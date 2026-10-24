import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ErreurApi, type FicheUrgence, type MotifUrgence, type ResultatRecherche } from '../../api';
import { Avatar, photoPersonne } from '../../composants/Avatar';
import { Carte, EntetePage, Page, useTitre } from '../../composants/Gabarit';
import { Illustration } from '../../composants/Illustration';
import { RubriqueAdaptation, RubriqueAllergies, RubriqueMaladies, RubriqueMedicaments, RubriqueVolontes } from '../../composants/Niveau1';
import { Charge, useRequete } from '../../composants/Requete';
import { age, heure, jourAnnee } from '../../format';

const SERVICE = 'Dossier clinique';
const SEXES: Record<string, string> = { F: 'Féminin', M: 'Masculin', X: 'Non précisé' };

export function Recherche() {
  useTitre('Trouver un patient', SERVICE);
  const naviguer = useNavigate();
  const [q, setQ] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function chercher(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) { setErreur('Entrez un numéro QC ou un NAM.'); return; }
    setOccupe(true); setErreur(null);
    try {
      const r = await api.get<ResultatRecherche>(`/recherche?q=${encodeURIComponent(q)}`);
      naviguer(`/clinique/${r.numero}`);
    } catch (x) { setErreur(x instanceof ErreurApi ? x.message : 'Une erreur est survenue.'); }
    finally { setOccupe(false); }
  }

  return (
    <Page etroite>
      <EntetePage illustration="clinique" titre="Trouver un patient" chapeau="Par numéro QC ou par numéro d'assurance maladie. Chaque recherche est inscrite au journal du patient." />
      <form className="carte apparait" onSubmit={chercher} noValidate style={{ gap: 18 }}>
        <div className={`groupe ${erreur ? 'en-erreur' : ''}`}>
          <label htmlFor="q">Numéro QC ou NAM</label>
          <p className="indice" id="q-indice">Par exemple 4829 1357 066 ou TREG 3955 0211</p>
          {erreur && <p className="message-erreur" id="q-erreur" role="alert"><span className="visuellement-cache">Erreur : </span>{erreur}</p>}
          <div className="actions" style={{ alignItems: 'stretch' }}>
            <input id="q" className="saisie" style={{ flex: '1 1 260px', maxWidth: 420 }} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false}
              aria-invalid={!!erreur} aria-describedby={`q-indice${erreur ? ' q-erreur' : ''}`} />
            <button type="submit" className="bouton" disabled={occupe}>{occupe ? 'Recherche…' : 'Rechercher'}</button>
          </div>
        </div>
      </form>
    </Page>
  );
}

/** Bandeau patient : identification sans ambiguïté (photo, NOM, naissance, numéro), toujours visible. */
function BandeauPatient({ r, fiche }: { r: ResultatRecherche; fiche: FicheUrgence | null }) {
  const i = r.identite;
  const nom = `${(i.nom ?? 'Inconnu').toLocaleUpperCase('fr-CA')}, ${i.prenom ?? '—'}`;
  return (
    <section className="bandeau-patient" aria-label="Patient">
      <div className="interieur">
        <div className="qui">
          <Avatar src={photoPersonne(r.numero)} nom={`${i.prenom ?? ''} ${i.nom ?? ''}`} taille={84} carre
            alt={i.photoPriseLe ? `Photo d'identification, prise le ${jourAnnee(i.photoPriseLe)}` : ''} />
          <p className="nom">{nom}</p>
        </div>
        <dl>
          <div><dt>Naissance</dt><dd>{i.dateNaissance ? `${jourAnnee(i.dateNaissance)} (${age(i.dateNaissance)} ans)` : '—'}</dd></div>
          <div><dt>Sexe à la naissance</dt><dd>{i.sexe ? SEXES[i.sexe] : '—'}</dd></div>
          <div><dt>Numéro QC</dt><dd className="chiffres">{r.numeroAffiche}</dd></div>
          <div><dt>Statut</dt><dd>{r.statut}</dd></div>
        </dl>
        {fiche && (fiche.allergies.etat === 'presentes'
          ? <span className={`drapeau ${fiche.allergies.elements.some((a) => a.gravite === 'grave') ? '' : 'neutre'}`}>Allergies : {fiche.allergies.elements.map((a) => a.substance).join(', ')}</span>
          : fiche.allergies.etat === 'non_documente' ? <span className="drapeau neutre">Allergies non documentées</span> : <span className="drapeau neutre">Aucune allergie connue</span>)}
      </div>
    </section>
  );
}

export function Fiche() {
  const { numero = '' } = useParams();
  const [identite] = useRequete(() => api.get<ResultatRecherche>(`/recherche?q=${numero}`), [numero]);
  const [fiche, recharger] = useRequete(() => api.get<FicheUrgence>(`/personnes/${numero}/fiche-urgence`), [numero]);
  const refuse = fiche.etat === 'erreur' && fiche.erreur.statut === 403;
  const nom = identite.etat === 'pret' ? `${identite.valeur.identite.nom?.toUpperCase()}, ${identite.valeur.identite.prenom}` : 'Patient';
  useTitre(nom, SERVICE);

  return (
    <>
      {identite.etat === 'pret' && <BandeauPatient r={identite.valeur} fiche={fiche.etat === 'pret' ? fiche.valeur : null} />}
      <Page>
        <nav aria-label="Fil d'Ariane"><ol className="fil"><li><Link to="/clinique">Trouver un patient</Link></li></ol></nav>
        {fiche.etat === 'pret' && (
          <div className={`statut-acces apparait ${fiche.valeur.acces.urgence ? 'urgence' : ''}`} role="status">
            <span className={`etiquette ${fiche.valeur.acces.urgence ? 'jaune' : 'verte'}`}><span className="point" />{fiche.valeur.acces.urgence ? 'Accès d\'urgence' : fiche.valeur.acces.raison}</span>
            {fiche.valeur.acces.expireLe && <span>Expire à <strong>{heure(fiche.valeur.acces.expireLe)}</strong>. Il sera revu par l'équipe d'exploitation.</span>}
            <span className="meta">Cette consultation est inscrite au journal du patient.</span>
          </div>
        )}
        {refuse
          ? <AccesUrgence numero={numero} apres={recharger} />
          : (
            <Charge etat={fiche} recharger={recharger} lignes={6}>
              {(f) => (
                <>
                  <h2>Niveau 1 · à voir avant tout soin</h2>
                  <div className="grille">
                    <RubriqueAllergies a={f.allergies} pourClinicien />
                    <RubriqueMedicaments m={f.medicaments} />
                    <RubriqueMaladies m={f.maladies} />
                    <RubriqueAdaptation a={f.adaptation} />
                    <RubriqueVolontes v={f.volontes} />
                    <Carte nom="proches" titre="Proche à joindre">
                      {f.proches.length === 0 ? <p>Aucun mandataire inscrit.</p> : (
                        <ul className="elements">
                          {f.proches.map((p) => (
                            <li key={p.nom}>
                              <span className="nom">{p.nom}</span>
                              <span className="chiffres">{p.telephone ?? '—'}</span>
                              <span className="meta">Procuration de niveau {p.niveau}{p.fin ? `, jusqu'au ${jourAnnee(p.fin)}` : ''}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Carte>
                  </div>
                </>
              )}
            </Charge>
          )}
      </Page>
    </>
  );
}

/** Accès d'urgence (« bris de verre ») : motif normalisé, précision, avertissement, accès limité dans le temps. */
function AccesUrgence({ numero, apres }: { numero: string; apres: () => void }) {
  const [motifs] = useRequete(() => api.get<MotifUrgence[]>('/motifs-urgence'), []);
  const [motif, setMotif] = useState('');
  const [precision, setPrecision] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const resume = useRef<HTMLDivElement>(null);
  useEffect(() => { if (erreur) resume.current?.focus(); }, [erreur]);

  async function ouvrir(e: FormEvent) {
    e.preventDefault();
    if (!motif) { setErreur('Choisissez le motif de l\'accès d\'urgence.'); return; }
    if (motif === 'autre' && precision.trim().length < 10) { setErreur('Précisez le motif en au moins 10 caractères.'); return; }
    setOccupe(true); setErreur(null);
    try { await api.post(`/personnes/${numero}/acces-urgence`, { motifCode: motif, precision }); apres(); }
    catch (x) { setErreur(x instanceof ErreurApi ? x.message : 'Une erreur est survenue.'); }
    finally { setOccupe(false); }
  }

  return (
    <div className="bento">
      <div className="l7 pile">
        <div className="encart apparait">
          <p><strong>Vous n'avez pas de lien de soins avec cette personne.</strong></p>
          <p className="secondaire">Son dossier n'est pas ouvert à votre nom. Si son état l'exige, ouvrez un accès d'urgence.</p>
        </div>
        {erreur && (
          <div className="resume-erreurs" role="alert" tabIndex={-1} ref={resume}>
            <h2>Il y a un problème</h2>
            <p><a href="#motif-0">{erreur}</a></p>
          </div>
        )}
        <form className="carte apparait" onSubmit={ouvrir} noValidate style={{ gap: 20 }}>
          <div className="carte-titre">
            <span className="puce" style={{ color: 'var(--critique)', background: 'var(--critique-doux)' }}><Illustration nom="clinique" taille={24} epaisseur={4.2} /></span>
            <h2>Ouvrir un accès d'urgence</h2>
          </div>
          <fieldset className="choix">
            <legend style={{ fontWeight: 750, fontSize: '1.1rem', marginBottom: 10 }}>Motif</legend>
            <Charge etat={motifs} lignes={5}>
              {(liste) => liste.map((m, i) => (
                <label key={m.code} className="option">
                  <input type="radio" name="motif" id={`motif-${i}`} value={m.code} checked={motif === m.code} onChange={() => setMotif(m.code)} />
                  <span>{m.libelle}</span>
                </label>
              ))}
            </Charge>
          </fieldset>
          <div className="groupe">
            <label htmlFor="precision">Précision {motif === 'autre' ? '' : '(facultatif)'}</label>
            <p className="indice" id="precision-indice">Par exemple : patiente confuse après une chute, arrivée en ambulance.</p>
            <textarea id="precision" className="saisie" rows={3} maxLength={300} value={precision} onChange={(e) => setPrecision(e.target.value)} aria-describedby="precision-indice" />
          </div>
          <div className="actions"><button type="submit" className="bouton danger" disabled={occupe}>{occupe ? 'Ouverture…' : 'Ouvrir l\'accès d\'urgence'}</button></div>
        </form>
      </div>
      <aside className="l5 carte apparait" aria-label="Ce qui se passe ensuite">
        <h2>Ce qui se passe ensuite</h2>
        <ol className="chronologie">
          {['L\'accès s\'ouvre pour 12 heures, à votre nom seulement.', 'La personne le voit dans « Qui a consulté mon dossier ».', 'L\'équipe d\'exploitation le revoit : justifié ou enquête.'].map((t, i) => (
            <li key={t}><span className="noeud" style={{ fontWeight: 800 }}>{i + 1}</span><div className="contenu"><p>{t}</p></div></li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

export function PorteAVenir({ porte }: { porte: string }) {
  useTitre(`Espace ${porte}`, 'Santé Québec');
  return (
    <Page etroite>
      <EntetePage illustration="journal" titre={`Espace ${porte}`} chapeau="Les écrans de cet espace sont en conception. Les fonctions existent déjà dans l'API." />
    </Page>
  );
}
