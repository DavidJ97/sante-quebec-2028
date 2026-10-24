import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formaterSaisie, MESSAGES_NUMERO, problemeNumero } from '@sante/noyau';
import { api, ErreurApi } from '../api';
import { useSession } from '../session';
import { Marque, useTitre } from '../composants/Gabarit';
import { Illustration } from '../composants/Illustration';

type Qui = 'citoyen' | 'personnel';
interface ReponseCode { message: string; codeDeveloppement?: string; telephone?: string }
interface Erreur { champ: string; message: string }

function ResumeErreurs({ erreur }: { erreur: Erreur | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (erreur) ref.current?.focus(); }, [erreur]);
  if (!erreur) return null;
  return (
    <div className="resume-erreurs" role="alert" tabIndex={-1} ref={ref} aria-labelledby="titre-erreurs">
      <h2 id="titre-erreurs">Il y a un problème</h2>
      <p><a href={`#${erreur.champ}`}>{erreur.message}</a></p>
    </div>
  );
}

const ATOUTS = [
  { icone: 'rendezvous' as const, texte: 'Vos rendez-vous, confirmés en un geste' },
  { icone: 'medicaments' as const, texte: 'Vos médicaments, au bon moment de la journée' },
  { icone: 'proches' as const, texte: 'Les personnes dont vous vous occupez' },
  { icone: 'journal' as const, texte: 'Qui a consulté votre dossier, à la minute près' },
];

export default function Connexion() {
  const { recharger, expiree } = useSession();
  const naviguer = useNavigate();
  const [qui, setQui] = useState<Qui>('citoyen');
  const [etape, setEtape] = useState<'identifiant' | 'code'>('identifiant');
  const [identifiant, setIdentifiant] = useState('');
  const [code, setCode] = useState('');
  const [envoi, setEnvoi] = useState<ReponseCode | null>(null);
  const [erreur, setErreur] = useState<Erreur | null>(null);
  const [occupe, setOccupe] = useState(false);
  const service = qui === 'citoyen' ? 'Mon dossier santé' : 'Dossier clinique';
  useTitre(etape === 'code' ? 'Entrez le code reçu' : 'Se connecter', service, !!erreur);

  const changerQui = () => { setQui(qui === 'citoyen' ? 'personnel' : 'citoyen'); setEtape('identifiant'); setIdentifiant(''); setCode(''); setErreur(null); };
  const corpsIdentite = () => (qui === 'citoyen' ? { numero: identifiant } : { identifiant });
  const echec = (champ: string, x: unknown) => setErreur({ champ, message: x instanceof ErreurApi ? x.message : 'Une erreur est survenue. Réessayez.' });

  async function demanderCode(e?: FormEvent) {
    e?.preventDefault();
    if (qui === 'citoyen') {
      const p = problemeNumero(identifiant);
      if (p) { setErreur({ champ: 'identifiant', message: MESSAGES_NUMERO[p] }); return; }
    } else if (!identifiant.trim()) { setErreur({ champ: 'identifiant', message: 'Entrez votre identifiant.' }); return; }
    setOccupe(true); setErreur(null);
    try {
      setEnvoi(await api.post<ReponseCode>(`/connexion/${qui}/code`, corpsIdentite()));
      setEtape('code'); setCode('');
    } catch (x) { echec('identifiant', x); } finally { setOccupe(false); }
  }

  async function valider(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { setErreur({ champ: 'code', message: 'Entrez les 6 chiffres du code.' }); return; }
    setOccupe(true); setErreur(null);
    try {
      await api.post(`/connexion/${qui}/session`, { ...corpsIdentite(), code });
      await recharger();
      naviguer(qui === 'citoyen' ? '/' : '/clinique', { replace: true });
    } catch (x) { echec('code', x); } finally { setOccupe(false); }
  }

  return (
    <div className="connexion">
      <a href="#contenu" className="lien-evitement">Passer au formulaire</a>
      <section className="connexion-visuel" aria-label="Présentation">
        <Marque service={service} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }}>
          <h1>{qui === 'citoyen' ? 'Votre santé, au même endroit.' : 'Le bon dossier, au bon moment.'}</h1>
          <p>{qui === 'citoyen'
            ? 'Un seul numéro, de la naissance à la fin de vie. Vous voyez tout, et vous savez qui regarde.'
            : 'La fiche de niveau 1 en un coup d\'œil. Chaque accès est justifié et inscrit au journal du patient.'}</p>
        </div>
        {qui === 'citoyen' && (
          <ul aria-label="Ce que vous pouvez faire">
            {ATOUTS.map((a) => (
              <li key={a.texte}><span className="ico"><Illustration nom={a.icone} taille={24} epaisseur={4.2} /></span>{a.texte}</li>
            ))}
          </ul>
        )}
        <p className="phase" style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.9)', borderColor: 'rgba(255,255,255,.3)' }}><b>Alpha</b> Service en conception, données fictives</p>
        <span className="filigrane-grand"><Illustration nom={qui === 'citoyen' ? 'accueil' : 'clinique'} taille={420} epaisseur={1.4} /></span>
      </section>

      <main className="connexion-formulaire" id="contenu" tabIndex={-1}>
        <div className="carte" style={{ gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p className="meta">{service}</p>
            <h2 style={{ fontSize: '1.7rem' }}>{etape === 'code' ? 'Entrez le code reçu' : qui === 'citoyen' ? 'Se connecter' : 'Connexion du personnel'}</h2>
          </div>
          {expiree && <p className="encart">Votre session a pris fin après une période d'inactivité. Reconnectez-vous pour continuer.</p>}
          <ResumeErreurs erreur={erreur} />

          {etape === 'identifiant' ? (
            <form onSubmit={demanderCode} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div className={`groupe ${erreur ? 'en-erreur' : ''}`}>
                <label htmlFor="identifiant">{qui === 'citoyen' ? 'Votre numéro QC' : 'Votre identifiant'}</label>
                <p className="indice" id="indice-id">{qui === 'citoyen' ? 'Les 11 chiffres de votre carte, par exemple 4829 1357 066.' : 'Celui de votre établissement, par exemple aouellet.'}</p>
                {erreur && <p className="message-erreur" id="erreur-id"><span className="visuellement-cache">Erreur : </span>{erreur.message}</p>}
                <input id="identifiant" className={`saisie ${qui === 'citoyen' ? 'numero' : 'moyenne'}`}
                  inputMode={qui === 'citoyen' ? 'numeric' : 'text'} autoComplete={qui === 'citoyen' ? 'off' : 'username'} spellCheck={false}
                  value={identifiant} aria-invalid={!!erreur} aria-describedby={`indice-id${erreur ? ' erreur-id' : ''}`}
                  onChange={(e) => setIdentifiant(qui === 'citoyen' ? formaterSaisie(e.target.value) : e.target.value)} />
              </div>
              <button type="submit" className="bouton large" disabled={occupe}>{occupe ? 'Envoi en cours…' : 'Continuer'}</button>
              <p className="meta">Nous enverrons un code à usage unique par texto au téléphone inscrit à votre dossier.</p>
            </form>
          ) : (
            <form onSubmit={valider} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <p>{envoi?.telephone ? <>Code envoyé au <strong className="chiffres">{envoi.telephone}</strong>. Il est valide 10 minutes.</> : envoi?.message}</p>
              {envoi?.codeDeveloppement && (
                <p className="note-dev"><strong>Environnement de développement.</strong> Aucun texto n'est envoyé. Code : <strong className="chiffres">{envoi.codeDeveloppement}</strong></p>
              )}
              <div className={`groupe ${erreur ? 'en-erreur' : ''}`}>
                <label htmlFor="code">Code de sécurité</label>
                <p className="indice" id="indice-code">6 chiffres</p>
                {erreur && <p className="message-erreur" id="erreur-code"><span className="visuellement-cache">Erreur : </span>{erreur.message}</p>}
                <input id="code" className="saisie code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} spellCheck={false}
                  value={code} aria-invalid={!!erreur} aria-describedby={`indice-code${erreur ? ' erreur-code' : ''}`}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              </div>
              <button type="submit" className="bouton large" disabled={occupe}>{occupe ? 'Vérification…' : 'Se connecter'}</button>
              <div className="actions" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="bouton-lien" onClick={() => demanderCode()} disabled={occupe}>Recevoir un nouveau code</button>
                <button type="button" className="bouton-lien" onClick={() => { setEtape('identifiant'); setErreur(null); }}>Ce n'est pas mon numéro</button>
              </div>
            </form>
          )}

          <hr style={{ border: 0, borderTop: '1px solid var(--ligne)', width: '100%', margin: 0 }} />
          <p>
            {qui === 'citoyen' ? 'Vous travaillez dans le réseau de la santé ? ' : 'Vous êtes un citoyen ? '}
            <button type="button" className="bouton-lien" onClick={changerQui}>{qui === 'citoyen' ? 'Connexion du personnel' : 'Accéder à mon dossier'}</button>
          </p>
          <nav className="connexion-pied" aria-label="Informations">
            <Link to="/a-propos/accessibilite">Accessibilité</Link>
            <Link to="/a-propos/confidentialite">Confidentialité</Link>
            <Link to="/a-propos/journal">Protection des accès</Link>
          </nav>
        </div>
      </main>
    </div>
  );
}
