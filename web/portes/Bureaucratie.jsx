import { useState } from 'react';
import { STATUTS, NIVEAUX_PROCURATION } from '../../core/index.js';
import { nomComplet } from '../monde.js';

const AGENT = { type: 'bureaucratie', id: 'agent-gagnon', role: 'Agent du registre' };

export default function Bureaucratie({ monde, rafraichir }) {
  const [vue, setVue] = useState('naissances');
  const reserves = [...monde.registre.numeros.values()].filter((f) => f.statut === STATUTS.RESERVE);
  const temporaires = [...monde.registre.numeros.values()].filter((f) => f.statut === STATUTS.TEMPORAIRE);
  const files = [
    ['naissances', 'Naissances à confirmer', reserves.length],
    ['appariements', 'Appariements incertains', temporaires.length],
    ['procurations', 'Procurations inscrites', monde.passerelle.procurations.filter((p) => p.actif).length],
    ['limites', 'Ce que je ne vois pas', null],
  ];
  return (
    <div className="colonnes">
      <nav className="file carte" aria-label="File de travail">
        <p className="discret" style={{ fontWeight: 700 }}>M. Gagnon · Registre des personnes</p>
        {files.map(([id, t, n]) => (
          <button key={id} type="button" aria-current={vue === id} onClick={() => setVue(id)}>{t}{n !== null && <strong>{n}</strong>}</button>
        ))}
      </nav>
      <div style={{ flex: '999 1 560px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {vue === 'naissances' && <Naissances {...{ monde, rafraichir, reserves }} />}
        {vue === 'appariements' && <Appariements {...{ monde, rafraichir, temporaires }} />}
        {vue === 'procurations' && <Procurations monde={monde} />}
        {vue === 'limites' && <Limites monde={monde} />}
      </div>
    </div>
  );
}

function Naissances({ monde, rafraichir, reserves }) {
  const [form, setForm] = useState({ prenom: 'Maëlle', dateNaissance: '2027-01-07', sexe: 'F', lieu: 'CHU Sainte-Justine', secondParent: true });
  const [fait, setFait] = useState(null);
  if (fait) return <div className="carte" role="status"><span className="etiq ok" style={{ alignSelf: 'flex-start' }}>Naissance confirmée</span><p style={{ fontSize: 20 }}><strong>{fait.nom}</strong> est couverte dès maintenant.</p><p className="num">{monde.formater(fait.numero)} · statut Actif</p><p className="discret">Son carnet vaccinal reprend les choix faits pendant la grossesse.</p></div>;
  if (!reserves.length) return <p>Aucune naissance en attente.</p>;
  const f = reserves[0];
  const b = monde.registre.personnes.get(f.cle);
  const mere = monde.registre.personne(b.parents[0]);
  const kevin = monde.p.kevin;
  const confirmer = (e) => {
    e.preventDefault();
    if (form.secondParent && !b.parents.includes(kevin)) monde.registre.ajouterParent(f.numero, kevin);
    const nom = b.parents.length > 1 ? `${mere.nom} ${monde.registre.personne(kevin).nom}` : mere.nom;
    monde.registre.activer(f.numero, { prenom: form.prenom, nom, dateNaissance: form.dateNaissance, sexe: form.sexe, lieu: form.lieu });
    monde.passerelle.decider({ demandeur: AGENT, sujet: f.numero, donnee: 'identite', action: 'ecrire', motif: 'Déclaration de naissance' });
    setFait({ numero: f.numero, nom: `${form.prenom} ${nom}` }); rafraichir();
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <form className="carte" onSubmit={confirmer}>
      <h1 style={{ fontSize: 24 }}>Naissance à confirmer</h1>
      <p>Numéro réservé <strong className="num">{monde.formater(f.numero)}</strong> · mère : {mere.prenom} {mere.nom} · naissance prévue le {b.dateprevue}</p>
      <p className="discret">Avis de naissance reçu de l'hôpital. Objectif : couvert en moins de 48 heures.</p>
      <div className="grille">
        <div className="champ"><label htmlFor="p">Prénom</label><input id="p" value={form.prenom} onChange={set('prenom')} required /></div>
        <div className="champ"><label htmlFor="d">Date de naissance</label><input id="d" type="date" value={form.dateNaissance} onChange={set('dateNaissance')} required /></div>
        <div className="champ"><label htmlFor="s">Sexe à la naissance</label><select id="s" value={form.sexe} onChange={set('sexe')}><option value="F">Féminin</option><option value="M">Masculin</option><option value="X">Indéterminé</option></select></div>
        <div className="champ"><label htmlFor="l">Lieu</label><input id="l" value={form.lieu} onChange={set('lieu')} /></div>
      </div>
      <label className="rangee"><input type="checkbox" checked={form.secondParent} onChange={set('secondParent')} style={{ width: 22, height: 22 }} /> Déclaration de l'État civil reçue : second parent {nomComplet(monde, kevin)}</label>
      <div className="rangee"><button type="submit" className="btn plein">Confirmer la naissance</button></div>
    </form>
  );
}

function Appariements({ monde, rafraichir, temporaires }) {
  const [resultat, setResultat] = useState(null);
  if (resultat) return <div className="carte" role="status"><span className="etiq ok" style={{ alignSelf: 'flex-start' }}>{resultat}</span><p className="discret">Rien n'est supprimé : l'ancien numéro renvoie maintenant vers le bon.</p></div>;
  if (!temporaires.length) return <p>Aucun appariement en attente.</p>;
  const t = temporaires[0];
  const B = monde.registre.personnes.get(t.cle);
  const A = monde.registre.personne(monde.p.mj);
  const lignes = [['Nom', `${A.prenom} ${A.nom}`, `${B.prenom} ${B.nom}`, false], ['Date de naissance', A.dateNaissance, B.dateNaissance], ['Lieu de naissance', A.lieuNaissance, 'Non inscrit', true], ['Sexe à la naissance', A.sexe, B.sexe], ['Adresse', A.ville, B.ville, true], ['Numéro QC', monde.formater(A.numero), monde.formater(t.numero)]];
  return (
    <>
      <div><h1 style={{ fontSize: 24 }}>Appariement incertain</h1><p className="discret">Deux fiches pourraient être la même personne. Comparez, puis décidez.</p></div>
      <div className="carte defile" style={{ padding: 0 }}>
        <table>
          <thead><tr><th scope="col">Champ</th><th scope="col">Fiche A · RAMQ</th><th scope="col">Fiche B · {B.source}</th></tr></thead>
          <tbody>{lignes.map(([c, a, b, diff]) => <tr key={c} className={diff ? 'diff' : ''}><th scope="row" style={{ fontWeight: 400 }}>{c}</th><td>{a}</td><td>{b}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="rangee">
        <button type="button" className="btn plein" onClick={() => { monde.registre.fusionner(t.numero, A.numero); monde.passerelle.decider({ demandeur: AGENT, sujet: A.numero, donnee: 'identite', action: 'ecrire', motif: 'Fusion de fiches' }); setResultat(`Fusionné : ${monde.formater(t.numero)} renvoie vers ${monde.formater(A.numero)}`); rafraichir(); }}>Même personne : fusionner</button>
        <button type="button" className="btn" onClick={() => setResultat('Gardées séparées')}>Personnes différentes</button>
      </div>
    </>
  );
}

function Procurations({ monde }) {
  return (
    <div className="carte defile" style={{ padding: 0 }}>
      <table>
        <thead><tr><th scope="col">Personne</th><th scope="col">Mandataire</th><th scope="col">Niveau</th><th scope="col">Fin</th></tr></thead>
        <tbody>{monde.passerelle.procurations.map((p, i) => (
          <tr key={i}><td>{nomComplet(monde, p.mandant)}</td><td>{nomComplet(monde, p.mandataire)}</td><td>{p.niveau} · {NIVEAUX_PROCURATION[p.niveau].nom}</td><td>{p.fin ?? '—'}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Limites({ monde }) {
  const [res, setRes] = useState(null);
  const essayer = (donnee) => setRes({ donnee, ...monde.passerelle.decider({ demandeur: AGENT, sujet: monde.p.gisele, donnee }) });
  return (
    <div className="carte">
      <h1 style={{ fontSize: 22 }}>La bureaucratie ne voit pas le contenu clinique</h1>
      <p>Essayez d'ouvrir une donnée du dossier de {nomComplet(monde, monde.p.gisele)} :</p>
      <div className="rangee">
        {['coordonnees', 'rendezvous', 'allergies', 'medicaments'].map((d) => <button key={d} type="button" className="btn neutre" onClick={() => essayer(d)}>{d === 'coordonnees' ? 'Coordonnées' : d === 'rendezvous' ? 'Rendez-vous' : d === 'allergies' ? 'Allergies' : 'Médicaments'}</button>)}
      </div>
      {res && <p role="status"><span className={`etiq ${res.permis ? 'ok' : 'non'}`}>{res.permis ? 'Permis' : 'Refusé'}</span> {res.raison}</p>}
    </div>
  );
}
