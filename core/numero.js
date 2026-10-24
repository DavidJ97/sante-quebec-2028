// Identifiant de santé QC : 11 chiffres affichés « QC 4829 1357 066 ».
// 10 chiffres tirés au hasard (le premier n'est jamais 0) + 1 chiffre de contrôle (algorithme de Damm).
// Aucune information n'est encodée dans le numéro : ni date, ni sexe, ni région.

const DAMM = [
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

/** Chiffre de contrôle de Damm pour une chaîne de chiffres. */
export function dammControle(chiffres) {
  let interim = 0;
  for (const c of chiffres) interim = DAMM[interim][c.charCodeAt(0) - 48];
  return interim;
}

/** Retire l'étiquette « QC », les espaces et les tirets. */
export function normaliser(saisie) {
  return String(saisie ?? '').toUpperCase().replace(/^\s*QC/, '').replace(/[\s-]/g, '');
}

/** Vrai si la saisie est un numéro QC bien formé (format + chiffre de contrôle). */
export function estValide(saisie) {
  const n = normaliser(saisie);
  if (!/^[1-9]\d{10}$/.test(n)) return false;
  return dammControle(n) === 0;
}

/** Explique pourquoi une saisie est refusée, en mots simples. */
export function diagnostiquer(saisie) {
  const n = normaliser(saisie);
  if (n.length === 0) return 'Entrez un numéro.';
  if (/\D/.test(n)) return 'Le numéro contient seulement des chiffres.';
  if (n.length !== 11) return `Il faut 11 chiffres ; vous en avez ${n.length}.`;
  if (n[0] === '0') return 'Un numéro QC ne commence jamais par 0.';
  if (dammControle(n) !== 0) return 'Un chiffre est probablement mal tapé ou inversé.';
  return null;
}

/** Affiche « QC 4829 1357 066 ». */
export function formater(saisie) {
  const n = normaliser(saisie);
  return `QC ${n.slice(0, 4)} ${n.slice(4, 8)} ${n.slice(8)}`;
}

/**
 * Tire un nouveau numéro. `aleatoire` renvoie un entier dans [0, max) ;
 * par défaut, crypto.getRandomValues. `existe` permet d'éviter toute collision.
 */
export function generer({ aleatoire = aleatoireCrypto, existe = () => false } = {}) {
  for (let essai = 0; essai < 1000; essai++) {
    let base = String(1 + aleatoire(9));
    for (let i = 0; i < 9; i++) base += String(aleatoire(10));
    const numero = base + dammControle(base);
    if (!existe(numero)) return numero;
  }
  throw new Error('Impossible de trouver un numéro libre');
}

function aleatoireCrypto(max) {
  const tampon = new Uint32Array(1);
  const limite = Math.floor(0x100000000 / max) * max;
  do globalThis.crypto.getRandomValues(tampon); while (tampon[0] >= limite);
  return tampon[0] % max;
}
