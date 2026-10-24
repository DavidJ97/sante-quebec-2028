import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Filigrane, Illustration, TEINTES, type NomIllustration } from './Illustration';
import { Avatar } from './Avatar';

const ORGANISME = 'Santé Québec';

/** Titre de l'onglet : « Page – Service – Santé Québec », préfixé « Erreur : » au besoin. */
export function useTitre(titre: string, service: string, erreur = false) {
  useEffect(() => {
    document.title = `${erreur ? 'Erreur : ' : ''}${titre} – ${service} – ${ORGANISME}`;
  }, [titre, service, erreur]);
}

export const teinte = (nom: NomIllustration) => ({ '--teinte': TEINTES[nom] } as CSSProperties);

export function Symbole({ taille = 22 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5z" fill="#fff" />
    </svg>
  );
}

export function Marque({ service }: { service: string }) {
  return (
    <Link to="/" className="marque" aria-label={`${ORGANISME}, ${service} : accueil`}>
      <span className="marque-symbole"><Symbole /></span>
      <span className="marque-texte"><strong>{ORGANISME}</strong><span>{service}</span></span>
    </Link>
  );
}

export interface EntreeNav { vers: string; texte: string; icone: NomIllustration; badge?: number | undefined; fin?: boolean }

export interface Utilisateur { nom: string; detail: string; photo?: string | null | undefined; vers?: string | undefined }

/**
 * Coquille de l'application : barre latérale sur ordinateur ; barre du haut et onglets du bas sur téléphone.
 */
export function Coquille({ service, utilisateur, navigation, sections, onglets, deconnecter, children, className }: {
  service: string;
  utilisateur: Utilisateur;
  navigation: EntreeNav[];
  sections?: { titre: string; entrees: { vers: string; texte: string; detail: string }[] }[] | undefined;
  onglets: EntreeNav[];
  deconnecter: () => void;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={`coquille ${className ?? ''}`}>
      <a href="#contenu" className="lien-evitement">Passer au contenu principal</a>
      <aside className="laterale" aria-label="Menu principal">
        <Marque service={service} />
        <p className="phase"><b>Alpha</b> Données fictives</p>
        <Link to={utilisateur.vers ?? '/'} className="carte-utilisateur">
          <Avatar src={utilisateur.photo} nom={utilisateur.nom} taille={46} />
          <span><span className="nom">{utilisateur.nom}</span><span className="meta">{utilisateur.detail}</span></span>
        </Link>
        <nav className="navigation" aria-label={service}>
          {navigation.map((e) => (
            <NavLink key={e.vers} to={e.vers} end={e.fin ?? e.vers === '/'} className="nav-lien">
              <Illustration nom={e.icone} taille={24} epaisseur={4.2} />
              <span>{e.texte}</span>
              {e.badge ? <span className="badge" aria-label={`${e.badge} à traiter`}>{e.badge}</span> : null}
            </NavLink>
          ))}
          {sections?.filter((s) => s.entrees.length).map((s) => (
            <div key={s.titre} className="navigation">
              <p className="titre-section">{s.titre}</p>
              {s.entrees.map((e) => (
                <NavLink key={e.vers} to={e.vers} className="nav-lien">
                  <Avatar nom={e.texte} taille={30} />
                  <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}><span>{e.texte}</span><span className="meta" style={{ fontSize: '.85rem', fontWeight: 500 }}>{e.detail}</span></span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="laterale-pied">
          <nav aria-label="Informations">
            <Link to="/a-propos/accessibilite">Accessibilité</Link>
            <Link to="/a-propos/confidentialite">Confidentialité</Link>
            <Link to="/a-propos/journal">Protection des accès</Link>
          </nav>
          <button type="button" className="bouton secondaire" onClick={deconnecter}>Se déconnecter</button>
        </div>
      </aside>

      <div className="principal">
        <header className="barre-haut">
          <Marque service={service} />
          <Link to={utilisateur.vers ?? '/'} className="bouton-profil" aria-label={`Mon profil : ${utilisateur.nom}`}>
            <Avatar src={utilisateur.photo} nom={utilisateur.nom} taille={40} />
          </Link>
        </header>
        {children}
        <nav className="onglets" aria-label="Navigation principale">
          {onglets.map((e) => (
            <NavLink key={e.vers} to={e.vers} end={e.fin ?? e.vers === '/'} className="onglet">
              <span className="pastille-icone"><Illustration nom={e.icone} taille={24} epaisseur={4.2} /></span>
              <span>{e.texte}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export interface Miette { vers: string; texte: string }

export function EntetePage({ titre, chapeau, surTitre, illustration, fil, apres }: {
  titre: string; chapeau?: ReactNode; surTitre?: string | undefined; illustration: NomIllustration; fil?: Miette[] | undefined; apres?: ReactNode;
}) {
  return (
    <header className="entete-page apparait" style={teinte(illustration)}>
      {fil && fil.length > 0 && (
        <nav aria-label="Fil d'Ariane">
          <ol className="fil">{fil.map((m) => <li key={m.vers}><Link to={m.vers}>{m.texte}</Link></li>)}</ol>
        </nav>
      )}
      {surTitre && <p className="sur-titre">{surTitre}</p>}
      <h1 id="titre-page">{titre}</h1>
      {chapeau && <p className="chapeau">{chapeau}</p>}
      {apres}
      <Filigrane nom={illustration} taille={220} />
    </header>
  );
}

/** Carte d'une catégorie : pastille d'icône teintée, titre, filigrane. */
export function Carte({ nom, titre, niveau = 2, alerte, children, id, action, className }: {
  nom: NomIllustration; titre: string; niveau?: 2 | 3; alerte?: boolean | undefined; children: ReactNode; id?: string; action?: ReactNode; className?: string;
}) {
  const Titre = niveau === 2 ? 'h2' : 'h3';
  const ident = id ?? `c-${nom}`;
  return (
    <section className={`carte apparait ${alerte ? 'alerte' : ''} ${className ?? ''}`} style={teinte(alerte ? 'allergies' : nom)} aria-labelledby={ident}>
      <div className="carte-titre">
        <span className="puce"><Illustration nom={nom} taille={24} epaisseur={4.2} /></span>
        <Titre id={ident}>{titre}</Titre>
        {action && <span className="action">{action}</span>}
      </div>
      {children}
      <Filigrane nom={nom} taille={150} />
    </section>
  );
}

export function Page({ children, etroite }: { children: ReactNode; etroite?: boolean }) {
  return <main id="contenu" tabIndex={-1} className={`page ${etroite ? 'etroite' : ''}`}>{children}</main>;
}
