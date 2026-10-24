/**
 * Connexion par code à usage unique envoyé au téléphone inscrit, puis session par témoin httpOnly.
 * En production, l'envoi passe par le service de messagerie de l'État ; en développement, le code est
 * renvoyé dans la réponse pour pouvoir tester sans téléphone.
 */

import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { Demandeur, Porte } from '@sante/noyau';
import type { Executeur } from './db.js';
import { nonAutorise } from './erreurs.js';
import { sha256 } from './journal.js';

export const DUREE_CODE_MIN = 10;
export const ESSAIS_MAX = 5;
export const DUREE_SESSION = { citoyen: 30 * 60_000, employe: 10 * 3_600_000 } as const;
export const NOM_TEMOIN = 'sq_session';

const poivre = () => process.env.SANTE_SECRET ?? 'developpement-seulement';
const hacher = (valeur: string) => sha256(`${poivre()}:${valeur}`);

export function masquerTelephone(tel: string): string {
  const chiffres = tel.replace(/\D/g, '');
  return `•••-•••-${chiffres.slice(-4)}`;
}

export interface Messagerie {
  envoyerCode(telephone: string, code: string): Promise<void>;
}
export const messagerieJournalConsole: Messagerie = {
  async envoyerCode(telephone, code) {
    console.info(`[messagerie] code ${code} → ${masquerTelephone(telephone)}`);
  },
};

export async function creerCode(ex: Executeur, cibleType: 'citoyen' | 'employe', cibleId: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  // Un seul code valide à la fois par cible
  await ex.requete('update code_connexion set utilise_le = now() where cible_type = $1 and cible_id = $2 and utilise_le is null', [cibleType, cibleId]);
  await ex.requete(
    `insert into code_connexion (cible_type, cible_id, code_hash, expire_le) values ($1, $2, $3, now() + make_interval(mins => $4))`,
    [cibleType, cibleId, hacher(code), DUREE_CODE_MIN]);
  return code;
}

/** Vérifie le code ; chaque essai compte, même réussi. */
export async function verifierCode(ex: Executeur, cibleType: 'citoyen' | 'employe', cibleId: string, code: string): Promise<boolean> {
  const [c] = await ex.requete<{ id: string; code_hash: string; essais: number }>(
    `select id::text, code_hash, essais from code_connexion
      where cible_type = $1 and cible_id = $2 and utilise_le is null and expire_le > now()
      order by id desc limit 1 for update`, [cibleType, cibleId]);
  if (!c) return false;
  if (c.essais >= ESSAIS_MAX) return false;
  const ok = /^\d{6}$/.test(code) && timingSafeEqual(Buffer.from(hacher(code)), Buffer.from(c.code_hash));
  await ex.requete(`update code_connexion set essais = essais + 1, utilise_le = case when $2 then now() else utilise_le end where id = $1`, [c.id, ok]);
  return ok;
}

export async function ouvrirSession(ex: Executeur, type: 'citoyen' | 'employe', sujetId: string): Promise<{ jeton: string; expire: Date }> {
  const jeton = randomBytes(32).toString('base64url');
  const expire = new Date(Date.now() + DUREE_SESSION[type]);
  await ex.requete('insert into session (jeton_hash, type, sujet_id, expire_le) values ($1, $2, $3, $4)', [sha256(jeton), type, sujetId, expire]);
  return { jeton, expire };
}

export async function fermerSession(ex: Executeur, jeton: string): Promise<void> {
  await ex.requete('delete from session where jeton_hash = $1', [sha256(jeton)]);
}

/** Retrouve le demandeur ; prolonge la session d'un citoyen à chaque requête (expiration glissante). */
export async function demandeurDeSession(ex: Executeur, jeton: string | undefined): Promise<Demandeur> {
  if (!jeton) throw nonAutorise();
  const [s] = await ex.requete<{ type: 'citoyen' | 'employe'; sujet_id: string }>(
    'select type, sujet_id from session where jeton_hash = $1 and expire_le > now()', [sha256(jeton)]);
  if (!s) throw nonAutorise('Session expirée. Reconnectez-vous.');
  if (s.type === 'citoyen') {
    await ex.requete('update session set expire_le = $2 where jeton_hash = $1', [sha256(jeton), new Date(Date.now() + DUREE_SESSION.citoyen)]);
    return { type: 'citoyen', personneCle: s.sujet_id };
  }
  const [e] = await ex.requete<{ id: string; porte: Porte; role: string }>('select id, porte, role from employe where id = $1 and actif', [s.sujet_id]);
  if (!e) throw nonAutorise('Compte désactivé');
  return { type: 'employe', id: e.id, porte: e.porte, role: e.role };
}
