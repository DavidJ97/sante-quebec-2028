import { useMemo, useState } from 'react';
import { diagnostiquer, estValide, age } from '../../core/index.js';
import { lire, nomComplet, AUJOURDHUI } from '../monde.js';

const SOIGNANTS = [
  { id: 'dre-ouellet', role: 'Médecin, urgence', nom: 'Dre A. Ouellet · Urgence' },
  { id: 'dr-roy', role: 'Médecin de famille', nom: 'Dr Roy · Médecin de famille' },
];

export default function Clinique({ monde, rafraichir }) {
  const [soignant, setSoignant] = useState(SOIGNANTS[0]);
  const [saisie, setSaisie] = useState('QC 4829 1357 066');
  const [sujet, setSujet] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [motif, setMotif] = useState('');
  const [urgence, setUrgence] = useState(null);

  const chercher = (e) => {
    e.preventDefault();
    setUrgence(null); setMotif('');
    const pareilNAM = /^[A-Za-z]{4}/.test(saisie.trim()) && !/^qc/i.test(saisie.trim());
    if (!pareilNAM && !estValide(saisie)) { setErreur(diagnostiquer(saisie)); setSujet(null); return; }
    const r = monde.registre.chercher(saisie);
    if (!r) { setErreur('Aucune personne trouvée.'); setSujet(null); return; }
    setErreur(null); setSujet(r.fiche.numero);
  };

  const demandeur = { type: 'clinicien', id: soignant.id, role: soignant.role };

  return (
    <>
      <div className="carte">
        <form className="rangee" onSubmit={chercher} style={{ alignItems: 'flex-end' }}>
          <div className="champ" style={{ flex: '1 1 260px' }}>
            <label htmlFor="rech">Numéro QC ou NAM</label>
            <input id="rech" value={saisie} onChange={(e) => setSaisie(e.target.value)} inputMode="text" autoComplete="off" aria-describedby="rech-err" />
          </div>
          <div className="champ" style={{ flex: '1 1 220px' }}>
            <label htmlFor="qui">Connecté comme</label>
            <select id="qui" value={soignant.id} onChange={(e) => { setSoignant(SOIGNANTS.find((s) => s.id === e.target.value)); setUrgence(null); }}>
              {SOIGNANTS.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
          <button type="submit" className="btn plein">Ouvrir le dossier</button>
        </form>
        <p id="rech-err" className="erreur" role="alert">{erreur}</p>
        <p className="discret petit">Essayez : QC 4829 1357 066 · TREG 3955 0211 (NAM) · QC 4829 1357 060 (faute de frappe) · QC 9047 3528 165 (fiche fusionnée plus tard)</p>
      </div>
      {sujet && <Fiche key={`${sujet}-${soignant.id}`} {...{ monde, rafraichir, sujet, demandeur, motif, setMotif, urgence, setUrgence }} />}
    </>
  );
}

function Fiche({ monde, rafraichir, sujet, demandeur, motif, setMotif, urgence, setUrgence }) {
  const motifEff = urgence ? `urgence: ${urgence}` : '';
  const pers = monde.registre.personne(sujet);
  const fiche = monde.registre.fiche(sujet);
  // Une seule lecture par ouverture du dossier : les re-rendus n'écrivent pas de nouvelles entrées au journal
  const lu = useMemo(() => {
    const essai = lire(monde, demandeur, sujet, 'allergies', motifEff);
    if (!essai.permis) return { essai };
    const L = (d) => lire(monde, demandeur, sujet, d, motifEff).valeur;
    return { essai, medicaments: L('medicaments') ?? [], adaptation: L('adaptation') ?? [], maladies: L('maladies') ?? [], volontes: L('volontes') };
  }, [sujet, demandeur.id, motifEff]); // eslint-disable-line react-hooks/exhaustive-deps
  const { essai } = lu;

  const entete = (
    <section className="carte" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18 }}>
      <div aria-hidden="true" style={{ width: 72, height: 72, borderRadius: 12, background: 'var(--accent-doux)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 24, color: 'var(--secondaire)' }}>{(pers.prenom ?? '?')[0]}{(pers.nom ?? '?')[0]}</div>
      <div style={{ flex: '1 1 260px' }}>
        <h1 style={{ fontSize: 26 }}>{nomComplet(monde, sujet)}</h1>
        <p><span>{pers.dateNaissance ? `${age(pers.dateNaissance, AUJOURDHUI)} ans` : '—'}</span> · <span className="num">{monde.formater(sujet)}</span> · Statut : {fiche.statut}</p>
      </div>
      {essai.permis && <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className={`etiq ${essai.urgence ? 'avert' : 'ok'}`}>{essai.raison}</span>
        <span className="discret petit">Cette consultation est inscrite au journal du patient</span>
      </div>}
    </section>
  );

  if (!essai.permis) {
    return (
      <>
        {entete}
        <section className="carte" style={{ maxWidth: 720 }}>
          <span className="etiq non" style={{ alignSelf: 'flex-start' }}>Accès refusé</span>
          <p>{essai.raison}.</p>
          <p className="discret">Si la personne est devant vous et ne peut pas consentir, ouvrez un accès d'urgence. Il est temporaire, la personne le verra et Québec Tech le revoit.</p>
          <div className="champ">
            <label htmlFor="motif">Motif de l'accès d'urgence (au moins 10 caractères)</label>
            <textarea id="motif" rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} />
          </div>
          <div className="rangee">
            <button type="button" className="btn danger" disabled={motif.trim().length < 10} onClick={() => { setUrgence(motif.trim()); rafraichir(); }}>Ouvrir l'accès d'urgence</button>
          </div>
        </section>
      </>
    );
  }

  const allergies = essai.valeur ?? [];
  const { medicaments, adaptation, maladies, volontes } = lu;
  const proches = monde.passerelle.procurations.filter((p) => p.mandant === sujet && p.actif);

  return (
    <>
      {entete}
      <h2 style={{ fontSize: 18, color: 'var(--secondaire)' }}>Niveau 1 · à voir avant tout soin</h2>
      <div className="grille">
        <section className={`carte ${allergies.some((a) => a.grave) ? 'critique' : ''}`}>
          <h3 style={{ fontSize: 19 }}>Allergies</h3>
          {allergies.length ? allergies.map((a) => <p key={a.substance}><strong>{a.substance}</strong> · {a.reaction} · {a.certitude}</p>) : <p>Aucune allergie connue</p>}
        </section>
        <section className="carte">
          <h3 style={{ fontSize: 19 }}>Médicaments actifs</h3>
          {medicaments.length ? medicaments.map((m) => <p key={m.nom}><strong>{m.nom}</strong> · {m.posologie}{m.note && <> · <span style={{ color: 'var(--avert)', fontWeight: 700 }}>{m.note}</span></>}</p>) : <p>Aucun</p>}
          <p className="discret petit">Source : Dossier santé Québec</p>
        </section>
        <section className="carte">
          <h3 style={{ fontSize: 19 }}>Besoins d'adaptation</h3>
          {adaptation.length ? adaptation.map((a) => <p key={a.titre}><strong>{a.titre}</strong> · {a.detail}</p>) : <p>Aucun inscrit</p>}
        </section>
        <section className="carte">
          <h3 style={{ fontSize: 19 }}>Maladies et dispositifs à risque</h3>
          {maladies.length ? maladies.map((m) => <p key={m}>{m}</p>) : <p>Aucun inscrit</p>}
        </section>
        <section className="carte">
          <h3 style={{ fontSize: 19 }}>Volontés</h3>
          {volontes ? <><p>Niveau de soins : <strong>{volontes.niveauSoins}</strong></p><p>Directives médicales anticipées : <strong>{volontes.directives}</strong></p></> : <p>Aucune inscrite</p>}
        </section>
        <section className="carte">
          <h3 style={{ fontSize: 19 }}>Proche à joindre</h3>
          {proches.length ? proches.map((p) => {
            const m = monde.registre.personne(p.mandataire);
            return <p key={p.mandataire}><strong>{m.prenom} {m.nom}</strong> · {m.telephone}<br /><span className="discret">Procuration niveau {p.niveau} jusqu'au {p.fin}</span></p>;
          }) : <p>Aucun</p>}
        </section>
      </div>
    </>
  );
}
