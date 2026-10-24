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
  const fil: Miette[] = estMoi
    ? [{ vers: '/', texte: 'Accueil' }]
    : [{ vers: '/', texte: 'Accueil' }, { vers: `/pour/${cible}`, texte: nom }];
  /** Titre adapté : « Mes médicaments » ou « Médicaments » avec le nom en sur-titre. */
  const titre = (moi: string, autreTitre: string) => (estMoi ? moi : autreTitre);
  return { moi: m, numero: cible, estMoi, nom, lien: autre?.lien, fil, titre, surTitre: estMoi ? undefined : nom };
}
