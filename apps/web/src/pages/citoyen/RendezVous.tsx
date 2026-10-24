import { useState } from 'react';
import { api, ErreurApi, type RendezVous as Rdv, type Reponse } from '../../api';
import { Charge, useRequete } from '../../composants/Requete';
import { heure, jour, majuscule } from '../../format';
import { Retour, TitrePage, useCible } from './commun';

export default function RendezVous() {
  const c = useCible();
  const [etat, recharger] = useRequete(() => api.get<Reponse<Rdv[]>>(`/personnes/${c.numero}/donnees/rendezvous`), [c.numero]);
  return (
    <main className="page etroite" id="contenu">
      <Retour vers={c.estMoi ? '/' : `/pour/${c.numero}`} texte={c.estMoi ? 'Accueil' : c.nom} />
      <TitrePage {...c} moi="Mes rendez-vous" autre="Rendez-vous" />
      <Charge etat={etat} recharger={recharger}>
        {(r) => r.valeur.length === 0
          ? <p className="carte">Aucun rendez-vous prévu.</p>
          : <div className="pile">{r.valeur.map((x) => <CarteRdv key={x.id} rdv={x} apres={recharger} />)}</div>}
      </Charge>
    </main>
  );
}

function CarteRdv({ rdv, apres }: { rdv: Rdv; apres: () => void }) {
  const [plages, setPlages] = useState<string[] | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const agir = async (f: () => Promise<unknown>) => {
    setOccupe(true); setErreur(null);
    try { await f(); setPlages(null); apres(); } catch (e) { setErreur(e instanceof ErreurApi ? e.message : 'Une erreur est survenue.'); } finally { setOccupe(false); }
  };
  const ouvrirPlages = async () => {
    setOccupe(true); setErreur(null);
    try { setPlages(await api.get<string[]>(`/rendez-vous/${rdv.id}/plages`)); } catch (e) { setErreur(e instanceof ErreurApi ? e.message : 'Une erreur est survenue.'); } finally { setOccupe(false); }
  };
  const propose = rdv.statut === 'propose';

  return (
    <article className="carte" style={propose ? { borderColor: 'var(--accent)', borderWidth: 2 } : undefined} aria-labelledby={`rdv-${rdv.id}`}>
      <span className={`pastille ${propose ? 'attention' : 'ok'}`}>{propose ? 'À confirmer' : 'Confirmé'}</span>
      <h2 id={`rdv-${rdv.id}`}>{rdv.objet}</h2>
      <p style={{ fontSize: '1.2rem' }}>{majuscule(jour(rdv.debut))}<br /><strong>{heure(rdv.debut)}</strong></p>
      <p>{rdv.lieu}<br /><span className="secondaire">{rdv.adresse}</span></p>
      {rdv.note && <p className="carte attention" style={{ padding: '10px 14px' }}>{rdv.note}</p>}
      {erreur && <p className="erreur" role="alert" style={{ color: 'var(--critique)', fontWeight: 700 }}>{erreur}</p>}

      {plages ? (
        <fieldset className="pile" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700, marginBottom: 8 }}>Choisissez une autre plage</legend>
          {plages.map((p) => (
            <button key={p} type="button" className="bouton discret plein-largeur" disabled={occupe}
              onClick={() => agir(() => api.post(`/rendez-vous/${rdv.id}/deplacement`, { debut: p }))}>
              {majuscule(jour(p))}, {heure(p)}
            </button>
          ))}
          <button type="button" className="bouton discret" onClick={() => setPlages(null)}>Garder la plage actuelle</button>
        </fieldset>
      ) : (
        <div className="rangee">
          {propose && <button type="button" className="bouton" disabled={occupe} onClick={() => agir(() => api.post(`/rendez-vous/${rdv.id}/confirmation`))}>Oui, je serai là</button>}
          <button type="button" className="bouton secondaire-b" disabled={occupe}
            onClick={ouvrirPlages}>
            Changer la date
          </button>
        </div>
      )}
    </article>
  );
}
