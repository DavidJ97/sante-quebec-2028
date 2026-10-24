import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { formaterNumero } from '@sante/noyau';
import { api, type RendezVous, type Reponse } from '../../api';
import { Corps, TetePage, useTitre } from '../../composants/Gabarit';
import { Illustration, TEINTES, type NomIllustration } from '../../composants/Illustration';
import { useRequete } from '../../composants/Requete';
import { heure, jour, majuscule } from '../../format';
import { SERVICE, useCible } from './commun';

interface Entree { vers: string; nom: NomIllustration; titre: string; description: string }

function MenuServices({ entrees, etiquette }: { entrees: Entree[]; etiquette: string }) {
  return (
    <nav aria-label={etiquette}>
      <ul className="menu-services">
        {entrees.map((e) => (
          <li key={e.vers} style={{ '--teinte': TEINTES[e.nom] } as CSSProperties}>
            <Link to={e.vers}>
              <span className="pictogramme"><Illustration nom={e.nom} taille={34} /></span>
              <span><span className="titre">{e.titre}</span><span className="description">{e.description}</span></span>
              <svg className="fleche" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Accueil() {
  const { moi } = useCible();
  useTitre('Accueil', SERVICE);
  const [rdv] = useRequete(() => api.get<Reponse<RendezVous[]>>(`/personnes/${moi.numero}/donnees/rendezvous`), [moi.numero]);
  const liste = rdv.etat === 'pret' ? rdv.valeur.valeur : [];
  const aConfirmer = liste.filter((r) => r.statut === 'propose');
  const prochain = liste.find((r) => r.statut === 'confirme');

  return (
    <main id="contenu" tabIndex={-1}>
      <TetePage illustration="accueil" titre={`Bonjour, ${moi.prenom}`}
        chapeau={<>Numéro QC <span className="chiffres">{formaterNumero(moi.numero)}</span></>} />
      <Corps>
        {aConfirmer.length > 0 && (
          <section className="bandeau" aria-labelledby="a-faire">
            <h2 className="bandeau-titre" id="a-faire">À faire</h2>
            <div className="bandeau-corps">
              <p className="accroche">{aConfirmer.length === 1 ? 'Un rendez-vous attend votre réponse' : `${aConfirmer.length} rendez-vous attendent votre réponse`}</p>
              <p>{aConfirmer[0]!.objet}, {jour(aConfirmer[0]!.debut)} à {heure(aConfirmer[0]!.debut)}.</p>
              <p><Link to="/rendez-vous">Confirmer ou changer la date</Link></p>
            </div>
          </section>
        )}

        {prochain && (
          <section aria-labelledby="prochain" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 id="prochain">Votre prochain rendez-vous</h2>
            <p style={{ fontSize: '1.25rem' }}><strong>{prochain.objet}</strong></p>
            <p>{majuscule(jour(prochain.debut))}, {heure(prochain.debut)} · {prochain.lieu}</p>
          </section>
        )}

        <section aria-labelledby="mon-dossier" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 id="mon-dossier">Mon dossier</h2>
          <MenuServices etiquette="Mon dossier" entrees={[
            { vers: '/rendez-vous', nom: 'rendezvous', titre: 'Rendez-vous', description: 'Confirmer, changer une date' },
            { vers: '/medicaments', nom: 'medicaments', titre: 'Médicaments', description: 'Quoi prendre et à quel moment' },
            { vers: '/vaccins', nom: 'vaccins', titre: 'Carnet de vaccination', description: 'Toutes vos doses, au même endroit' },
            { vers: '/resume', nom: 'maladies', titre: 'Résumé de santé', description: 'Allergies, maladies, volontés' },
          ]} />
        </section>

        {moi.pourQui.length > 0 && (
          <section aria-labelledby="proches" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 id="proches">Personnes dont vous vous occupez</h2>
            <MenuServices etiquette="Personnes dont vous vous occupez"
              entrees={moi.pourQui.map((p) => ({ vers: `/pour/${p.numero}`, nom: 'proches' as const, titre: p.nom, description: p.lien }))} />
          </section>
        )}

        <section aria-labelledby="autres" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 id="autres">Confidentialité et famille</h2>
          <MenuServices etiquette="Confidentialité et famille" entrees={[
            { vers: '/qui-a-vu', nom: 'journal', titre: 'Qui a consulté mon dossier', description: 'Chaque consultation est inscrite' },
            { vers: '/famille', nom: 'famille', titre: 'Ma famille', description: 'Les liens inscrits à l\'État civil' },
            { vers: '/aide', nom: 'aide', titre: 'Obtenir de l\'aide', description: 'Parler à une infirmière, jour et nuit' },
          ]} />
        </section>
      </Corps>
    </main>
  );
}
