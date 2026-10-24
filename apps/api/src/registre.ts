/**
 * Registre des personnes : la seule autorité qui attribue, résout et fait évoluer les numéros QC.
 */

import {
  entierCryptographique, normaliserNAM, normaliserNumero, estNumeroValide, tirerNumero, verifierTransition, type Statut,
} from '@sante/noyau';
import type { Executeur } from './db.js';
import { conflit, introuvable, invalide } from './erreurs.js';

export interface NumeroResolu {
  numero: string;
  personneCle: string;
  statut: Statut;
}

/** Suit les renvois (fusion, remplacement) jusqu'au numéro en vigueur. */
export async function resoudre(ex: Executeur, saisie: string): Promise<NumeroResolu> {
  if (!estNumeroValide(saisie)) throw invalide('Numéro QC invalide');
  let numero = normaliserNumero(saisie);
  for (let saut = 0; saut < 10; saut++) {
    const [l] = await ex.requete<{ numero: string; personne_cle: string; statut: Statut; renvoie_vers: string | null }>(
      'select numero, personne_cle, statut, renvoie_vers from numero_qc where numero = $1', [numero]);
    if (!l) throw introuvable('Numéro inconnu');
    if (!l.renvoie_vers) return { numero: l.numero, personneCle: l.personne_cle, statut: l.statut };
    numero = l.renvoie_vers;
  }
  throw new Error('Chaîne de renvois trop longue');
}

/** Numéro en vigueur d'une personne (actif, réservé, temporaire ou décédé). */
export async function numeroDe(ex: Executeur, personneCle: string): Promise<NumeroResolu> {
  const [l] = await ex.requete<{ numero: string; statut: Statut }>(
    `select numero, statut from numero_qc where personne_cle = $1 and statut in ('reserve','actif','temporaire','decede')`, [personneCle]);
  if (!l) throw introuvable('Aucun numéro en vigueur');
  return { numero: l.numero, personneCle, statut: l.statut };
}

/** Accepte un numéro QC ou un NAM. */
export async function chercher(ex: Executeur, saisie: string): Promise<NumeroResolu | null> {
  if (estNumeroValide(saisie)) {
    try { return await resoudre(ex, saisie); } catch { return null; }
  }
  const nam = normaliserNAM(saisie);
  if (!nam) return null;
  const [l] = await ex.requete<{ personne_cle: string }>('select personne_cle from correspondance_nam where nam = $1', [nam]);
  return l ? numeroDe(ex, l.personne_cle) : null;
}

async function nouveauNumero(ex: Executeur): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidat = tirerNumero(entierCryptographique, () => false);
    const [deja] = await ex.requete('select 1 from numero_qc where numero = $1', [candidat]);
    if (!deja) return candidat;
  }
  throw new Error('Impossible de tirer un numéro libre');
}

async function historiser(ex: Executeur, numero: string, de: Statut | null, a: Statut, motif: string, par: string) {
  await ex.requete('insert into numero_historique (numero, de, a, motif, par) values ($1, $2, $3, $4, $5)', [numero, de, a, motif, par]);
}

async function changerStatut(ex: Executeur, numero: string, a: Statut, motif: string, par: string, renvoieVers: string | null = null) {
  const [l] = await ex.requete<{ statut: Statut }>('select statut from numero_qc where numero = $1 for update', [numero]);
  if (!l) throw introuvable('Numéro inconnu');
  verifierTransition(l.statut, a);
  await ex.requete('update numero_qc set statut = $2, renvoie_vers = $3 where numero = $1', [numero, a, renvoieVers]);
  await historiser(ex, numero, l.statut, a, motif, par);
}

/** Inscrit une personne déjà née (reprise des données de la RAMQ, nouvel arrivant). */
export async function inscrire(
  ex: Executeur,
  p: { prenom: string; nom: string; dateNaissance: string; sexe: 'F' | 'M' | 'X'; lieu?: string; nam?: string; numero?: string },
  par: string,
): Promise<NumeroResolu> {
  const [{ cle }] = (await ex.requete<{ cle: string }>(
    'insert into personne (prenom, nom, date_naissance, sexe_naissance, lieu_naissance) values ($1, $2, $3, $4, $5) returning cle',
    [p.prenom, p.nom, p.dateNaissance, p.sexe, p.lieu ?? null])) as [{ cle: string }];
  const numero = p.numero ? normaliserNumero(p.numero) : await nouveauNumero(ex);
  if (p.numero && !estNumeroValide(numero)) throw invalide('Numéro imposé invalide');
  await ex.requete(`insert into numero_qc (numero, personne_cle, statut) values ($1, $2, 'actif')`, [numero, cle]);
  await historiser(ex, numero, null, 'actif', 'Inscription', par);
  if (p.nam) {
    const nam = normaliserNAM(p.nam);
    if (!nam) throw invalide('NAM mal formé');
    await ex.requete('insert into correspondance_nam (nam, personne_cle) values ($1, $2)', [nam, cle]);
  }
  return { numero, personneCle: cle, statut: 'actif' };
}

/** Réserve un numéro pour un bébé, environ un mois avant la naissance prévue. La mère gère le profil. */
export async function reserver(ex: Executeur, p: { mere: string; datePrevue: string; numero?: string }, par: string): Promise<NumeroResolu> {
  const mere = await resoudre(ex, p.mere);
  if (mere.statut !== 'actif') throw conflit('La mère doit avoir un numéro actif');
  const [{ cle }] = (await ex.requete<{ cle: string }>('insert into personne (date_prevue) values ($1) returning cle', [p.datePrevue])) as [{ cle: string }];
  const numero = p.numero ? normaliserNumero(p.numero) : await nouveauNumero(ex);
  await ex.requete(`insert into numero_qc (numero, personne_cle, statut) values ($1, $2, 'reserve')`, [numero, cle]);
  await historiser(ex, numero, null, 'reserve', 'Réservation prénatale', par);
  await ex.requete('insert into filiation (enfant_cle, parent_cle) values ($1, $2)', [cle, mere.personneCle]);
  await ex.requete('insert into gestionnaire_prenatal (enfant_cle, parent_cle) values ($1, $2)', [cle, mere.personneCle]);
  return { numero, personneCle: cle, statut: 'reserve' };
}

/** Filiation déclarée à l'État civil. */
export async function ajouterParent(ex: Executeur, enfant: string, parent: string): Promise<void> {
  const e = await resoudre(ex, enfant);
  const p = await resoudre(ex, parent);
  const parents = await ex.requete<{ parent_cle: string }>('select parent_cle from filiation where enfant_cle = $1', [e.personneCle]);
  if (parents.some((x) => x.parent_cle === p.personneCle)) return;
  if (parents.length >= 2) throw conflit('Deux parents sont déjà inscrits');
  await ex.requete('insert into filiation (enfant_cle, parent_cle) values ($1, $2)', [e.personneCle, p.personneCle]);
  if (e.statut === 'reserve') {
    await ex.requete('insert into gestionnaire_prenatal (enfant_cle, parent_cle) values ($1, $2) on conflict do nothing', [e.personneCle, p.personneCle]);
  }
}

/** Naissance déclarée : le numéro réservé devient actif et l'enfant est couvert. */
export async function declarerNaissance(
  ex: Executeur, numero: string,
  p: { prenom: string; nom: string; dateNaissance: string; sexe: 'F' | 'M' | 'X'; lieu: string; secondParent?: string },
  par: string,
): Promise<NumeroResolu> {
  const r = await resoudre(ex, numero);
  if (p.secondParent) await ajouterParent(ex, r.numero, p.secondParent);
  await changerStatut(ex, r.numero, 'actif', 'Naissance déclarée', par);
  await ex.requete(
    'update personne set prenom = $2, nom = $3, date_naissance = $4, sexe_naissance = $5, lieu_naissance = $6 where cle = $1',
    [r.personneCle, p.prenom, p.nom, p.dateNaissance, p.sexe, p.lieu]);
  return { ...r, statut: 'actif' };
}

/** Deux fiches désignent la même personne : la fiche perdante renvoie vers la gagnante. Rien n'est supprimé. */
export async function fusionner(ex: Executeur, perdant: string, gagnant: string, par: string): Promise<void> {
  const p = await resoudre(ex, perdant);
  const g = await resoudre(ex, gagnant);
  if (p.personneCle === g.personneCle) throw conflit('Ces numéros désignent déjà la même personne');
  await changerStatut(ex, p.numero, 'fusionne', `Fusionné avec ${g.numero}`, par, g.numero);
  await ex.requete('update correspondance_nam set personne_cle = $2 where personne_cle = $1', [p.personneCle, g.personneCle]);
}

export async function declarerDeces(ex: Executeur, numero: string, date: string, par: string): Promise<void> {
  const r = await resoudre(ex, numero);
  await changerStatut(ex, r.numero, 'decede', 'Décès confirmé par l\'État civil', par);
  await ex.requete('update personne set date_deces = $2 where cle = $1', [r.personneCle, date]);
  await ex.requete('update procuration set revoquee_le = now() where (mandant_cle = $1 or mandataire_cle = $1) and revoquee_le is null', [r.personneCle]);
  await ex.requete(`update rendez_vous set statut = 'annule', modifie_le = now() where personne_cle = $1 and debut > now() and statut <> 'annule'`, [r.personneCle]);
}

/** Après une fraude : nouveau numéro public, même personne. */
export async function remplacer(ex: Executeur, numero: string, motif: string, par: string): Promise<NumeroResolu> {
  const r = await resoudre(ex, numero);
  const nouveau = await nouveauNumero(ex);
  // L'ancien numéro passe à « remplacé » et renvoie vers le nouveau (clé étrangère vérifiée à la fin de la transaction).
  await changerStatut(ex, r.numero, 'remplace', motif, par, nouveau);
  await ex.requete(`insert into numero_qc (numero, personne_cle, statut) values ($1, $2, 'actif')`, [nouveau, r.personneCle]);
  await historiser(ex, nouveau, null, 'actif', `Remplace ${r.numero}`, par);
  return { numero: nouveau, personneCle: r.personneCle, statut: 'actif' };
}
