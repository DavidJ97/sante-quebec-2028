/**
 * Passerelle d'accès côté serveur.
 * Charge le contexte, applique les règles pures du noyau, inscrit le verdict au journal
 * (dans la même transaction), et refuse la suite si l'accès n'est pas permis.
 */

import { decider, type Action, type Demandeur, type Donnee, type NiveauProcuration, type Sujet, type Verdict } from '@sante/noyau';
import type { Base, Executeur } from './db.js';
import { interdit } from './erreurs.js';
import { inscrire } from './journal.js';
import { resoudre, type NumeroResolu } from './registre.js';

export async function chargerSujet(ex: Executeur, r: NumeroResolu): Promise<Sujet> {
  const [p] = await ex.requete<{ date_naissance: string | null }>('select date_naissance::text from personne where cle = $1', [r.personneCle]);
  const parents = await ex.requete<{ parent_cle: string }>('select parent_cle from filiation where enfant_cle = $1', [r.personneCle]);
  const gest = await ex.requete<{ parent_cle: string }>('select parent_cle from gestionnaire_prenatal where enfant_cle = $1', [r.personneCle]);
  return {
    personneCle: r.personneCle,
    statut: r.statut,
    dateNaissance: p?.date_naissance ?? null,
    parents: parents.map((x) => x.parent_cle),
    gestionnairesPrenatals: gest.map((x) => x.parent_cle),
  };
}

async function procurationsEnVigueur(ex: Executeur, mandant: string, mandataire: string, maintenant: Date) {
  return ex.requete<{ niveau: NiveauProcuration }>(
    `select niveau from procuration where mandant_cle = $1 and mandataire_cle = $2 and revoquee_le is null
       and debut <= $3::date and (fin is null or fin >= $3::date)`, [mandant, mandataire, maintenant.toISOString().slice(0, 10)]);
}

async function liensSoinsEnVigueur(ex: Executeur, employe: string, personne: string, maintenant: Date) {
  return ex.requete<{ contexte: string; urgence: boolean }>(
    `select contexte, urgence from lien_soins where employe_id = $1 and personne_cle = $2
       and debut <= $3 and (fin is null or fin >= $3) order by urgence`, [employe, personne, maintenant.toISOString()]);
}

export const idDemandeur = (d: Demandeur) => (d.type === 'citoyen' ? d.personneCle : d.id);

export interface Acces {
  verdict: Verdict;
  sujet: Sujet;
  numero: NumeroResolu;
}

/** Évalue sans rien lire ni journaliser : sert à afficher ce qui est ouvert ou fermé. */
export async function evaluerSansJournal(tx: Executeur, demandeur: Demandeur, numero: string, donnee: Donnee, action: Action = 'lire', maintenant = new Date()): Promise<Verdict> {
  const r = await resoudre(tx, numero);
  const sujet = await chargerSujet(tx, r);
  const procurations = demandeur.type === 'citoyen' ? await procurationsEnVigueur(tx, r.personneCle, demandeur.personneCle, maintenant) : [];
  const liensSoins = demandeur.type === 'employe' && demandeur.porte === 'clinique' ? await liensSoinsEnVigueur(tx, demandeur.id, r.personneCle, maintenant) : [];
  return decider({ demandeur, sujet, donnee, action, maintenant, procurations, liensSoins });
}

/**
 * Évalue et journalise. Ne lève PAS d'exception sur un refus : un refus doit rester inscrit au journal,
 * et une exception annulerait la transaction. Utiliser `avecAcces` dans les routes.
 */
export async function autoriser(
  tx: Executeur, demandeur: Demandeur, numero: string, donnee: Donnee, action: Action = 'lire', motif = '', maintenant = new Date(),
): Promise<Acces> {
  const r = await resoudre(tx, numero);
  const sujet = await chargerSujet(tx, r);
  const procurations = demandeur.type === 'citoyen' ? await procurationsEnVigueur(tx, r.personneCle, demandeur.personneCle, maintenant) : [];
  const liensSoins = demandeur.type === 'employe' && demandeur.porte === 'clinique' ? await liensSoinsEnVigueur(tx, demandeur.id, r.personneCle, maintenant) : [];
  const verdict = decider({ demandeur, sujet, donnee, action, maintenant, procurations, liensSoins });
  await inscrire(tx, {
    demandeurType: demandeur.type === 'citoyen' ? 'citoyen' : demandeur.porte,
    demandeurId: idDemandeur(demandeur),
    sujet: r.numero, donnee, action, motif,
    decision: verdict.permis ? 'permis' : 'refuse', raison: verdict.raison, urgence: verdict.urgence,
  }, maintenant);
  return { verdict, sujet, numero: r };
}

/**
 * Patron des routes : dans une transaction, autoriser puis (si permis) faire le travail.
 * Le refus est levé APRÈS la validation de la transaction, donc il reste au journal.
 */
export async function avecAcces<T>(
  base: Base, demandeur: Demandeur, numero: string, donnee: Donnee, action: Action,
  travail: (tx: Executeur, acces: Acces) => Promise<T>, motif = '',
): Promise<T> {
  const r = await base.transaction(async (tx) => {
    const acces = await autoriser(tx, demandeur, numero, donnee, action, motif);
    if (!acces.verdict.permis) return { ok: false as const, refus: acces.verdict.raison };
    return { ok: true as const, valeur: await travail(tx, acces) };
  });
  if (!r.ok) throw interdit(r.refus);
  return r.valeur;
}
