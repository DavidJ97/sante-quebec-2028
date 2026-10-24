import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ErreurApi, type FicheUrgence, type MotifUrgence, type ResultatRecherche } from '../../api';
import { Corps, Rubrique, TetePage, useTitre } from '../../composants/Gabarit';
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
    <main id="contenu" tabIndex={-1} className="clinique">
      <TetePage illustration="clinique" titre="Trouver un patient" chapeau="Par numéro QC ou par numéro d'assurance maladie. Chaque recherche est inscrite au journal du patient." />
      <Corps etroit>
        <form onSubmit={chercher} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={`groupe ${erreur ? 'en-erreur' : ''}`}>
            <label htmlFor="q">Numéro QC ou NAM</label>
            <p className="indice" id="q-indice">Par exemple 4829 1357 066 ou TREG 3955 0211</p>
            {erreur && <p className="message-erreur" id="q-erreur" role="alert"><span className="visuellement-cache">Erreur : </span>{erreur}</p>}
            <input id="q" className="saisie moyenne" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false}
              aria-invalid={!!erreur} aria-describedby={`q-indice${erreur ? ' q-erreur' : ''}`} />
          </div>
          <div className="actions"><button type="submit" className="bouton" disabled={occupe}>{occupe ? 'Recherche…' : 'Rechercher'}</button></div>
        </form>
      </Corps>
    </main>
  );
}

/** Bandeau patient : identification sans ambiguïté, toujours visible en haut de l'écran. */
function BandeauPatient({ r, fiche }: { r: ResultatRecherche; fiche: FicheUrgence | null }) {
  const i = r.identite;
  const allergiesGraves = fiche?.allergies.elements.filter((a) => a.gravite === 'grave') ?? [];
  return (
    <section className="bandeau-patient" aria-label="Patient">
      <div className="conteneur">
        <p className="nom"><span className="famille">{(i.nom ?? 'Inconnu').toLocaleUpperCase('fr-CA')}</span>, {i.prenom ?? '—'}</p>
        <dl>
          <div><dt>Naissance</dt><dd>{i.dateNaissance ? `${jourAnnee(i.dateNaissance)} (${age(i.dateNaissance)} ans)` : '—'}</dd></div>
          <div><dt>Sexe à la naissance</dt><dd>{i.sexe ? SEXES[i.sexe] : '—'}</dd></div>
          <div><dt>Numéro QC</dt><dd className="chiffres">{r.numeroAffiche}</dd></div>
          <div><dt>Statut</dt><dd>{r.statut}</dd></div>
        </dl>
        {fiche && (fiche.allergies.etat === 'presentes'
          ? <span className={`drapeau ${allergiesGraves.length ? '' : 'neutre'}`}>Allergies : {fiche.allergies.elements.map((a) => a.substance).join(', ')}</span>
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
    <main id="contenu" tabIndex={-1} className="clinique">
      {identite.etat === 'pret' && <BandeauPatient r={identite.valeur} fiche={fiche.etat === 'pret' ? fiche.valeur : null} />}
      <Corps>
        <nav aria-label="Fil d'Ariane"><ol className="fil"><li><Link to="/clinique">Trouver un patient</Link></li></ol></nav>
        {fiche.etat === 'pret' && (
          <div className={`statut-acces ${fiche.valeur.acces.urgence ? 'urgence' : ''}`} role="status">
            <strong>{fiche.valeur.acces.urgence ? 'Accès d\'urgence' : fiche.valeur.acces.raison}</strong>
            {fiche.valeur.acces.expireLe && <span>Expire à {heure(fiche.valeur.acces.expireLe)}. Il sera revu par l'équipe d'exploitation.</span>}
            <span className="secondaire">Cette consultation est inscrite au journal du patient.</span>
          </div>
        )}
        {refuse
          ? <AccesUrgence numero={numero} raison={(fiche as { erreur: ErreurApi }).erreur.message} apres={recharger} />
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
                    <Rubrique nom="proches" titre="Proche à joindre">
                      {f.proches.length === 0 ? <p>Aucun mandataire inscrit.</p> : (
                        <ul className="elements">
                          {f.proches.map((p) => (
                            <li key={p.nom}>
                              <span className="nom">{p.nom}</span>
                              <span className="chiffres">{p.telephone ?? '—'}</span>
                              <span className="secondaire">Procuration de niveau {p.niveau}{p.fin ? `, jusqu'au ${jourAnnee(p.fin)}` : ''}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Rubrique>
                  </div>
                </>
              )}
            </Charge>
          )}
      </Corps>
    </main>
  );
}

/** Accès d'urgence (« bris de verre ») : motif normalisé, précision, avertissement, puis accès limité dans le temps. */
function AccesUrgence({ numero, raison, apres }: { numero: string; raison: string; apres: () => void }) {
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
    <div className="colonne-texte">
      <div className="encart">
        <p><strong>Vous n'avez pas de lien de soins avec cette personne.</strong></p>
        <p>Son dossier n'est pas ouvert à votre nom. Si son état l'exige, vous pouvez ouvrir un accès d'urgence.</p>
      </div>
      {erreur && (
        <div className="resume-erreurs" role="alert" tabIndex={-1} ref={resume}>
          <h2>Il y a un problème</h2>
          <p><a href="#motif-0">{erreur}</a></p>
        </div>
      )}
      <form onSubmit={ouvrir} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <h2>Ouvrir un accès d'urgence</h2>
        <fieldset className={`groupe radios ${erreur && !motif ? 'en-erreur' : ''}`}>
          <legend>Motif</legend>
          <Charge etat={motifs} lignes={5}>
            {(liste) => liste.map((m, i) => (
              <label key={m.code} className="radio">
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
        <div className="avertissement">
          <span className="signe" aria-hidden="true">!</span>
          <p><span className="visuellement-cache">Attention : </span>L'accès dure 12 heures. La personne le verra dans son dossier et l'équipe d'exploitation le revoit. Un accès sans motif valable peut entraîner une enquête.</p>
        </div>
        <div className="actions"><button type="submit" className="bouton alerte" disabled={occupe}>{occupe ? 'Ouverture…' : 'Ouvrir l\'accès d\'urgence'}</button></div>
      </form>
    </div>
  );
}

export function PorteAVenir({ porte }: { porte: string }) {
  useTitre(`Espace ${porte}`, 'Santé Québec');
  return (
    <main id="contenu" tabIndex={-1}>
      <TetePage illustration="journal" titre={`Espace ${porte}`} chapeau="Les écrans de cet espace sont en conception. Les fonctions existent déjà dans l'API." />
    </main>
  );
}
