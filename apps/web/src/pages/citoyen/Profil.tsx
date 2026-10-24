import { formaterNumero } from '@sante/noyau';
import { api, type Coordonnees, type Reponse } from '../../api';
import { Avatar, photoPersonne } from '../../composants/Avatar';
import { Carte, EntetePage, Page, useTitre } from '../../composants/Gabarit';
import { Charge, useRequete } from '../../composants/Requete';
import { jourAnnee } from '../../format';
import { SERVICE, useCible } from './commun';

/** Prochaine photo : chaque année avant 5 ans, aux 5 ans ensuite (règle du plan). */
function prochainePhoto(priseLe: string, dateNaissance: string | null): string {
  const prise = new Date(`${priseLe}T12:00:00`);
  const ageALaPrise = dateNaissance ? prise.getFullYear() - Number(dateNaissance.slice(0, 4)) : 18;
  prise.setFullYear(prise.getFullYear() + (ageALaPrise < 5 ? 1 : 5));
  return prise.toISOString().slice(0, 10);
}

export default function Profil() {
  const { moi } = useCible();
  const nom = `${moi.prenom} ${moi.nom}`;
  useTitre('Mon profil', SERVICE);
  const [coord, recharger] = useRequete(() => api.get<Reponse<Coordonnees | null>>(`/personnes/${moi.numero}/donnees/coordonnees`).then((r) => r.valeur), [moi.numero]);

  return (
    <Page>
      <EntetePage illustration="proches" titre="Mon profil" chapeau="Votre identité, vos coordonnées et les personnes en qui vous avez confiance." />
      <div className="bento">
        <Carte nom="connexion" titre="Identité" className="l7">
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <Avatar src={photoPersonne(moi.numero)} nom={nom} taille={120} carre alt={moi.photoPriseLe ? `Votre photo, prise le ${jourAnnee(moi.photoPriseLe)}` : ''} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ fontSize: '1.45rem', fontWeight: 780 }}>{nom}</p>
              {moi.dateNaissance && <p className="secondaire">Né·e le {jourAnnee(moi.dateNaissance)}</p>}
              <p className="chiffres" style={{ fontSize: '1.15rem' }}>{formaterNumero(moi.numero)}</p>
            </div>
          </div>
          {moi.photoPriseLe ? (
            <p className="meta">Photo prise le {jourAnnee(moi.photoPriseLe)} en point de service. Prochaine photo vers le {jourAnnee(prochainePhoto(moi.photoPriseLe, moi.dateNaissance))}.</p>
          ) : (
            <div className="avertissement">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
              <p>Aucune photo au dossier. Elle aide les équipes à vous reconnaître, surtout à l'urgence. Elle se prend lors d'un passage en point de service.</p>
            </div>
          )}
        </Carte>

        <Carte nom="proches" titre="Personnes de confiance" className="l5">
          {moi.mandataires.length === 0 ? <p>Vous n'avez donné aucune procuration.</p> : (
            <ul className="elements">
              {moi.mandataires.map((m) => (
                <li key={m.nom} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Avatar nom={m.nom} taille={44} />
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="nom">{m.nom}</span>
                    <span className="meta">Niveau {m.niveau} · {m.niveauNom}{m.fin ? ` · jusqu'au ${jourAnnee(m.fin)}` : ''}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Carte>

        <div className="l12">
          <Carte nom="aide" titre="Coordonnées">
            <Charge etat={coord} recharger={recharger}>
              {(c) => !c ? <p>Aucune coordonnée inscrite.</p> : (
                <dl className="resume">
                  <div><dt>Adresse</dt><dd>{[c.adresse, c.ville, c.codePostal].filter(Boolean).join(', ') || '—'}</dd></div>
                  <div><dt>Téléphone</dt><dd className="chiffres">{c.telephone ?? '—'}</dd></div>
                  <div><dt>Courriel</dt><dd>{c.courriel ?? '—'}</dd></div>
                  <div><dt>Affichage</dt><dd>{c.modeSimplifie ? 'Mode simplifié' : 'Standard'}</dd></div>
                </dl>
              )}
            </Charge>
          </Carte>
        </div>
      </div>
    </Page>
  );
}
