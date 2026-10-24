import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ErreurApi, type Droit, type EntreeQuiAVu, type GroupeFamille, type Medicament, type Reponse, type Vaccin } from '../../api';
import { Charge, useRequete } from '../../composants/Requete';
import { Icone } from '../../composants/Icone';
import { heure, jourAnnee, MOMENTS } from '../../format';
import { Retour, TitrePage, useCible } from './commun';

const retourDe = (c: ReturnType<typeof useCible>) => <Retour vers={c.estMoi ? '/' : `/pour/${c.numero}`} texte={c.estMoi ? 'Accueil' : c.nom} />;

export function Medicaments() {
  const c = useCible();
  const [etat, recharger] = useRequete(() => api.get<Reponse<Medicament[]>>(`/personnes/${c.numero}/donnees/medicaments`), [c.numero]);
  return (
    <main className="page etroite" id="contenu">
      {retourDe(c)}
      <TitrePage {...c} moi="Mes médicaments" autre="Médicaments" />
      <Charge etat={etat} recharger={recharger}>
        {(r) => r.valeur.length === 0 ? <p className="carte">Aucun médicament actif.</p> : (
          <>
            {(Object.keys(MOMENTS) as (keyof typeof MOMENTS)[]).map((m) => {
              const liste = r.valeur.filter((x) => x.moments.includes(m));
              if (!liste.length) return null;
              return (
                <section key={m} className="carte" aria-labelledby={`m-${m}`}>
                  <h2 id={`m-${m}`}>{MOMENTS[m]}</h2>
                  <ul className="liste">
                    {liste.map((x) => (
                      <li key={x.id}>
                        <strong style={{ fontSize: '1.15rem' }}>{x.nom}</strong>
                        <span>{x.posologie}</span>
                        {x.miseEnGarde && <span className="pastille attention">{x.miseEnGarde}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            <p className="secondaire petit">Source : {[...new Set(r.valeur.map((x) => x.source))].join(', ')}. Pour toute question, votre pharmacien peut vous répondre.</p>
          </>
        )}
      </Charge>
    </main>
  );
}

export function Vaccins() {
  const c = useCible();
  const [etat, recharger] = useRequete(() => api.get<Reponse<Vaccin[]>>(`/personnes/${c.numero}/donnees/vaccins`), [c.numero]);
  return (
    <main className="page etroite" id="contenu">
      {retourDe(c)}
      <TitrePage {...c} moi="Mon carnet de vaccination" autre="Carnet de vaccination" />
      <Charge etat={etat} recharger={recharger}>
        {(r) => r.valeur.length === 0 ? <p className="carte">Aucune dose inscrite.</p> : (
          <section className="carte">
            <ul className="liste">
              {r.valeur.map((v) => (
                <li key={v.id}>
                  <strong>{v.produit}</strong>
                  <span>{jourAnnee(v.donneLe)}</span>
                  <span className="secondaire">{v.lieu}{v.note ? ` · ${v.note}` : ''}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Charge>
    </main>
  );
}

export function QuiAVu() {
  const c = useCible();
  const [etat, recharger] = useRequete(() => api.get<EntreeQuiAVu[]>(`/personnes/${c.numero}/journal`), [c.numero]);
  const [erreur, setErreur] = useState<string | null>(null);
  const signaler = async (no: number) => {
    setErreur(null);
    try { await api.post(`/journal/${no}/signalement`); recharger(); } catch (e) { setErreur(e instanceof ErreurApi ? e.message : 'Une erreur est survenue.'); }
  };
  return (
    <main className="page etroite" id="contenu">
      <Retour />
      <div className="pile" style={{ gap: 6 }}>
        <h1>Qui a consulté mon dossier</h1>
        <p className="secondaire">Chaque consultation est inscrite. Personne ne peut effacer cette liste.</p>
      </div>
      {erreur && <p className="carte attention" role="alert">{erreur}</p>}
      <Charge etat={etat} recharger={recharger}>
        {(liste) => liste.length === 0 ? <p className="carte">Personne d'autre que vous n'a consulté votre dossier.</p> : (
          <ul className="pile" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {liste.map((e) => (
              <li key={e.no} className={`carte ${e.urgence ? 'attention' : ''}`}>
                <p style={{ fontWeight: 700, fontSize: '1.15rem' }}>{e.qui}</p>
                <p className="secondaire">{e.precision}</p>
                <p>{e.action === 'lire' ? 'A consulté' : 'A modifié'} : {e.donnee.toLowerCase()} · {jourAnnee(e.le)}, {heure(e.le)}</p>
                {e.urgence && <span className="pastille attention">Accès d'urgence</span>}
                {e.signale
                  ? <span className="pastille ok"><Icone nom="coche" taille={16} /> Signalé, une personne va vérifier</span>
                  : <button type="button" className="bouton discret" style={{ alignSelf: 'flex-start' }} onClick={() => signaler(e.no)}>Je ne reconnais pas cet accès</button>}
              </li>
            ))}
          </ul>
        )}
      </Charge>
    </main>
  );
}

export function Famille() {
  const c = useCible();
  const [etat, recharger] = useRequete(() => api.get<GroupeFamille[]>(`/personnes/${c.numero}/famille`), [c.numero]);
  return (
    <main className="page etroite" id="contenu">
      <Retour />
      <div className="pile" style={{ gap: 6 }}>
        <h1>Ma famille</h1>
        <p className="secondaire">Ces liens viennent de l'État civil. Vous ne voyez pas le dossier de vos proches sans leur permission.</p>
      </div>
      <Charge etat={etat} recharger={recharger}>
        {(groupes) => groupes.length === 0 ? <p className="carte">Aucun lien familial inscrit.</p> : (
          <div className="pile">
            {groupes.map((g) => (
              <section key={g.groupe} className="carte" aria-labelledby={`g-${g.groupe}`}>
                <h2 id={`g-${g.groupe}`}>{g.libelle}</h2>
                <ul className="liste">
                  {g.personnes.map((p) => (
                    <li key={p.numero}>
                      <strong>{p.nom}</strong>
                      <span className="secondaire">{p.deces ? `Décédé·e en ${p.deces.slice(0, 4)}` : p.age !== null ? `${p.age} ans` : p.statut}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Charge>
    </main>
  );
}

const SECTIONS: Record<string, { vers: string; libelle: string }> = {
  rendezvous: { vers: 'rendez-vous', libelle: 'Rendez-vous' },
  medicaments: { vers: 'medicaments', libelle: 'Médicaments' },
  vaccins: { vers: 'vaccins', libelle: 'Carnet de vaccination' },
};

/** Vue d'une personne dont on s'occupe : ce qu'on peut ouvrir, et pourquoi le reste est fermé. */
export function PourUnProche() {
  const c = useCible();
  const [etat, recharger] = useRequete(() => api.get<Droit[]>(`/personnes/${c.numero}/droits`), [c.numero]);
  return (
    <main className="page etroite" id="contenu">
      <Retour />
      <div className="pile" style={{ gap: 4 }}>
        <h1>{c.nom}</h1>
        {c.lien && <p className="secondaire">{c.lien}</p>}
      </div>
      <Charge etat={etat} recharger={recharger}>
        {(droits) => {
          const ouvertes = droits.filter((d) => d.permis && SECTIONS[d.donnee]);
          const fermees = droits.filter((d) => !d.permis);
          return (
            <>
              {ouvertes.length > 0 && (
                <nav className="pile" aria-label="Ce que vous pouvez gérer">
                  {ouvertes.map((d) => (
                    <Link key={d.donnee} to={`/pour/${c.numero}/${SECTIONS[d.donnee]!.vers}`} className="tuile">
                      <span><span className="titre">{SECTIONS[d.donnee]!.libelle}</span></span>
                      <Icone nom="chevron" className="chevron" />
                    </Link>
                  ))}
                </nav>
              )}
              {fermees.length > 0 && (
                <section className="carte" aria-labelledby="fermees">
                  <h2 id="fermees">Non accessible</h2>
                  <ul className="liste">
                    {fermees.map((d) => <li key={d.donnee}><strong>{d.libelle}</strong><span className="secondaire">{d.raison}</span></li>)}
                  </ul>
                </section>
              )}
            </>
          );
        }}
      </Charge>
    </main>
  );
}

export function Aide() {
  return (
    <main className="page etroite" id="contenu">
      <Retour />
      <h1>Besoin d'aide</h1>
      <a className="tuile principale" href="tel:811">
        <Icone nom="telephone" className="icone" taille={44} />
        <span><span className="titre">Info-Santé 811</span><span className="sous">Une infirmière, jour et nuit</span></span>
      </a>
      <a className="tuile" href="tel:911" style={{ borderColor: 'var(--critique)' }}>
        <Icone nom="alerte" className="icone" taille={44} />
        <span><span className="titre">Urgence : 911</span><span className="sous">Si votre vie ou celle d'un proche est en danger</span></span>
      </a>
    </main>
  );
}
