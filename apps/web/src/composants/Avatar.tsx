import { useState } from 'react';

const initiales = (nom: string) => nom.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('');

/**
 * Photo d'identification, avec repli sur les initiales s'il n'y en a pas (ou si l'accès est refusé).
 * `alt` vide quand le nom est déjà écrit à côté (la photo est alors redondante pour un lecteur d'écran).
 */
export function Avatar({ src, nom, taille = 44, alt = '', carre = false }: { src?: string | null; nom: string; taille?: number; alt?: string; carre?: boolean }) {
  const [echec, setEchec] = useState(false);
  const style = { width: taille, height: taille, fontSize: Math.round(taille * 0.36) };
  return (
    <span className={`avatar ${carre ? 'carre' : ''}`} style={style} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
      {src && !echec
        ? <img src={src} alt="" width={taille} height={taille} loading="lazy" decoding="async" onError={() => setEchec(true)} />
        : <span aria-hidden="true">{initiales(nom)}</span>}
    </span>
  );
}

export const photoPersonne = (numero: string) => `/api/personnes/${numero}/photo`;
export const photoPersonnel = (id: string) => `/api/personnel/${id}/photo`;
