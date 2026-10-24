export class ErreurHttp extends Error {
  constructor(readonly statut: number, readonly code: string, message: string) {
    super(message);
  }
}

export const nonAutorise = (message = 'Connexion requise') => new ErreurHttp(401, 'non_connecte', message);
export const interdit = (message: string) => new ErreurHttp(403, 'acces_refuse', message);
export const introuvable = (message = 'Introuvable') => new ErreurHttp(404, 'introuvable', message);
export const invalide = (message: string) => new ErreurHttp(400, 'requete_invalide', message);
export const conflit = (message: string) => new ErreurHttp(409, 'conflit', message);
