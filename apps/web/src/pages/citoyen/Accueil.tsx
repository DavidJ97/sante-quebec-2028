import { Link } from 'react-router-dom';
import { api, type EntreeQuiAVu, type Medicament, type RendezVous, type Reponse } from '../../api';
import { Avatar, photoPersonnel } from '../../composants/Avatar';
import { CarteSante } from '../../composants/CarteSante';
import { Carte, Page, teinte, useTitre } from '../../composants/Gabarit';
import { Illustration, type NomIllustration } from '../../composants/Illustration';
import { useRequete } from '../../composants/Requete';
import { heure, jour, majuscule, MOMENTS } from '../../format';
import { relatif, SERVICE, useCible } from './commun';

const aujourdhui = () => majuscule(new Date().toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Toronto' }));

function Raccourci({ vers, nom, titre, detail }: { vers: string; nom: NomIllustration; titre: string; detail: string }) {
  return (
    <Link to={vers} className="carte cliquable apparait" style={{ ...teinte(nom), gap: 10, padding: 18 }}>
      <span className="puce"><Illustration nom={nom} taille={24} epaisseur={4.2} /></span>
      <span style={{ fontWeight: 750, fontSize: '1.12rem' }}>{titre}</span>
      <span className="meta">{detail}</span>
    </Link>
  );
}

export default function Accueil() {
  const { moi } = useCible();
  useTitre('Accueil', SERVICE);
  const [rdv] = useRequete(() => api.get<Reponse<RendezVous[]>>(`/personnes/${moi.numero}/donnees/rendezvous`).then((r) => r.valeur), [moi.numero]);
  const [meds] = useRequete(() => api.get<Reponse<Medicament[]>>(`/personnes/${moi.numero}/donnees/medicaments`).then((r) => r.valeur), [moi.numero]);
  const [journal] = useRequete(() => api.get<EntreeQuiAVu[]>(`/personnes/${moi.numero}/journal`), [moi.numero]);

  const liste = rdv.etat === 'pret' ? rdv.valeur : [];
  const aConfirmer = liste.filter((r) => r.statut === 'propose');
  const prochain = liste.find((r) => r.statut === 'confirme');
  const dernier = journal.etat === 'pret' ? journal.valeur[0] : undefined;
  const nom = `${moi.prenom} ${moi.nom}`;

  return (
    <Page>
      <header className="apparait" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p className="meta">{aujourdhui()}</p>
        <h1 id="titre-page">Bonjour, {moi.prenom}</h1>
      </header>

      <div className="bento">
        <div className="l7 apparait"><CarteSante numero={moi.numero} nom={nom} dateNaissance={moi.dateNaissance} photoPriseLe={moi.photoPriseLe} /></div>

        <div className="l5 pile">
          {aConfirmer.length > 0 ? (
            <section className="carte apparait" style={{ ...teinte('rendezvous'), borderColor: 'var(--attention-bord)', background: 'linear-gradient(180deg, var(--attention-doux), var(--surface) 80%)' }} aria-labelledby="a-faire">
              <span className="etiquette jaune"><span className="point" />À faire</span>
              <h2 id="a-faire">{aConfirmer.length === 1 ? 'Un rendez-vous attend votre réponse' : `${aConfirmer.length} rendez-vous attendent votre réponse`}</h2>
              <p>{aConfirmer[0]!.objet}, {jour(aConfirmer[0]!.debut)} à {heure(aConfirmer[0]!.debut)}.</p>
              <div className="actions"><Link to="/rendez-vous" className="bouton">Répondre</Link></div>
            </section>
          ) : (
            <section className="carte apparait" aria-labelledby="a-faire">
              <span className="etiquette verte"><span className="point" />À jour</span>
              <h2 id="a-faire">Rien à faire pour l'instant</h2>
              <p className="secondaire">Nous vous écrirons quand une réponse sera nécessaire.</p>
            </section>
          )}
          {prochain && (
            <Link to="/rendez-vous" className="carte cliquable apparait" style={teinte('rendezvous')} aria-label={`Prochain rendez-vous : ${prochain.objet}, ${jour(prochain.debut)} à ${heure(prochain.debut)}`}>
              <p className="meta">Prochain rendez-vous · <span className="compte">{relatif(prochain.debut)}</span></p>
              <p style={{ fontSize: '1.25rem', fontWeight: 750 }}>{prochain.objet}</p>
              <p>{majuscule(jour(prochain.debut))}, {heure(prochain.debut)}<br /><span className="secondaire">{prochain.lieu}</span></p>
            </Link>
          )}
        </div>

        <div className="l7">
          <Carte nom="medicaments" titre="Aujourd'hui" id="aujourdhui" action={<Link to="/medicaments">Tous mes médicaments</Link>}>
            {meds.etat !== 'pret' ? <div className="squelette" style={{ width: '70%' }} /> : meds.valeur.length === 0 ? <p>Aucun médicament à prendre.</p> : (
              <ol className="chronologie" style={teinte('medicaments')}>
                {(Object.keys(MOMENTS) as (keyof typeof MOMENTS)[]).filter((m) => meds.valeur.some((x) => x.moments.includes(m))).map((m) => (
                  <li key={m}>
                    <span className="noeud"><Illustration nom="medicaments" taille={20} epaisseur={5} /></span>
                    <div className="contenu">
                      <strong>{MOMENTS[m]}</strong>
                      <span className="secondaire">{meds.valeur.filter((x) => x.moments.includes(m)).map((x) => x.nom).join(' · ')}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Carte>
        </div>

        <div className="l5">
          <Carte nom="journal" titre="Votre dossier" id="dossier" action={<Link to="/qui-a-vu">Historique</Link>}>
            {journal.etat !== 'pret' ? <div className="squelette" style={{ width: '70%' }} /> : !dernier ? <p>Personne d'autre que vous ne l'a consulté.</p> : (
              <>
                <p className="meta">Dernière consultation · {relatif(dernier.le)}</p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Avatar src={dernier.employeId ? photoPersonnel(dernier.employeId) : null} nom={dernier.qui} taille={48} />
                  <div><strong>{dernier.qui}</strong><br /><span className="secondaire">{dernier.precision}</span></div>
                </div>
                <p className="secondaire">A consulté : {dernier.donnee.toLowerCase()}.</p>
              </>
            )}
          </Carte>
        </div>

        {moi.pourQui.length > 0 && (
          <nav className="l12" aria-labelledby="proches">
            <h2 id="proches" style={{ marginBottom: 14 }}>Je m'occupe de</h2>
            <div className="grille">
              {moi.pourQui.map((p) => (
                <Link key={p.numero} to={`/pour/${p.numero}`} className="carte cliquable apparait" style={{ ...teinte('proches'), flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }}>
                  <Avatar nom={p.nom} taille={52} />
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 750, fontSize: '1.15rem' }}>{p.nom}</span>
                    <span className="meta">{p.lien}</span>
                  </span>
                </Link>
              ))}
            </div>
          </nav>
        )}

        <nav className="l12" aria-label="Mon dossier">
          <div className="raccourcis">
            <Raccourci vers="/resume" nom="maladies" titre="Résumé de santé" detail="Allergies, maladies, volontés" />
            <Raccourci vers="/vaccins" nom="vaccins" titre="Vaccins" detail="Toutes vos doses" />
            <Raccourci vers="/famille" nom="famille" titre="Ma famille" detail="Liens de l'État civil" />
            <Raccourci vers="/aide" nom="aide" titre="Obtenir de l'aide" detail="Info-Santé, jour et nuit" />
          </div>
        </nav>
      </div>
    </Page>
  );
}
