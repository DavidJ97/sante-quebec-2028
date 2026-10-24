import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { formaterSaisie, MESSAGES_NUMERO, problemeNumero } from '@sante/noyau';
import { api, ErreurApi } from '../api';
import { useSession } from '../session';
import { Icone } from '../composants/Icone';

type Qui = 'citoyen' | 'personnel';
interface ReponseCode { message: string; codeDeveloppement?: string; telephone?: string }

export default function Connexion() {
  const { recharger, expiree } = useSession();
  const naviguer = useNavigate();
  const [qui, setQui] = useState<Qui>('citoyen');
  const [etape, setEtape] = useState<'identifiant' | 'code'>('identifiant');
  const [identifiant, setIdentifiant] = useState('');
  const [code, setCode] = useState('');
  const [envoi, setEnvoi] = useState<ReponseCode | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const changerQui = (q: Qui) => { setQui(q); setEtape('identifiant'); setIdentifiant(''); setCode(''); setErreur(null); };
  const corpsIdentite = () => (qui === 'citoyen' ? { numero: identifiant } : { identifiant });

  async function demanderCode(e?: FormEvent) {
    e?.preventDefault();
    if (qui === 'citoyen') {
      const p = problemeNumero(identifiant);
      if (p) { setErreur(MESSAGES_NUMERO[p]); return; }
    } else if (!identifiant.trim()) { setErreur('Entrez votre identifiant.'); return; }
    setOccupe(true); setErreur(null);
    try {
      setEnvoi(await api.post<ReponseCode>(`/connexion/${qui}/code`, corpsIdentite()));
      setEtape('code'); setCode('');
    } catch (x) {
      setErreur(x instanceof ErreurApi ? x.message : 'Une erreur est survenue.');
    } finally { setOccupe(false); }
  }

  async function valider(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { setErreur('Le code compte 6 chiffres.'); return; }
    setOccupe(true); setErreur(null);
    try {
      await api.post(`/connexion/${qui}/session`, { ...corpsIdentite(), code });
      await recharger();
      naviguer(qui === 'citoyen' ? '/' : '/clinique', { replace: true });
    } catch (x) {
      setErreur(x instanceof ErreurApi ? x.message : 'Une erreur est survenue.');
    } finally { setOccupe(false); }
  }

  return (
    <main className="page etroite" id="contenu">
      <div className="pile">
        <h1>Se connecter</h1>
        {expiree && <p className="carte attention" role="status">Votre session a pris fin. Reconnectez-vous pour continuer.</p>}
      </div>

      <div className="rangee" role="tablist" aria-label="Type de compte">
        {(['citoyen', 'personnel'] as const).map((q) => (
          <button key={q} type="button" role="tab" aria-selected={qui === q} onClick={() => changerQui(q)}
            className={`bouton ${qui === q ? '' : 'discret'}`} style={{ flex: '1 1 0', minHeight: 48 }}>
            {q === 'citoyen' ? 'Citoyen' : 'Personnel de la santé'}
          </button>
        ))}
      </div>

      {etape === 'identifiant' ? (
        <form className="carte" onSubmit={demanderCode} noValidate>
          <div className="champ">
            <label htmlFor="identifiant">{qui === 'citoyen' ? 'Votre numéro QC' : 'Votre identifiant'}</label>
            {qui === 'citoyen' && <p className="aide" id="aide-id">Les 11 chiffres inscrits sur votre carte, par exemple 4829 1357 066.</p>}
            <input
              id="identifiant" className={qui === 'citoyen' ? 'gros' : ''} autoFocus
              inputMode={qui === 'citoyen' ? 'numeric' : 'text'} autoComplete={qui === 'citoyen' ? 'off' : 'username'}
              value={identifiant} aria-invalid={!!erreur} aria-describedby={`${qui === 'citoyen' ? 'aide-id ' : ''}erreur-id`}
              onChange={(e) => { setIdentifiant(qui === 'citoyen' ? formaterSaisie(e.target.value) : e.target.value); setErreur(null); }}
            />
            <p id="erreur-id" className="erreur" role="alert">{erreur && <><Icone nom="alerte" taille={20} />{erreur}</>}</p>
          </div>
          <button type="submit" className="bouton plein-largeur" disabled={occupe}>{occupe ? 'Envoi…' : 'Recevoir un code par texto'}</button>
        </form>
      ) : (
        <form className="carte" onSubmit={valider} noValidate>
          <p>{envoi?.telephone ? `Un code a été envoyé au ${envoi.telephone}.` : envoi?.message}</p>
          {envoi?.codeDeveloppement && (
            <p className="bandeau-dev" role="note">Environnement de développement : aucun texto n'est envoyé. Code : <strong className="chiffres">{envoi.codeDeveloppement}</strong></p>
          )}
          <div className="champ">
            <label htmlFor="code">Code à 6 chiffres</label>
            <input id="code" className="gros" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              value={code} aria-invalid={!!erreur} aria-describedby="erreur-code"
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErreur(null); }} />
            <p id="erreur-code" className="erreur" role="alert">{erreur && <><Icone nom="alerte" taille={20} />{erreur}</>}</p>
          </div>
          <button type="submit" className="bouton plein-largeur" disabled={occupe}>{occupe ? 'Vérification…' : 'Me connecter'}</button>
          <div className="rangee">
            <button type="button" className="bouton discret" onClick={() => demanderCode()} disabled={occupe}>Renvoyer un code</button>
            <button type="button" className="bouton discret" onClick={() => { setEtape('identifiant'); setErreur(null); }}>Changer de numéro</button>
          </div>
        </form>
      )}
      <p className="secondaire petit">Le code expire après 10 minutes. Après 5 essais, il faut en demander un nouveau.</p>
    </main>
  );
}
