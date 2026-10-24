import { Link } from 'react-router-dom';
import { formaterNumero } from '@sante/noyau';
import { api, type RendezVous, type Reponse } from '../../api';
import { Icone, type NomIcone } from '../../composants/Icone';
import { useRequete } from '../../composants/Requete';
import { heure, jour, majuscule } from '../../format';
import { useCible } from './commun';

function Tuile({ vers, icone, titre, sous, principale }: { vers: string; icone: NomIcone; titre: string; sous: string; principale?: boolean }) {
  return (
    <Link to={vers} className={`tuile ${principale ? 'principale' : ''}`}>
      <Icone nom={icone} className="icone" taille={44} />
      <span><span className="titre">{titre}</span><span className="sous">{sous}</span></span>
      <Icone nom="chevron" className="chevron" />
    </Link>
  );
}

export default function Accueil() {
  const { moi } = useCible();
  const [rdv] = useRequete(() => api.get<Reponse<RendezVous[]>>(`/personnes/${moi.numero}/donnees/rendezvous`), [moi.numero]);
  const liste = rdv.etat === 'pret' ? rdv.valeur.valeur : [];
  const aConfirmer = liste.filter((r) => r.statut === 'propose').length;
  const prochain = liste.find((r) => r.statut === 'confirme');

  return (
    <main className="page etroite" id="contenu">
      <div className="pile" style={{ gap: 4 }}>
        <h1>Bonjour {moi.prenom}</h1>
        <p className="secondaire chiffres">{formaterNumero(moi.numero)}</p>
      </div>

      {prochain && (
        <section className="carte" aria-labelledby="prochain">
          <p className="sur-titre" id="prochain">Prochain rendez-vous</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 700 }}>{prochain.objet}</p>
          <p>{majuscule(jour(prochain.debut))}, {heure(prochain.debut)}</p>
          <p className="secondaire">{prochain.lieu}</p>
        </section>
      )}

      <nav className="pile" aria-label="Mon dossier">
        <Tuile vers="/rendez-vous" icone="calendrier" titre="Mes rendez-vous"
          sous={rdv.etat !== 'pret' ? ' ' : aConfirmer ? `${aConfirmer} à confirmer` : liste.length ? 'Tout est confirmé' : 'Aucun rendez-vous prévu'} />
        <Tuile vers="/medicaments" icone="pilule" titre="Mes médicaments" sous="Quoi prendre et quand" />
        <Tuile vers="/vaccins" icone="seringue" titre="Mon carnet de vaccination" sous="Toutes mes doses" />
        <Tuile vers="/aide" icone="telephone" titre="Besoin d'aide" sous="Parler à une infirmière" principale />
      </nav>

      {moi.pourQui.length > 0 && (
        <section className="pile" aria-labelledby="soins-proches">
          <h2 id="soins-proches">Je m'occupe de</h2>
          {moi.pourQui.map((p) => <Tuile key={p.numero} vers={`/pour/${p.numero}`} icone="main" titre={p.nom} sous={p.lien} />)}
        </section>
      )}

      <nav className="pile" aria-label="Autres">
        <Tuile vers="/qui-a-vu" icone="oeil" titre="Qui a consulté mon dossier" sous="Chaque consultation est inscrite" />
        <Tuile vers="/famille" icone="famille" titre="Ma famille" sous="Les liens inscrits à l'État civil" />
      </nav>
    </main>
  );
}
