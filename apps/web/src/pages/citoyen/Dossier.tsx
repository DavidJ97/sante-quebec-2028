import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  api, ErreurApi, type Adaptation, type Allergies, type Droit, type EntreeQuiAVu, type GroupeFamille, type Maladie,
  type Medicament, type Reponse, type Vaccin, type Volontes,
} from '../../api';
import { Corps, Rubrique, TetePage, useTitre } from '../../composants/Gabarit';
import { Illustration, TEINTES, type NomIllustration } from '../../composants/Illustration';
import { RubriqueAdaptation, RubriqueAllergies, RubriqueMaladies, RubriqueVolontes } from '../../composants/Niveau1';
import { Charge, useRequete } from '../../composants/Requete';
import { dateHeure, jourAnnee, MOMENTS } from '../../format';
import { SERVICE, useCible } from './commun';

const lire = <T,>(numero: string, donnee: string) => api.get<Reponse<T>>(`/personnes/${numero}/donnees/${donnee}`).then((r) => r.valeur);

export function Medicaments() {
  const c = useCible();
  const titre = c.titre('Mes médicaments', 'Médicaments');
  useTitre(titre, SERVICE);
  const [etat, recharger] = useRequete(() => lire<Medicament[]>(c.numero, 'medicaments'), [c.numero]);
  return (
    <main id="contenu" tabIndex={-1}>
      <TetePage illustration="medicaments" fil={c.fil} surTitre={c.surTitre} titre={titre}
        chapeau="Les médicaments servis en pharmacie, regroupés selon le moment de la journée." />
      <Corps etroit>
        <Charge etat={etat} recharger={recharger}>
          {(m) => m.length === 0 ? <p>Aucun médicament actif au Dossier santé Québec.</p> : (
            <>
              {(Object.keys(MOMENTS) as (keyof typeof MOMENTS)[]).map((moment) => {
                const liste = m.filter((x) => x.moments.includes(moment));
                if (!liste.length) return null;
                return (
                  <Rubrique key={moment} nom="medicaments" titre={MOMENTS[moment]} id={`moment-${moment}`}>
                    <ul className="elements">
                      {liste.map((x) => (
                        <li key={x.id}>
                          <span className="nom">{x.nom}</span>
                          <span>{x.posologie}</span>
                          {x.miseEnGarde && <span className="etiquette jaune">{x.miseEnGarde}</span>}
                        </li>
                      ))}
                    </ul>
                  </Rubrique>
                );
              })}
              <p className="secondaire">Source : {[...new Set(m.map((x) => x.source))].join(', ')}. Une question sur un médicament ? Votre pharmacienne ou votre pharmacien peut vous répondre.</p>
            </>
          )}
        </Charge>
      </Corps>
    </main>
  );
}

export function Vaccins() {
  const c = useCible();
  const titre = c.titre('Mon carnet de vaccination', 'Carnet de vaccination');
  useTitre(titre, SERVICE);
  const [etat, recharger] = useRequete(() => lire<Vaccin[]>(c.numero, 'vaccins'), [c.numero]);
  return (
    <main id="contenu" tabIndex={-1}>
      <TetePage illustration="vaccins" fil={c.fil} surTitre={c.surTitre} titre={titre}
        chapeau="Chaque dose est inscrite par la personne qui l'a donnée. Vous n'avez rien à recopier." />
      <Corps>
        <Charge etat={etat} recharger={recharger}>
          {(v) => v.length === 0 ? <p>Aucune dose inscrite.</p> : (
            <div className="tableau-conteneur" tabIndex={0} role="region" aria-label="Doses de vaccins inscrites">
              <table className="empilable">
                <caption>{v.length} dose{v.length > 1 ? 's' : ''} inscrite{v.length > 1 ? 's' : ''}</caption>
                <thead><tr><th scope="col">Date</th><th scope="col">Vaccin</th><th scope="col">Lieu</th><th scope="col">Remarque</th></tr></thead>
                <tbody>
                  {v.map((x) => (
                    <tr key={x.id}>
                      <td data-etiquette="Date" style={{ whiteSpace: 'nowrap' }}>{jourAnnee(x.donneLe)}</td>
                      <th scope="row" data-etiquette="Vaccin" style={{ fontWeight: 700 }}>{x.produit}</th>
                      <td data-etiquette="Lieu">{x.lieu}</td>
                      <td data-etiquette="Remarque">{x.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Charge>
      </Corps>
    </main>
  );
}

export function Resume() {
  const c = useCible();
  useTitre('Résumé de santé', SERVICE);
  const [etat, recharger] = useRequete(async () => {
    const [allergies, maladies, adaptation, volontes] = await Promise.all([
      lire<Allergies>(c.numero, 'allergies'), lire<Maladie[]>(c.numero, 'maladies'),
      lire<Adaptation[]>(c.numero, 'adaptation'), lire<Volontes | null>(c.numero, 'volontes'),
    ]);
    return { allergies, maladies, adaptation, volontes };
  }, [c.numero]);
  return (
    <main id="contenu" tabIndex={-1}>
      <TetePage illustration="maladies" fil={c.fil} titre="Résumé de santé"
        chapeau="Ce que les équipes soignantes voient en premier, avant tout soin." />
      <Corps>
        <Charge etat={etat} recharger={recharger} lignes={6}>
          {(r) => (
            <div className="grille">
              <RubriqueAllergies a={r.allergies} />
              <RubriqueMaladies m={r.maladies} />
              <RubriqueAdaptation a={r.adaptation} />
              <RubriqueVolontes v={r.volontes} />
            </div>
          )}
        </Charge>
        <p className="secondaire">Une information est inexacte ? Signalez-la à votre médecin de famille ou à votre pharmacie : seuls les professionnels peuvent la corriger.</p>
      </Corps>
    </main>
  );
}

export function QuiAVu() {
  const c = useCible();
  useTitre('Qui a consulté mon dossier', SERVICE);
  const [etat, recharger] = useRequete(() => api.get<EntreeQuiAVu[]>(`/personnes/${c.numero}/journal`), [c.numero]);
  const [erreur, setErreur] = useState<string | null>(null);
  const signaler = async (no: number) => {
    setErreur(null);
    try { await api.post(`/journal/${no}/signalement`); recharger(); }
    catch (e) { setErreur(e instanceof ErreurApi ? e.message : 'Une erreur est survenue.'); }
  };
  return (
    <main id="contenu" tabIndex={-1}>
      <TetePage illustration="journal" fil={c.fil} titre="Qui a consulté mon dossier"
        chapeau="Chaque consultation est inscrite au journal. Personne, pas même un administrateur, ne peut l'effacer." />
      <Corps etroit>
        {erreur && <p className="message-erreur" role="alert">{erreur}</p>}
        <Charge etat={etat} recharger={recharger}>
          {(liste) => liste.length === 0 ? <p>Personne d'autre que vous n'a consulté votre dossier.</p> : (
            <ol className="elements" style={{ borderTop: '1px solid var(--ligne)' }} reversed>
              {liste.map((e) => (
                <li key={e.no} style={{ paddingBlock: 18 }}>
                  <span className="secondaire">{dateHeure(e.le)}</span>
                  <span className="nom">{e.qui}</span>
                  <span>{e.precision}</span>
                  <span>{e.action === 'lire' ? 'A consulté' : 'A modifié'} : <strong>{e.donnee.toLowerCase()}</strong></span>
                  {e.urgence && <span className="etiquette jaune">Accès d'urgence</span>}
                  <span style={{ marginTop: 6 }}>
                    {e.signale
                      ? <span className="etiquette verte">Signalé · une personne va vérifier</span>
                      : <button type="button" className="bouton-lien" onClick={() => signaler(e.no)}>Je ne reconnais pas cet accès</button>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Charge>
      </Corps>
    </main>
  );
}

const PICTO_FAMILLE: Record<string, NomIllustration> = { parents: 'famille', enfants: 'famille' };

export function Famille() {
  const c = useCible();
  useTitre('Ma famille', SERVICE);
  const [etat, recharger] = useRequete(() => api.get<GroupeFamille[]>(`/personnes/${c.numero}/famille`), [c.numero]);
  return (
    <main id="contenu" tabIndex={-1}>
      <TetePage illustration="famille" fil={c.fil} titre="Ma famille"
        chapeau="Ces liens viennent de l'État civil. Vous ne voyez pas le dossier de vos proches sans leur permission." />
      <Corps>
        <Charge etat={etat} recharger={recharger}>
          {(groupes) => groupes.length === 0 ? <p>Aucun lien familial inscrit.</p> : (
            <div className="grille">
              {groupes.map((g) => (
                <Rubrique key={g.groupe} nom={PICTO_FAMILLE[g.groupe] ?? 'proches'} titre={g.libelle} id={`g-${g.groupe}`}>
                  <ul className="elements">
                    {g.personnes.map((p) => (
                      <li key={p.numero}>
                        <span className="nom">{p.nom}</span>
                        <span className="secondaire">{p.deces ? `Décédé·e en ${p.deces.slice(0, 4)}` : p.age !== null ? `${p.age} ans` : p.statut}</span>
                      </li>
                    ))}
                  </ul>
                </Rubrique>
              ))}
            </div>
          )}
        </Charge>
      </Corps>
    </main>
  );
}

const SECTIONS: Partial<Record<string, { vers: string; titre: string; nom: NomIllustration; description: string }>> = {
  rendezvous: { vers: 'rendez-vous', titre: 'Rendez-vous', nom: 'rendezvous', description: 'Confirmer, changer une date' },
  medicaments: { vers: 'medicaments', titre: 'Médicaments', nom: 'medicaments', description: 'Quoi prendre et à quel moment' },
  vaccins: { vers: 'vaccins', titre: 'Carnet de vaccination', nom: 'vaccins', description: 'Toutes les doses' },
};

/** Personne dont on s'occupe : ce qu'on peut ouvrir, et pourquoi le reste est fermé. */
export function PourUnProche() {
  const c = useCible();
  useTitre(c.nom, SERVICE);
  const [etat, recharger] = useRequete(() => api.get<Droit[]>(`/personnes/${c.numero}/droits`), [c.numero]);
  return (
    <main id="contenu" tabIndex={-1}>
      <TetePage illustration="proches" fil={[{ vers: '/', texte: 'Accueil' }]} surTitre="Personne dont vous vous occupez" titre={c.nom} chapeau={c.lien} />
      <Corps>
        <Charge etat={etat} recharger={recharger}>
          {(droits) => {
            const ouvertes = droits.filter((d) => d.permis && SECTIONS[d.donnee]);
            const fermees = droits.filter((d) => !d.permis);
            return (
              <>
                {ouvertes.length > 0 && (
                  <section aria-labelledby="peut" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h2 id="peut">Ce que vous pouvez faire</h2>
                    <ul className="menu-services">
                      {ouvertes.map((d) => {
                        const s = SECTIONS[d.donnee]!;
                        return (
                          <li key={d.donnee} style={{ '--teinte': TEINTES[s.nom] } as CSSProperties}>
                            <Link to={`/pour/${c.numero}/${s.vers}`}>
                              <span className="pictogramme"><Illustration nom={s.nom} taille={34} /></span>
                              <span><span className="titre">{s.titre}</span><span className="description">{s.description}</span></span>
                              <svg className="fleche" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
                {fermees.length > 0 && (
                  <section aria-labelledby="pas" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760 }}>
                    <h2 id="pas">Ce qui reste privé</h2>
                    {[...new Set(fermees.map((d) => d.raison))].map((raison) => {
                      const m = /^Procuration « (.+) » : cette donnée n'est pas incluse$/.exec(raison);
                      return (
                        <div key={raison} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <p>{m ? <>Votre procuration « {m[1]} » ne donne pas accès à :</> : `${raison} :`}</p>
                          <ul style={{ margin: 0, paddingLeft: 22 }}>
                            {fermees.filter((d) => d.raison === raison).map((d) => <li key={d.donnee}>{d.libelle.toLowerCase()}</li>)}
                          </ul>
                        </div>
                      );
                    })}
                    <p className="secondaire">Pour obtenir plus d'accès, la personne peut modifier votre procuration dans son propre dossier.</p>
                  </section>
                )}
              </>
            );
          }}
        </Charge>
      </Corps>
    </main>
  );
}

export function Aide() {
  useTitre('Obtenir de l\'aide', SERVICE);
  return (
    <main id="contenu" tabIndex={-1}>
      <TetePage illustration="aide" fil={[{ vers: '/', texte: 'Accueil' }]} titre="Obtenir de l'aide"
        chapeau="Une question sur votre santé, un symptôme, un doute sur un médicament ?" />
      <Corps etroit>
        <Rubrique nom="aide" titre="Info-Santé 811">
          <p>Une infirmière vous répond 24 heures sur 24, 7 jours sur 7. L'appel est gratuit.</p>
          <p><a className="bouton" href="tel:811">Appeler le 811</a></p>
        </Rubrique>
        <Rubrique nom="maladies" titre="Urgence : 911" alerte>
          <p>Si votre vie ou celle d'une autre personne est en danger, appelez le 911 immédiatement.</p>
        </Rubrique>
      </Corps>
    </main>
  );
}
