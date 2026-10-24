// Passerelle d'accès : chaque requête dit QUI demande, sur QUI, QUELLE donnée, POURQUOI.
// La passerelle répond oui ou non, avec une raison en mots simples, et tout est inscrit au journal.

import { STATUTS } from './registre.js';

// Catalogue des données : niveau de névralgie (1 = le plus critique) et nature.
export const DONNEES = {
  identite:       { libelle: 'Identité',                    niveau: 1, nature: 'administrative' },
  coordonnees:    { libelle: 'Coordonnées',                 niveau: 2, nature: 'administrative' },
  rendezvous:     { libelle: 'Rendez-vous',                 niveau: 3, nature: 'administrative' },
  notifications:  { libelle: 'Avis et rappels',             niveau: 3, nature: 'administrative' },
  allergies:      { libelle: 'Allergies',                   niveau: 1, nature: 'clinique' },
  medicaments:    { libelle: 'Médicaments',                 niveau: 1, nature: 'clinique' },
  adaptation:     { libelle: 'Besoins d\'adaptation',       niveau: 1, nature: 'clinique' },
  maladies:       { libelle: 'Maladies à risque',           niveau: 1, nature: 'clinique' },
  volontes:       { libelle: 'Volontés et niveau de soins', niveau: 1, nature: 'clinique' },
  vaccins:        { libelle: 'Vaccins',                     niveau: 2, nature: 'clinique' },
  resultats:      { libelle: 'Résultats',                   niveau: 2, nature: 'clinique' },
  rencontres:     { libelle: 'Rencontres',                  niveau: 2, nature: 'clinique' },
  santeSexuelle:  { libelle: 'Santé sexuelle',              niveau: 2, nature: 'clinique', confidentielleAdo: true },
  santeMentale:   { libelle: 'Santé mentale',               niveau: 2, nature: 'clinique', confidentielleAdo: true },
  grossesse:      { libelle: 'Grossesse',                   niveau: 1, nature: 'clinique' },
  journal:        { libelle: 'Journal d\'accès (métadonnées)', niveau: 3, nature: 'technique' },
};

// Procuration : ce que chaque niveau permet
export const NIVEAUX_PROCURATION = {
  1: { nom: 'Être averti', donnees: ['notifications'], actions: ['lire'] },
  2: { nom: 'Organiser',   donnees: ['notifications', 'rendezvous', 'coordonnees', 'identite'], actions: ['lire', 'ecrire'] },
  3: { nom: 'Consulter',   donnees: '*', actions: ['lire', 'ecrire'] },
  4: { nom: 'Représenter', donnees: '*', actions: ['lire', 'ecrire', 'decider'] },
};

/** Âge en années révolues à une date donnée. */
export function age(dateNaissance, maintenant) {
  if (!dateNaissance) return null;
  const n = new Date(dateNaissance);
  let a = maintenant.getFullYear() - n.getFullYear();
  const m = maintenant.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && maintenant.getDate() < n.getDate())) a -= 1;
  return a;
}

export class Passerelle {
  constructor({ registre, journal, procurations = [], liensSoins = [], horloge = () => new Date(), version = '1.4' }) {
    Object.assign(this, { registre, journal, procurations, liensSoins, horloge, version });
  }

  ajouterProcuration(p) { this.procurations.push({ actif: true, ...p }); }
  ajouterLienSoins(l) { this.liensSoins.push(l); }

  /**
   * demandeur : { type: 'personne'|'clinicien'|'bureaucratie'|'admintech', id, numero?, role? }
   * Retour : { permis, raison, urgence }
   */
  decider({ demandeur, sujet, donnee, action = 'lire', motif = '' }) {
    const verdict = this.#evaluer({ demandeur, sujet, donnee, action, motif });
    let sujetNumero = sujet;
    try { sujetNumero = this.registre.resoudre(sujet).fiche.numero; } catch { /* numéro inconnu */ }
    this.journal.ajouter({
      demandeur: { type: demandeur.type, id: demandeur.id ?? demandeur.numero, role: demandeur.role },
      sujet: sujetNumero, donnee, action, motif,
      decision: verdict.permis ? 'permis' : 'refusé', raison: verdict.raison, urgence: !!verdict.urgence,
    });
    return verdict;
  }

  #evaluer({ demandeur, sujet, donnee, action, motif }) {
    const def = DONNEES[donnee];
    if (!def) return non('Donnée inconnue');
    let res;
    try { res = this.registre.resoudre(sujet); } catch (e) { return non(e.message); }
    const { fiche, personne } = res;
    const maintenant = this.horloge();

    // 1. Portes sans contenu clinique
    if (demandeur.type === 'admintech') {
      return def.nature === 'technique' ? oui('Supervision technique') : non('L\'équipe technique ne voit pas le contenu des dossiers');
    }
    if (demandeur.type === 'bureaucratie') {
      if (def.nature !== 'administrative') return non('La bureaucratie ne voit pas le contenu clinique');
      return oui('Gestion administrative');
    }

    // 2. Soignants : lien de soins actif, sinon accès d'urgence justifié
    if (demandeur.type === 'clinicien') {
      if (def.nature === 'technique') return non('Réservé à l\'équipe technique');
      const lien = this.liensSoins.find((l) => l.clinicien === demandeur.id && this.#meme(l.patient, fiche.numero) && (!l.fin || new Date(l.fin) >= maintenant));
      if (lien) return oui(`Lien de soins actif : ${lien.contexte}`);
      if (motif.startsWith('urgence:') && motif.slice(8).trim().length >= 10) {
        return { permis: true, urgence: true, raison: 'Accès d\'urgence : sera revu par Québec Tech' };
      }
      return non('Aucun lien de soins actif avec cette personne');
    }

    // 3. Citoyens : soi-même, parent, ou procuration
    if (demandeur.type === 'personne') {
      if (def.nature === 'technique' && donnee !== 'journal') return non('Donnée technique');
      const moi = this.registre.resoudre(demandeur.numero).fiche.numero;
      const a = age(personne.dateNaissance, maintenant);

      if (this.#meme(moi, fiche.numero)) {
        if (fiche.statut === STATUTS.RESERVE) return non('Profil pas encore né');
        if (a !== null && a < 14 && action !== 'lire') return non('Avant 14 ans, ce sont les parents qui gèrent');
        return oui('Votre propre dossier');
      }

      // Bébé à naître : les parents gestionnaires (la mère d'abord)
      if (fiche.statut === STATUTS.RESERVE) {
        return (personne.parentsGestionnaires ?? []).some((p) => this.#meme(p, moi)) ? oui('Parent du bébé à naître') : non('Seuls les parents gèrent ce profil');
      }
      if (fiche.statut === STATUTS.DECEDE && action !== 'lire') return non('Dossier fermé après le décès');

      // Parents d'un mineur
      const estParent = (personne.parents ?? []).some((p) => this.#meme(p, moi));
      if (estParent && a !== null && a < 18) {
        if (a < 14) return oui('Parent d\'un enfant de moins de 14 ans');
        if (def.confidentielleAdo) return non('Soins confidentiels : à 14 ans, l\'adolescent décide');
        return oui('Parent d\'un adolescent de 14 à 17 ans');
      }

      // Procuration
      const proc = this.procurations.find((p) => p.actif && this.#meme(p.mandant, fiche.numero) && this.#meme(p.mandataire, moi) && (!p.fin || new Date(p.fin) >= maintenant));
      if (proc) {
        if (fiche.statut === STATUTS.DECEDE) return non('La procuration a pris fin au décès');
        const n = NIVEAUX_PROCURATION[proc.niveau];
        const donneeOk = n.donnees === '*' || n.donnees.includes(donnee);
        if (!donneeOk) return non(`Procuration « ${n.nom} » : cette donnée n'est pas incluse`);
        if (!n.actions.includes(action)) return non(`Procuration « ${n.nom} » : action non permise`);
        return oui(`Procuration « ${n.nom} »`);
      }
      return non('Aucun lien autorisé avec cette personne');
    }
    return non('Demandeur inconnu');
  }

  #meme(a, b) {
    try { return this.registre.resoudre(a).fiche.cle === this.registre.resoudre(b).fiche.cle; } catch { return false; }
  }
}

const oui = (raison) => ({ permis: true, raison });
const non = (raison) => ({ permis: false, raison });
