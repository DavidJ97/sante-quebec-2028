import { Link, useParams } from 'react-router-dom';
import type { MoiCitoyen } from '../../api';
import { useSession } from '../../session';
import { Icone } from '../../composants/Icone';

/** Pour quelle personne on consulte : soi-même ou une personne dont on s'occupe. */
export function useCible() {
  const { moi } = useSession();
  const { numero } = useParams();
  const m = moi as MoiCitoyen;
  const cible = numero ?? m.numero;
  const estMoi = cible === m.numero;
  const autre = m.pourQui.find((p) => p.numero === cible);
  return { moi: m, numero: cible, estMoi, nom: estMoi ? `${m.prenom} ${m.nom}` : autre?.nom ?? 'Cette personne', lien: autre?.lien };
}

export function Retour({ vers = '/', texte = 'Accueil' }: { vers?: string; texte?: string }) {
  return (
    <nav className="fil" aria-label="Fil d'Ariane">
      <Link to={vers}><Icone nom="retour" taille={20} /> {texte}</Link>
    </nav>
  );
}

export function TitrePage({ moi, autre, estMoi, nom }: { moi: string; autre: string; estMoi: boolean; nom: string }) {
  return (
    <div className="pile" style={{ gap: 4 }}>
      {!estMoi && <p className="sur-titre">{nom}</p>}
      <h1>{estMoi ? moi : autre}</h1>
    </div>
  );
}
