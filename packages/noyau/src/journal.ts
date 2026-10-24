/**
 * Journal des accès, chaîné : chaque entrée porte l'empreinte de la précédente.
 * Le noyau fournit la forme canonique ; le serveur calcule le SHA-256 et vérifie la chaîne.
 */

export const EMPREINTE_ORIGINE = '0'.repeat(64);

export interface EntreeJournal {
  no: number;
  le: string; // ISO 8601, précision milliseconde
  demandeurType: string;
  demandeurId: string;
  sujet: string | null;
  donnee: string;
  action: string;
  motif: string;
  decision: 'permis' | 'refuse';
  raison: string;
  urgence: boolean;
  precedente: string;
}

/** Texte canonique : ordre des champs fixe, aucune ambiguïté d'échappement. */
export function formeCanonique(e: EntreeJournal): string {
  return JSON.stringify([
    e.no, e.le, e.demandeurType, e.demandeurId, e.sujet, e.donnee, e.action, e.motif, e.decision, e.raison, e.urgence, e.precedente,
  ]);
}

export type ResultatVerification = { intacte: true; total: number } | { intacte: false; no: number; total: number };

export function verifierChaine(entrees: readonly (EntreeJournal & { empreinte: string })[], sha256: (texte: string) => string): ResultatVerification {
  let precedente = EMPREINTE_ORIGINE;
  for (const e of entrees) {
    if (e.precedente !== precedente || sha256(formeCanonique(e)) !== e.empreinte) {
      return { intacte: false, no: e.no, total: entrees.length };
    }
    precedente = e.empreinte;
  }
  return { intacte: true, total: entrees.length };
}
