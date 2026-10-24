import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { formaterSaisie, MESSAGES_NUMERO, problemeNumero } from '@sante/noyau';
import { api, ErreurApi } from '../api';
import { useSession } from '../session';
import { Corps, TetePage, useTitre } from '../composants/Gabarit';

type Qui = 'citoyen' | 'personnel';
interface ReponseCode { message: string; codeDeveloppement?: string; telephone?: string }
interface Erreur { champ: string; message: string }

/** Résumé des erreurs en haut du formulaire, qui reçoit le focus (patron des services publics). */
function ResumeErreurs({ erreur }: { erreur: Erreur | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (erreur) ref.current?.focus(); }, [erreur]);
  if (!erreur) return null;
  return (
    <div className="resume-erreurs" role="alert" tabIndex={-1} ref={ref} aria-labelledby="titre-erreurs">
      <h2 id="titre-erreurs">Il y a un problème</h2>
      <ul style={{ margin: 0, paddingLeft: 20 }}><li><a href={`#${erreur.champ}`}>{erreur.message}</a></li></ul>
    </div>
  );
}

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
    <main id="contenu" tabIndex={-1}>
      <TetePage
        illustration={qui === 'citoyen' ? 'connexion' : 'clinique'}
        surTitre={service}
        titre={etape === 'code' ? 'Entrez le code reçu' : qui === 'citoyen' ? 'Se connecter à votre dossier' : 'Connexion du personnel'}
        chapeau={etape === 'code' ? undefined : qui === 'citoyen'
          ? 'Vos rendez-vous, vos médicaments, votre carnet de vaccination et les personnes dont vous vous occupez.'
          : 'Réservé aux professionnels de la santé et au personnel autorisé.'}
      />
      <Corps etroit>
        {expiree && <div className="encart"><p>Votre session a pris fin après une période d'inactivité. Reconnectez-vous pour continuer.</p></div>}
        <ResumeErreurs erreur={erreur} />

        {etape === 'identifiant' ? (
          <form onSubmit={demanderCode} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className={`groupe ${erreur ? 'en-erreur' : ''}`}>
              <label htmlFor="identifiant">{qui === 'citoyen' ? 'Votre numéro QC' : 'Votre identifiant'}</label>
              <p className="indice" id="indice-id">
                {qui === 'citoyen' ? 'Les 11 chiffres inscrits sur votre carte. Par exemple : 4829 1357 066.' : 'Celui de votre établissement, par exemple aouellet.'}
              </p>
              {erreur && <p className="message-erreur" id="erreur-id"><span className="visuellement-cache">Erreur : </span>{erreur.message}</p>}
              <input
                id="identifiant" className={`saisie ${qui === 'citoyen' ? 'numero' : 'moyenne'}`}
                inputMode={qui === 'citoyen' ? 'numeric' : 'text'} autoComplete={qui === 'citoyen' ? 'off' : 'username'} spellCheck={false}
                value={identifiant} aria-invalid={!!erreur} aria-describedby={`indice-id${erreur ? ' erreur-id' : ''}`}
                onChange={(e) => setIdentifiant(qui === 'citoyen' ? formaterSaisie(e.target.value) : e.target.value)}
              />
            </div>
            <p>Nous enverrons un code à usage unique par texto au numéro de téléphone inscrit à votre dossier.</p>
            <div className="actions">
              <button type="submit" className="bouton" disabled={occupe}>{occupe ? 'Envoi en cours…' : 'Continuer'}</button>
            </div>
          </form>
        ) : (
          <form onSubmit={valider} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p>{envoi?.telephone ? <>Nous avons envoyé un code au <strong className="chiffres">{envoi.telephone}</strong>. Il est valide 10 minutes.</> : envoi?.message}</p>
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
            <div className="actions">
              <button type="submit" className="bouton" disabled={occupe}>{occupe ? 'Vérification…' : 'Se connecter'}</button>
              <button type="button" className="bouton-lien" onClick={() => demanderCode()} disabled={occupe}>Recevoir un nouveau code</button>
            </div>
            <p><button type="button" className="bouton-lien" onClick={() => { setEtape('identifiant'); setErreur(null); }}>Ce n'est pas mon numéro</button></p>
          </form>
        )}

        <hr style={{ border: 0, borderTop: '1px solid var(--ligne)', width: '100%', margin: 0 }} />
        <p>
          {qui === 'citoyen' ? 'Vous travaillez dans le réseau de la santé ? ' : 'Vous êtes un citoyen ? '}
          <button type="button" className="bouton-lien" onClick={changerQui}>{qui === 'citoyen' ? 'Connexion du personnel' : 'Accéder à mon dossier'}</button>
        </p>
      </Corps>
    </main>
  );
}
