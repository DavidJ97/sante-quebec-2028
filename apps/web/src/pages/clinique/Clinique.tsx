import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ErreurApi, type FicheUrgence, type ResultatRecherche } from '../../api';
import { Charge, MessageErreur, useRequete } from '../../composants/Requete';
import { Icone } from '../../composants/Icone';
import { age, CERTITUDE, GRAVITE, jourAnnee } from '../../format';

export function Recherche() {
  const naviguer = useNavigate();
  const [q, setQ] = useState('');
  const [resultat, setResultat] = useState<ResultatRecherche | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function chercher(e: FormEvent) {
    e.preventDefault();
    setOccupe(true); setErreur(null); setResultat(null);
    try { setResultat(await api.get<ResultatRecherche>(`/recherche?q=${encodeURIComponent(q)}`)); }
    catch (x) { setErreur(x instanceof ErreurApi ? x.message : 'Une erreur est survenue.'); }
    finally { setOccupe(false); }
  }

  return (
    <main className="page clinique" id="contenu">
      <h1>Trouver un patient</h1>
      <form className="carte" onSubmit={chercher} noValidate>
        <div className="champ">
          <label htmlFor="q">Numéro QC ou NAM</label>
          <div className="rangee" style={{ alignItems: 'stretch' }}>
            <input id="q" value={q} onChange={(e) => setQ(e.target.value)} autoFocus autoComplete="off" style={{ flex: '1 1 260px' }}
              aria-invalid={!!erreur} aria-describedby="q-erreur" />
            <button type="submit" className="bouton" disabled={occupe || !q.trim()}><Icone nom="recherche" taille={20} /> Chercher</button>
          </div>
          <p id="q-erreur" className="erreur" role="alert">{erreur}</p>
        </div>
      </form>
      {resultat && (
        <section className="carte">
          <EntetePatient r={resultat} />
          <button type="button" className="bouton" style={{ alignSelf: 'flex-start' }} onClick={() => naviguer(`/clinique/${resultat.numero}`, { state: resultat })}>Ouvrir la fiche</button>
        </section>
      )}
    </main>
  );
}

function EntetePatient({ r }: { r: ResultatRecherche }) {
  const i = r.identite;
  const initiales = `${i.prenom?.[0] ?? '?'}${i.nom?.[0] ?? ''}`;
  return (
    <div className="patient">
      <div className="avatar" aria-hidden="true">{initiales}</div>
      <div style={{ flex: '1 1 240px' }}>
        <h2 style={{ fontSize: '1.4rem' }}>{[i.prenom, i.nom].filter(Boolean).join(' ') || 'Identité inconnue'}</h2>
        <p>
          {i.dateNaissance && <>{age(i.dateNaissance)} ans · né·e le {jourAnnee(i.dateNaissance)} · </>}
          <span className="chiffres">{r.numeroAffiche}</span> · {r.statut}
        </p>
      </div>
    </div>
  );
}

export function Fiche() {
  const { numero = '' } = useParams();
  const [identite] = useRequete(() => api.get<ResultatRecherche>(`/recherche?q=${numero}`), [numero]);
  const [fiche, recharger] = useRequete(() => api.get<FicheUrgence>(`/personnes/${numero}/fiche-urgence`), [numero]);

  return (
    <main className="page clinique" id="contenu">
      <nav className="fil" aria-label="Fil d'Ariane"><Link to="/clinique"><Icone nom="retour" taille={20} /> Trouver un patient</Link></nav>
      <section className="carte">
        <Charge etat={identite} lignes={2}>{(r) => <EntetePatient r={r} />}</Charge>
        {fiche.etat === 'pret' && (
          <p>
            <span className={`pastille ${fiche.valeur.acces.urgence ? 'attention' : 'ok'}`}>{fiche.valeur.acces.raison}</span>{' '}
            <span className="secondaire petit">Cette consultation est inscrite au journal du patient.</span>
          </p>
        )}
      </section>

      {fiche.etat === 'erreur' && fiche.erreur.statut === 403
        ? <AccesUrgence numero={numero} raison={fiche.erreur.message} apres={recharger} />
        : (
          <Charge etat={fiche} recharger={recharger} lignes={6}>
            {(f) => <Niveau1 f={f} />}
          </Charge>
        )}
    </main>
  );
}

function AccesUrgence({ numero, raison, apres }: { numero: string; raison: string; apres: () => void }) {
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const ouvrir = async (e: FormEvent) => {
    e.preventDefault();
    setOccupe(true); setErreur(null);
    try { await api.post(`/personnes/${numero}/acces-urgence`, { motif }); apres(); }
    catch (x) { setErreur(x instanceof ErreurApi ? x.message : 'Une erreur est survenue.'); }
    finally { setOccupe(false); }
  };
  return (
    <form className="carte" onSubmit={ouvrir} style={{ maxWidth: 720 }}>
      <span className="pastille non"><Icone nom="bouclier" taille={16} /> {raison}</span>
      <p>Si la personne est devant vous et que son état l'exige, ouvrez un accès d'urgence. Il dure 12 heures. La personne le verra dans son dossier et l'accès sera revu.</p>
      <div className="champ">
        <label htmlFor="motif">Motif</label>
        <textarea id="motif" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={300} aria-describedby="motif-aide motif-erreur" />
        <p id="motif-aide" className="aide">Au moins 10 caractères. Exemple : patiente confuse après une chute, arrivée en ambulance.</p>
        <p id="motif-erreur" className="erreur" role="alert">{erreur}</p>
      </div>
      <button type="submit" className="bouton danger" style={{ alignSelf: 'flex-start' }} disabled={occupe || motif.trim().length < 10}>Ouvrir l'accès d'urgence</button>
    </form>
  );
}

function Niveau1({ f }: { f: FicheUrgence }) {
  const graves = f.allergies.some((a) => a.gravite === 'grave');
  return (
    <>
      <h2 className="sur-titre" style={{ fontSize: '.9rem' }}>Niveau 1 · à voir avant tout soin</h2>
      <div className="grille">
        <section className={`carte ${graves ? 'alerte' : ''}`} aria-labelledby="s-all">
          <h3 id="s-all">{graves && <Icone nom="alerte" taille={20} />} Allergies</h3>
          {f.allergies.length === 0 ? <p>Aucune allergie connue</p> : (
            <ul className="liste">{f.allergies.map((a) => (
              <li key={a.id}><strong>{a.substance}</strong><span>{a.reaction} · {GRAVITE[a.gravite]} · {CERTITUDE[a.certitude]}</span></li>
            ))}</ul>
          )}
        </section>
        <section className="carte" aria-labelledby="s-med">
          <h3 id="s-med">Médicaments actifs</h3>
          {f.medicaments.length === 0 ? <p>Aucun</p> : (
            <ul className="liste">{f.medicaments.map((m) => (
              <li key={m.id}><strong>{m.nom}</strong><span>{m.posologie}</span>{m.miseEnGarde && <span className="pastille attention">{m.miseEnGarde}</span>}</li>
            ))}</ul>
          )}
        </section>
        <section className="carte" aria-labelledby="s-ada">
          <h3 id="s-ada">Besoins d'adaptation</h3>
          {f.adaptation.length === 0 ? <p>Aucun inscrit</p> : (
            <ul className="liste">{f.adaptation.map((a) => <li key={a.id}><strong>{a.titre}</strong><span>{a.detail}</span></li>)}</ul>
          )}
        </section>
        <section className="carte" aria-labelledby="s-mal">
          <h3 id="s-mal">Maladies et dispositifs à risque</h3>
          {f.maladies.length === 0 ? <p>Aucun inscrit</p> : (
            <ul className="liste">{f.maladies.map((m) => (
              <li key={m.id}><strong>{m.libelle}</strong>{m.dispositif && <span className="pastille attention">Dispositif implanté</span>}{m.depuis && <span className="secondaire">Depuis {m.depuis.slice(0, 4)}</span>}</li>
            ))}</ul>
          )}
        </section>
        <section className="carte" aria-labelledby="s-vol">
          <h3 id="s-vol">Volontés</h3>
          {!f.volontes ? <p>Aucune inscrite</p> : (
            <ul className="liste">
              <li><span className="secondaire">Niveau de soins</span><strong style={{ fontSize: '1.3rem' }}>{f.volontes.niveauSoins ?? 'Non précisé'}</strong></li>
              <li><span className="secondaire">Directives médicales anticipées</span><strong>{f.volontes.directives ? 'Inscrites au registre' : 'Aucune'}</strong></li>
              <li><span className="secondaire">Don d'organes</span><strong>{f.volontes.donOrganes === null ? 'Non précisé' : f.volontes.donOrganes ? 'Consentement' : 'Refus'}</strong></li>
            </ul>
          )}
        </section>
        <section className="carte" aria-labelledby="s-pro">
          <h3 id="s-pro">Proche à joindre</h3>
          {f.proches.length === 0 ? <p>Aucun mandataire inscrit</p> : (
            <ul className="liste">{f.proches.map((p) => (
              <li key={p.nom}><strong>{p.nom}</strong><span className="chiffres">{p.telephone ?? '—'}</span><span className="secondaire">Procuration niveau {p.niveau}{p.fin ? ` jusqu'au ${jourAnnee(p.fin)}` : ''}</span></li>
            ))}</ul>
          )}
        </section>
      </div>
    </>
  );
}

export function PorteNonDisponible({ porte }: { porte: string }) {
  return (
    <main className="page" id="contenu">
      <h1>Espace {porte}</h1>
      <MessageErreur erreur={new ErreurApi(0, 'a_venir', 'Cet espace n\'a pas encore d\'écrans. Les fonctions existent déjà dans l\'API.')} />
    </main>
  );
}
