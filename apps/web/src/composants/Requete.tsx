import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ErreurApi } from '../api';
import { Icone } from './Icone';

export type Etat<T> =
  | { etat: 'chargement' }
  | { etat: 'erreur'; erreur: ErreurApi }
  | { etat: 'pret'; valeur: T };

/** Charge une ressource ; `recharger` relance la requête (après une modification, par exemple). */
export function useRequete<T>(charger: () => Promise<T>, deps: unknown[]): [Etat<T>, () => void] {
  const [etat, setEtat] = useState<Etat<T>>({ etat: 'chargement' });
  const [tour, setTour] = useState(0);
  const courant = useRef(0);
  useEffect(() => {
    const id = ++courant.current;
    setEtat((e) => (e.etat === 'pret' ? e : { etat: 'chargement' }));
    charger().then(
      (valeur) => { if (id === courant.current) setEtat({ etat: 'pret', valeur }); },
      (e: unknown) => {
        if (id !== courant.current) return;
        setEtat({ etat: 'erreur', erreur: e instanceof ErreurApi ? e : new ErreurApi(0, 'inconnu', 'Une erreur est survenue.') });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tour]);
  const recharger = useCallback(() => setTour((t) => t + 1), []);
  return [etat, recharger];
}

export function Charge<T>({ etat, lignes = 3, children, recharger }: { etat: Etat<T>; lignes?: number; children: (v: T) => ReactNode; recharger?: () => void }) {
  if (etat.etat === 'chargement') {
    return (
      <div className="pile" aria-busy="true" aria-label="Chargement">
        {Array.from({ length: lignes }, (_, i) => <div key={i} className="squelette" style={{ width: `${90 - i * 15}%` }} />)}
      </div>
    );
  }
  if (etat.etat === 'erreur') return <MessageErreur erreur={etat.erreur} recharger={recharger} />;
  return <>{children(etat.valeur)}</>;
}

export function MessageErreur({ erreur, recharger }: { erreur: ErreurApi; recharger?: (() => void) | undefined }) {
  const refus = erreur.statut === 403;
  return (
    <div className={`carte ${refus ? '' : 'attention'}`} role="alert">
      <p style={{ display: 'flex', gap: 8, fontWeight: 700 }}>
        <Icone nom={refus ? 'bouclier' : 'alerte'} />
        {refus ? 'Vous n\'avez pas accès à cette information' : 'Impossible d\'afficher cette information'}
      </p>
      <p>{erreur.message}</p>
      {recharger && !refus && <button type="button" className="bouton discret" style={{ alignSelf: 'flex-start' }} onClick={recharger}>Réessayer</button>}
    </div>
  );
}
