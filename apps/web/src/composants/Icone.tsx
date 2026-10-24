const CHEMINS = {
  calendrier: 'M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  pilule: 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM8.5 8.5l7 7',
  telephone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  oeil: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  famille: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21v-2a6 6 0 0 1 12 0v2M17 11a3 3 0 1 0 0-6M21 21v-2a5 5 0 0 0-3-4.6',
  seringue: 'M18 2l4 4M17 7l3-3M19 9 8.7 19.3a1 1 0 0 1-1.4 0l-2.6-2.6a1 1 0 0 1 0-1.4L15 5M9 11l4 4M5 19l-3 3',
  main: 'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z',
  chevron: 'M9 6l6 6-6 6',
  retour: 'M15 6l-6 6 6 6',
  alerte: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  coche: 'M20 6 9 17l-5-5',
  bouclier: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  recherche: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
} as const;

export type NomIcone = keyof typeof CHEMINS;

export function Icone({ nom, taille = 24, className }: { nom: NomIcone; taille?: number; className?: string }) {
  return (
    <svg className={className} width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={CHEMINS[nom]} />
    </svg>
  );
}

/** Symbole de l'application : une croix dans un cercle, sans emprunt à une marque existante. */
export function Symbole({ taille = 30 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M13 8h6v5h5v6h-5v5h-6v-5H8v-6h5z" fill="currentColor" />
    </svg>
  );
}
