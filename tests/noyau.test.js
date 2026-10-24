import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  estValide, formater, generer, diagnostiquer, dammControle,
  Registre, STATUTS, ErreurRegistre, liensLisibles, Journal, Passerelle, sha256,
} from '../core/index.js';

// Générateur déterministe pour des tests reproductibles
function graine(s = 42) { return (max) => { s = (s * 1103515245 + 12345) % 2147483648; return s % max; }; }
const HORLOGE = () => new Date('2026-10-24T10:00:00Z');

test('numéros d\'exemple du plan valides', () => {
  for (const n of ['QC 4829 1357 066', 'QC 7310 2284 591', 'QC 5196 4037 286', 'QC 2684 0173 959', 'QC 9047 3528 165']) {
    assert.ok(estValide(n), n);
  }
});

test('détecte toute faute de frappe d\'un chiffre et toute inversion de voisins', () => {
  const n = '48291357066';
  for (let i = 0; i < 11; i++) {
    for (let d = 0; d < 10; d++) {
      if (String(d) === n[i]) continue;
      const faux = n.slice(0, i) + d + n.slice(i + 1);
      assert.equal(estValide(faux), false, faux);
    }
    if (i < 10 && n[i] !== n[i + 1]) {
      const inv = n.slice(0, i) + n[i + 1] + n[i] + n.slice(i + 2);
      assert.equal(estValide(inv), false, inv);
    }
  }
});

test('génération : 11 chiffres, jamais de 0 en tête, toujours valide, sans collision', () => {
  const vus = new Set();
  for (let i = 0; i < 2000; i++) {
    const n = generer({ existe: (x) => vus.has(x) });
    assert.match(n, /^[1-9]\d{10}$/);
    assert.ok(estValide(n));
    assert.equal(vus.has(n), false);
    vus.add(n);
  }
});

test('format et diagnostic lisibles', () => {
  assert.equal(formater('48291357066'), 'QC 4829 1357 066');
  assert.equal(estValide('qc 4829-1357-066'), true);
  assert.match(diagnostiquer('4829 1357 06'), /11 chiffres/);
  assert.match(diagnostiquer('48291357067'), /mal tapé/);
  assert.equal(diagnostiquer('48291357066'), null);
  assert.equal(dammControle('4829135706'), 6);
});

test('SHA-256 identique à celui de Node', () => {
  for (const t of ['', 'abc', 'Gisèle Tremblay', 'x'.repeat(200)]) {
    assert.equal(sha256(t), createHash('sha256').update(t).digest('hex'));
  }
});

function famille() {
  const r = new Registre({ aleatoire: graine(), horloge: HORLOGE });
  const grandMere = r.inscrire({ prenom: 'Gisèle', nom: 'Tremblay', dateNaissance: '1939-05-02', sexe: 'F' }, { nam: 'TREG39550211' });
  const sarah = r.inscrire({ prenom: 'Sarah', nom: 'Lavoie', dateNaissance: '1994-03-11', sexe: 'F', parents: [] });
  const kevin = r.inscrire({ prenom: 'Kevin', nom: 'N\'Diaye', dateNaissance: '1992-08-30', sexe: 'M' });
  const nadia = r.inscrire({ prenom: 'Nadia', nom: 'Tremblay', dateNaissance: '1968-01-20', sexe: 'F' });
  const marc = r.inscrire({ prenom: 'Marc', nom: 'Tremblay', dateNaissance: '1971-06-04', sexe: 'M' });
  r.personne(nadia).parents.push(grandMere);
  r.personne(marc).parents.push(grandMere);
  r.personne(sarah).parents.push(nadia);
  const leo = r.inscrire({ prenom: 'Léo', nom: 'Tremblay', dateNaissance: '2011-02-14', sexe: 'M' });
  r.personne(leo).parents.push(marc);
  return { r, grandMere, sarah, kevin, nadia, marc, leo };
}

test('naissance : réservation, second parent par l\'État civil, activation', () => {
  const { r, sarah, kevin } = famille();
  const bebe = r.reserver({ mere: sarah, dateprevue: '2027-01-09' });
  assert.equal(r.fiche(bebe).statut, STATUTS.RESERVE);
  assert.throws(() => r.ajouterParent(bebe, kevin, { source: 'Test ADN' }), ErreurRegistre);
  r.ajouterParent(bebe, kevin);
  r.activer(bebe, { prenom: 'Maëlle', nom: 'Lavoie N\'Diaye', dateNaissance: '2027-01-07', sexe: 'F', lieu: 'CHU Sainte-Justine' });
  assert.equal(r.fiche(bebe).statut, STATUTS.ACTIF);
  assert.deepEqual(r.personne(bebe).parents.length, 2);
  assert.throws(() => r.activer(bebe, {}), /Passage impossible/);
});

test('décès : numéro archivé, jamais réutilisé', () => {
  const { r, grandMere } = famille();
  r.deces(grandMere, '2026-10-01');
  assert.equal(r.fiche(grandMere).statut, STATUTS.DECEDE);
  assert.throws(() => r.fusionner(grandMere, grandMere));
  assert.equal(r.numeros.has(r.fiche(grandMere).numero), true);
});

test('fusion et remplacement : les anciens numéros renvoient vers le bon', () => {
  const { r, nadia } = famille();
  const temp = r.temporaire('Femme, environ 55 ans, arrivée en ambulance');
  r.fusionner(temp, nadia);
  assert.equal(r.resoudre(temp).fiche.numero, nadia);
  const nouveau = r.remplacer(nadia, 'Fraude');
  assert.notEqual(nouveau, nadia);
  assert.equal(r.resoudre(nadia).fiche.numero, nouveau);
  assert.equal(r.resoudre(temp).fiche.numero, nouveau);
  assert.equal(r.fiche(nadia).statut, STATUTS.REMPLACE);
});

test('NAM : recherche par l\'ancien numéro', () => {
  const { r, grandMere } = famille();
  assert.equal(r.chercher('TREG 3955 0211').fiche.numero, grandMere);
  assert.equal(r.chercher(formater(grandMere)).fiche.numero, grandMere);
  assert.equal(r.chercher('ABCD12345678'), null);
});

test('liens calculés jusqu\'aux cousins', () => {
  const { r, sarah, leo, grandMere } = famille();
  const l = liensLisibles(r, sarah);
  assert.deepEqual(l.cousins.map((x) => x.numero), [leo]);
  assert.deepEqual(l.grandsParents.map((x) => x.numero), [grandMere]);
  assert.deepEqual(liensLisibles(r, grandMere).petitsEnfants.map((x) => x.nom).sort(), ['Léo Tremblay', 'Sarah Lavoie']);
});

function systeme() {
  const f = famille();
  const journal = new Journal({ horloge: HORLOGE });
  const p = new Passerelle({ registre: f.r, journal, horloge: HORLOGE });
  return { ...f, journal, p };
}

test('passerelle : soi-même, bureaucratie, admin tech', () => {
  const { p, grandMere } = systeme();
  assert.equal(p.decider({ demandeur: { type: 'personne', numero: grandMere }, sujet: grandMere, donnee: 'medicaments' }).permis, true);
  assert.equal(p.decider({ demandeur: { type: 'bureaucratie', id: 'agent-12' }, sujet: grandMere, donnee: 'coordonnees' }).permis, true);
  assert.equal(p.decider({ demandeur: { type: 'bureaucratie', id: 'agent-12' }, sujet: grandMere, donnee: 'allergies' }).permis, false);
  assert.equal(p.decider({ demandeur: { type: 'admintech', id: 'qt-3' }, sujet: grandMere, donnee: 'medicaments' }).permis, false);
  assert.equal(p.decider({ demandeur: { type: 'admintech', id: 'qt-3' }, sujet: grandMere, donnee: 'journal' }).permis, true);
});

test('passerelle : procuration par niveaux', () => {
  const { p, grandMere, nadia } = systeme();
  p.ajouterProcuration({ mandant: grandMere, mandataire: nadia, niveau: 2, fin: '2027-12-31' });
  const d = (donnee, action = 'lire') => p.decider({ demandeur: { type: 'personne', numero: nadia }, sujet: grandMere, donnee, action }).permis;
  assert.equal(d('rendezvous'), true);
  assert.equal(d('rendezvous', 'ecrire'), true);
  assert.equal(d('medicaments'), false);
  p.procurations[0].niveau = 4;
  assert.equal(d('volontes', 'decider'), true);
});

test('passerelle : règles d\'âge et soins confidentiels de l\'ado', () => {
  const { p, marc, leo } = systeme(); // Léo a 15 ans en octobre 2026
  const d = (donnee) => p.decider({ demandeur: { type: 'personne', numero: marc }, sujet: leo, donnee }).permis;
  assert.equal(d('vaccins'), true);
  assert.equal(d('santeSexuelle'), false);
  assert.equal(p.decider({ demandeur: { type: 'personne', numero: leo }, sujet: leo, donnee: 'santeSexuelle' }).permis, true);
});

test('passerelle : bébé à naître géré par la mère seulement au départ', () => {
  const { p, r, sarah, kevin } = systeme();
  const bebe = r.reserver({ mere: sarah, dateprevue: '2027-01-09' });
  assert.equal(p.decider({ demandeur: { type: 'personne', numero: sarah }, sujet: bebe, donnee: 'vaccins', action: 'ecrire' }).permis, true);
  assert.equal(p.decider({ demandeur: { type: 'personne', numero: kevin }, sujet: bebe, donnee: 'vaccins' }).permis, false);
  r.ajouterParent(bebe, kevin);
  assert.equal(p.decider({ demandeur: { type: 'personne', numero: kevin }, sujet: bebe, donnee: 'vaccins' }).permis, true);
});

test('passerelle : lien de soins, accès d\'urgence, journal inviolable', () => {
  const { p, journal, grandMere } = systeme();
  const dre = { type: 'clinicien', id: 'dre-ouellet', role: 'Médecin' };
  assert.equal(p.decider({ demandeur: dre, sujet: grandMere, donnee: 'allergies' }).permis, false);
  assert.equal(p.decider({ demandeur: dre, sujet: grandMere, donnee: 'allergies', motif: 'urgence: court' }).permis, false);
  const u = p.decider({ demandeur: dre, sujet: grandMere, donnee: 'allergies', motif: 'urgence: patiente inconsciente à l\'arrivée' });
  assert.equal(u.permis, true); assert.equal(u.urgence, true);
  p.ajouterLienSoins({ clinicien: 'dre-ouellet', patient: grandMere, contexte: 'Urgence', fin: '2026-10-25' });
  assert.equal(p.decider({ demandeur: dre, sujet: grandMere, donnee: 'medicaments' }).permis, true);

  assert.equal(journal.entrees.length, 4);
  assert.equal(journal.urgences().length, 1);
  assert.deepEqual(journal.verifier(), { intact: true, total: 4 });
  journal.entrees[1].decision = 'permis';
  assert.deepEqual(journal.verifier(), { intact: false, no: 2 });
});

test('alerte d\'accès inhabituel', () => {
  const { p, journal, grandMere } = systeme();
  for (let i = 0; i < 14; i++) p.decider({ demandeur: { type: 'bureaucratie', id: 'agent-99' }, sujet: grandMere, donnee: 'coordonnees' });
  assert.deepEqual(journal.alertes(), [{ demandeur: 'agent-99', sujet: grandMere, nombre: 14 }]);
});
