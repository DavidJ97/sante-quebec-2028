import { createHash } from 'node:crypto';
import { EMPREINTE_ORIGINE, formeCanonique, verifierChaine, type EntreeJournal, type ResultatVerification } from '@sante/noyau';
import type { Executeur } from './db.js';

export const sha256 = (texte: string) => createHash('sha256').update(texte).digest('hex');

/** Verrou applicatif : une seule écriture au journal à la fois, pour que la chaîne reste linéaire. */
const VERROU_JOURNAL = 2028_0001;

export type NouvelleEntree = Omit<EntreeJournal, 'no' | 'le' | 'precedente'>;

/** À appeler dans la même transaction que l'accès qu'on inscrit. */
export async function inscrire(tx: Executeur, e: NouvelleEntree, maintenant = new Date()): Promise<EntreeJournal & { empreinte: string }> {
  await tx.requete('select pg_advisory_xact_lock($1)', [VERROU_JOURNAL]);
  const [dernier] = await tx.requete<{ no: string; empreinte: string }>('select no, empreinte from journal_acces order by no desc limit 1');
  const entree: EntreeJournal = {
    ...e,
    no: dernier ? Number(dernier.no) + 1 : 1,
    le: maintenant.toISOString(),
    precedente: dernier?.empreinte ?? EMPREINTE_ORIGINE,
  };
  const empreinte = sha256(formeCanonique(entree));
  await tx.requete(
    `insert into journal_acces (no, le, demandeur_type, demandeur_id, sujet, donnee, action, motif, decision, raison, urgence, precedente, empreinte)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [entree.no, entree.le, entree.demandeurType, entree.demandeurId, entree.sujet, entree.donnee, entree.action, entree.motif,
      entree.decision, entree.raison, entree.urgence, entree.precedente, empreinte],
  );
  return { ...entree, empreinte };
}

interface LigneJournal {
  no: string; le: Date | string; demandeur_type: string; demandeur_id: string; sujet: string | null; donnee: string; action: string;
  motif: string; decision: 'permis' | 'refuse'; raison: string; urgence: boolean; precedente: string; empreinte: string;
}

export function versEntree(l: LigneJournal): EntreeJournal & { empreinte: string } {
  return {
    no: Number(l.no), le: new Date(l.le).toISOString(), demandeurType: l.demandeur_type, demandeurId: l.demandeur_id,
    sujet: l.sujet, donnee: l.donnee, action: l.action, motif: l.motif, decision: l.decision, raison: l.raison,
    urgence: l.urgence, precedente: l.precedente, empreinte: l.empreinte,
  };
}

export async function verifier(ex: Executeur): Promise<ResultatVerification> {
  const lignes = await ex.requete<LigneJournal>('select * from journal_acces order by no');
  return verifierChaine(lignes.map(versEntree), sha256);
}
