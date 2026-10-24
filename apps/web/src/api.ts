/** Client de l'API. Le témoin de session est httpOnly : le navigateur l'envoie seul. */

export class ErreurApi extends Error {
  constructor(readonly statut: number, readonly code: string, message: string) {
    super(message);
  }
}

async function appel<T>(methode: string, chemin: string, corps?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`/api${chemin}`, {
      method: methode,
      credentials: 'same-origin',
      headers: corps === undefined ? {} : { 'content-type': 'application/json' },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
  } catch {
    throw new ErreurApi(0, 'reseau', 'Connexion impossible. Vérifiez votre accès Internet et réessayez.');
  }
  if (r.status === 204) return undefined as T;
  const donnees = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) window.dispatchEvent(new Event('session-expiree'));
    throw new ErreurApi(r.status, donnees.code ?? 'inconnu', donnees.message ?? 'Une erreur est survenue.');
  }
  return donnees as T;
}

export const api = {
  get: <T>(chemin: string) => appel<T>('GET', chemin),
  post: <T = void>(chemin: string, corps: unknown = {}) => appel<T>('POST', chemin, corps),
  delete: (chemin: string) => appel<void>('DELETE', chemin),
};

// ---------- Types des réponses ----------
export interface MoiCitoyen {
  type: 'citoyen';
  numero: string;
  prenom: string;
  nom: string;
  modeSimplifie: boolean;
  pourQui: { numero: string; nom: string; lien: string }[];
}
export interface MoiEmploye {
  type: 'employe';
  id: string;
  nom: string;
  role: string;
  porte: 'clinique' | 'bureaucratie' | 'admintech';
  etablissement: string;
}
export type Moi = MoiCitoyen | MoiEmploye;

export interface Reponse<T> { donnee: string; libelle: string; raison: string; valeur: T }

export interface RendezVous { id: string; objet: string; lieu: string; adresse: string; debut: string; statut: 'propose' | 'confirme'; note: string | null }
export interface Medicament { id: string; nom: string; posologie: string; moments: ('matin' | 'midi' | 'soir' | 'coucher')[]; miseEnGarde: string | null; source: string }
export interface Allergie { id: string; substance: string; reaction: string; gravite: 'grave' | 'moderee' | 'legere'; certitude: 'confirmee' | 'soupconnee' }
export interface Adaptation { id: string; titre: string; detail: string }
export interface Maladie { id: string; libelle: string; dispositif: boolean; depuis: string | null; note: string | null }
export interface Volontes { niveauSoins: 'A' | 'B' | 'C' | 'D' | null; directives: boolean; donOrganes: boolean | null }
export interface Vaccin { id: string; donneLe: string; produit: string; lieu: string; note: string | null }
export interface Identite { prenom: string | null; nom: string | null; dateNaissance: string | null; datePrevue: string | null; sexe: string | null; lieuNaissance: string | null; dateDeces: string | null }
export interface Droit { donnee: string; libelle: string; permis: boolean; raison: string }
export interface EntreeQuiAVu { no: number; le: string; donnee: string; action: string; urgence: boolean; qui: string; precision: string; signale: boolean }
export interface GroupeFamille { groupe: string; libelle: string; personnes: { numero: string; nom: string; statut: string; age: number | null; deces: string | null }[] }
export interface FicheUrgence {
  acces: { raison: string; urgence: boolean };
  allergies: Allergie[]; medicaments: Medicament[]; adaptation: Adaptation[]; maladies: Maladie[]; volontes: Volontes | null;
  proches: { nom: string; telephone: string | null; niveau: number; fin: string | null }[];
}
export interface ResultatRecherche { numero: string; numeroAffiche: string; statut: string; identite: Identite }
