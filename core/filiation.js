// Filiation : seul le lien parent → enfant est stocké. Tous les autres liens sont calculés.

function index(registre) {
  const enfants = new Map();
  for (const p of registre.personnes.values()) {
    for (const parent of p.parents ?? []) {
      const cle = registre.resoudre(parent).fiche.cle;
      if (!enfants.has(cle)) enfants.set(cle, []);
      enfants.get(cle).push(p.cle);
    }
  }
  return enfants;
}

/** Renvoie les liens familiaux d'une personne, par catégorie, sous forme de clés internes. */
export function liens(registre, numero) {
  const moi = registre.resoudre(numero).personne;
  const enfantsDe = index(registre);
  const parentsDe = (cle) => (registre.personnes.get(cle)?.parents ?? []).map((n) => registre.resoudre(n).fiche.cle);
  const enfants = (cle) => enfantsDe.get(cle) ?? [];
  const unique = (arr, sauf = []) => [...new Set(arr)].filter((c) => !sauf.includes(c));

  const parents = parentsDe(moi.cle);
  const fratrie = unique(parents.flatMap(enfants), [moi.cle]);
  const grandsParents = unique(parents.flatMap(parentsDe));
  const oncles = unique(parents.flatMap((p) => unique(parentsDe(p).flatMap(enfants), [p])), parents);
  const cousins = unique(oncles.flatMap(enfants));
  const mesEnfants = enfants(moi.cle);
  const petitsEnfants = unique(mesEnfants.flatMap(enfants));

  return { parents, enfants: mesEnfants, fratrie, grandsParents, petitsEnfants, onclesTantes: oncles, cousins };
}

/** Version lisible : noms et numéros. */
export function liensLisibles(registre, numero) {
  const l = liens(registre, numero);
  const nom = (cle) => {
    const p = registre.personnes.get(cle);
    return { numero: p.numero, nom: [p.prenom, p.nom].filter(Boolean).join(' ') || 'Bébé à naître' };
  };
  return Object.fromEntries(Object.entries(l).map(([k, v]) => [k, v.map(nom)]));
}
