/** Cycle de vie d'un numéro QC dans le registre des personnes. Rien n'est jamais supprimé. */

export const STATUTS = ['reserve', 'actif', 'temporaire', 'decede', 'fusionne', 'remplace', 'annule'] as const;
export type Statut = (typeof STATUTS)[number];

export const LIBELLES_STATUT: Record<Statut, string> = {
  reserve: 'Réservé',
  actif: 'Actif',
  temporaire: 'Temporaire',
  decede: 'Décédé',
  fusionne: 'Fusionné',
  remplace: 'Remplacé',
  annule: 'Annulé',
};

/** Passages permis. Les statuts finaux n'ont aucune sortie. */
export const TRANSITIONS: Record<Statut, readonly Statut[]> = {
  reserve: ['actif', 'annule'],
  temporaire: ['actif', 'fusionne', 'decede'],
  actif: ['decede', 'fusionne', 'remplace'],
  decede: [],
  fusionne: [],
  remplace: [],
  annule: [],
};

/** Statuts sous lesquels un numéro désigne encore une personne en vie ou à naître. */
export const STATUTS_EN_VIGUEUR: readonly Statut[] = ['reserve', 'actif', 'temporaire'];

export function transitionPermise(de: Statut, a: Statut): boolean {
  return TRANSITIONS[de].includes(a);
}

export class TransitionInterdite extends Error {
  constructor(readonly de: Statut, readonly a: Statut) {
    super(`Passage impossible : ${LIBELLES_STATUT[de]} → ${LIBELLES_STATUT[a]}`);
  }
}

export function verifierTransition(de: Statut, a: Statut): void {
  if (!transitionPermise(de, a)) throw new TransitionInterdite(de, a);
}
