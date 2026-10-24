// Monde de démonstration : personnes et dossiers FICTIFS.
// Toutes les lectures de dossiers passent par la passerelle, donc chaque clic s'inscrit au journal.

import { Registre, Journal, Passerelle, formater } from '../core/index.js';

export const AUJOURDHUI = new Date('2026-10-24T09:30:00-04:00');

function graine(s) { return (max) => { s = (s * 1103515245 + 12345) % 2147483648; return s % max; }; }

export function creerMonde() {
  let minutes = 0;
  // Horloge de démo : avance d'une minute à chaque action pour un journal lisible
  const horloge = () => new Date(AUJOURDHUI.getTime() + (minutes++) * 60000);
  const registre = new Registre({ aleatoire: graine(2037), horloge });
  const journal = new Journal({ horloge });
  const passerelle = new Passerelle({ registre, journal, horloge });

  const p = {};
  p.gisele = registre.inscrire({ prenom: 'Gisèle', nom: 'Tremblay', dateNaissance: '1939-05-02', sexe: 'F', ville: 'Trois-Rivières', telephone: '819 555-0132', modeSimplifie: true }, { nam: 'TREG39550211', numero: '48291357066' });
  p.nadia = registre.inscrire({ prenom: 'Nadia', nom: 'Tremblay', dateNaissance: '1968-01-20', sexe: 'F', ville: 'Montréal', telephone: '514 555-0147' }, { nam: 'TREN68512014' });
  p.marc = registre.inscrire({ prenom: 'Marc', nom: 'Tremblay', dateNaissance: '1971-06-04', sexe: 'M', ville: 'Québec', telephone: '418 555-0190' });
  p.sarah = registre.inscrire({ prenom: 'Sarah', nom: 'Lavoie', dateNaissance: '1994-03-11', sexe: 'F', ville: 'Montréal', telephone: '514 555-0163' }, { numero: '51964037286' });
  p.kevin = registre.inscrire({ prenom: 'Kevin', nom: 'N\'Diaye', dateNaissance: '1992-08-30', sexe: 'M', ville: 'Montréal', telephone: '514 555-0178' });
  p.leo = registre.inscrire({ prenom: 'Léo', nom: 'Tremblay', dateNaissance: '2011-02-14', sexe: 'M', ville: 'Québec' });
  p.mj = registre.inscrire({ prenom: 'Marie-Josée', nom: 'Bélanger', dateNaissance: '1961-02-14', sexe: 'F', ville: 'Shawinigan', lieuNaissance: 'Trois-Rivières' }, { nam: 'BELM61521412', numero: '26840173959' });
  registre.personne(p.nadia).parents.push(p.gisele);
  registre.personne(p.marc).parents.push(p.gisele);
  registre.personne(p.sarah).parents.push(p.nadia);
  registre.personne(p.leo).parents.push(p.marc);

  // Bébé à naître de Sarah : numéro réservé, second parent pas encore déclaré à l'État civil
  p.bebe = registre.reserver({ mere: p.sarah, dateprevue: '2027-01-09', numero: '73102284591' });
  // Fiche venue d'un ancien système d'hôpital, peut-être la même que Marie-Josée
  p.temp = registre.temporaire('Marie Josee Belanger, née le 14 février 1961, adresse Trois-Rivières (2014)', { numero: '90473528165' });
  Object.assign(registre.personne(p.temp), { prenom: 'Marie Josee', nom: 'Belanger', dateNaissance: '1961-02-14', sexe: 'F', ville: 'Trois-Rivières (2014)', source: 'Hôpital, dossier 448210' });

  passerelle.ajouterProcuration({ mandant: p.gisele, mandataire: p.nadia, niveau: 2, fin: '2027-12-31' });
  passerelle.ajouterLienSoins({ clinicien: 'dr-roy', patient: p.gisele, contexte: 'Médecin de famille', fin: null });

  const dossiers = {
    [p.gisele]: {
      allergies: [{ substance: 'Pénicilline', reaction: 'anaphylaxie', certitude: 'confirmée', grave: true }, { substance: 'Arachides', reaction: 'urticaire', certitude: 'soupçonnée' }],
      medicaments: [
        { nom: 'Apixaban 5 mg', posologie: '2 fois par jour', note: 'anticoagulant', moments: ['Matin', 'Soir'] },
        { nom: 'Metformine 500 mg', posologie: '2 fois par jour', moments: ['Matin', 'Soir'] },
        { nom: 'Ramipril 5 mg', posologie: '1 fois par jour', moments: ['Matin'] },
      ],
      adaptation: [{ titre: 'Malentendante', detail: 'parler lentement, face à elle ; appareil auditif à droite' }, { titre: 'Mobilité', detail: 'marchette ; transfert assisté' }],
      maladies: ['Fibrillation auriculaire', 'Diabète de type 2', 'Stimulateur cardiaque : vérifier avant une IRM'],
      volontes: { niveauSoins: 'C', directives: 'au registre' },
      vaccins: [{ nom: 'Grippe saisonnière', date: '2025-10-18' }, { nom: 'Zona (2 doses)', date: '2024-04-02' }, { nom: 'COVID-19', date: '2025-10-18' }],
      rendezvous: [
        { id: 'r1', quoi: 'Prise de sang', ou: 'CLSC du Cap', adresse: '1350, rue du Moulin, Trois-Rivières', quand: '2026-10-28T09:30', statut: 'proposé' },
        { id: 'r2', quoi: 'Vaccin contre la grippe', ou: 'Pharmacie Lemire', adresse: '2200, boul. des Forges, Trois-Rivières', quand: '2026-11-04T10:15', statut: 'confirmé', note: 'Proposé près de votre anniversaire de vaccination de l\'an dernier' },
        { id: 'r3', quoi: 'Suivi, médecin de famille', ou: 'GMF des Forges', adresse: '4000, boul. des Forges, Trois-Rivières', quand: '2026-11-19T14:00', statut: 'confirmé' },
      ],
    },
    [p.sarah]: {
      allergies: [], medicaments: [{ nom: 'Acide folique 1 mg', posologie: '1 fois par jour', moments: ['Matin'] }],
      grossesse: { semaines: 28, dateprevue: '2027-01-09', hopital: 'CHU Sainte-Justine' },
      rendezvous: [{ id: 's1', quoi: 'Échographie du 3e trimestre', ou: 'CHU Sainte-Justine', adresse: '3175, ch. de la Côte-Sainte-Catherine, Montréal', quand: '2026-11-02T08:45', statut: 'confirmé' }],
    },
    [p.bebe]: { choixPrenataux: { vrs: null, vitamineK: null, onguent: null } },
    [p.leo]: { vaccins: [{ nom: 'VPH', date: '2020-10-05' }], santeSexuelle: [{ note: 'Consultation confidentielle, CLSC' }] },
  };

  // Quelques accès passés pour remplir le journal
  passerelle.decider({ demandeur: { type: 'clinicien', id: 'dr-roy', role: 'Médecin de famille' }, sujet: p.gisele, donnee: 'medicaments' });
  passerelle.decider({ demandeur: { type: 'clinicien', id: 'pharm-lemire', role: 'Pharmacienne' }, sujet: p.gisele, donnee: 'allergies' });
  passerelle.decider({ demandeur: { type: 'clinicien', id: 'inf-gagne', role: 'Infirmière, urgence' }, sujet: p.gisele, donnee: 'allergies', motif: 'urgence: chute à domicile, arrivée en ambulance, confuse' });
  passerelle.decider({ demandeur: { type: 'personne', numero: p.nadia }, sujet: p.gisele, donnee: 'rendezvous' });
  for (let i = 0; i < 12; i++) passerelle.decider({ demandeur: { type: 'bureaucratie', id: 'agent-207', role: 'Agent administratif' }, sujet: p.mj, donnee: 'coordonnees' });

  return { registre, journal, passerelle, dossiers, p, formater };
}

/** Lit une donnée en passant par la passerelle. Renvoie { permis, raison, valeur }. */
export function lire(monde, demandeur, sujet, donnee, motif) {
  const v = monde.passerelle.decider({ demandeur, sujet, donnee, action: 'lire', motif });
  const cle = monde.registre.resoudre(sujet).fiche.numero;
  return { ...v, valeur: v.permis ? monde.dossiers[cle]?.[donnee] : undefined };
}

export function nomComplet(monde, numero) {
  const pers = monde.registre.personne(numero);
  return [pers.prenom, pers.nom].filter(Boolean).join(' ') || 'Bébé à naître';
}

export const DEMANDEURS = {
  'dr-roy': 'Dr Roy, médecin de famille',
  'pharm-lemire': 'Pharmacie Lemire',
  'inf-gagne': 'Infirmière, urgence de Trois-Rivières',
  'dre-ouellet': 'Dre Ouellet, urgence',
  'agent-207': 'Agent administratif 207',
  'agent-gagnon': 'M. Gagnon, registre',
  'qt-garde': 'Québec Tech, équipe de garde',
};
