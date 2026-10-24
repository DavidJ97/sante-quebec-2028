import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import {
  DONNEES, estDonnee, estNumeroValide, formaterNumero, MESSAGES_NUMERO, problemeNumero, LIBELLES_STATUT, NIVEAUX_PROCURATION,
  ageA, calculerParente, LIBELLES_PARENTE, TransitionInterdite, MOTIFS_URGENCE, DUREE_ACCES_URGENCE_H, type MotifUrgence, type Demandeur, type Porte, type NiveauProcuration, type Parente,
} from '@sante/noyau';
import type { Base, Executeur } from './db.js';
import { ErreurHttp, interdit, introuvable, invalide, nonAutorise } from './erreurs.js';
import {
  creerCode, demandeurDeSession, fermerSession, masquerTelephone, NOM_TEMOIN, ouvrirSession, verifierCode, messagerieJournalConsole,
  DUREE_SESSION, type Messagerie,
} from './connexion.js';
import { autoriser, avecAcces, evaluerSansJournal } from './passerelle.js';
import { FICHE_URGENCE, LECTEURS } from './dossier.js';
import { inscrire, verifier } from './journal.js';
import * as registre from './registre.js';
import { migrer } from './db.js';
import { semer } from './seed.js';

export interface Options {
  base: Base;
  messagerie?: Messagerie;
  /** En développement, le code de connexion est renvoyé dans la réponse. Jamais en production. */
  developpement?: boolean;
  journaliser?: boolean;
  /** Codes de connexion permis par personne sur 5 minutes. */
  limiteCodes?: number;
}

// ---------- petits outils de validation ----------
type Corps = Record<string, unknown>;
const corps = (req: FastifyRequest): Corps => (req.body && typeof req.body === 'object' ? (req.body as Corps) : {});
function texte(c: Corps, cle: string, { min = 1, max = 500 } = {}): string {
  const v = c[cle];
  if (typeof v !== 'string' || v.trim().length < min || v.length > max) throw invalide(`Champ « ${cle} » manquant ou invalide`);
  return v.trim();
}
function date(c: Corps, cle: string): string {
  const v = texte(c, cle, { max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw invalide(`Date « ${cle} » invalide (AAAA-MM-JJ)`);
  return v;
}
function numeroQC(v: unknown): string {
  if (typeof v !== 'string') throw invalide('Numéro QC manquant');
  const p = problemeNumero(v);
  if (p) throw invalide(MESSAGES_NUMERO[p]);
  return v;
}
const sexe = (c: Corps): 'F' | 'M' | 'X' => {
  const v = c.sexe;
  if (v !== 'F' && v !== 'M' && v !== 'X') throw invalide('Sexe à la naissance : F, M ou X');
  return v;
};

function exigerEmploye(d: Demandeur, ...portes: Porte[]) {
  if (d.type !== 'employe' || !portes.includes(d.porte)) throw interdit('Réservé au personnel autorisé');
  return d;
}
function exigerCitoyen(d: Demandeur) {
  if (d.type !== 'citoyen') throw interdit('Réservé aux citoyens');
  return d;
}

const nomComplet = (p: { prenom: string | null; nom: string | null }) => [p.prenom, p.nom].filter(Boolean).join(' ') || 'Bébé à naître';

export function construireApp(o: Options) {
  const { base } = o;
  const messagerie = o.messagerie ?? messagerieJournalConsole;
  const app = Fastify({ logger: o.journaliser ?? false, bodyLimit: 64 * 1024 });

  app.register(cookie);
  // Seul le JSON est accepté : un formulaire d'un autre site ne peut pas forger une requête.
  app.removeContentTypeParser('text/plain');

  app.addHook('onSend', async (_req, rep) => {
    rep.header('cache-control', 'no-store');
    rep.header('x-content-type-options', 'nosniff');
    rep.header('referrer-policy', 'no-referrer');
  });

  app.setErrorHandler((err, req, rep) => {
    if (err instanceof ErreurHttp) return rep.status(err.statut).send({ code: err.code, message: err.message });
    if (err instanceof TransitionInterdite) return rep.status(409).send({ code: 'conflit', message: err.message });
    if ((err as { statusCode?: number }).statusCode && (err as { statusCode: number }).statusCode < 500) {
      return rep.status((err as { statusCode: number }).statusCode).send({ code: 'requete_invalide', message: err.message });
    }
    req.log.error(err);
    return rep.status(500).send({ code: 'erreur_interne', message: 'Erreur interne. Réessayez dans un moment.' });
  });

  const demandeur = (req: FastifyRequest) => base.transaction((tx) => demandeurDeSession(tx, req.cookies[NOM_TEMOIN]));
  const poserTemoin = (rep: FastifyReply, jeton: string, expire: Date) =>
    rep.setCookie(NOM_TEMOIN, jeton, { httpOnly: true, sameSite: 'strict', secure: !o.developpement, path: '/', expires: expire });

  // Limite simple d'envoi de codes par cible (en plus du nombre d'essais par code)
  async function limiterCodes(tx: Executeur, type: string, id: string) {
    const [{ n }] = (await tx.requete<{ n: number }>(
      `select count(*)::int as n from code_connexion where cible_type = $1 and cible_id = $2 and expire_le > now() - interval '5 minutes'`, [type, id])) as [{ n: number }];
    if (n >= (o.limiteCodes ?? 3)) throw new ErreurHttp(429, 'trop_de_demandes', 'Trop de codes demandés. Attendez quelques minutes.');
  }

  // ================= Connexion =================
  const MESSAGE_CODE = 'Si ce numéro est inscrit, un code a été envoyé au téléphone de votre dossier.';

  app.post('/api/connexion/citoyen/code', async (req, rep) => {
    const numero = numeroQC(corps(req).numero);
    const envoi = await base.transaction(async (tx) => {
      const r = await registre.resoudre(tx, numero).catch(() => null);
      if (!r || r.statut !== 'actif') return null;
      const [c] = await tx.requete<{ telephone: string | null }>('select telephone from coordonnees where personne_cle = $1', [r.personneCle]);
      if (!c?.telephone) return null;
      await limiterCodes(tx, 'citoyen', r.personneCle);
      return { telephone: c.telephone, code: await creerCode(tx, 'citoyen', r.personneCle) };
    });
    if (envoi) await messagerie.envoyerCode(envoi.telephone, envoi.code);
    return rep.status(202).send({
      message: MESSAGE_CODE,
      ...(o.developpement && envoi ? { codeDeveloppement: envoi.code, telephone: masquerTelephone(envoi.telephone) } : {}),
    });
  });

  app.post('/api/connexion/citoyen/session', async (req, rep) => {
    const c = corps(req);
    const numero = numeroQC(c.numero);
    const code = texte(c, 'code', { max: 6 });
    const s = await base.transaction(async (tx) => {
      const r = await registre.resoudre(tx, numero).catch(() => null);
      if (!r || r.statut !== 'actif') return null;
      if (!(await verifierCode(tx, 'citoyen', r.personneCle, code))) return null;
      return ouvrirSession(tx, 'citoyen', r.personneCle);
    });
    if (!s) throw nonAutorise('Code incorrect ou expiré.');
    poserTemoin(rep, s.jeton, s.expire);
    return rep.status(204).send();
  });

  app.post('/api/connexion/personnel/code', async (req, rep) => {
    const id = texte(corps(req), 'identifiant', { max: 40 }).toLowerCase();
    const envoi = await base.transaction(async (tx) => {
      const [e] = await tx.requete<{ telephone: string }>('select telephone from employe where id = $1 and actif', [id]);
      if (!e) return null;
      await limiterCodes(tx, 'employe', id);
      return { telephone: e.telephone, code: await creerCode(tx, 'employe', id) };
    });
    if (envoi) await messagerie.envoyerCode(envoi.telephone, envoi.code);
    return rep.status(202).send({
      message: 'Si cet identifiant est actif, un code a été envoyé à votre téléphone professionnel.',
      ...(o.developpement && envoi ? { codeDeveloppement: envoi.code, telephone: masquerTelephone(envoi.telephone) } : {}),
    });
  });

  app.post('/api/connexion/personnel/session', async (req, rep) => {
    const c = corps(req);
    const id = texte(c, 'identifiant', { max: 40 }).toLowerCase();
    const code = texte(c, 'code', { max: 6 });
    const s = await base.transaction(async (tx) => (await verifierCode(tx, 'employe', id, code)) ? ouvrirSession(tx, 'employe', id) : null);
    if (!s) throw nonAutorise('Code incorrect ou expiré.');
    poserTemoin(rep, s.jeton, s.expire);
    return rep.status(204).send();
  });

  app.delete('/api/connexion', async (req, rep) => {
    const jeton = req.cookies[NOM_TEMOIN];
    if (jeton) await fermerSession(base, jeton);
    rep.clearCookie(NOM_TEMOIN, { path: '/' });
    return rep.status(204).send();
  });

  // ================= Qui suis-je =================
  app.get('/api/moi', async (req, rep) => {
    const d = await demandeur(req);
    if (d.type === 'employe') {
      const [e] = await base.requete('select id, nom, role, porte, etablissement from employe where id = $1', [d.id]);
      return { type: 'employe', ...e, dureeSessionMin: DUREE_SESSION.employe / 60_000 };
    }
    const cle = d.personneCle;
    const moi = await registre.numeroDe(base, cle);
    const [p] = await base.requete<{ prenom: string; nom: string; date_naissance: string }>('select prenom, nom, date_naissance::text from personne where cle = $1', [cle]);
    const [c] = await base.requete<{ mode_simplifie: boolean }>('select mode_simplifie from coordonnees where personne_cle = $1', [cle]);

    // Personnes pour qui j'agis : mes enfants mineurs, les bébés que je gère, mes mandants.
    const enfants = await base.requete<{ cle: string; prenom: string | null; nom: string | null; date_naissance: string | null }>(
      `select p.cle, p.prenom, p.nom, p.date_naissance::text from filiation f join personne p on p.cle = f.enfant_cle
        where f.parent_cle = $1 and p.date_deces is null`, [cle]);
    const gestions = new Set((await base.requete<{ enfant_cle: string }>('select enfant_cle from gestionnaire_prenatal where parent_cle = $1', [cle])).map((x) => x.enfant_cle));
    const mandats = await base.requete<{ cle: string; prenom: string; nom: string; niveau: NiveauProcuration; fin: string | null }>(
      `select p.cle, p.prenom, p.nom, pr.niveau, pr.fin::text from procuration pr join personne p on p.cle = pr.mandant_cle
        where pr.mandataire_cle = $1 and pr.revoquee_le is null and (pr.fin is null or pr.fin >= current_date) and p.date_deces is null
        order by pr.niveau desc`, [cle]);

    const pourQui: { numero: string; nom: string; lien: string }[] = [];
    for (const e of enfants) {
      const n = await registre.numeroDe(base, e.cle);
      if (n.statut === 'reserve') {
        if (gestions.has(e.cle)) pourQui.push({ numero: n.numero, nom: 'Votre bébé à naître', lien: 'Profil réservé' });
        continue;
      }
      if (e.date_naissance && ageA(e.date_naissance, new Date()) < 18) {
        const age = ageA(e.date_naissance, new Date());
        pourQui.push({ numero: n.numero, nom: nomComplet(e), lien: `Votre enfant, ${age === 0 ? 'moins d\'un an' : `${age} an${age > 1 ? 's' : ''}`}` });
      }
    }
    for (const m of mandats) {
      const n = await registre.numeroDe(base, m.cle);
      if (pourQui.some((x) => x.numero === n.numero)) continue;
      pourQui.push({ numero: n.numero, nom: nomComplet(m), lien: `Procuration « ${NIVEAUX_PROCURATION[m.niveau].nom} »` });
    }
    // Personnes de confiance : qui agit pour moi
    const mandataires = await base.requete<{ nom: string; niveau: NiveauProcuration; fin: string | null; debut: string }>(
      `select p.prenom || ' ' || p.nom as nom, pr.niveau, pr.fin::text, pr.debut::text from procuration pr join personne p on p.cle = pr.mandataire_cle
        where pr.mandant_cle = $1 and pr.revoquee_le is null and (pr.fin is null or pr.fin >= current_date) order by pr.niveau desc`, [cle]);
    const [ph] = await base.requete<{ prise_le: string }>('select prise_le::text from photo where personne_cle = $1 order by prise_le desc limit 1', [cle]);
    return rep.send({
      type: 'citoyen', numero: moi.numero, prenom: p!.prenom, nom: p!.nom, dateNaissance: p!.date_naissance,
      modeSimplifie: c?.mode_simplifie ?? false, photoPriseLe: ph?.prise_le ?? null, pourQui,
      mandataires: mandataires.map((m) => ({ nom: m.nom, niveau: m.niveau, niveauNom: NIVEAUX_PROCURATION[m.niveau].nom, debut: m.debut, fin: m.fin })),
    });
  });

  // ================= Dossier : une donnée à la fois, toujours par la passerelle =================
  app.get<{ Params: { numero: string; donnee: string } }>('/api/personnes/:numero/donnees/:donnee', async (req) => {
    const d = await demandeur(req);
    const numero = numeroQC(req.params.numero);
    const donnee = req.params.donnee;
    if (!estDonnee(donnee) || !LECTEURS[donnee]) throw introuvable('Donnée inconnue');
    return avecAcces(base, d, numero, donnee, 'lire', async (tx, a) => ({
      donnee, libelle: DONNEES[donnee].libelle, raison: a.verdict.raison, valeur: await LECTEURS[donnee]!(tx, a.numero.personneCle),
    }));
  });

  // Ce que le demandeur peut voir de cette personne, donnée par donnée (sans lire le contenu).
  app.get<{ Params: { numero: string } }>('/api/personnes/:numero/droits', async (req) => {
    const d = await demandeur(req);
    const numero = numeroQC(req.params.numero);
    const donnees = ['identite', 'coordonnees', 'rendezvous', 'allergies', 'medicaments', 'adaptation', 'maladies', 'volontes', 'vaccins'] as const;
    return base.transaction(async (tx) => {
      const out = [];
      for (const x of donnees) {
        const v = await evaluerSansJournal(tx, d, numero, x, 'lire');
        out.push({ donnee: x, libelle: DONNEES[x].libelle, permis: v.permis, raison: v.raison });
      }
      return out;
    });
  });

  // ================= Famille calculée =================
  app.get<{ Params: { numero: string } }>('/api/personnes/:numero/famille', async (req) => {
    const d = exigerCitoyen(await demandeur(req));
    const numero = numeroQC(req.params.numero);
    return avecAcces(base, d, numero, 'identite', 'lire', async (tx, a) => {
      if (a.numero.personneCle !== d.personneCle) throw interdit('Seule la personne voit sa famille calculée');
      // Liens parent-enfant sur deux générations autour de la personne, pas plus.
      const liens = await tx.requete<{ enfant: string; parent: string }>(
        `with recursive asc_(cle, n) as (
            select $1::uuid, 0 union select f.parent_cle, a.n + 1 from filiation f join asc_ a on f.enfant_cle = a.cle where a.n < 2
          ), desc_(cle, n) as (
            select cle, 0 from asc_ union select f.enfant_cle, d.n + 1 from filiation f join desc_ d on f.parent_cle = d.cle where d.n < 2
          )
          select distinct f.enfant_cle as enfant, f.parent_cle as parent from filiation f
           where f.enfant_cle in (select cle from desc_) and f.parent_cle in (select cle from desc_ union select cle from asc_)`,
        [a.numero.personneCle]);
      const parente = calculerParente(a.numero.personneCle, liens);
      const toutes = [...new Set(Object.values(parente).flat())];
      const infos = toutes.length ? await tx.requete<{ cle: string; prenom: string | null; nom: string | null; date_naissance: string | null; date_deces: string | null; numero: string; statut: string }>(
        `select p.cle, p.prenom, p.nom, p.date_naissance::text, p.date_deces::text, n.numero, n.statut from personne p
           join numero_qc n on n.personne_cle = p.cle and n.statut in ('reserve','actif','temporaire','decede')
          where p.cle = any($1::uuid[])`, [toutes]) : [];
      const parCle = new Map(infos.map((i) => [i.cle, i]));
      return (Object.keys(LIBELLES_PARENTE) as (keyof Parente)[])
        .map((g) => ({
          groupe: g, libelle: LIBELLES_PARENTE[g],
          personnes: parente[g].map((c) => parCle.get(c)!).filter(Boolean).map((i) => ({
            numero: i.numero, nom: nomComplet(i), statut: LIBELLES_STATUT[i.statut as keyof typeof LIBELLES_STATUT],
            age: i.date_naissance && !i.date_deces ? ageA(i.date_naissance, new Date()) : null, deces: i.date_deces,
          })),
        }))
        .filter((g) => g.personnes.length > 0);
    });
  });

  // ================= Qui a vu mon dossier =================
  app.get<{ Params: { numero: string } }>('/api/personnes/:numero/journal', async (req) => {
    const d = await demandeur(req);
    const numero = numeroQC(req.params.numero);
    return avecAcces(base, d, numero, 'journal', 'lire', async (tx, a) => {
      const lignes = await tx.requete<{
        no: string; le: Date; demandeur_type: string; demandeur_id: string; donnee: string; action: string; urgence: boolean;
        raison: string; emp_nom: string | null; emp_role: string | null; emp_etab: string | null; prenom: string | null; nom: string | null; signale: boolean;
      }>(
        `select j.no::text, j.le, j.demandeur_type, j.demandeur_id, j.donnee, j.action, j.urgence, j.raison,
                e.nom as emp_nom, e.role as emp_role, e.etablissement as emp_etab, p.prenom, p.nom,
                exists (select 1 from signalement s where s.journal_no = j.no) as signale
           from journal_acces j
           left join employe e on j.demandeur_type <> 'citoyen' and e.id = j.demandeur_id
           left join personne p on j.demandeur_type = 'citoyen' and p.cle::text = j.demandeur_id
          where j.sujet = $1 and j.decision = 'permis' and not (j.demandeur_type = 'citoyen' and j.demandeur_id = $2)
          order by j.no desc limit 200`, [a.numero.numero, a.numero.personneCle]);
      return lignes.map((l) => ({
        no: Number(l.no), le: l.le, donnee: DONNEES[l.donnee as keyof typeof DONNEES]?.libelle ?? l.donnee, action: l.action, urgence: l.urgence,
        qui: l.demandeur_type === 'citoyen' ? nomComplet(l) : `${l.emp_nom}`,
        employeId: l.demandeur_type === 'citoyen' ? null : l.demandeur_id,
        precision: l.demandeur_type === 'citoyen' ? l.raison : `${l.emp_role} · ${l.emp_etab}`, signale: l.signale,
      }));
    });
  });

  app.post<{ Params: { no: string } }>('/api/journal/:no/signalement', async (req, rep) => {
    const d = exigerCitoyen(await demandeur(req));
    const no = Number(req.params.no);
    if (!Number.isInteger(no) || no < 1) throw invalide('Entrée inconnue');
    await base.transaction(async (tx) => {
      const moi = await registre.numeroDe(tx, d.personneCle);
      const [e] = await tx.requete('select 1 from journal_acces where no = $1 and sujet = $2', [no, moi.numero]);
      if (!e) throw introuvable('Entrée introuvable');
      await tx.requete('insert into signalement (journal_no, personne_cle) values ($1, $2) on conflict do nothing', [no, d.personneCle]);
    });
    return rep.status(204).send();
  });

  // ================= Rendez-vous =================
  async function rendezVous(tx: Executeur, id: string) {
    if (!/^\d+$/.test(id)) throw introuvable('Rendez-vous introuvable');
    const [r] = await tx.requete<{ personne_cle: string; debut: Date; statut: string }>(
      'select personne_cle, debut, statut from rendez_vous where id = $1', [id]);
    if (!r) throw introuvable('Rendez-vous introuvable');
    return { ...r, numero: (await registre.numeroDe(tx, r.personne_cle)).numero };
  }

  /** Trois autres plages : même heure, prochains jours ouvrables. */
  function plages(debut: Date, maintenant = new Date()): string[] {
    const out: string[] = [];
    const j = new Date(Math.max(debut.getTime(), maintenant.getTime()));
    j.setUTCHours(debut.getUTCHours(), debut.getUTCMinutes(), 0, 0);
    while (out.length < 3) {
      j.setUTCDate(j.getUTCDate() + 1);
      const jour = j.getUTCDay();
      if (jour !== 0 && jour !== 6 && j.getTime() !== debut.getTime()) out.push(j.toISOString());
    }
    return out;
  }

  app.get<{ Params: { id: string } }>('/api/rendez-vous/:id/plages', async (req) => {
    const d = await demandeur(req);
    const r = await rendezVous(base, req.params.id);
    return avecAcces(base, d, r.numero, 'rendezvous', 'lire', async () => plages(new Date(r.debut)));
  });

  app.post<{ Params: { id: string } }>('/api/rendez-vous/:id/confirmation', async (req, rep) => {
    const d = await demandeur(req);
    const r = await rendezVous(base, req.params.id);
    await avecAcces(base, d, r.numero, 'rendezvous', 'ecrire', async (tx) => {
      await tx.requete(`update rendez_vous set statut = 'confirme', modifie_le = now() where id = $1 and statut = 'propose'`, [req.params.id]);
    }, 'Confirmation du rendez-vous');
    return rep.status(204).send();
  });

  app.post<{ Params: { id: string } }>('/api/rendez-vous/:id/deplacement', async (req, rep) => {
    const d = await demandeur(req);
    const debut = texte(corps(req), 'debut', { max: 40 });
    const r = await rendezVous(base, req.params.id);
    if (!plages(new Date(r.debut)).includes(debut)) throw invalide('Cette plage n\'est pas offerte');
    await avecAcces(base, d, r.numero, 'rendezvous', 'ecrire', async (tx) => {
      await tx.requete(`update rendez_vous set debut = $2, statut = 'confirme', modifie_le = now() where id = $1`, [req.params.id, debut]);
    }, 'Déplacement du rendez-vous');
    return rep.status(204).send();
  });

  // ================= Photos =================
  // Photo d'une personne : c'est une donnée d'identité, servie par la passerelle et inscrite au journal.
  app.get<{ Params: { numero: string } }>('/api/personnes/:numero/photo', async (req, rep) => {
    const d = await demandeur(req);
    const numero = numeroQC(req.params.numero);
    const ph = await avecAcces(base, d, numero, 'identite', 'lire', async (tx, a) => {
      const [x] = await tx.requete<{ image: Uint8Array; type_mime: string }>(
        'select image, type_mime from photo where personne_cle = $1 order by prise_le desc limit 1', [a.numero.personneCle]);
      return x ?? null;
    }, 'Photo');
    if (!ph) throw introuvable('Aucune photo');
    return rep.header('content-type', ph.type_mime).header('cache-control', 'private, no-store').send(Buffer.from(ph.image));
  });

  // Photo d'un membre du personnel : visible par toute personne connectée (on sait qui nous soigne ou qui a consulté).
  app.get<{ Params: { id: string } }>('/api/personnel/:id/photo', async (req, rep) => {
    await demandeur(req);
    if (!/^[a-z0-9._-]{1,40}$/.test(req.params.id)) throw introuvable();
    const [ph] = await base.requete<{ image: Uint8Array; type_mime: string }>(
      'select image, type_mime from photo where employe_id = $1 order by prise_le desc limit 1', [req.params.id]);
    if (!ph) throw introuvable('Aucune photo');
    return rep.header('content-type', ph.type_mime).header('cache-control', 'private, max-age=3600').send(Buffer.from(ph.image));
  });

  // ================= Personnel clinique =================
  app.get<{ Querystring: { q?: string } }>('/api/recherche', async (req) => {
    const d = exigerEmploye(await demandeur(req), 'clinique', 'bureaucratie');
    const q = (req.query.q ?? '').trim();
    if (!q) throw invalide('Entrez un numéro QC ou un NAM');
    if (/\d/.test(q) && !/[a-z]/i.test(q.replace(/^qc/i, '')) && !estNumeroValide(q)) throw invalide(MESSAGES_NUMERO[problemeNumero(q)!]);
    const r = await registre.chercher(base, q);
    if (!r) throw introuvable('Aucune personne ne correspond');
    return avecAcces(base, d, r.numero, 'identite', 'lire', async (tx, a) => ({
      numero: a.numero.numero, numeroAffiche: formaterNumero(a.numero.numero), statut: LIBELLES_STATUT[a.numero.statut],
      identite: await LECTEURS.identite!(tx, a.numero.personneCle),
    }), `Recherche : ${q.length > 4 ? '…' + q.slice(-4) : q}`);
  });

  app.get<{ Params: { numero: string } }>('/api/personnes/:numero/fiche-urgence', async (req) => {
    const d = exigerEmploye(await demandeur(req), 'clinique');
    const numero = numeroQC(req.params.numero);
    const r = await base.transaction(async (tx) => {
      const sections: Record<string, unknown> = {};
      let acces: Awaited<ReturnType<typeof autoriser>> | null = null;
      for (const donnee of FICHE_URGENCE) {
        const a = await autoriser(tx, d, numero, donnee, 'lire');
        if (!a.verdict.permis) return { ok: false as const, refus: a.verdict.raison };
        acces = a;
        sections[donnee] = await LECTEURS[donnee]!(tx, a.numero.personneCle);
      }
      const cle = acces!.numero.personneCle;
      const proches = await tx.requete(
        `select p.prenom || ' ' || p.nom as nom, c.telephone, pr.niveau, pr.fin::text from procuration pr
           join personne p on p.cle = pr.mandataire_cle left join coordonnees c on c.personne_cle = pr.mandataire_cle
          where pr.mandant_cle = $1 and pr.niveau >= 2 and pr.revoquee_le is null and (pr.fin is null or pr.fin >= current_date)
          order by pr.niveau desc`, [cle]);
      const [urg] = acces!.verdict.urgence ? await tx.requete<{ fin: Date }>(
        `select max(fin) as fin from lien_soins where employe_id = $1 and personne_cle = $2 and urgence and fin > now()`, [d.id, cle]) : [];
      return { ok: true as const, valeur: { acces: { raison: acces!.verdict.raison, urgence: acces!.verdict.urgence, expireLe: urg?.fin ?? null }, ...sections, proches } };
    });
    if (!r.ok) throw interdit(r.refus);
    return r.valeur;
  });

  app.get('/api/motifs-urgence', async () => Object.entries(MOTIFS_URGENCE).map(([code, libelle]) => ({ code, libelle })));

  app.post<{ Params: { numero: string } }>('/api/personnes/:numero/acces-urgence', async (req, rep) => {
    const d = exigerEmploye(await demandeur(req), 'clinique');
    const numero = numeroQC(req.params.numero);
    const c = corps(req);
    const code = c.motifCode;
    if (typeof code !== 'string' || !Object.hasOwn(MOTIFS_URGENCE, code)) throw invalide('Choisissez un motif');
    const motifCode = code as MotifUrgence;
    const precision = typeof c.precision === 'string' ? c.precision.trim().slice(0, 300) : '';
    if (motifCode === 'autre' && precision.length < 10) throw invalide('Précisez le motif (au moins 10 caractères)');
    const motif = precision ? `${MOTIFS_URGENCE[motifCode]} — ${precision}` : MOTIFS_URGENCE[motifCode];
    const fin = await base.transaction(async (tx) => {
      const r = await registre.resoudre(tx, numero);
      const [l] = (await tx.requete<{ fin: Date }>(
        `insert into lien_soins (employe_id, personne_cle, contexte, urgence, motif_code, motif, fin)
         values ($1, $2, 'Accès d''urgence', true, $3, $4, now() + make_interval(hours => $5)) returning fin`,
        [d.id, r.personneCle, motifCode, precision || null, DUREE_ACCES_URGENCE_H])) as [{ fin: Date }];
      await inscrire(tx, {
        demandeurType: 'clinique', demandeurId: d.id, sujet: r.numero, donnee: 'identite', action: 'ecrire', motif,
        decision: 'permis', raison: `Ouverture d'un accès d'urgence de ${DUREE_ACCES_URGENCE_H} heures`, urgence: true,
      });
      return l.fin;
    });
    return rep.status(201).send({ expireLe: fin });
  });

  // ================= Registre (bureaucratie) =================
  const agent = async (req: FastifyRequest) => exigerEmploye(await demandeur(req), 'bureaucratie');

  app.post('/api/registre/reservations', async (req, rep) => {
    const d = await agent(req);
    const c = corps(req);
    const mere = numeroQC(c.mere);
    const datePrevue = date(c, 'datePrevue');
    const r = await avecAcces(base, d, mere, 'identite', 'lire', (tx) => registre.reserver(tx, { mere, datePrevue }, d.id), 'Réservation prénatale');
    return rep.status(201).send({ numero: r.numero, numeroAffiche: formaterNumero(r.numero) });
  });

  app.post<{ Params: { numero: string } }>('/api/registre/naissances/:numero', async (req) => {
    const d = await agent(req);
    const numero = numeroQC(req.params.numero);
    const c = corps(req);
    const p = {
      prenom: texte(c, 'prenom', { max: 80 }), nom: texte(c, 'nom', { max: 80 }), dateNaissance: date(c, 'dateNaissance'),
      sexe: sexe(c), lieu: texte(c, 'lieu', { max: 120 }), ...(c.secondParent ? { secondParent: numeroQC(c.secondParent) } : {}),
    };
    const r = await avecAcces(base, d, numero, 'identite', 'ecrire', (tx) => registre.declarerNaissance(tx, numero, p, d.id), 'Déclaration de naissance');
    return { numero: r.numero, statut: LIBELLES_STATUT[r.statut] };
  });

  app.post('/api/registre/fusions', async (req, rep) => {
    const d = await agent(req);
    const c = corps(req);
    const perdant = numeroQC(c.perdant), gagnant = numeroQC(c.gagnant);
    await avecAcces(base, d, gagnant, 'identite', 'ecrire', (tx) => registre.fusionner(tx, perdant, gagnant, d.id), `Fusion de ${perdant}`);
    return rep.status(204).send();
  });

  app.post<{ Params: { numero: string } }>('/api/registre/deces/:numero', async (req, rep) => {
    const d = await agent(req);
    const numero = numeroQC(req.params.numero);
    const le = date(corps(req), 'date');
    await avecAcces(base, d, numero, 'identite', 'ecrire', (tx) => registre.declarerDeces(tx, numero, le, d.id), 'Avis de décès');
    return rep.status(204).send();
  });

  // ================= Exploitation (Québec Tech) =================
  app.get('/api/exploitation/journal', async (req) => {
    exigerEmploye(await demandeur(req), 'admintech');
    return verifier(base);
  });

  app.get('/api/exploitation/acces-urgence', async (req) => {
    exigerEmploye(await demandeur(req), 'admintech');
    return base.requete(
      `select l.id::text, e.nom as employe, e.role, e.etablissement, n.numero as sujet, l.motif_code as "motifCode", l.motif,
              l.debut, l.fin, l.revu_le as "revuLe", l.revue_decision as "decision"
         from lien_soins l join employe e on e.id = l.employe_id
         join numero_qc n on n.personne_cle = l.personne_cle and n.statut in ('actif','temporaire','decede')
        where l.urgence order by (l.revu_le is null) desc, l.debut desc limit 100`);
  });

  app.post<{ Params: { id: string } }>('/api/exploitation/acces-urgence/:id/revue', async (req, rep) => {
    const d = exigerEmploye(await demandeur(req), 'admintech');
    const decision = corps(req).decision;
    if (decision !== 'justifie' && decision !== 'enquete') throw invalide('Décision : justifie ou enquete');
    if (!/^\d+$/.test(req.params.id)) throw introuvable();
    const r = await base.requete(
      `update lien_soins set revu_le = now(), revu_par = $2, revue_decision = $3 where id = $1 and urgence and revu_le is null returning id`,
      [req.params.id, d.id, decision]);
    if (!r.length) throw introuvable('Accès introuvable ou déjà revu');
    return rep.status(204).send();
  });

  app.get('/api/sante', async () => ({ ok: true }));

  // Développement et tests seulement : repartir d'une base neuve. N'existe pas en production.
  if (o.developpement) {
    app.post('/api/developpement/reinitialiser', async (_req, rep) => {
      await base.script('drop schema public cascade; create schema public;');
      await migrer(base);
      await semer(base);
      return rep.status(204).send();
    });
  }

  return app;
}
