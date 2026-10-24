import { useParams } from 'react-router-dom';
import type { MoiCitoyen } from '../../api';
import { useSession } from '../../session';
import type { Miette } from '../../composants/Gabarit';

export const SERVICE = 'Mon dossier santé';

/** Pour quelle personne on consulte : soi-même ou une personne dont on s'occupe. */
export function useCible() {
  const { moi } = useSession();
  const { numero } = useParams();
  const m = moi as MoiCitoyen;
  const cible = numero ?? m.numero;
  const estMoi = cible === m.numero;
  const autre = m.pourQui.find((p) => p.numero === cible);
  const nom = estMoi ? `${m.prenom} ${m.nom}` : autre?.nom ?? 'Cette personne';
  const fil: Miette[] | undefined = estMoi ? undefined : [{ vers: '/', texte: 'Accueil' }, { vers: `/pour/${cible}`, texte: nom }];
  const titre = (moi: string, autreTitre: string) => (estMoi ? moi : autreTitre);
  return { moi: m, numero: cible, estMoi, nom, lien: autre?.lien, fil, titre, surTitre: estMoi ? undefined : nom };
}

/** « dans 4 jours », « demain », « aujourd'hui », « il y a 9 jours ». */
export function relatif(iso: string, maintenant = new Date()): string {
  const jour = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const ecart = Math.round((jour(new Date(iso)) - jour(maintenant)) / 86_400_000);
  if (ecart === 0) return 'aujourd\'hui';
  if (ecart === 1) return 'demain';
  if (ecart === -1) return 'hier';
  if (ecart > 1) return `dans ${ecart} jours`;
  return `il y a ${-ecart} jours`;
}
