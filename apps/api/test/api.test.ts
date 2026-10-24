import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { basePGlite, migrer, type Base } from '../src/db.js';
import { construireApp } from '../src/app.js';
import { semer } from '../src/seed.js';
import { verifier } from '../src/journal.js';

let base: Base;
let app: ReturnType<typeof construireApp>;
let N: Record<string, string>;

beforeAll(async () => {
  base = basePGlite();
  await migrer(base);
  N = await semer(base);
  app = construireApp({ base, developpement: true, limiteCodes: 1000, messagerie: { envoyerCode: async () => {} } });
  await app.ready();
}, 60_000);

afterAll(async () => {
  await app.close();
  await base.fermer();
});

async function connecterCitoyen(numero: string): Promise<string> {
  const r1 = await app.inject({ method: 'POST', url: '/api/connexion/citoyen/code', payload: { numero } });
  expect(r1.statusCode).toBe(202);
  const code = r1.json().codeDeveloppement as string;
  const r2 = await app.inject({ method: 'POST', url: '/api/connexion/citoyen/session', payload: { numero, code } });
  expect(r2.statusCode).toBe(204);
  return r2.cookies.find((c) => c.name === 'sq_session')!.value;
}

async function connecterPersonnel(identifiant: string): Promise<string> {
  const r1 = await app.inject({ method: 'POST', url: '/api/connexion/personnel/code', payload: { identifiant } });
  const r2 = await app.inject({ method: 'POST', url: '/api/connexion/personnel/session', payload: { identifiant, code: r1.json().codeDeveloppement } });
  expect(r2.statusCode).toBe(204);
  return r2.cookies.find((c) => c.name === 'sq_session')!.value;
}

const get = (jeton: string, url: string) => app.inject({ method: 'GET', url, cookies: { sq_session: jeton } });
const post = (jeton: string, url: string, payload: object = {}) => app.inject({ method: 'POST', url, payload, cookies: { sq_session: jeton } });

describe('connexion', () => {
  it('refuse sans session', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/moi' })).statusCode).toBe(401);
  });

  it('valide le format du numéro et ne révèle pas si un numéro existe', async () => {
    const mauvais = await app.inject({ method: 'POST', url: '/api/connexion/citoyen/code', payload: { numero: '4829 1357 060' } });
    expect(mauvais.statusCode).toBe(400);
    expect(mauvais.json().message).toMatch(/Vérifiez chaque chiffre/);
    // Numéro valide mais jamais attribué
    const inconnu = await app.inject({ method: 'POST', url: '/api/connexion/citoyen/code', payload: { numero: 'QC 9999 9999 991' } });
    expect(inconnu.statusCode === 202 || inconnu.statusCode === 400).toBe(true);
    if (inconnu.statusCode === 202) expect(inconnu.json().codeDeveloppement).toBeUndefined();
  });

  it('limite le nombre de codes demandés', async () => {
    const stricte = construireApp({ base, developpement: true, messagerie: { envoyerCode: async () => {} } });
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await stricte.inject({ method: 'POST', url: '/api/connexion/citoyen/code', payload: { numero: N.marc } })).statusCode);
    expect(codes).toEqual([202, 202, 202, 429]);
    await stricte.close();
  });

  it('bloque un code après 5 essais ratés', async () => {
    const r1 = await app.inject({ method: 'POST', url: '/api/connexion/citoyen/code', payload: { numero: N.mj } });
    const bon = r1.json().codeDeveloppement as string;
    const faux = bon === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      expect((await app.inject({ method: 'POST', url: '/api/connexion/citoyen/session', payload: { numero: N.mj, code: faux } })).statusCode).toBe(401);
    }
    expect((await app.inject({ method: 'POST', url: '/api/connexion/citoyen/session', payload: { numero: N.mj, code: bon } })).statusCode).toBe(401);
  });

  it('pose un témoin httpOnly et SameSite strict, et se déconnecte', async () => {
    const r1 = await app.inject({ method: 'POST', url: '/api/connexion/citoyen/code', payload: { numero: N.leo } });
    const r2 = await app.inject({ method: 'POST', url: '/api/connexion/citoyen/session', payload: { numero: N.leo, code: r1.json().codeDeveloppement } });
    const t = r2.cookies.find((c) => c.name === 'sq_session')!;
    expect(t.httpOnly).toBe(true);
    expect(t.sameSite).toBe('Strict');
    expect((await get(t.value, '/api/moi')).statusCode).toBe(200);
    await app.inject({ method: 'DELETE', url: '/api/connexion', cookies: { sq_session: t.value } });
    expect((await get(t.value, '/api/moi')).statusCode).toBe(401);
  });
});

describe('espace citoyen', () => {
  it('Gisèle lit son propre dossier', async () => {
    const j = await connecterCitoyen(N.gisele!);
    const moi = (await get(j, '/api/moi')).json();
    expect(moi).toMatchObject({ type: 'citoyen', prenom: 'Gisèle', modeSimplifie: true });
    const med = (await get(j, `/api/personnes/${N.gisele}/donnees/medicaments`)).json();
    expect(med.valeur.map((m: { nom: string }) => m.nom)).toContain('Apixaban 5 mg');
  });

  it('Nadia organise pour sa mère, sans voir ses médicaments', async () => {
    const j = await connecterCitoyen(N.nadia!);
    const moi = (await get(j, '/api/moi')).json();
    expect(moi.pourQui).toContainEqual({ numero: N.gisele, nom: 'Gisèle Tremblay', lien: 'Procuration «\u00a0Organiser\u00a0»' });

    const rdv = await get(j, `/api/personnes/${N.gisele}/donnees/rendezvous`);
    expect(rdv.statusCode).toBe(200);
    const propose = rdv.json().valeur.find((r: { statut: string }) => r.statut === 'propose');
    expect((await post(j, `/api/rendez-vous/${propose.id}/confirmation`)).statusCode).toBe(204);

    const med = await get(j, `/api/personnes/${N.gisele}/donnees/medicaments`);
    expect(med.statusCode).toBe(403);
    expect(med.json().message).toMatch(/Organiser/);

    // Le refus est resté au journal malgré l'erreur 403
    const refus = await base.requete(`select 1 from journal_acces where sujet = $1 and donnee = 'medicaments' and decision = 'refuse'`, [N.gisele]);
    expect(refus.length).toBeGreaterThan(0);
  });

  it('déplacer un rendez-vous : seulement vers une plage offerte', async () => {
    const j = await connecterCitoyen(N.gisele!);
    const rdv = (await get(j, `/api/personnes/${N.gisele}/donnees/rendezvous`)).json().valeur[0];
    const plages = (await get(j, `/api/rendez-vous/${rdv.id}/plages`)).json() as string[];
    expect(plages).toHaveLength(3);
    expect((await post(j, `/api/rendez-vous/${rdv.id}/deplacement`, { debut: '2030-01-01T10:00:00.000Z' })).statusCode).toBe(400);
    expect((await post(j, `/api/rendez-vous/${rdv.id}/deplacement`, { debut: plages[1] })).statusCode).toBe(204);
  });

  it('un inconnu ne voit rien', async () => {
    const j = await connecterCitoyen(N.kevin!);
    expect((await get(j, `/api/personnes/${N.gisele}/donnees/rendezvous`)).statusCode).toBe(403);
  });

  it('Gisèle voit qui a consulté son dossier et peut signaler un accès', async () => {
    const j = await connecterCitoyen(N.gisele!);
    const journal = (await get(j, `/api/personnes/${N.gisele}/journal`)).json() as { no: number; qui: string }[];
    const deNadia = journal.find((e) => e.qui === 'Nadia Tremblay');
    expect(deNadia).toBeDefined();
    expect((await post(j, `/api/journal/${deNadia!.no}/signalement`)).statusCode).toBe(204);
    const apres = (await get(j, `/api/personnes/${N.gisele}/journal`)).json() as { no: number; signale: boolean }[];
    expect(apres.find((e) => e.no === deNadia!.no)!.signale).toBe(true);
    // Nadia ne peut pas lire le journal de sa mère
    const n = await connecterCitoyen(N.nadia!);
    expect((await get(n, `/api/personnes/${N.gisele}/journal`)).statusCode).toBe(403);
  });

  it('famille calculée jusqu\'aux cousins', async () => {
    const j = await connecterCitoyen(N.sarah!);
    const fam = (await get(j, `/api/personnes/${N.sarah}/famille`)).json() as { groupe: string; personnes: { nom: string }[] }[];
    const g = Object.fromEntries(fam.map((x) => [x.groupe, x.personnes.map((p) => p.nom)]));
    expect(g.parents).toEqual(['Nadia Tremblay']);
    expect(g.grandsParents).toEqual(['Gisèle Tremblay']);
    expect(g.cousins).toEqual(['Léo Tremblay']);
    expect(g.enfants).toEqual(['Bébé à naître']);
  });

  it('parent d\'un ado : les vaccins oui, le journal non', async () => {
    const j = await connecterCitoyen(N.marc!);
    expect((await get(j, `/api/personnes/${N.leo}/donnees/vaccins`)).statusCode).toBe(200);
    expect((await get(j, `/api/personnes/${N.leo}/journal`)).statusCode).toBe(403);
  });
});

describe('personnel clinique', () => {
  it('identifie, refuse la fiche sans lien de soins, puis ouvre un accès d\'urgence', async () => {
    const j = await connecterPersonnel('aouellet');
    const r = await get(j, '/api/recherche?q=TREG%203955%200211');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ numero: N.gisele, identite: { prenom: 'Gisèle' } });

    expect((await get(j, '/api/recherche?q=4829%201357%20060')).statusCode).toBe(400);
    expect((await get(j, `/api/personnes/${N.gisele}/fiche-urgence`)).statusCode).toBe(403);
    expect((await post(j, `/api/personnes/${N.gisele}/acces-urgence`, {})).statusCode).toBe(400);
    expect((await post(j, `/api/personnes/${N.gisele}/acces-urgence`, { motifCode: 'autre', precision: 'court' })).statusCode).toBe(400);
    const ouvert = await post(j, `/api/personnes/${N.gisele}/acces-urgence`, { motifCode: 'inapte', precision: 'Patiente confuse après une chute' });
    expect(ouvert.statusCode).toBe(201);
    const heures = (new Date(ouvert.json().expireLe).getTime() - Date.now()) / 3_600_000;
    expect(heures).toBeGreaterThan(11.9);
    expect(heures).toBeLessThanOrEqual(12);

    const fiche = (await get(j, `/api/personnes/${N.gisele}/fiche-urgence`)).json();
    expect(fiche.acces.urgence).toBe(true);
    expect(fiche.acces.expireLe).toBeTruthy();
    expect(fiche.allergies.etat).toBe('presentes');
    expect(fiche.allergies.elements[0]).toMatchObject({ substance: 'Pénicilline', gravite: 'grave' });
    expect(fiche.proches[0]).toMatchObject({ nom: 'Nadia Tremblay', niveau: 2 });
  });

  it('le médecin de famille a accès sans urgence', async () => {
    const j = await connecterPersonnel('proy');
    const fiche = (await get(j, `/api/personnes/${N.gisele}/fiche-urgence`)).json();
    expect(fiche.acces).toEqual({ raison: 'Lien de soins\u00a0: Médecin de famille', urgence: false, expireLe: null });
  });

  it('Québec Tech voit l\'accès d\'urgence à revoir, pas le contenu', async () => {
    const j = await connecterPersonnel('lchen');
    const u = (await get(j, '/api/exploitation/acces-urgence')).json();
    expect(u[0]).toMatchObject({ employe: 'Dre Anne Ouellet', sujet: N.gisele, motifCode: 'inapte', motif: 'Patiente confuse après une chute', decision: null });
    expect((await post(j, `/api/exploitation/acces-urgence/${u[0].id}/revue`, { decision: 'justifie' })).statusCode).toBe(204);
    expect((await post(j, `/api/exploitation/acces-urgence/${u[0].id}/revue`, { decision: 'justifie' })).statusCode).toBe(404);
    expect((await get(j, `/api/personnes/${N.gisele}/donnees/allergies`)).statusCode).toBe(403);
  });
});

describe('registre', () => {
  it('l\'agent ne voit pas le clinique', async () => {
    const j = await connecterPersonnel('mgagnon');
    expect((await get(j, `/api/personnes/${N.gisele}/donnees/allergies`)).statusCode).toBe(403);
    expect((await get(j, `/api/personnes/${N.gisele}/donnees/coordonnees`)).statusCode).toBe(200);
  });

  it('naissance : le numéro réservé devient actif, avec le second parent de l\'État civil', async () => {
    const j = await connecterPersonnel('mgagnon');
    const r = await post(j, `/api/registre/naissances/${N.bebe}`, {
      prenom: 'Maëlle', nom: 'Lavoie N\'Diaye', dateNaissance: '2027-01-07', sexe: 'F', lieu: 'CHU Sainte-Justine', secondParent: N.kevin,
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().statut).toBe('Actif');
    // Kevin, désormais parent, voit les vaccins de sa fille
    const k = await connecterCitoyen(N.kevin!);
    expect((await get(k, `/api/personnes/${N.bebe}/donnees/vaccins`)).statusCode).toBe(200);
    // Une deuxième déclaration est refusée
    const encore = await post(j, `/api/registre/naissances/${N.bebe}`, { prenom: 'X', nom: 'Y', dateNaissance: '2027-01-07', sexe: 'F', lieu: 'Z' });
    expect(encore.statusCode).toBe(409);
    expect(encore.json().message).toBe('Passage impossible : Actif → Actif');
  });

  it('fusion : l\'ancien numéro renvoie vers le bon', async () => {
    const j = await connecterPersonnel('mgagnon');
    expect((await post(j, '/api/registre/fusions', { perdant: N.temporaire, gagnant: N.mj })).statusCode).toBe(204);
    const r = (await get(j, `/api/recherche?q=${N.temporaire}`)).json();
    expect(r.numero).toBe(N.mj);
  });
});

describe('sécurité clinique', () => {
  it('distingue « aucune allergie connue » (constat signé) de « non documenté »', async () => {
    const j = await connecterCitoyen(N.sarah!);
    const a = (await get(j, `/api/personnes/${N.sarah}/donnees/allergies`)).json().valeur;
    expect(a).toMatchObject({ etat: 'aucune_connue', elements: [], verification: { par: 'Sophie Dubé, Infirmière clinicienne' } });
    const k = await connecterCitoyen(N.kevin!);
    expect((await get(k, `/api/personnes/${N.kevin}/donnees/allergies`)).json().valeur).toEqual({ etat: 'non_documente', elements: [], verification: null });
  });

  it('afficher ses droits sur un proche n\'écrit rien au journal', async () => {
    const avant = (await base.requete<{ n: number }>('select count(*)::int as n from journal_acces'))[0]!.n;
    const j = await connecterCitoyen(N.nadia!);
    const droits = (await get(j, `/api/personnes/${N.gisele}/droits`)).json() as { donnee: string; permis: boolean }[];
    expect(droits.find((d) => d.donnee === 'rendezvous')!.permis).toBe(true);
    expect(droits.find((d) => d.donnee === 'medicaments')!.permis).toBe(false);
    const apres = (await base.requete<{ n: number }>('select count(*)::int as n from journal_acces'))[0]!.n;
    expect(apres).toBe(avant);
  });
});

describe('photos', () => {
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

  it('la photo est une donnée d\'identité : servie par la passerelle et inscrite au journal', async () => {
    const [{ cle }] = (await base.requete<{ cle: string }>('select personne_cle as cle from numero_qc where numero = $1', [N.gisele])) as [{ cle: string }];
    await base.requete(`insert into photo (personne_cle, image, type_mime, prise_le, source) values ($1, $2, 'image/png', '2026-10-01', 'point_de_service')`, [cle, PNG]);

    const g = await connecterCitoyen(N.gisele!);
    const r = await get(g, `/api/personnes/${N.gisele}/photo`);
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toBe('image/png');
    expect(r.headers['cache-control']).toContain('no-store');
    expect(Buffer.compare(r.rawPayload, PNG)).toBe(0);
    expect((await get(g, '/api/moi')).json().photoPriseLe).toBe('2026-10-01');

    const k = await connecterCitoyen(N.kevin!);
    expect((await get(k, `/api/personnes/${N.gisele}/photo`)).statusCode).toBe(403);

    const dre = await connecterPersonnel('aouellet');
    expect((await get(dre, `/api/personnes/${N.gisele}/photo`)).statusCode).toBe(200);
    const traces = await base.requete(`select 1 from journal_acces where sujet = $1 and motif = 'Photo' and demandeur_id = 'aouellet'`, [N.gisele]);
    expect(traces.length).toBe(1);

    expect((await get(g, `/api/personnes/${N.sarah}/photo`)).statusCode).toBe(403);
    const [{ cs }] = (await base.requete<{ cs: string }>('select personne_cle as cs from numero_qc where numero = $1', [N.sarah])) as [{ cs: string }];
    await base.requete('delete from photo where personne_cle = $1', [cs]);
    const s = await connecterCitoyen(N.sarah!);
    expect((await get(s, `/api/personnes/${N.sarah}/photo`)).statusCode).toBe(404);
  });

  it('Gisèle voit ses personnes de confiance', async () => {
    const g = await connecterCitoyen(N.gisele!);
    expect((await get(g, '/api/moi')).json().mandataires).toEqual([
      { nom: 'Nadia Tremblay', niveau: 2, niveauNom: 'Organiser', debut: '2025-03-01', fin: '2027-12-31' },
    ]);
  });
});

describe('journal inviolable', () => {
  it('la base refuse toute modification ou suppression', async () => {
    await expect(base.requete(`update journal_acces set decision = 'permis' where no = 1`)).rejects.toThrow(/ni modifié ni effacé/);
    await expect(base.requete('delete from journal_acces where no = 1')).rejects.toThrow(/ni modifié ni effacé/);
  });

  it('la chaîne d\'empreintes est intacte', async () => {
    const v = await verifier(base);
    expect(v.intacte).toBe(true);
    expect(v.total).toBeGreaterThan(20);
  });
});
