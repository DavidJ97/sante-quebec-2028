import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api, ErreurApi, type Adaptation, type Allergies, type Droit, type EntreeQuiAVu, type GroupeFamille, type Maladie,
  type Medicament, type Reponse, type Vaccin, type Volontes,
} from '../../api';
import { Avatar, photoPersonne, photoPersonnel } from '../../composants/Avatar';
import { Carte, EntetePage, Page, teinte, useTitre } from '../../composants/Gabarit';
import { Illustration, type NomIllustration } from '../../composants/Illustration';
import { RubriqueAdaptation, RubriqueAllergies, RubriqueMaladies, RubriqueVolontes } from '../../composants/Niveau1';
import { Charge, useRequete } from '../../composants/Requete';
import { dateHeure, jourAnnee, MOMENTS } from '../../format';
import { relatif, SERVICE, useCible } from './commun';

const lire = <T,>(numero: string, donnee: string) => api.get<Reponse<T>>(`/personnes/${numero}/donnees/${donnee}`).then((r) => r.valeur);

export function Medicaments() {
  const c = useCible();
  const titre = c.titre('Mes médicaments', 'Médicaments');
  useTitre(titre, SERVICE);
  const [etat, recharger] = useRequete(() => lire<Medicament[]>(c.numero, 'medicaments'), [c.numero]);
  return (
    <Page etroite>
      <EntetePage illustration="medicaments" fil={c.fil} surTitre={c.surTitre} titre={titre}
        chapeau="Les médicaments servis en pharmacie, selon le moment de la journée." />
      <Charge etat={etat} recharger={recharger}>
        {(m) => m.length === 0 ? <p className="encart">Aucun médicament actif au Dossier santé Québec.</p> : (
          <>
            {(Object.keys(MOMENTS) as (keyof typeof MOMENTS)[]).map((moment) => {
              const liste = m.filter((x) => x.moments.includes(moment));
              if (!liste.length) return null;
              return (
                <Carte key={moment} nom="medicaments" titre={MOMENTS[moment]} id={`moment-${moment}`}>
                  <ul className="elements">
                    {liste.map((x) => (
                      <li key={x.id}>
                        <span className="nom">{x.nom}</span>
                        <span className="secondaire">{x.posologie}</span>
                        {x.miseEnGarde && <span className="etiquette jaune">{x.miseEnGarde}</span>}
                      </li>
                    ))}
                  </ul>
                </Carte>
              );
            })}
            <p className="meta">Source : {[...new Set(m.map((x) => x.source))].join(', ')}. Une question sur un médicament ? Votre pharmacienne ou votre pharmacien peut vous répondre.</p>
          </>
        )}
      </Charge>
    </Page>
  );
}

export function Vaccins() {
  const c = useCible();
  const titre = c.titre('Mon carnet de vaccination', 'Carnet de vaccination');
  useTitre(titre, SERVICE);
  const [etat, recharger] = useRequete(() => lire<Vaccin[]>(c.numero, 'vaccins'), [c.numero]);
  return (
    <Page etroite>
      <EntetePage illustration="vaccins" fil={c.fil} surTitre={c.surTitre} titre={titre}
        chapeau="Chaque dose est inscrite par la personne qui l'a donnée. Vous n'avez rien à recopier." />
      <Charge etat={etat} recharger={recharger}>
        {(v) => v.length === 0 ? <p className="encart">Aucune dose inscrite.</p> : (
          <section className="carte apparait" style={teinte('vaccins')} aria-labelledby="doses">
            <h2 id="doses">{v.length} dose{v.length > 1 ? 's' : ''} inscrite{v.length > 1 ? 's' : ''}</h2>
            <ol className="chronologie" style={teinte('vaccins')}>
              {v.map((x) => (
                <li key={x.id}>
                  <span className="noeud"><Illustration nom="vaccins" taille={20} epaisseur={5} /></span>
                  <div className="contenu">
                    <span className="annee">{jourAnnee(x.donneLe)}</span>
                    <strong style={{ fontSize: '1.12rem' }}>{x.produit}</strong>
                    <span className="secondaire">{x.lieu}{x.note ? ` · ${x.note}` : ''}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </Charge>
    </Page>
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
    <Page>
      <EntetePage illustration="maladies" fil={c.fil} titre="Résumé de santé"
        chapeau="Ce que les équipes soignantes voient en premier, avant tout soin." />
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
      <p className="meta">Une information est inexacte ? Signalez-la à votre médecin de famille ou à votre pharmacie : seuls les professionnels peuvent la corriger.</p>
    </Page>
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
    <Page etroite>
      <EntetePage illustration="journal" titre="Qui a consulté mon dossier"
        chapeau="Chaque consultation est inscrite au journal. Personne, pas même un administrateur, ne peut l'effacer." />
      {erreur && <p className="resume-erreurs" role="alert">{erreur}</p>}
      <Charge etat={etat} recharger={recharger}>
        {(liste) => liste.length === 0 ? <p className="encart">Personne d'autre que vous n'a consulté votre dossier.</p> : (
          <ol className="pile" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {liste.map((e) => (
              <li key={e.no} className="carte apparait" style={{ ...teinte('journal'), flexDirection: 'row', alignItems: 'flex-start', gap: 16, ...(e.urgence ? { borderColor: 'var(--attention-bord)' } : {}) }}>
                <Avatar src={e.employeId ? photoPersonnel(e.employeId) : null} nom={e.qui} taille={52} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
                  <p className="meta">{dateHeure(e.le)} · {relatif(e.le)}</p>
                  <p style={{ fontWeight: 750, fontSize: '1.15rem' }}>{e.qui}</p>
                  <p className="secondaire">{e.precision}</p>
                  <p>{e.action === 'lire' ? 'A consulté' : 'A modifié'} : <strong>{e.donnee.toLowerCase()}</strong></p>
                  {e.urgence && <span className="etiquette jaune"><span className="point" />Accès d'urgence</span>}
                  <div style={{ marginTop: 4 }}>
                    {e.signale
                      ? <span className="etiquette verte"><span className="point" />Signalé · une personne va vérifier</span>
                      : <button type="button" className="bouton-lien" onClick={() => signaler(e.no)}>Je ne reconnais pas cet accès</button>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Charge>
    </Page>
  );
}

export function Famille() {
  const c = useCible();
  useTitre('Ma famille', SERVICE);
  const [etat, recharger] = useRequete(() => api.get<GroupeFamille[]>(`/personnes/${c.numero}/famille`), [c.numero]);
  return (
    <Page>
      <EntetePage illustration="famille" titre="Ma famille"
        chapeau="Ces liens viennent de l'État civil. Vous ne voyez pas le dossier de vos proches sans leur permission." />
      <Charge etat={etat} recharger={recharger}>
        {(groupes) => groupes.length === 0 ? <p className="encart">Aucun lien familial inscrit.</p> : (
          <div className="grille">
            {groupes.map((g) => (
              <Carte key={g.groupe} nom="famille" titre={g.libelle} id={`g-${g.groupe}`}>
                <ul className="elements">
                  {g.personnes.map((p) => (
                    <li key={p.numero} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Avatar nom={p.nom} taille={40} />
                      <span style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="nom">{p.nom}</span>
                        <span className="meta">{p.deces ? `Décédé·e en ${p.deces.slice(0, 4)}` : p.age !== null ? `${p.age} ans` : p.statut}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Carte>
            ))}
          </div>
        )}
      </Charge>
    </Page>
  );
}

const SECTIONS: Partial<Record<string, { vers: string; titre: string; nom: NomIllustration; description: string }>> = {
  rendezvous: { vers: 'rendez-vous', titre: 'Rendez-vous', nom: 'rendezvous', description: 'Confirmer, changer une date' },
  medicaments: { vers: 'medicaments', titre: 'Médicaments', nom: 'medicaments', description: 'Quoi prendre et quand' },
  vaccins: { vers: 'vaccins', titre: 'Carnet de vaccination', nom: 'vaccins', description: 'Toutes les doses' },
};

/** Personne dont on s'occupe : ce qu'on peut ouvrir, et pourquoi le reste est fermé. */
export function PourUnProche() {
  const c = useCible();
  useTitre(c.nom, SERVICE);
  const [etat, recharger] = useRequete(() => api.get<Droit[]>(`/personnes/${c.numero}/droits`), [c.numero]);
  return (
    <Page>
      <EntetePage illustration="proches" surTitre="Personne dont vous vous occupez" titre={c.nom} chapeau={c.lien}
        apres={<Avatar src={photoPersonne(c.numero)} nom={c.nom} taille={72} carre alt={`Photo de ${c.nom}`} />} />
      <Charge etat={etat} recharger={recharger}>
        {(droits) => {
          const ouvertes = droits.filter((d) => d.permis && SECTIONS[d.donnee]);
          const fermees = droits.filter((d) => !d.permis);
          return (
            <div className="bento">
              {ouvertes.length > 0 && (
                <nav className="l7" aria-labelledby="peut">
                  <h2 id="peut" style={{ marginBottom: 14 }}>Ce que vous pouvez faire</h2>
                  <div className="grille" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))' }}>
                    {ouvertes.map((d) => {
                      const s = SECTIONS[d.donnee]!;
                      return (
                        <Link key={d.donnee} to={`/pour/${c.numero}/${s.vers}`} className="carte cliquable apparait" style={{ ...teinte(s.nom), padding: 18, gap: 10 }}>
                          <span className="puce"><Illustration nom={s.nom} taille={24} epaisseur={4.2} /></span>
                          <span style={{ fontWeight: 750, fontSize: '1.12rem' }}>{s.titre}</span>
                          <span className="meta">{s.description}</span>
                        </Link>
                      );
                    })}
                  </div>
                </nav>
              )}
              {fermees.length > 0 && (
                <section className="l5 carte apparait" style={teinte('journal')} aria-labelledby="pas">
                  <div className="carte-titre">
                    <span className="puce"><Illustration nom="journal" taille={24} epaisseur={4.2} /></span>
                    <h2 id="pas">Ce qui reste privé</h2>
                  </div>
                  {[...new Set(fermees.map((d) => d.raison))].map((raison) => {
                    const m = /^Procuration «\s?(.+?)\s?»\s?: cette donnée n'est pas incluse$/.exec(raison);
                    return (
                      <div key={raison} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <p>{m ? <>Votre procuration « {m[1]} » ne donne pas accès à :</> : `${raison} :`}</p>
                        <ul style={{ margin: 0, paddingLeft: 22 }}>
                          {fermees.filter((d) => d.raison === raison).map((d) => <li key={d.donnee}>{d.libelle.toLowerCase()}</li>)}
                        </ul>
                      </div>
                    );
                  })}
                  <p className="meta">Pour plus d'accès, la personne peut modifier votre procuration dans son propre dossier.</p>
                </section>
              )}
            </div>
          );
        }}
      </Charge>
    </Page>
  );
}

export function Aide() {
  useTitre('Obtenir de l\'aide', SERVICE);
  return (
    <Page etroite>
      <EntetePage illustration="aide" titre="Obtenir de l'aide" chapeau="Une question sur votre santé, un symptôme, un doute sur un médicament ?" />
      <Carte nom="aide" titre="Info-Santé 811">
        <p>Une infirmière vous répond 24 heures sur 24, 7 jours sur 7. L'appel est gratuit.</p>
        <div className="actions"><a className="bouton" href="tel:811">Appeler le 811</a></div>
      </Carte>
      <Carte nom="maladies" titre="Urgence : 911" alerte>
        <p>Si votre vie ou celle d'une autre personne est en danger, appelez le 911 immédiatement.</p>
        <div className="actions"><a className="bouton danger" href="tel:911">Appeler le 911</a></div>
      </Carte>
    </Page>
  );
}
