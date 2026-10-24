// Registre des personnes : une seule autorité attribue les numéros QC.
// Chaque personne a une clé interne invisible (permanente) et un numéro public (remplaçable après fraude).
// Rien n'est jamais supprimé ; un numéro n'est jamais réattribué, même après un décès.

import { generer, estValide, normaliser } from './numero.js';

export const STATUTS = Object.freeze({
  RESERVE: 'Réservé',
  ACTIF: 'Actif',
  TEMPORAIRE: 'Temporaire',
  DECEDE: 'Décédé',
  FUSIONNE: 'Fusionné',
  REMPLACE: 'Remplacé',
  ANNULE: 'Annulé',
});

// Transitions permises : statut de départ → statuts d'arrivée
const TRANSITIONS = {
  [STATUTS.RESERVE]: [STATUTS.ACTIF, STATUTS.ANNULE],
  [STATUTS.TEMPORAIRE]: [STATUTS.ACTIF, STATUTS.FUSIONNE, STATUTS.DECEDE],
  [STATUTS.ACTIF]: [STATUTS.DECEDE, STATUTS.FUSIONNE, STATUTS.REMPLACE],
  [STATUTS.DECEDE]: [],
  [STATUTS.FUSIONNE]: [],
  [STATUTS.REMPLACE]: [],
  [STATUTS.ANNULE]: [],
};

export class ErreurRegistre extends Error {}

export class Registre {
  constructor({ aleatoire, horloge = () => new Date() } = {}) {
    this.aleatoire = aleatoire;
    this.horloge = horloge;
    this.numeros = new Map();      // numéro public → fiche de numéro
    this.personnes = new Map();    // clé interne → personne
    this.correspondanceNAM = new Map(); // NAM → clé interne
    this.compteur = 0;
  }

  // ---------- outils internes ----------
  #nouveauNumero() {
    return generer({ aleatoire: this.aleatoire, existe: (n) => this.numeros.has(n) });
  }
  #nouvelleCle() {
    this.compteur += 1;
    return `P-${String(this.compteur).padStart(8, '0')}`;
  }
  #changerStatut(fiche, statut, motif, extra = {}) {
    if (!TRANSITIONS[fiche.statut].includes(statut)) {
      throw new ErreurRegistre(`Passage impossible : ${fiche.statut} → ${statut}`);
    }
    fiche.historique.push({ de: fiche.statut, a: statut, motif, le: this.horloge().toISOString() });
    fiche.statut = statut;
    Object.assign(fiche, extra);
  }
  #inscrire(cle, statut, motif) {
    const numero = this.#nouveauNumero();
    const fiche = { numero, cle, statut, historique: [{ de: null, a: statut, motif, le: this.horloge().toISOString() }] };
    this.numeros.set(numero, fiche);
    return fiche;
  }

  // ---------- lecture ----------
  fiche(numero) {
    const n = normaliser(numero);
    if (!estValide(n)) throw new ErreurRegistre('Numéro invalide');
    const f = this.numeros.get(n);
    if (!f) throw new ErreurRegistre('Numéro inconnu');
    return f;
  }

  /** Suit les renvois (fusion, remplacement) jusqu'au numéro en vigueur. */
  resoudre(numero) {
    let f = this.fiche(numero);
    const vus = new Set();
    while (f.renvoieVers && !vus.has(f.numero)) {
      vus.add(f.numero);
      f = this.numeros.get(f.renvoieVers);
    }
    return { fiche: f, personne: this.personnes.get(f.cle) };
  }

  personne(numero) { return this.resoudre(numero).personne; }

  // ---------- opérations ----------
  /** Inscrit une personne déjà née (migration depuis la RAMQ, nouvel arrivant). */
  inscrire(donnees, { nam } = {}) {
    const cle = this.#nouvelleCle();
    const fiche = this.#inscrire(cle, STATUTS.ACTIF, 'Inscription');
    this.personnes.set(cle, { cle, numero: fiche.numero, parents: [], ...donnees });
    if (nam) this.lierNAM(nam, fiche.numero);
    return fiche.numero;
  }

  /** Réserve un numéro pour un bébé, environ un mois avant la naissance prévue. */
  reserver({ mere, dateprevue }) {
    const m = this.resoudre(mere);
    if (m.fiche.statut !== STATUTS.ACTIF) throw new ErreurRegistre('La mère doit avoir un numéro actif');
    const cle = this.#nouvelleCle();
    const fiche = this.#inscrire(cle, STATUTS.RESERVE, 'Réservation prénatale');
    this.personnes.set(cle, { cle, numero: fiche.numero, nom: null, prenom: null, dateprevue, parents: [m.fiche.numero], parentsGestionnaires: [m.fiche.numero] });
    return fiche.numero;
  }

  /** Ajoute le second parent selon la déclaration de l'État civil (jamais par un test biologique). */
  ajouterParent(enfant, parent, { source = 'État civil' } = {}) {
    const e = this.resoudre(enfant).personne;
    const p = this.resoudre(parent).fiche.numero;
    if (source !== 'État civil') throw new ErreurRegistre('La filiation vient seulement de l\'État civil');
    if (e.parents.includes(p)) return;
    if (e.parents.length >= 2) throw new ErreurRegistre('Deux parents sont déjà inscrits');
    e.parents.push(p);
    e.parentsGestionnaires = [...new Set([...(e.parentsGestionnaires ?? []), p])];
  }

  /** Activation à la naissance : le bébé est couvert dans les 48 heures. */
  activer(numero, { prenom, nom, dateNaissance, sexe, lieu }) {
    const f = this.fiche(numero);
    this.#changerStatut(f, STATUTS.ACTIF, 'Naissance déclarée');
    Object.assign(this.personnes.get(f.cle), { prenom, nom, dateNaissance, sexe, lieu });
    return f.numero;
  }

  annuler(numero, motif) { this.#changerStatut(this.fiche(numero), STATUTS.ANNULE, motif); }

  /** Personne inconnue arrivée à l'urgence : numéro temporaire, fusionné plus tard. */
  temporaire(description) {
    const cle = this.#nouvelleCle();
    const fiche = this.#inscrire(cle, STATUTS.TEMPORAIRE, 'Personne non identifiée');
    this.personnes.set(cle, { cle, numero: fiche.numero, description, parents: [] });
    return fiche.numero;
  }

  deces(numero, date) {
    const { fiche } = this.resoudre(numero);
    this.#changerStatut(fiche, STATUTS.DECEDE, 'Décès confirmé par l\'État civil', { dateDeces: date });
  }

  /** Deux fiches sont la même personne : le perdant renvoie vers le gagnant, rien n'est supprimé. */
  fusionner(perdant, gagnant) {
    const fp = this.fiche(perdant);
    const fg = this.resoudre(gagnant).fiche;
    if (fp.numero === fg.numero) throw new ErreurRegistre('Même numéro');
    this.#changerStatut(fp, STATUTS.FUSIONNE, `Fusionné avec ${fg.numero}`, { renvoieVers: fg.numero });
    for (const [nam, cle] of this.correspondanceNAM) if (cle === fp.cle) this.correspondanceNAM.set(nam, fg.cle);
  }

  /** Après une fraude : nouveau numéro public, même personne (même clé interne). */
  remplacer(numero, motif = 'Fraude') {
    const f = this.fiche(numero);
    const nouvelle = this.#inscrire(f.cle, STATUTS.ACTIF, `Remplace ${f.numero}`);
    this.#changerStatut(f, STATUTS.REMPLACE, motif, { renvoieVers: nouvelle.numero });
    this.personnes.get(f.cle).numero = nouvelle.numero;
    return nouvelle.numero;
  }

  // ---------- correspondance avec le NAM ----------
  lierNAM(nam, numero) {
    const n = String(nam).toUpperCase().replace(/\s/g, '');
    if (!/^[A-Z]{4}\d{8}$/.test(n)) throw new ErreurRegistre('NAM mal formé');
    this.correspondanceNAM.set(n, this.resoudre(numero).fiche.cle);
  }
  parNAM(nam) {
    const cle = this.correspondanceNAM.get(String(nam).toUpperCase().replace(/\s/g, ''));
    return cle ? this.personnes.get(cle).numero : null;
  }

  /** Accepte un numéro QC ou un NAM. */
  chercher(saisie) {
    if (estValide(saisie)) return this.resoudre(saisie);
    const n = this.parNAM(saisie);
    return n ? this.resoudre(n) : null;
  }
}
