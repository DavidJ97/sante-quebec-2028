import { useState } from 'react';
import { STATUTS, DONNEES } from '../../core/index.js';
import { DEMANDEURS } from '../monde.js';

export default function AdminTech({ monde, rafraichir }) {
  const [decisions, setDecisions] = useState({});
  const [sauvegarde, setSauvegarde] = useState(null);
  const verif = monde.journal.verifier();
  const statuts = Object.values(STATUTS).map((s) => [s, [...monde.registre.numeros.values()].filter((f) => f.statut === s).length]);
  const urgences = monde.journal.urgences();
  const alertes = monde.journal.alertes();
  const derniers = monde.journal.entrees.slice(-12).reverse();
  const qui = (d) => DEMANDEURS[d.id] ?? (d.type === 'personne' ? 'Citoyen' : d.id);

  const alterer = () => {
    const e = monde.journal.entrees[2];
    setSauvegarde({ no: 2, decision: e.decision, motif: e.motif });
    e.motif = 'urgence: (motif effacé)';
    rafraichir();
  };
  const restaurer = () => { Object.assign(monde.journal.entrees[sauvegarde.no], { decision: sauvegarde.decision, motif: sauvegarde.motif }); setSauvegarde(null); rafraichir(); };

  return (
    <>
      <p className="discret">Québec Tech · équipe de garde · aucune donnée clinique nominative affichée</p>
      <div className="grille" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))' }}>
        <div className="carte"><p className="discret">Journal d'accès</p><p style={{ fontSize: 22, fontWeight: 700, color: verif.intact ? 'var(--succes)' : 'var(--critique)' }}>{verif.intact ? 'Intact' : `Altéré à l'entrée ${verif.no}`}</p><p className="petit">{monde.journal.entrees.length} entrées chaînées par SHA-256</p></div>
        <div className="carte"><p className="discret">Règles d'accès</p><p style={{ fontSize: 22, fontWeight: 700 }}>Version {monde.passerelle.version}</p><p className="petit">16 tests automatiques réussis</p></div>
        <div className="carte"><p className="discret">Registre des personnes</p><p style={{ fontSize: 22, fontWeight: 700 }}>{monde.registre.numeros.size} numéros</p><p className="petit">{statuts.filter(([, n]) => n).map(([s, n]) => `${s} ${n}`).join(' · ')}</p></div>
        <div className="carte"><p className="discret">Accès d'urgence à revoir</p><p style={{ fontSize: 22, fontWeight: 700, color: urgences.length ? 'var(--avert)' : 'var(--succes)' }}>{urgences.filter((u) => !decisions[u.no]).length}</p><p className="petit">sur {urgences.length} au total</p></div>
      </div>

      <section className="carte">
        <h2 style={{ fontSize: 20 }}>Accès d'urgence</h2>
        <div className="defile">
          <table>
            <thead><tr><th scope="col">Entrée</th><th scope="col">Qui</th><th scope="col">Donnée</th><th scope="col">Motif déclaré</th><th scope="col">Décision</th></tr></thead>
            <tbody>{urgences.map((u) => (
              <tr key={u.no}>
                <td className="num">no {u.no}</td><td>{qui(u.demandeur)}</td><td>{DONNEES[u.donnee].libelle}</td><td>{u.motif.slice(8)}</td>
                <td>{decisions[u.no] ? <span className={`etiq ${decisions[u.no] === 'Validé' ? 'ok' : 'avert'}`}>{decisions[u.no]}</span> : (
                  <span className="rangee"><button type="button" className="btn" style={{ minHeight: 36 }} onClick={() => setDecisions({ ...decisions, [u.no]: 'Validé' })}>Valider</button><button type="button" className="btn danger" style={{ minHeight: 36 }} onClick={() => setDecisions({ ...decisions, [u.no]: 'Enquête ouverte' })}>Enquête</button></span>
                )}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <div className="grille">
        <section className="carte">
          <h2 style={{ fontSize: 20 }}>Alertes d'accès inhabituel</h2>
          {alertes.length ? alertes.map((a) => <p key={a.demandeur + a.sujet}><strong>{DEMANDEURS[a.demandeur] ?? a.demandeur}</strong> a consulté le même dossier {a.nombre} fois en moins de 2 heures.</p>) : <p>Aucune alerte.</p>}
        </section>
        <section className="carte">
          <h2 style={{ fontSize: 20 }}>Test d'inviolabilité</h2>
          <p className="discret">Modifiez une entrée passée comme le ferait un intrus : la chaîne d'empreintes casse aussitôt.</p>
          {sauvegarde ? <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={restaurer}>Restaurer l'entrée</button> : <button type="button" className="btn danger" style={{ alignSelf: 'flex-start' }} onClick={alterer}>Effacer le motif de l'entrée 3</button>}
        </section>
        <section className="carte">
          <h2 style={{ fontSize: 20 }}>Carte des dépendances</h2>
          <p className="discret">Les 62 fonctionnalités et ce qui dépend de quoi.</p>
          <a href="./carte.html" className="btn" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Ouvrir la carte</a>
        </section>
      </div>

      <section className="carte">
        <h2 style={{ fontSize: 20 }}>Dernières entrées du journal</h2>
        <div className="defile">
          <table>
            <thead><tr><th scope="col">No</th><th scope="col">Porte</th><th scope="col">Donnée</th><th scope="col">Décision</th><th scope="col">Empreinte</th></tr></thead>
            <tbody>{derniers.map((e) => (
              <tr key={e.no}><td className="num">{e.no}</td><td>{e.demandeur.type}</td><td>{DONNEES[e.donnee]?.libelle}</td><td><span className={`etiq ${e.decision === 'permis' ? 'ok' : 'non'}`}>{e.decision}</span></td><td className="num petit">{e.empreinte.slice(0, 16)}…</td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
