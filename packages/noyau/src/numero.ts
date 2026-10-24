/**
 * Identifiant de santé QC.
 *
 * 11 chiffres affichés « QC 4829 1357 066 » : 10 chiffres tirés au hasard (le premier n'est jamais 0)
 * suivis d'un chiffre de contrôle calculé par l'algorithme de Damm. Le chiffre de contrôle détecte
 * toute erreur sur un seul chiffre et toute inversion de deux chiffres voisins.
 * Le numéro ne contient aucune information : ni date, ni sexe, ni région.
 */

const DAMM: readonly (readonly number[])[] = [
  [0, 3, 1, 7, 5, 9, 8, 6, 4, 2],
  [7, 0, 9, 2, 1, 5, 4, 8, 6, 3],
  [4, 2, 0, 6, 8, 7, 1, 3, 5, 9],
  [1, 7, 5, 0, 9, 8, 3, 4, 2, 6],
  [6, 1, 2, 3, 0, 4, 5, 9, 7, 8],
  [3, 6, 7, 4, 2, 0, 9, 5, 8, 1],
  [5, 8, 6, 9, 7, 2, 0, 1, 3, 4],
  [8, 9, 4, 5, 3, 6, 2, 0, 1, 7],
  [9, 4, 3, 8, 6, 1, 7, 2, 0, 5],
  [2, 5, 8, 1, 4, 3, 6, 7, 9, 0],
];

export const LONGUEUR_NUMERO = 11;

/** Chiffre de contrôle de Damm d'une suite de chiffres. */
export function chiffreControle(chiffres: string): number {
  let interim = 0;
  for (const c of chiffres) {
    const d = c.charCodeAt(0) - 48;
    if (d < 0 || d > 9) throw new RangeError(`Caractère non numérique : ${c}`);
    interim = DAMM[interim]![d]!;
  }
  return interim;
}

/** Retire l'étiquette « QC », les espaces et les tirets. */
export function normaliserNumero(saisie: string): string {
  return saisie.trim().toUpperCase().replace(/^QC/, '').replace(/[\s-]/g, '');
}

export type ProblemeNumero = 'vide' | 'caracteres' | 'longueur' | 'zero-initial' | 'controle';

/** Renvoie le problème d'une saisie, ou null si le numéro est valide. */
export function problemeNumero(saisie: string): ProblemeNumero | null {
  const n = normaliserNumero(saisie);
  if (n.length === 0) return 'vide';
  if (!/^\d+$/.test(n)) return 'caracteres';
  if (n.length !== LONGUEUR_NUMERO) return 'longueur';
  if (n.startsWith('0')) return 'zero-initial';
  if (chiffreControle(n) !== 0) return 'controle';
  return null;
}

export const MESSAGES_NUMERO: Record<ProblemeNumero, string> = {
  vide: 'Entrez votre numéro QC.',
  caracteres: 'Le numéro contient seulement des chiffres.',
  longueur: 'Le numéro compte 11 chiffres.',
  'zero-initial': 'Un numéro QC ne commence jamais par 0.',
  controle: 'Ce numéro n\'existe pas. Vérifiez chaque chiffre.',
};

export function estNumeroValide(saisie: string): boolean {
  return problemeNumero(saisie) === null;
}

/** « 48291357066 » → « QC 4829 1357 066 ». */
export function formaterNumero(saisie: string): string {
  const n = normaliserNumero(saisie);
  return `QC ${n.slice(0, 4)} ${n.slice(4, 8)} ${n.slice(8)}`;
}

/** Mise en forme pendant la frappe : « 482913 » → « 4829 13 ». */
export function formaterSaisie(saisie: string): string {
  const n = normaliserNumero(saisie).replace(/\D/g, '').slice(0, LONGUEUR_NUMERO);
  return [n.slice(0, 4), n.slice(4, 8), n.slice(8)].filter(Boolean).join(' ');
}

/**
 * Tire un nouveau numéro. `entier(max)` doit renvoyer un entier uniforme dans [0, max) tiré
 * d'une source cryptographique. `existe` évite toute collision avec un numéro déjà attribué,
 * y compris un numéro archivé : un numéro n'est jamais réattribué.
 */
export function tirerNumero(entier: (max: number) => number, existe: (numero: string) => boolean): string {
  for (let essai = 0; essai < 100; essai++) {
    let base = String(1 + entier(9));
    for (let i = 0; i < 9; i++) base += String(entier(10));
    const numero = base + chiffreControle(base);
    if (!existe(numero)) return numero;
  }
  throw new Error('Aucun numéro libre après 100 essais');
}

/** Source uniforme basée sur crypto.getRandomValues (navigateur et Node). */
export function entierCryptographique(max: number): number {
  const tampon = new Uint32Array(1);
  const limite = Math.floor(0x1_0000_0000 / max) * max;
  do globalThis.crypto.getRandomValues(tampon);
  while (tampon[0]! >= limite);
  return tampon[0]! % max;
}

/** Numéro d'assurance maladie (NAM) : 4 lettres et 8 chiffres. Conservé seulement pour la correspondance. */
export function normaliserNAM(saisie: string): string | null {
  const n = saisie.toUpperCase().replace(/[\s-]/g, '');
  return /^[A-Z]{4}\d{8}$/.test(n) ? n : null;
}
