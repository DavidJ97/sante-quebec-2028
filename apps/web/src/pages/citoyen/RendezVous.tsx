import { useState } from 'react';
import { api, ErreurApi, type RendezVous as Rdv, type Reponse } from '../../api';
import { Corps, TetePage, useTitre } from '../../composants/Gabarit';
import { Charge, useRequete } from '../../composants/Requete';
import { heure, jour, jourSemaine, majuscule, moisCourt, numeroJour } from '../../format';
import { SERVICE, useCible } from './commun';

export default function RendezVous() {
  const c = useCible();
  const titre = c.titre('Mes rendez-vous', 'Rendez-vous');
  useTitre(titre, SERVICE);
  const [etat, recharger] = useRequete(() => api.get<Reponse<Rdv[]>>(`/personnes/${c.numero}/donnees/rendezvous`), [c.numero]);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  return (
    <main id="contenu" tabIndex={-1}>
      <TetePage illustration="rendezvous" fil={c.fil} surTitre={c.surTitre} titre={titre}
        chapeau="Confirmez votre présence ou choisissez une autre date qui vous convient mieux." />
      <Corps etroit>
        {confirmation && (
          <div className="bandeau succes" role="status">
            <p className="bandeau-titre">Fait</p>
            <div className="bandeau-corps"><p className="accroche">{confirmation}</p></div>
          </div>
        )}
        <Charge etat={etat} recharger={recharger}>
          {(r) => r.valeur.length === 0
            ? <p>Aucun rendez-vous prévu.</p>
            : <div>{r.valeur.map((x) => <CarteRdv key={x.id} rdv={x} apres={(m) => { setConfirmation(m); recharger(); }} />)}</div>}
        </Charge>
      </Corps>
    </main>
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
    <article className="rdv" aria-labelledby={`rdv-${rdv.id}`}>
      <div className="date-bloc" aria-hidden="true">
        <span className="mois">{moisCourt(rdv.debut)}</span>
        <span className="jour">{numeroJour(rdv.debut)}</span>
        <span className="semaine">{jourSemaine(rdv.debut).slice(0, 3)}.</span>
      </div>
      <div className="infos">
        <span className={`etiquette ${propose ? 'jaune' : 'verte'}`}>{propose ? 'À confirmer' : 'Confirmé'}</span>
        <h2 id={`rdv-${rdv.id}`}>{rdv.objet}</h2>
        <p className="heure">{majuscule(jour(rdv.debut))}, {heure(rdv.debut)}</p>
        <p>{rdv.lieu}<br /><span className="secondaire">{rdv.adresse}</span></p>
        {rdv.note && <div className="avertissement"><span className="signe" aria-hidden="true">!</span><p><span className="visuellement-cache">Important : </span>{rdv.note}</p></div>}
        {erreur && <p className="message-erreur" role="alert" style={{ color: 'var(--critique)', fontWeight: 700 }}>{erreur}</p>}

        {plages ? (
          <fieldset className="radios" style={{ marginTop: 8 }}>
            <legend style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 10 }}>Choisissez une nouvelle date</legend>
            {plages.map((p) => (
              <button key={p} type="button" className="bouton secondaire" disabled={occupe} style={{ justifyContent: 'flex-start' }}
                onClick={() => agir(() => api.post(`/rendez-vous/${rdv.id}/deplacement`, { debut: p }), `${rdv.objet} : déplacé au ${jour(p)}, ${heure(p)}.`)}>
                {majuscule(jour(p))}, {heure(p)}
              </button>
            ))}
            <p><button type="button" className="bouton-lien" onClick={() => setPlages(null)}>Garder la date actuelle</button></p>
          </fieldset>
        ) : (
          <div className="actions" style={{ marginTop: 6 }}>
            {propose && (
              <button type="button" className="bouton" disabled={occupe}
                onClick={() => agir(() => api.post(`/rendez-vous/${rdv.id}/confirmation`), `${rdv.objet} : votre présence est confirmée.`)}>
                Confirmer ma présence
              </button>
            )}
            <button type="button" className="bouton-lien" disabled={occupe} onClick={ouvrirPlages}>Choisir une autre date</button>
          </div>
        )}
      </div>
    </article>
  );
}
