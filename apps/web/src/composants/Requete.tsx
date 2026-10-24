import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ErreurApi } from '../api';

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
      <div role="status" aria-label="Chargement en cours" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: lignes }, (_, i) => <div key={i} className="squelette" style={{ width: `${88 - i * 14}%` }} />)}
      </div>
    );
  }
  if (etat.etat === 'erreur') return <MessageErreur erreur={etat.erreur} recharger={recharger} />;
  return <>{children(etat.valeur)}</>;
}

export function MessageErreur({ erreur, recharger }: { erreur: ErreurApi; recharger?: (() => void) | undefined }) {
  if (erreur.statut === 403) {
    return (
      <div className="encart" role="alert">
        <p><strong>Vous n'avez pas accès à cette information.</strong></p>
        <p>{erreur.message}.</p>
      </div>
    );
  }
  return (
    <div className="resume-erreurs" role="alert">
      <h2>Ce contenu n'a pas pu être affiché</h2>
      <p>{erreur.message}</p>
      {recharger && <p><button type="button" className="bouton-lien" onClick={recharger}>Réessayer</button></p>}
    </div>
  );
}
