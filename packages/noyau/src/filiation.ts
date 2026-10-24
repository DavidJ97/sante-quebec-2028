/**
 * Seul le lien parent → enfant est stocké. Tous les autres liens sont calculés ici.
 */

export interface LienParent {
  enfant: string;
  parent: string;
}

export interface Parente {
  parents: string[];
  enfants: string[];
  fratrie: string[];
  grandsParents: string[];
  petitsEnfants: string[];
  onclesTantes: string[];
  cousins: string[];
  neveux: string[];
}

export const LIBELLES_PARENTE: Record<keyof Parente, string> = {
  parents: 'Parents',
  enfants: 'Enfants',
  fratrie: 'Frères et sœurs',
  grandsParents: 'Grands-parents',
  petitsEnfants: 'Petits-enfants',
  onclesTantes: 'Oncles et tantes',
  cousins: 'Cousins et cousines',
  neveux: 'Neveux et nièces',
};

export function calculerParente(cle: string, liens: readonly LienParent[]): Parente {
  const parentsDe = new Map<string, string[]>();
  const enfantsDe = new Map<string, string[]>();
  for (const { enfant, parent } of liens) {
    (parentsDe.get(enfant) ?? parentsDe.set(enfant, []).get(enfant)!).push(parent);
    (enfantsDe.get(parent) ?? enfantsDe.set(parent, []).get(parent)!).push(enfant);
  }
  const P = (x: string) => parentsDe.get(x) ?? [];
  const E = (x: string) => enfantsDe.get(x) ?? [];
  const uniques = (xs: string[], sauf: readonly string[] = []) => [...new Set(xs)].filter((x) => !sauf.includes(x));

  const parents = P(cle);
  const enfants = E(cle);
  const fratrie = uniques(parents.flatMap(E), [cle]);
  const grandsParents = uniques(parents.flatMap(P));
  const onclesTantes = uniques(grandsParents.flatMap(E), parents);
  const cousins = uniques(onclesTantes.flatMap(E));
  const petitsEnfants = uniques(enfants.flatMap(E));
  const neveux = uniques(fratrie.flatMap(E));
  return { parents, enfants, fratrie, grandsParents, petitsEnfants, onclesTantes, cousins, neveux };
}
