import { useMemo, useState } from 'react';
import { liensLisibles, age, NIVEAUX_PROCURATION, DONNEES } from '../../core/index.js';
import { lire, nomComplet, DEMANDEURS, AUJOURDHUI } from '../monde.js';

const PERSONAS = [
  { cle: 'gisele', etiquette: 'Gisèle, 87 ans' },
  { cle: 'nadia', etiquette: 'Nadia, sa fille' },
  { cle: 'sarah', etiquette: 'Sarah, enceinte' },
  { cle: 'marc', etiquette: 'Marc, père de Léo' },
];

const jour = (iso) => new Date(iso).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
const heure = (iso) => new Date(iso).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ');

function Icone({ d }) {
  return <svg className="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}
const I = {
  cal: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  pil: 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM8.5 8.5l7 7',
  aide: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  oeil: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  fam: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21v-2a6 6 0 0 1 12 0v2M17 11a3 3 0 1 0 0-6M21 21v-2a5 5 0 0 0-3-4.6',
  bebe: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 12h.01M15 12h.01M10 15.5a3 3 0 0 0 4 0M12 5V3',
  main: 'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z',
};

export default function Patient({ monde, rafraichir }) {
  const [qui, setQui] = useState('gisele');
  const [ecran, setEcran] = useState({ nom: 'accueil' });
  const moi = monde.p[qui];
  const demandeur = { type: 'personne', numero: moi };
  const pers = monde.registre.personne(moi);
  const aller = (nom, extra = {}) => setEcran({ nom, ...extra });

  const props = { monde, rafraichir, moi, demandeur, aller };
  let contenu;
  switch (ecran.nom) {
    case 'rdv': contenu = <RendezVous {...props} sujet={ecran.sujet ?? moi} />; break;
    case 'medics': contenu = <Medicaments {...props} />; break;
    case 'aide': contenu = <Aide {...props} />; break;
    case 'journal': contenu = <Journal {...props} />; break;
    case 'famille': contenu = <Famille {...props} />; break;
    case 'grossesse': contenu = <Grossesse {...props} />; break;
    case 'proche': contenu = <Proche {...props} sujet={ecran.sujet} />; break;
    default: contenu = <Accueil {...props} pers={pers} />;
  }

  return (
    <div className="telephone">
      <div className="choix-personne" role="group" aria-label="Voir l'application comme">
        {PERSONAS.map((p) => (
          <button key={p.cle} type="button" className={`btn ${qui === p.cle ? 'plein' : 'neutre'}`} style={{ minHeight: 40 }} aria-pressed={qui === p.cle}
            onClick={() => { setQui(p.cle); setEcran({ nom: 'accueil' }); }}>{p.etiquette}</button>
        ))}
      </div>
      {ecran.nom !== 'accueil' && <button type="button" className="retour" onClick={() => aller('accueil')}>← Retour à l'accueil</button>}
      {contenu}
    </div>
  );
}

function Accueil({ monde, moi, demandeur, aller, pers }) {
  const rdv = lire(monde, demandeur, moi, 'rendezvous').valeur ?? [];
  const aConfirmer = rdv.filter((r) => r.statut === 'proposé').length;
  const prochain = rdv.filter((r) => r.statut === 'confirmé').sort((a, b) => a.quand.localeCompare(b.quand))[0];
  const mandats = monde.passerelle.procurations.filter((p) => p.mandataire === moi && p.actif);
  const enfants = [...monde.registre.personnes.values()].filter((x) => x.parents?.includes(moi) && x.dateNaissance && age(x.dateNaissance, AUJOURDHUI) < 18);
  const bebe = [...monde.registre.personnes.values()].find((x) => x.parentsGestionnaires?.includes(moi) && monde.registre.fiche(x.numero).statut === 'Réservé');

  return (
    <>
      <div className="carte" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <div aria-hidden="true" style={{ width: 60, height: 60, borderRadius: 12, background: 'var(--accent-doux)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 22 }}>{pers.prenom[0]}{pers.nom[0]}</div>
        <div>
          <h1 style={{ fontSize: 28 }}>Bonjour {pers.prenom}</h1>
          <p className="discret num">{monde.formater(moi)}</p>
        </div>
      </div>
      {prochain && (
        <div className="carte">
          <p className="discret">Votre prochain rendez-vous</p>
          <p style={{ fontSize: 20, fontWeight: 700 }}>{prochain.quoi}</p>
          <p>{jour(prochain.quand)}, {heure(prochain.quand)} · {prochain.ou}</p>
        </div>
      )}
      <button type="button" className="gros" onClick={() => aller('rdv')}><Icone d={I.cal} /><span>Mes rendez-vous<small>{aConfirmer ? `${aConfirmer} à confirmer` : 'Tout est confirmé'}</small></span></button>
      <button type="button" className="gros" onClick={() => aller('medics')}><Icone d={I.pil} /><span>Mes médicaments<small>Quoi prendre et quand</small></span></button>
      {bebe && <button type="button" className="gros" onClick={() => aller('grossesse')}><Icone d={I.bebe} /><span>Le profil de votre bébé<small>Choix à faire avant la naissance</small></span></button>}
      {mandats.map((m) => (
        <button key={m.mandant} type="button" className="gros" onClick={() => aller('proche', { sujet: m.mandant })}><Icone d={I.main} /><span>Je m'occupe de {nomComplet(monde, m.mandant)}<small>Procuration : {NIVEAUX_PROCURATION[m.niveau].nom}</small></span></button>
      ))}
      {enfants.map((e) => (
        <button key={e.numero} type="button" className="gros" onClick={() => aller('proche', { sujet: e.numero })}><Icone d={I.main} /><span>Mon enfant : {e.prenom}<small>{age(e.dateNaissance, AUJOURDHUI)} ans</small></span></button>
      ))}
      <button type="button" className="gros aide" onClick={() => aller('aide')}><Icone d={I.aide} /><span>Aidez-moi<small>Joindre un proche ou une infirmière</small></span></button>
      <div className="grille" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <button type="button" className="gros" style={{ fontSize: 18, minHeight: 72 }} onClick={() => aller('journal')}><Icone d={I.oeil} />Qui a vu mon dossier</button>
        <button type="button" className="gros" style={{ fontSize: 18, minHeight: 72 }} onClick={() => aller('famille')}><Icone d={I.fam} />Ma famille</button>
      </div>
    </>
  );
}

function RendezVous({ monde, rafraichir, demandeur, sujet }) {
  const [change, setChange] = useState(null);
  const r = lire(monde, demandeur, sujet, 'rendezvous');
  if (!r.permis) return <Refus raison={r.raison} />;
  const liste = [...r.valeur].sort((a, b) => a.quand.localeCompare(b.quand));
  const ecrire = (fn) => {
    const v = monde.passerelle.decider({ demandeur, sujet, donnee: 'rendezvous', action: 'ecrire' });
    if (v.permis) { fn(); rafraichir(); }
  };
  const autres = (rdv) => [2, 3, 6].map((j) => { const d = new Date(rdv.quand); d.setDate(d.getDate() + j); return d.toISOString().slice(0, 16); });

  return (
    <>
      <h1 style={{ fontSize: 28 }}>{sujet === demandeur.numero ? 'Mes rendez-vous' : `Rendez-vous de ${nomComplet(monde, sujet)}`}</h1>
      {liste.map((rdv) => (
        <div key={rdv.id} className="carte" style={rdv.statut === 'proposé' ? { borderColor: 'var(--accent)', borderWidth: 2 } : undefined}>
          <span className={`etiq ${rdv.statut === 'confirmé' ? 'ok' : 'avert'}`} style={{ alignSelf: 'flex-start' }}>{rdv.statut === 'confirmé' ? 'Confirmé' : 'À confirmer'}</span>
          <h2 style={{ fontSize: 22 }}>{rdv.quoi}</h2>
          <p style={{ fontSize: 19 }}>{jour(rdv.quand)}<br />{heure(rdv.quand)}</p>
          <p>{rdv.ou}<br /><span className="discret">{rdv.adresse}</span></p>
          {rdv.note && <p className="discret">{rdv.note}</p>}
          {change === rdv.id ? (
            <div className="champ">
              <p style={{ fontWeight: 700 }}>Choisissez une autre plage</p>
              {autres(rdv).map((q) => (
                <button key={q} type="button" className="btn neutre" onClick={() => ecrire(() => { rdv.quand = q; rdv.statut = 'confirmé'; setChange(null); })}>{jour(q)}, {heure(q)}</button>
              ))}
            </div>
          ) : (
            <div className="rangee">
              {rdv.statut === 'proposé' && <button type="button" className="btn plein" onClick={() => ecrire(() => { rdv.statut = 'confirmé'; })}>Oui, j'y serai</button>}
              <button type="button" className="btn" onClick={() => setChange(rdv.id)}>Changer</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function Medicaments({ monde, demandeur, moi }) {
  const r = lire(monde, demandeur, moi, 'medicaments');
  if (!r.permis) return <Refus raison={r.raison} />;
  const moments = ['Matin', 'Midi', 'Soir', 'Coucher'];
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Mes médicaments</h1>
      {moments.map((m) => {
        const liste = (r.valeur ?? []).filter((x) => x.moments?.includes(m));
        if (!liste.length) return null;
        return (
          <div key={m} className="carte">
            <h2 style={{ fontSize: 22 }}>{m}</h2>
            {liste.map((x) => <p key={x.nom} style={{ fontSize: 19 }}><strong>{x.nom}</strong>{x.note && <span className="etiq avert" style={{ marginLeft: 8 }}>{x.note}</span>}</p>)}
          </div>
        );
      })}
      <p className="discret">Source : Dossier santé Québec. Une question ? Votre pharmacien peut vous répondre.</p>
    </>
  );
}

function Aide({ monde, moi }) {
  const proches = monde.passerelle.procurations.filter((p) => p.mandant === moi && p.actif).map((p) => monde.registre.personne(p.mandataire));
  const [appel, setAppel] = useState(null);
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Aidez-moi</h1>
      {proches.map((p) => (
        <button key={p.numero} type="button" className="gros aide" onClick={() => setAppel(p)}><Icone d={I.aide} /><span>Appeler {p.prenom}<small>{p.telephone}</small></span></button>
      ))}
      <button type="button" className="gros" onClick={() => setAppel({ prenom: 'une infirmière d\'Info-Santé', telephone: '811' })}><Icone d={I.aide} /><span>Parler à une infirmière<small>811, jour et nuit</small></span></button>
      {appel && (
        <div className="carte" role="status">
          <p style={{ fontSize: 20, fontWeight: 700 }}>Appel de {appel.prenom}</p>
          <p className="num" style={{ fontSize: 26 }}>{appel.telephone}</p>
          <p className="discret">Dans la vraie application, l'appel partirait ici. {appel.telephone !== '811' && `${appel.prenom} reçoit aussi un avis.`}</p>
        </div>
      )}
    </>
  );
}

function Journal({ monde, moi }) {
  const [signales, setSignales] = useState(new Set());
  const entrees = monde.journal.pourSujet(moi).filter((e) => e.decision === 'permis' && e.demandeur.id !== moi).reverse();
  const qui = (e) => (e.demandeur.type === 'personne' ? nomComplet(monde, e.demandeur.id) : DEMANDEURS[e.demandeur.id] ?? e.demandeur.role ?? e.demandeur.id);
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Qui a vu mon dossier</h1>
      <p className="discret">Chaque consultation est inscrite. Personne ne peut l'effacer.</p>
      {!entrees.length && <p>Personne d'autre n'a consulté votre dossier.</p>}
      {entrees.map((e) => (
        <div key={e.no} className="carte" style={e.urgence ? { borderColor: 'var(--avert)', borderWidth: 2 } : undefined}>
          <p style={{ fontSize: 19, fontWeight: 700 }}>{qui(e)}</p>
          <p>A consulté : {DONNEES[e.donnee]?.libelle.toLowerCase()} · {jour(e.le)}, {heure(e.le)}</p>
          {e.urgence && <p><span className="etiq avert">Accès d'urgence</span> {e.motif.slice(8)}</p>}
          {signales.has(e.no)
            ? <p className="etiq ok" style={{ alignSelf: 'flex-start' }}>Signalé à Québec Tech</p>
            : <button type="button" className="btn neutre" style={{ alignSelf: 'flex-start' }} onClick={() => setSignales(new Set([...signales, e.no]))}>Je ne reconnais pas cet accès</button>}
        </div>
      ))}
    </>
  );
}

function Famille({ monde, moi }) {
  const l = liensLisibles(monde.registre, moi);
  const groupes = [['parents', 'Parents'], ['enfants', 'Enfants'], ['fratrie', 'Frères et sœurs'], ['grandsParents', 'Grands-parents'], ['petitsEnfants', 'Petits-enfants'], ['onclesTantes', 'Oncles et tantes'], ['cousins', 'Cousins et cousines']];
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Ma famille</h1>
      <p className="discret">Seul le lien parent-enfant est inscrit. Les autres liens sont calculés. Vous ne voyez pas le dossier de vos proches sans leur permission.</p>
      {groupes.filter(([k]) => l[k].length).map(([k, t]) => (
        <div key={k} className="carte">
          <h2 style={{ fontSize: 20 }}>{t}</h2>
          {l[k].map((x) => <p key={x.numero} style={{ fontSize: 18 }}>{x.nom}</p>)}
        </div>
      ))}
    </>
  );
}

function Grossesse({ monde, rafraichir, moi, demandeur }) {
  const bebe = [...monde.registre.personnes.values()].find((x) => x.parentsGestionnaires?.includes(moi));
  if (!bebe) return <p>Aucun profil de bébé.</p>;
  const fiche = monde.registre.fiche(bebe.numero);
  const g = lire(monde, demandeur, moi, 'grossesse').valeur;
  const choix = monde.dossiers[bebe.numero].choixPrenataux;
  const choisir = (cle, val) => {
    const v = monde.passerelle.decider({ demandeur, sujet: bebe.numero, donnee: 'vaccins', action: 'ecrire', motif: `Choix prénatal : ${cle}` });
    if (v.permis) { choix[cle] = val; rafraichir(); }
  };
  const optionsVRS = [
    ['mere', 'Un vaccin pour moi pendant la grossesse', 'Un rendez-vous vous sera proposé entre 32 et 36 semaines'],
    ['bebe', 'Un anticorps pour le bébé à la naissance', 'Une dose sera réservée à l\'hôpital'],
    ['non', 'Je ne le souhaite pas', ''],
  ];
  const autres = [['vitamineK', 'Vitamine K à la naissance'], ['onguent', 'Onguent pour les yeux']];
  return (
    <>
      <p className="discret">Grossesse · {g?.semaines} semaines</p>
      <h1 style={{ fontSize: 28 }}>Le profil de votre bébé</h1>
      <div className="carte">
        <p style={{ fontSize: 20, fontWeight: 700 }}>Bébé {monde.registre.personne(moi).nom}</p>
        <p>Arrivée prévue vers le {new Date(bebe.dateprevue + 'T12:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })} · {g?.hopital}</p>
        <p className="discret">Numéro réservé : <strong className="num" style={{ color: 'var(--encre)' }}>{monde.formater(bebe.numero)}</strong> · {fiche.statut}</p>
        {bebe.parents.map((p) => <p key={p}>✓ {nomComplet(monde, p)}{p === moi ? ', vous' : ''}</p>)}
        {bebe.parents.length < 2 && <p className="discret">Le second parent sera ajouté selon la déclaration de naissance à l'État civil.</p>}
      </div>
      <div className="carte">
        <h2 style={{ fontSize: 21 }}>Protection contre le VRS</h2>
        {optionsVRS.map(([v, t, s]) => (
          <button key={v} type="button" className="btn neutre" aria-pressed={choix.vrs === v}
            style={{ minHeight: 60, textAlign: 'left', padding: '8px 14px', borderWidth: 2, borderColor: choix.vrs === v ? 'var(--accent)' : 'var(--bordure)', background: choix.vrs === v ? 'var(--accent-doux)' : 'var(--surface)' }}
            onClick={() => choisir('vrs', v)}>
            <strong>{choix.vrs === v ? '● ' : '○ '}{t}</strong>{s && <><br /><span className="discret">{s}</span></>}
          </button>
        ))}
      </div>
      <div className="carte">
        <h2 style={{ fontSize: 21 }}>Aussi à choisir avant la naissance</h2>
        {autres.map(([k, t]) => (
          <div key={k} className="rangee" style={{ justifyContent: 'space-between' }}>
            <span>{t}</span>
            <span className="rangee">
              <button type="button" className={`btn ${choix[k] === true ? 'plein' : 'neutre'}`} style={{ minHeight: 40 }} onClick={() => choisir(k, true)}>Oui</button>
              <button type="button" className={`btn ${choix[k] === false ? 'plein' : 'neutre'}`} style={{ minHeight: 40 }} onClick={() => choisir(k, false)}>Non</button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function Proche({ monde, demandeur, sujet, aller }) {
  const elements = ['rendezvous', 'coordonnees', 'medicaments', 'allergies', 'vaccins', 'santeSexuelle'];
  const verdicts = useMemo(() => elements.map((d) => ({ d, ...lire(monde, demandeur, sujet, d) })), [sujet, demandeur.numero]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <h1 style={{ fontSize: 28 }}>{nomComplet(monde, sujet)}</h1>
      <p className="discret">Ce que la passerelle vous laisse voir, et pourquoi.</p>
      {verdicts.filter((v) => monde.dossiers[monde.registre.resoudre(sujet).fiche.numero]?.[v.d] !== undefined || v.d === 'coordonnees').map((v) => (
        <div key={v.d} className="carte">
          <div className="rangee" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 20 }}>{DONNEES[v.d].libelle}</h2>
            <span className={`etiq ${v.permis ? 'ok' : 'non'}`}>{v.permis ? 'Permis' : 'Refusé'}</span>
          </div>
          <p className="discret">{v.raison}</p>
          {v.permis && v.d === 'rendezvous' && <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => aller('rdv', { sujet })}>Gérer les rendez-vous</button>}
          {v.permis && v.d === 'coordonnees' && <p>{monde.registre.personne(sujet).ville} · {monde.registre.personne(sujet).telephone ?? '—'}</p>}
          {v.permis && Array.isArray(v.valeur) && v.d !== 'rendezvous' && v.valeur.map((x, i) => <p key={i}>{x.nom ?? x.substance ?? x.note}</p>)}
        </div>
      ))}
    </>
  );
}

function Refus({ raison }) {
  return <div className="carte"><span className="etiq non" style={{ alignSelf: 'flex-start' }}>Refusé</span><p>{raison}</p></div>;
}
