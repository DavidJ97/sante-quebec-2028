import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Filigrane, Illustration, TEINTES, type NomIllustration } from './Illustration';

const ORGANISME = 'Santé Québec';

/** Titre de l'onglet : « Page – Service – Santé Québec », préfixé « Erreur : » au besoin (norme des services publics). */
export function useTitre(titre: string, service: string, erreur = false) {
  useEffect(() => {
    document.title = `${erreur ? 'Erreur : ' : ''}${titre} – ${service} – ${ORGANISME}`;
  }, [titre, service, erreur]);
}

export function Entete({ service, utilisateur, deconnecter }: { service: string; utilisateur?: string | undefined; deconnecter?: (() => void) | undefined }) {
  return (
    <>
      <a href="#contenu" className="lien-evitement">Passer au contenu principal</a>
      <header className="entete">
        <div className="conteneur">
          <Link to="/" className="signature" aria-label={`${ORGANISME}, ${service} : accueil`}>
            <span className="organisme">{ORGANISME}</span>
            <span className="service">{service}</span>
          </Link>
          {utilisateur && (
            <div className="utilisateur">
              <span>{utilisateur}</span>
              <button type="button" onClick={deconnecter}>Se déconnecter</button>
            </div>
          )}
        </div>
      </header>
      <div className="entete-filet" aria-hidden="true" />
      <div className="phase">
        <div className="conteneur">
          <span className="etiquette-phase">Alpha</span>
          <p>Service en conception. Toutes les personnes et les données sont fictives.</p>
        </div>
      </div>
    </>
  );
}

export function Pied() {
  return (
    <footer className="pied">
      <div className="conteneur">
        <nav aria-label="Pied de page">
          <ul>
            <li><Link to="/a-propos/accessibilite">Accessibilité</Link></li>
            <li><Link to="/a-propos/confidentialite">Confidentialité</Link></li>
            <li><Link to="/a-propos/journal">Comment vos accès sont protégés</Link></li>
          </ul>
        </nav>
        <p>{ORGANISME} 2028 · Prototype de conception, non officiel.</p>
      </div>
    </footer>
  );
}

export interface Miette { vers: string; texte: string }

export function TetePage({ titre, chapeau, surTitre, illustration, fil }: {
  titre: string; chapeau?: ReactNode; surTitre?: string | undefined; illustration: NomIllustration; fil?: Miette[];
}) {
  return (
    <div className="tete-page">
      <div className="conteneur">
        {fil && fil.length > 0 && (
          <nav aria-label="Fil d'Ariane">
            <ol className="fil">
              {fil.map((m) => <li key={m.vers}><Link to={m.vers}>{m.texte}</Link></li>)}
            </ol>
          </nav>
        )}
        {surTitre && <p className="sur-titre">{surTitre}</p>}
        <h1 id="titre-page">{titre}</h1>
        {chapeau && <p className="chapeau">{chapeau}</p>}
        <Filigrane nom={illustration} />
      </div>
    </div>
  );
}

/** Bloc d'une catégorie : filet de couleur, pictogramme, filigrane. */
export function Rubrique({ nom, titre, niveau = 2, alerte, children, id }: {
  nom: NomIllustration; titre: string; niveau?: 2 | 3; alerte?: boolean; children: ReactNode; id?: string;
}) {
  const Titre = niveau === 2 ? 'h2' : 'h3';
  const ident = id ?? `r-${nom}`;
  return (
    <section className={`rubrique ${alerte ? 'alerte' : ''}`} style={{ '--teinte': TEINTES[nom] } as CSSProperties} aria-labelledby={ident}>
      <div className="rubrique-titre">
        <Illustration nom={nom} taille={30} />
        <Titre id={ident}>{titre}</Titre>
      </div>
      {children}
      <Filigrane nom={nom} taille={150} />
    </section>
  );
}

export function Corps({ children, etroit }: { children: ReactNode; etroit?: boolean }) {
  return (
    <div className="conteneur corps-page">
      {etroit ? <div className="colonne-texte">{children}</div> : children}
    </div>
  );
}
