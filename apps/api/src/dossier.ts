/** Lecture des données d'un dossier. À n'appeler qu'après `autoriser`. */

import type { Donnee } from '@sante/noyau';
import type { Executeur } from './db.js';

type Lecteur = (ex: Executeur, cle: string) => Promise<unknown>;

export const LECTEURS: Partial<Record<Donnee, Lecteur>> = {
  identite: async (ex, cle) => {
    const [p] = await ex.requete(
      `select prenom, nom, date_naissance::text as "dateNaissance", date_prevue::text as "datePrevue",
              sexe_naissance as "sexe", lieu_naissance as "lieuNaissance", date_deces::text as "dateDeces",
              (select prise_le::text from photo where personne_cle = $1 order by prise_le desc limit 1) as "photoPriseLe"
         from personne where cle = $1`, [cle]);
    return p ?? null;
  },
  coordonnees: async (ex, cle) => {
    const [c] = await ex.requete(
      `select adresse, ville, code_postal as "codePostal", telephone, courriel, langue, mode_simplifie as "modeSimplifie"
         from coordonnees where personne_cle = $1`, [cle]);
    return c ?? null;
  },
  rendezvous: (ex, cle) => ex.requete(
    `select id::text, objet, lieu, adresse, debut, statut, note from rendez_vous
      where personne_cle = $1 and statut <> 'annule' and debut >= now() - interval '1 day' order by debut`, [cle]),
  /**
   * Trois états, jamais confondus :
   * - presentes : au moins une allergie inscrite ;
   * - aucune_connue : un professionnel a vérifié et constaté l'absence (constat daté et signé) ;
   * - non_documente : personne n'a encore vérifié. Une liste vide ne veut PAS dire « aucune ».
   */
  allergies: async (ex, cle) => {
    const elements = await ex.requete(
      `select id::text, substance, reaction, gravite, certitude, inscrite_le as "inscriteLe" from allergie
        where personne_cle = $1 order by (gravite = 'grave') desc, substance`, [cle]);
    const [c] = await ex.requete<{ le: Date; par: string }>(
      `select c.verifie_le as le, e.nom || ', ' || e.role as par from constat_absence c join employe e on e.id = c.verifie_par
        where c.personne_cle = $1 and c.domaine = 'allergies'`, [cle]);
    const etat = elements.length ? 'presentes' : c ? 'aucune_connue' : 'non_documente';
    return { etat, elements, verification: !elements.length && c ? { le: c.le, par: c.par } : null };
  },
  medicaments: (ex, cle) => ex.requete(
    `select id::text, nom, posologie, moments, mise_en_garde as "miseEnGarde", source from medicament
      where personne_cle = $1 and actif order by nom`, [cle]),
  adaptation: (ex, cle) => ex.requete('select id::text, titre, detail from besoin_adaptation where personne_cle = $1 order by id', [cle]),
  maladies: (ex, cle) => ex.requete(
    'select id::text, libelle, dispositif, depuis::text, note from maladie where personne_cle = $1 order by dispositif, libelle', [cle]),
  volontes: async (ex, cle) => {
    const [v] = await ex.requete(
      `select niveau_soins as "niveauSoins", directives, don_organes as "donOrganes" from volonte where personne_cle = $1`, [cle]);
    return v ?? null;
  },
  vaccins: (ex, cle) => ex.requete(
    `select id::text, donne_le::text as "donneLe", produit, lieu, note from vaccin where personne_cle = $1 order by donne_le desc`, [cle]),
};

export const FICHE_URGENCE: Donnee[] = ['allergies', 'medicaments', 'adaptation', 'maladies', 'volontes'];
