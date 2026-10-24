import { useState } from 'react';
import { api, ErreurApi, type RendezVous as Rdv, type Reponse } from '../../api';
import { EntetePage, Page, teinte, useTitre } from '../../composants/Gabarit';
import { Charge, useRequete } from '../../composants/Requete';
import { heure, jour, jourSemaine, majuscule, moisCourt, numeroJour } from '../../format';
import { relatif, SERVICE, useCible } from './commun';

export default function RendezVous() {
  const c = useCible();
  const titre = c.titre('Mes rendez-vous', 'Rendez-vous');
  useTitre(titre, SERVICE);
  const [etat, recharger] = useRequete(() => api.get<Reponse<Rdv[]>>(`/personnes/${c.numero}/donnees/rendezvous`), [c.numero]);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  return (
    <Page etroite>
      <EntetePage illustration="rendezvous" fil={c.fil} surTitre={c.surTitre} titre={titre}
        chapeau="Confirmez votre présence ou choisissez une autre date qui vous convient mieux." />
      {confirmation && (
        <div className="notification apparait" role="status">
          <span className="rond"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg></span>
          <p><strong>C'est fait.</strong> {confirmation}</p>
        </div>
      )}
      <Charge etat={etat} recharger={recharger}>
        {(r) => r.valeur.length === 0
          ? <p className="encart">Aucun rendez-vous prévu.</p>
          : <div className="pile">{r.valeur.map((x) => <CarteRdv key={x.id} rdv={x} apres={(m) => { setConfirmation(m); recharger(); }} />)}</div>}
      </Charge>
    </Page>
  );
}

function CarteRdv({ rdv, apres }: { rdv: Rdv; apres: (message: string) => void }) {
  const [plages, setPlages] = useState<string[] | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const propose = rdv.statut === 'propose';

  async function agir(f: () => Promise<unknown>, message: string) {
    setOccupe(true); setErreur(null);
    try { await f(); setPlages(null); apres(message); }
    catch (e) { setErreur(e instanceof ErreurApi ? e.message : 'Une erreur est survenue. Réessayez.'); }
    finally { setOccupe(false); }
  }
  async function ouvrirPlages() {
    setOccupe(true); setErreur(null);
    try { setPlages(await api.get<string[]>(`/rendez-vous/${rdv.id}/plages`)); }
    catch (e) { setErreur(e instanceof ErreurApi ? e.message : 'Une erreur est survenue. Réessayez.'); }
    finally { setOccupe(false); }
  }

  return (
    <article className="carte apparait" style={{ ...teinte('rendezvous'), ...(propose ? { borderColor: 'var(--attention-bord)' } : {}) }} aria-labelledby={`rdv-${rdv.id}`}>
      <div className="rdv">
        <div className="tuile-date" aria-hidden="true">
          <span className="mois">{moisCourt(rdv.debut)}</span>
          <span className="jour">{numeroJour(rdv.debut)}</span>
          <span className="semaine">{jourSemaine(rdv.debut).slice(0, 3)}.</span>
        </div>
        <div className="infos">
          <div className="actions" style={{ gap: 8 }}>
            <span className={`etiquette ${propose ? 'jaune' : 'verte'}`}><span className="point" />{propose ? 'À confirmer' : 'Confirmé'}</span>
            <span className="meta">{relatif(rdv.debut)}</span>
          </div>
          <h2 id={`rdv-${rdv.id}`}>{rdv.objet}</h2>
          <p className="heure">{majuscule(jour(rdv.debut))}, {heure(rdv.debut)}</p>
          <p>{rdv.lieu}<br /><span className="secondaire">{rdv.adresse}</span></p>
          {rdv.note && (
            <div className="avertissement">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
              <p><span className="visuellement-cache">Important : </span><strong>{rdv.note}</strong></p>
            </div>
          )}
          {erreur && <p className="groupe message-erreur" role="alert" style={{ color: 'var(--critique)', fontWeight: 700 }}>{erreur}</p>}
        </div>
      </div>

      {plages ? (
        <fieldset className="choix" style={{ marginTop: 4 }}>
          <legend style={{ fontWeight: 750, fontSize: '1.1rem', marginBottom: 10 }}>Choisissez une nouvelle date</legend>
          {plages.map((p) => (
            <button key={p} type="button" className="option" disabled={occupe} style={{ textAlign: 'left', fontWeight: 650 }}
              onClick={() => agir(() => api.post(`/rendez-vous/${rdv.id}/deplacement`, { debut: p }), `${rdv.objet} : déplacé au ${jour(p)}, ${heure(p)}.`)}>
              {majuscule(jour(p))}, {heure(p)}
            </button>
          ))}
          <p><button type="button" className="bouton-lien" onClick={() => setPlages(null)}>Garder la date actuelle</button></p>
        </fieldset>
      ) : (
        <div className="actions">
          {propose && (
            <button type="button" className="bouton" disabled={occupe}
              onClick={() => agir(() => api.post(`/rendez-vous/${rdv.id}/confirmation`), `${rdv.objet} : votre présence est confirmée.`)}>
              Confirmer ma présence
            </button>
          )}
          <button type="button" className={`bouton ${propose ? 'secondaire' : 'tonal'}`} disabled={occupe} onClick={ouvrirPlages}>Choisir une autre date</button>
        </div>
      )}
    </article>
  );
}
