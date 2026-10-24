// Journal d'accès inviolable : chaque entrée contient l'empreinte de la précédente.
// Modifier ou retirer une entrée casse la chaîne, et verifier() le détecte.

import { sha256 } from './sha256.js';

export class Journal {
  constructor({ horloge = () => new Date() } = {}) {
    this.entrees = [];
    this.horloge = horloge;
  }

  ajouter({ demandeur, sujet, donnee, action, motif, decision, raison, urgence = false }) {
    const precedente = this.entrees.at(-1)?.empreinte ?? '0'.repeat(64);
    const contenu = {
      no: this.entrees.length + 1,
      le: this.horloge().toISOString(),
      demandeur, sujet, donnee, action, motif, decision, raison, urgence,
      precedente,
    };
    const entree = { ...contenu, empreinte: sha256(JSON.stringify(contenu)) };
    this.entrees.push(entree);
    return entree;
  }

  /** Renvoie { intact: true } ou { intact: false, no } à la première entrée altérée. */
  verifier() {
    let precedente = '0'.repeat(64);
    for (const e of this.entrees) {
      const { empreinte, ...contenu } = e;
      if (contenu.precedente !== precedente || sha256(JSON.stringify(contenu)) !== empreinte) {
        return { intact: false, no: e.no };
      }
      precedente = empreinte;
    }
    return { intact: true, total: this.entrees.length };
  }

  /** Ce que la personne voit dans « Qui a vu mon dossier ». */
  pourSujet(numero) { return this.entrees.filter((e) => e.sujet === numero); }

  /** Accès d'urgence à revoir par l'équipe de Québec Tech. */
  urgences() { return this.entrees.filter((e) => e.urgence); }

  /** Alerte : même demandeur, même dossier, au moins `seuil` lectures dans la fenêtre. */
  alertes({ seuil = 10, fenetreMinutes = 120 } = {}) {
    const groupes = new Map();
    for (const e of this.entrees) {
      if (e.demandeur.id === e.sujet) continue; // consulter son propre dossier n'est jamais suspect
      const k = `${e.demandeur.id}|${e.sujet}`;
      if (!groupes.has(k)) groupes.set(k, []);
      groupes.get(k).push(new Date(e.le).getTime());
    }
    const res = [];
    for (const [k, temps] of groupes) {
      temps.sort((a, b) => a - b);
      let max = 0;
      for (let i = 0, j = 0; j < temps.length; j++) {
        while (temps[j] - temps[i] > fenetreMinutes * 60000) i++;
        max = Math.max(max, j - i + 1);
      }
      if (max >= seuil) {
        const [demandeur, sujet] = k.split('|');
        res.push({ demandeur, sujet, nombre: max });
      }
    }
    return res;
  }
}
