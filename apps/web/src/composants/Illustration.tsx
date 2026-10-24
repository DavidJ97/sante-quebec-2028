/**
 * Illustrations au trait, une par service ou catégorie, dessinées sur une grille de 64.
 * Utilisées en filigrane (grandes, très pâles) pour qu'on sache d'un coup d'œil dans quel service on se trouve.
 * Elles sont décoratives : aria-hidden, aucune information ne passe par elles seules.
 */

const TRACES = {
  allergies: [
    'M32 6c-7 0-12 6-12 13 0 5 3 8 3 11s-3 6-3 11c0 7 5 13 12 13s12-6 12-13c0-5-3-8-3-11s3-6 3-11c0-7-5-13-12-13z',
    'M27 15l2 2M37 13l-2 2M33 22l1 2M27 40l2 2M37 45l-2 2M31 48l1 2',
    'M50 40l9 16H41z', 'M50 46v4', 'M50 53v.5',
  ],
  medicaments: [
    'M12 20h20a9 9 0 0 1 0 18H12a9 9 0 0 1 0-18z', 'M22 20v18',
    'M45 46m-11 0a11 11 0 1 0 22 0a11 11 0 1 0-22 0', 'M34 46h22',
  ],
  vaccins: [
    'M15 41L38 18l7 7-23 23z', 'M18 44L7 55', 'M41 21l8-8', 'M45 9l10 10', 'M34 14l16 16',
    'M23 33l3 3M28 28l3 3M33 23l3 3',
  ],
  rendezvous: [
    'M10 14h44v42H10z', 'M10 25h44', 'M21 8v12M43 8v12', 'M22 40l7 7 14-14',
  ],
  adaptation: [
    'M32 32m-25 0a25 25 0 1 0 50 0a25 25 0 1 0-50 0', 'M32 17m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
    'M18 25l14 4 14-4', 'M32 29v11', 'M32 40l-7 13M32 40l7 13',
  ],
  maladies: [
    'M32 55S9 41 9 24a11.5 11.5 0 0 1 23-4 11.5 11.5 0 0 1 23 4c0 17-23 31-23 31z',
    'M13 32h9l4-9 6 17 4-11 3 3h12',
  ],
  volontes: [
    'M15 6h25l11 11v41H15z', 'M40 6v11h11', 'M22 24h22M22 31h22M22 38h13',
    'M22 50c3-5 5-5 6 0s3 5 6-1 5 2 9 1',
  ],
  proches: [
    'M21 23m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0', 'M43 23m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0',
    'M5 54c0-9 7-16 16-16s16 7 16 16', 'M27 54c0-9 7-16 16-16s16 7 16 16',
  ],
  famille: [
    'M32 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0', 'M16 33m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
    'M48 33m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0', 'M9 54m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
    'M23 54m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0', 'M48 54m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
    'M32 17v6M16 23h32M16 23v5M48 23v5M16 38v6M9 44h14M9 44v6M23 44v6M48 38v12',
  ],
  journal: [
    'M32 5l21 8v15c0 14-9 25-21 31C20 53 11 42 11 28V13z',
    'M20 32s5-8 12-8 12 8 12 8-5 8-12 8-12-8-12-8z', 'M32 32m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  ],
  aide: [
    'M11 37v-5a21 21 0 0 1 42 0v5', 'M11 37h7v15h-7z', 'M46 37h7v15h-7z', 'M53 52c0 4-7 6-15 6h-5',
  ],
  clinique: [
    'M17 7v15a11 11 0 0 0 22 0V7', 'M13 7h8M35 7h8', 'M28 33v8a12 12 0 0 0 24 0v-6',
    'M52 31m-4.5 0a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0',
  ],
  connexion: [
    'M13 28h38v28H13z', 'M21 28v-8a11 11 0 0 1 22 0v8', 'M32 38v9', 'M32 38m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
  ],
  accueil: [
    'M8 30L32 9l24 21', 'M14 25v31h36V25', 'M28 56V42h8v14', 'M28 32h8M32 28v8',
  ],
} as const;

export type NomIllustration = keyof typeof TRACES;

/** Teinte de chaque catégorie : sert au filet de couleur et au filigrane. */
export const TEINTES: Record<NomIllustration, string> = {
  allergies: 'var(--t-allergies)',
  medicaments: 'var(--t-medicaments)',
  vaccins: 'var(--t-vaccins)',
  rendezvous: 'var(--t-rendezvous)',
  adaptation: 'var(--t-adaptation)',
  maladies: 'var(--t-maladies)',
  volontes: 'var(--t-volontes)',
  proches: 'var(--t-proches)',
  famille: 'var(--t-famille)',
  journal: 'var(--t-journal)',
  aide: 'var(--t-aide)',
  clinique: 'var(--t-clinique)',
  connexion: 'var(--t-rendezvous)',
  accueil: 'var(--t-rendezvous)',
};

export function Illustration({ nom, taille = 64, className, epaisseur = 2 }: { nom: NomIllustration; taille?: number; className?: string; epaisseur?: number }) {
  return (
    <svg className={className} width={taille} height={taille} viewBox="0 0 64 64" fill="none" stroke="currentColor"
      strokeWidth={epaisseur} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {TRACES[nom].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/** Grande illustration très pâle, posée derrière un bloc. Le bloc parent doit être `position: relative`. */
export function Filigrane({ nom, taille = 168 }: { nom: NomIllustration; taille?: number }) {
  return (
    <span className="filigrane" style={{ color: TEINTES[nom] }}>
      <Illustration nom={nom} taille={taille} epaisseur={1.6} />
    </span>
  );
}
