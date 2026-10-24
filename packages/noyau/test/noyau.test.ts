import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  chiffreControle, decider, estNumeroValide, formaterNumero, formaterSaisie, normaliserNAM, problemeNumero, tirerNumero,
  entierCryptographique, transitionPermise, verifierTransition, TransitionInterdite, calculerParente, formeCanonique,
  verifierChaine, EMPREINTE_ORIGINE, type Contexte, type EntreeJournal, type Sujet,
} from '../src/index.js';

describe('numéro QC', () => {
  it('accepte les numéros de référence du plan', () => {
    for (const n of ['QC 4829 1357 066', 'QC 7310 2284 591', 'QC 5196 4037 286', 'QC 2684 0173 959', 'QC 9047 3528 165']) {
      expect(estNumeroValide(n)).toBe(true);
    }
  });

  it('détecte toute erreur sur un chiffre et toute inversion de voisins', () => {
    const n = '48291357066';
    for (let i = 0; i < n.length; i++) {
      for (let d = 0; d <= 9; d++) {
        if (String(d) === n[i]) continue;
        expect(estNumeroValide(n.slice(0, i) + d + n.slice(i + 1))).toBe(false);
      }
      if (i < n.length - 1 && n[i] !== n[i + 1]) {
        expect(estNumeroValide(n.slice(0, i) + n[i + 1] + n[i] + n.slice(i + 2))).toBe(false);
      }
    }
  });

  it('tire des numéros valides, sans zéro initial ni collision', () => {
    const vus = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const n = tirerNumero(entierCryptographique, (x) => vus.has(x));
      expect(n).toMatch(/^[1-9]\d{10}$/);
      expect(chiffreControle(n)).toBe(0);
      vus.add(n);
    }
    expect(vus.size).toBe(3000);
  });

  it('abandonne proprement si tout est pris', () => {
    expect(() => tirerNumero(() => 0, () => true)).toThrow();
  });

  it('explique les erreurs de saisie', () => {
    expect(problemeNumero('')).toBe('vide');
    expect(problemeNumero('4829 1357 06A')).toBe('caracteres');
    expect(problemeNumero('4829 1357 06')).toBe('longueur');
    expect(problemeNumero('0829 1357 066')).toBe('zero-initial');
    expect(problemeNumero('4829 1357 060')).toBe('controle');
    expect(problemeNumero('qc-4829-1357-066')).toBeNull();
  });

  it('met en forme', () => {
    expect(formaterNumero('48291357066')).toBe('QC 4829 1357 066');
    expect(formaterSaisie('4829135')).toBe('4829 135');
    expect(formaterSaisie('482913570661234')).toBe('4829 1357 066');
  });

  it('reconnaît un NAM', () => {
    expect(normaliserNAM('treg 3955 0211')).toBe('TREG39550211');
    expect(normaliserNAM('TRE 3955 0211')).toBeNull();
  });
});

describe('statuts du registre', () => {
  it('suit le cycle de vie', () => {
    expect(transitionPermise('reserve', 'actif')).toBe(true);
    expect(transitionPermise('actif', 'reserve')).toBe(false);
    expect(transitionPermise('decede', 'actif')).toBe(false);
    expect(() => verifierTransition('fusionne', 'actif')).toThrow(TransitionInterdite);
  });
});

describe('règles d\'accès', () => {
  const maintenant = new Date('2026-10-24T12:00:00');
  const gisele: Sujet = { personneCle: 'gisele', statut: 'actif', dateNaissance: '1939-05-02', parents: [], gestionnairesPrenatals: [] };
  const leo: Sujet = { personneCle: 'leo', statut: 'actif', dateNaissance: '2011-02-14', parents: ['marc'], gestionnairesPrenatals: [] };
  const bebe: Sujet = { personneCle: 'bebe', statut: 'reserve', dateNaissance: null, parents: ['sarah'], gestionnairesPrenatals: ['sarah'] };
  const ctx = (p: Partial<Contexte>): Contexte => ({
    demandeur: { type: 'citoyen', personneCle: 'gisele' }, sujet: gisele, donnee: 'medicaments', action: 'lire',
    maintenant, procurations: [], liensSoins: [], ...p,
  });
  const citoyen = (personneCle: string) => ({ type: 'citoyen' as const, personneCle });

  it('chacun voit son propre dossier', () => {
    expect(decider(ctx({})).permis).toBe(true);
  });

  it('procuration : chaque niveau ouvre ce qu\'il doit', () => {
    const nadia = citoyen('nadia');
    expect(decider(ctx({ demandeur: nadia })).raison).toBe('Aucun lien autorisé avec cette personne');
    const org = [{ niveau: 2 as const }];
    expect(decider(ctx({ demandeur: nadia, procurations: org, donnee: 'rendezvous', action: 'ecrire' })).permis).toBe(true);
    expect(decider(ctx({ demandeur: nadia, procurations: org, donnee: 'medicaments' })).permis).toBe(false);
    expect(decider(ctx({ demandeur: nadia, procurations: [{ niveau: 3 }], donnee: 'volontes', action: 'decider' })).permis).toBe(false);
    expect(decider(ctx({ demandeur: nadia, procurations: [{ niveau: 4 }], donnee: 'volontes', action: 'decider' })).permis).toBe(true);
    expect(decider(ctx({ demandeur: nadia, procurations: [{ niveau: 4 }], donnee: 'journal' })).permis).toBe(false);
  });

  it('procuration : prend fin au décès', () => {
    const v = decider(ctx({ demandeur: citoyen('nadia'), procurations: [{ niveau: 4 }], sujet: { ...gisele, statut: 'decede' } }));
    expect(v).toMatchObject({ permis: false, raison: 'La procuration a pris fin au décès' });
  });

  it('parent d\'ado : tout sauf les soins confidentiels', () => {
    const marc = citoyen('marc');
    expect(decider(ctx({ demandeur: marc, sujet: leo, donnee: 'vaccins' })).permis).toBe(true);
    expect(decider(ctx({ demandeur: marc, sujet: leo, donnee: 'santeSexuelle' })).permis).toBe(false);
    expect(decider(ctx({ demandeur: citoyen('leo'), sujet: leo, donnee: 'santeSexuelle' })).permis).toBe(true);
  });

  it('les parents perdent l\'accès à 18 ans', () => {
    const adulte = { ...leo, dateNaissance: '2008-10-23' };
    expect(decider(ctx({ demandeur: citoyen('marc'), sujet: adulte, donnee: 'vaccins' })).permis).toBe(false);
    expect(decider(ctx({ demandeur: citoyen('marc'), sujet: { ...adulte, dateNaissance: '2008-10-25' }, donnee: 'vaccins' })).permis).toBe(true);
  });

  it('bébé à naître : seulement ses gestionnaires', () => {
    expect(decider(ctx({ demandeur: citoyen('sarah'), sujet: bebe, donnee: 'vaccins', action: 'ecrire' })).permis).toBe(true);
    expect(decider(ctx({ demandeur: citoyen('kevin'), sujet: bebe, donnee: 'vaccins' })).permis).toBe(false);
  });

  it('portes du personnel', () => {
    const agent = { type: 'employe' as const, id: 'a1', porte: 'bureaucratie' as const, role: 'Agent' };
    const tech = { type: 'employe' as const, id: 't1', porte: 'admintech' as const, role: 'Exploitation' };
    const dre = { type: 'employe' as const, id: 'd1', porte: 'clinique' as const, role: 'Médecin' };
    expect(decider(ctx({ demandeur: agent, donnee: 'coordonnees' })).permis).toBe(true);
    expect(decider(ctx({ demandeur: agent, donnee: 'allergies' })).permis).toBe(false);
    expect(decider(ctx({ demandeur: tech, donnee: 'allergies' })).permis).toBe(false);
    expect(decider(ctx({ demandeur: tech, donnee: 'journal' })).permis).toBe(true);
    expect(decider(ctx({ demandeur: dre, donnee: 'allergies' })).permis).toBe(false);
    expect(decider(ctx({ demandeur: dre, donnee: 'identite' })).raison).toBe('Identification du patient');
    expect(decider(ctx({ demandeur: dre, donnee: 'identite', action: 'ecrire' })).permis).toBe(false);
    expect(decider(ctx({ demandeur: dre, donnee: 'allergies', liensSoins: [{ contexte: 'Médecin de famille', urgence: false }] }))).toMatchObject({ permis: true, urgence: false });
    expect(decider(ctx({ demandeur: dre, donnee: 'allergies', liensSoins: [{ contexte: 'Urgence', urgence: true }] }))).toMatchObject({ permis: true, urgence: true });
  });
});

describe('filiation', () => {
  it('calcule la parenté jusqu\'aux cousins', () => {
    const liens = [
      { enfant: 'nadia', parent: 'gisele' }, { enfant: 'marc', parent: 'gisele' },
      { enfant: 'sarah', parent: 'nadia' }, { enfant: 'leo', parent: 'marc' }, { enfant: 'bebe', parent: 'sarah' },
    ];
    const p = calculerParente('sarah', liens);
    expect(p.parents).toEqual(['nadia']);
    expect(p.grandsParents).toEqual(['gisele']);
    expect(p.onclesTantes).toEqual(['marc']);
    expect(p.cousins).toEqual(['leo']);
    expect(p.enfants).toEqual(['bebe']);
    expect(calculerParente('marc', liens).neveux).toEqual(['sarah']);
    expect(calculerParente('gisele', liens).petitsEnfants.sort()).toEqual(['leo', 'sarah']);
  });
});

describe('journal chaîné', () => {
  const sha = (t: string) => createHash('sha256').update(t).digest('hex');
  const chaine = () => {
    const out: (EntreeJournal & { empreinte: string })[] = [];
    let prec = EMPREINTE_ORIGINE;
    for (let no = 1; no <= 3; no++) {
      const e: EntreeJournal = { no, le: `2026-10-24T12:00:0${no}.000Z`, demandeurType: 'citoyen', demandeurId: 'x', sujet: '48291357066', donnee: 'allergies', action: 'lire', motif: '', decision: 'permis', raison: 'r', urgence: false, precedente: prec };
      const empreinte = sha(formeCanonique(e));
      out.push({ ...e, empreinte });
      prec = empreinte;
    }
    return out;
  };
  it('détecte une entrée modifiée', () => {
    const c = chaine();
    expect(verifierChaine(c, sha)).toEqual({ intacte: true, total: 3 });
    c[1]!.decision = 'refuse';
    expect(verifierChaine(c, sha)).toEqual({ intacte: false, no: 2, total: 3 });
  });
  it('détecte une entrée retirée', () => {
    const c = chaine();
    c.splice(1, 1);
    expect(verifierChaine(c, sha)).toMatchObject({ intacte: false, no: 3 });
  });
});
