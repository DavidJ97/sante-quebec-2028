/**
 * Données de départ FICTIVES pour le développement : une famille sur quatre générations, du personnel,
 * des procurations et un dossier clinique de base. Aucune personne réelle.
 *
 * Utilisation : npm run seed   (repart d'une base vide)
 */

import { rm } from 'node:fs/promises';
import type { Base, Executeur } from './db.js';
import * as registre from './registre.js';
import { autoriser } from './passerelle.js';

const PAR = 'donnees-de-depart';

export async function semer(base: Base): Promise<Record<string, string>> {
  return base.transaction(async (tx) => {
    const n: Record<string, string> = {};
    const cle: Record<string, string> = {};
    const inscrire = async (id: string, p: Parameters<typeof registre.inscrire>[1], coord: Coord) => {
      const r = await registre.inscrire(tx, p, PAR);
      n[id] = r.numero; cle[id] = r.personneCle;
      await coordonnees(tx, r.personneCle, coord);
    };

    await inscrire('gisele', { prenom: 'Gisèle', nom: 'Tremblay', dateNaissance: '1939-05-02', sexe: 'F', lieu: 'Trois-Rivières', nam: 'TREG39550211', numero: '48291357066' },
      { adresse: '1250, rue Laviolette', ville: 'Trois-Rivières', codePostal: 'G9A 1W2', telephone: '819 555-0132', modeSimplifie: true });
    await inscrire('nadia', { prenom: 'Nadia', nom: 'Tremblay', dateNaissance: '1968-01-20', sexe: 'F', nam: 'TREN68512014', numero: '30618429756' },
      { adresse: '4410, rue Saint-Denis', ville: 'Montréal', codePostal: 'H2J 2L1', telephone: '514 555-0147' });
    await inscrire('marc', { prenom: 'Marc', nom: 'Tremblay', dateNaissance: '1971-06-04', sexe: 'M', numero: '66049172384' },
      { adresse: '88, rue Saint-Jean', ville: 'Québec', codePostal: 'G1R 1N4', telephone: '418 555-0190' });
    await inscrire('sarah', { prenom: 'Sarah', nom: 'Lavoie', dateNaissance: '1994-03-11', sexe: 'F', numero: '51964037286' },
      { adresse: '2730, rue Masson', ville: 'Montréal', codePostal: 'H1Y 1W4', telephone: '514 555-0163' });
    await inscrire('kevin', { prenom: 'Kevin', nom: 'N\'Diaye', dateNaissance: '1992-08-30', sexe: 'M', numero: '81527304965' },
      { adresse: '2730, rue Masson', ville: 'Montréal', codePostal: 'H1Y 1W4', telephone: '514 555-0178' });
    await inscrire('leo', { prenom: 'Léo', nom: 'Tremblay', dateNaissance: '2011-02-14', sexe: 'M', numero: '17390582641' },
      { adresse: '88, rue Saint-Jean', ville: 'Québec', codePostal: 'G1R 1N4', telephone: '418 555-0191' });
    await inscrire('mj', { prenom: 'Marie-Josée', nom: 'Bélanger', dateNaissance: '1961-02-14', sexe: 'F', lieu: 'Trois-Rivières', nam: 'BELM61521412', numero: '26840173959' },
      { adresse: '510, 5e Rue', ville: 'Shawinigan', codePostal: 'G9N 1E6', telephone: '819 555-0110' });

    const filiation = async (enfant: string, parent: string) =>
      tx.requete('insert into filiation (enfant_cle, parent_cle) values ($1, $2)', [cle[enfant], cle[parent]]);
    await filiation('nadia', 'gisele');
    await filiation('marc', 'gisele');
    await filiation('sarah', 'nadia');
    await filiation('leo', 'marc');

    // Bébé à naître de Sarah, numéro réservé
    const bebe = await registre.reserver(tx, { mere: n.sarah!, datePrevue: '2027-01-09', numero: '73102284591' }, PAR);
    n.bebe = bebe.numero;

    // Fiche venue d'un ancien système d'hôpital
    const [{ cle: tmp }] = (await tx.requete<{ cle: string }>(
      `insert into personne (prenom, nom, date_naissance, sexe_naissance) values ('Marie Josee', 'Belanger', '1961-02-14', 'F') returning cle`)) as [{ cle: string }];
    await tx.requete(`insert into numero_qc (numero, personne_cle, statut) values ('90473528165', $1, 'temporaire')`, [tmp]);
    n.temporaire = '90473528165';

    // Procuration : Nadia organise pour sa mère
    await tx.requete(`insert into procuration (mandant_cle, mandataire_cle, niveau, debut, fin) values ($1, $2, 2, '2025-03-01', '2027-12-31')`, [cle.gisele, cle.nadia]);

    // Personnel
    await tx.requete(`insert into employe (id, nom, role, porte, etablissement, telephone) values
      ('aouellet', 'Dre Anne Ouellet', 'Médecin d''urgence', 'clinique', 'CHU de Trois-Rivières', '819 555-0901'),
      ('proy', 'Dr Pierre Roy', 'Médecin de famille', 'clinique', 'GMF des Forges', '819 555-0902'),
      ('mgagnon', 'Martin Gagnon', 'Agent du registre', 'bureaucratie', 'Santé Québec, registre', '418 555-0903'),
      ('lchen', 'Li Chen', 'Exploitation', 'admintech', 'Québec Tech', '514 555-0904'),
      ('jlemire', 'Julie Lemire', 'Pharmacienne', 'clinique', 'Pharmacie Lemire, Trois-Rivières', '819 555-0905'),
      ('sdube', 'Sophie Dubé', 'Infirmière clinicienne', 'clinique', 'CHU Sainte-Justine', '514 555-0906')`);
    await tx.requete(`insert into lien_soins (employe_id, personne_cle, contexte, debut) values
      ('proy', $1, 'Médecin de famille', '2015-01-01'),
      ('jlemire', $1, 'Pharmacie habituelle', '2018-01-01'),
      ('sdube', $2, 'Suivi de grossesse', '2026-06-01')`, [cle.gisele, cle.sarah]);

    // Dossier clinique de Gisèle
    await tx.requete(`insert into allergie (personne_cle, substance, reaction, gravite, certitude, inscrite_par) values
      ($1, 'Pénicilline', 'Anaphylaxie', 'grave', 'confirmee', 'proy'),
      ($1, 'Arachides', 'Urticaire', 'moderee', 'soupconnee', 'proy')`, [cle.gisele]);
    await tx.requete(`insert into medicament (personne_cle, nom, posologie, moments, mise_en_garde, source) values
      ($1, 'Apixaban 5 mg', '1 comprimé 2 fois par jour', '{matin,soir}', 'Anticoagulant', 'Dossier santé Québec'),
      ($1, 'Metformine 500 mg', '1 comprimé 2 fois par jour, en mangeant', '{matin,soir}', null, 'Dossier santé Québec'),
      ($1, 'Ramipril 5 mg', '1 capsule par jour', '{matin}', null, 'Dossier santé Québec')`, [cle.gisele]);
    await tx.requete(`insert into besoin_adaptation (personne_cle, titre, detail) values
      ($1, 'Malentendante', 'Parler lentement, face à elle. Appareil auditif à droite.'),
      ($1, 'Mobilité réduite', 'Marchette. Transfert avec aide.')`, [cle.gisele]);
    await tx.requete(`insert into maladie (personne_cle, libelle, dispositif, depuis) values
      ($1, 'Fibrillation auriculaire', false, '2019-03-01'),
      ($1, 'Diabète de type 2', false, '2012-06-01'),
      ($1, 'Stimulateur cardiaque', true, '2021-09-14')`, [cle.gisele]);
    await tx.requete(`insert into volonte (personne_cle, niveau_soins, directives, don_organes) values ($1, 'C', true, false)`, [cle.gisele]);
    await tx.requete(`insert into vaccin (personne_cle, donne_le, produit, lieu) values
      ($1, '2025-10-18', 'Grippe saisonnière', 'Pharmacie Lemire, Trois-Rivières'),
      ($1, '2025-10-18', 'COVID-19', 'Pharmacie Lemire, Trois-Rivières'),
      ($1, '2024-04-02', 'Zona, 2e dose', 'GMF des Forges'),
      ($1, '2023-11-20', 'Zona, 1re dose', 'GMF des Forges')`, [cle.gisele]);

    // Rendez-vous : relatifs à aujourd'hui pour que la démo reste vivante
    const dans = (jours: number, heure: string) => {
      const d = new Date();
      d.setDate(d.getDate() + jours);
      const [h, m] = heure.split(':').map(Number) as [number, number];
      d.setHours(h, m, 0, 0);
      return d.toISOString();
    };
    await tx.requete(`insert into rendez_vous (personne_cle, objet, lieu, adresse, debut, statut, note) values
      ($1, 'Prise de sang', 'CLSC du Cap', '1350, rue du Moulin, Trois-Rivières', $2, 'propose', 'À jeun depuis minuit'),
      ($1, 'Vaccin contre la grippe', 'Pharmacie Lemire', '2200, boul. des Forges, Trois-Rivières', $3, 'confirme', null),
      ($1, 'Suivi avec le Dr Roy', 'GMF des Forges', '4000, boul. des Forges, Trois-Rivières', $4, 'confirme', null)`,
      [cle.gisele, dans(4, '09:30'), dans(11, '10:15'), dans(26, '14:00')]);

    // Sarah : allergies vérifiées par l'infirmière, aucune trouvée (constat explicite)
    await tx.requete(`insert into constat_absence (personne_cle, domaine, verifie_le, verifie_par) values ($1, 'allergies', '2026-06-12T14:20:00Z', 'sdube')`, [cle.sarah]);
    await tx.requete(`insert into medicament (personne_cle, nom, posologie, moments, source) values ($1, 'Acide folique 1 mg', '1 comprimé par jour', '{matin}', 'Dossier santé Québec')`, [cle.sarah]);
    await tx.requete(`insert into rendez_vous (personne_cle, objet, lieu, adresse, debut, statut) values
      ($1, 'Échographie du 3e trimestre', 'CHU Sainte-Justine', '3175, ch. de la Côte-Sainte-Catherine, Montréal', $2, 'confirme')`, [cle.sarah, dans(9, '08:45')]);

    // Léo
    await tx.requete(`insert into vaccin (personne_cle, donne_le, produit, lieu, note) values
      ($1, '2020-10-05', 'VPH', 'École primaire', '4e année'),
      ($1, '2025-10-14', 'Hépatite B, dT, Méningocoque ACYW', 'École secondaire', 'Secondaire 3')`, [cle.leo]);

    // Historique réel du journal : ces consultations passent par la passerelle, à des dates passées.
    const il = (jours: number, h: number) => { const d = new Date(); d.setDate(d.getDate() - jours); d.setHours(h, 12, 0, 0); return d; };
    const roy = { type: 'employe' as const, id: 'proy', porte: 'clinique' as const, role: 'Médecin de famille' };
    const lemire = { type: 'employe' as const, id: 'jlemire', porte: 'clinique' as const, role: 'Pharmacienne' };
    const nadia = { type: 'citoyen' as const, personneCle: cle.nadia! };
    await autoriser(tx, roy, n.gisele!, 'medicaments', 'lire', '', il(21, 10));
    await autoriser(tx, roy, n.gisele!, 'maladies', 'lire', '', il(21, 10));
    await autoriser(tx, lemire, n.gisele!, 'allergies', 'lire', '', il(9, 15));
    await autoriser(tx, lemire, n.gisele!, 'medicaments', 'lire', '', il(9, 15));
    await autoriser(tx, nadia, n.gisele!, 'rendezvous', 'lire', '', il(2, 19));

    return n;
  });
}

interface Coord { adresse: string; ville: string; codePostal: string; telephone: string; modeSimplifie?: boolean }
async function coordonnees(tx: Executeur, cle: string, c: Coord) {
  await tx.requete(
    'insert into coordonnees (personne_cle, adresse, ville, code_postal, telephone, mode_simplifie) values ($1, $2, $3, $4, $5, $6)',
    [cle, c.adresse, c.ville, c.codePostal, c.telephone, c.modeSimplifie ?? false]);
}

// Exécution directe : base de développement neuve
if (import.meta.url === `file://${process.argv[1]}`) {
  const { ouvrirBase, migrer } = await import('./db.js');
  if (process.env.DATABASE_URL) throw new Error('Le semis ne s\'exécute que sur la base de développement locale');
  await rm(new URL('../../../.donnees/pglite', import.meta.url), { recursive: true, force: true });
  const base = ouvrirBase();
  await migrer(base);
  const n = await semer(base);
  await base.fermer();
  console.info('Base de développement prête. Numéros :', n);
}
