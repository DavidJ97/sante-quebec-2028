/**
 * Règles d'accès de la passerelle.
 *
 * Fonction pure : elle reçoit tout le contexte (qui demande, sur qui, quelle donnée, les procurations
 * et liens de soins en vigueur) et rend un verdict avec une raison lisible. Le serveur charge le contexte,
 * appelle `decider`, inscrit le verdict au journal, puis seulement lit la donnée si c'est permis.
 */

import type { Statut } from './statuts.js';

export type Nature = 'administrative' | 'clinique' | 'technique';

export interface DefinitionDonnee {
  libelle: string;
  /** 1 = le plus névralgique, à voir avant tout soin. */
  niveau: 1 | 2 | 3;
  nature: Nature;
  /** À partir de 14 ans, l'adolescent décide seul qui la voit. */
  confidentielleAdo?: boolean;
}

export const DONNEES = {
  identite: { libelle: 'Identité', niveau: 1, nature: 'administrative' },
  coordonnees: { libelle: 'Coordonnées', niveau: 2, nature: 'administrative' },
  rendezvous: { libelle: 'Rendez-vous', niveau: 3, nature: 'administrative' },
  avis: { libelle: 'Avis et rappels', niveau: 3, nature: 'administrative' },
  allergies: { libelle: 'Allergies', niveau: 1, nature: 'clinique' },
  medicaments: { libelle: 'Médicaments', niveau: 1, nature: 'clinique' },
  adaptation: { libelle: 'Besoins d\'adaptation', niveau: 1, nature: 'clinique' },
  maladies: { libelle: 'Maladies et dispositifs à risque', niveau: 1, nature: 'clinique' },
  volontes: { libelle: 'Volontés et niveau de soins', niveau: 1, nature: 'clinique' },
  vaccins: { libelle: 'Vaccins', niveau: 2, nature: 'clinique' },
  santeSexuelle: { libelle: 'Santé sexuelle', niveau: 2, nature: 'clinique', confidentielleAdo: true },
  santeMentale: { libelle: 'Santé mentale', niveau: 2, nature: 'clinique', confidentielleAdo: true },
  journal: { libelle: 'Journal des accès', niveau: 3, nature: 'technique' },
} as const satisfies Record<string, DefinitionDonnee>;

export type Donnee = keyof typeof DONNEES;
export const LISTE_DONNEES = Object.keys(DONNEES) as Donnee[];
export function estDonnee(x: string): x is Donnee {
  return Object.hasOwn(DONNEES, x);
}

export type Action = 'lire' | 'ecrire' | 'decider';

export const NIVEAUX_PROCURATION = {
  1: { nom: 'Être averti', donnees: ['avis'] as Donnee[] | '*', actions: ['lire'] as Action[] },
  2: { nom: 'Organiser', donnees: ['avis', 'rendezvous', 'coordonnees', 'identite'] as Donnee[] | '*', actions: ['lire', 'ecrire'] as Action[] },
  3: { nom: 'Consulter', donnees: '*' as Donnee[] | '*', actions: ['lire', 'ecrire'] as Action[] },
  4: { nom: 'Représenter', donnees: '*' as Donnee[] | '*', actions: ['lire', 'ecrire', 'decider'] as Action[] },
} as const;
export type NiveauProcuration = keyof typeof NIVEAUX_PROCURATION;

export type Porte = 'clinique' | 'bureaucratie' | 'admintech';

export type Demandeur =
  | { type: 'citoyen'; personneCle: string }
  | { type: 'employe'; id: string; porte: Porte; role: string };

export interface Sujet {
  personneCle: string;
  statut: Statut;
  dateNaissance: string | null;
  parents: readonly string[];
  gestionnairesPrenatals: readonly string[];
}

/** Procuration du sujet vers le demandeur, déjà filtrée sur la période de validité. */
export interface Procuration {
  niveau: NiveauProcuration;
}

/** Lien de soins de l'employé avec le sujet, déjà filtré sur la période de validité. */
export interface LienSoins {
  contexte: string;
  urgence: boolean;
}

export interface Contexte {
  demandeur: Demandeur;
  sujet: Sujet;
  donnee: Donnee;
  action: Action;
  maintenant: Date;
  procurations: readonly Procuration[];
  liensSoins: readonly LienSoins[];
}

export interface Verdict {
  permis: boolean;
  raison: string;
  urgence: boolean;
}

const oui = (raison: string, urgence = false): Verdict => ({ permis: true, raison, urgence });
const non = (raison: string): Verdict => ({ permis: false, raison, urgence: false });

/** Âge en années révolues. */
export function ageA(dateNaissance: string, maintenant: Date): number {
  const [a, m, j] = dateNaissance.split('-').map(Number) as [number, number, number];
  let age = maintenant.getFullYear() - a;
  const mois = maintenant.getMonth() + 1;
  if (mois < m || (mois === m && maintenant.getDate() < j)) age -= 1;
  return age;
}

export const AGE_SOINS_CONFIDENTIELS = 14;
export const AGE_MAJORITE = 18;

export function decider(c: Contexte): Verdict {
  const def: DefinitionDonnee = DONNEES[c.donnee];
  const { demandeur, sujet } = c;

  if (demandeur.type === 'employe') {
    if (demandeur.porte === 'admintech') {
      return def.nature === 'technique' ? oui('Supervision technique') : non('L\'équipe technique ne voit pas le contenu des dossiers');
    }
    if (demandeur.porte === 'bureaucratie') {
      if (def.nature !== 'administrative') return non('Le personnel administratif ne voit pas le contenu clinique');
      if (c.action === 'decider') return non('Action réservée à la personne ou à son représentant');
      return oui('Gestion administrative');
    }
    // Porte clinique
    if (def.nature === 'technique') return non('Réservé à l\'équipe technique');
    if (c.action === 'decider') return non('Action réservée à la personne ou à son représentant');
    // Identifier la personne devant soi est permis à tout soignant ; le reste exige un lien de soins.
    if (c.donnee === 'identite' && c.action === 'lire' && c.liensSoins.length === 0) return oui('Identification du patient');
    const lien = c.liensSoins.find((l) => !l.urgence) ?? c.liensSoins[0];
    if (!lien) return non('Aucun lien de soins actif avec cette personne');
    return lien.urgence ? oui('Accès d\'urgence, revu après coup', true) : oui(`Lien de soins : ${lien.contexte}`);
  }

  // Citoyen
  const soiMeme = demandeur.personneCle === sujet.personneCle;
  const age = sujet.dateNaissance ? ageA(sujet.dateNaissance, c.maintenant) : null;

  if (soiMeme) {
    if (sujet.statut === 'reserve') return non('Profil pas encore né');
    if (age !== null && age < AGE_SOINS_CONFIDENTIELS && c.action !== 'lire') return non('Avant 14 ans, ce sont les parents qui gèrent');
    return oui('Votre propre dossier');
  }

  if (sujet.statut === 'reserve') {
    return sujet.gestionnairesPrenatals.includes(demandeur.personneCle) ? oui('Parent du bébé à naître') : non('Seuls les parents gèrent ce profil');
  }
  if (sujet.statut === 'decede' && c.action !== 'lire') return non('Dossier fermé après le décès');

  if (def.nature === 'technique') return non('Seule la personne voit son journal des accès');

  if (sujet.parents.includes(demandeur.personneCle) && age !== null && age < AGE_MAJORITE && sujet.statut !== 'decede') {
    if (age < AGE_SOINS_CONFIDENTIELS) return oui('Parent d\'un enfant de moins de 14 ans');
    if ('confidentielleAdo' in def && def.confidentielleAdo) return non('Soins confidentiels : dès 14 ans, l\'adolescent décide');
    if (c.action === 'decider') return non('Dès 14 ans, l\'adolescent consent lui-même à ses soins');
    return oui('Parent d\'un adolescent de 14 à 17 ans');
  }

  if (c.procurations.length > 0) {
    if (sujet.statut === 'decede') return non('La procuration a pris fin au décès');
    const meilleure = Math.max(...c.procurations.map((p) => p.niveau)) as NiveauProcuration;
    const n = NIVEAUX_PROCURATION[meilleure];
    if (n.donnees !== '*' && !n.donnees.includes(c.donnee)) return non(`Procuration « ${n.nom} » : cette donnée n'est pas incluse`);
    if (!n.actions.includes(c.action)) return non(`Procuration « ${n.nom} » : action non permise`);
    return oui(`Procuration « ${n.nom} »`);
  }

  return non('Aucun lien autorisé avec cette personne');
}

/** Motifs normalisés d'un accès d'urgence (« bris de verre »). « autre » exige une précision écrite. */
export const MOTIFS_URGENCE = {
  inconscient: 'Patient inconscient ou incapable de communiquer',
  urgence_vitale: 'Urgence vitale en cours',
  transfert: 'Transfert d\'un autre établissement, dossier non reçu',
  inapte: 'Patient inapte à consentir, aucun représentant joignable',
  autre: 'Autre motif (préciser)',
} as const;
export type MotifUrgence = keyof typeof MOTIFS_URGENCE;
export const DUREE_ACCES_URGENCE_H = 12;
