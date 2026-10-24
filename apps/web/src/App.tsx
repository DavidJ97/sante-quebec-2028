import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from './session';
import { Symbole } from './composants/Icone';
import Connexion from './pages/Connexion';
import Accueil from './pages/citoyen/Accueil';
import RendezVous from './pages/citoyen/RendezVous';
import { Aide, Famille, Medicaments, PourUnProche, QuiAVu, Vaccins } from './pages/citoyen/Dossier';
import { Fiche, PorteNonDisponible, Recherche } from './pages/clinique/Clinique';

function Entete() {
  const { moi, deconnecter } = useSession();
  const naviguer = useNavigate();
  const nom = moi ? (moi.type === 'citoyen' ? `${moi.prenom} ${moi.nom}` : `${moi.nom} · ${moi.role}`) : null;
  return (
    <header className="entete">
      <a href="#contenu" className="visuellement-cache">Aller au contenu</a>
      <div className="entete-int">
        <Link to="/" className="marque"><Symbole /> Santé Québec</Link>
        {moi && (
          <div className="entete-droite">
            <span>{nom}</span>
            <button type="button" className="lien-entete" onClick={async () => { await deconnecter(); naviguer('/connexion'); }}>Se déconnecter</button>
          </div>
        )}
      </div>
    </header>
  );
}

/** Remet le focus en haut de page à chaque navigation, pour les lecteurs d'écran. */
function FocusNavigation() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('contenu')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

export default function App() {
  const { moi, pret } = useSession();
  if (!pret) return <Entete />;

  return (
    <>
      <Entete />
      <FocusNavigation />
      {!moi ? (
        <Routes>
          <Route path="/connexion" element={<Connexion />} />
          <Route path="*" element={<Navigate to="/connexion" replace />} />
        </Routes>
      ) : moi.type === 'citoyen' ? (
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/rendez-vous" element={<RendezVous />} />
          <Route path="/medicaments" element={<Medicaments />} />
          <Route path="/vaccins" element={<Vaccins />} />
          <Route path="/qui-a-vu" element={<QuiAVu />} />
          <Route path="/famille" element={<Famille />} />
          <Route path="/aide" element={<Aide />} />
          <Route path="/pour/:numero" element={<PourUnProche />} />
          <Route path="/pour/:numero/rendez-vous" element={<RendezVous />} />
          <Route path="/pour/:numero/medicaments" element={<Medicaments />} />
          <Route path="/pour/:numero/vaccins" element={<Vaccins />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : moi.porte === 'clinique' ? (
        <Routes>
          <Route path="/clinique" element={<Recherche />} />
          <Route path="/clinique/:numero" element={<Fiche />} />
          <Route path="*" element={<Navigate to="/clinique" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="*" element={<PorteNonDisponible porte={moi.porte === 'bureaucratie' ? 'administratif' : 'exploitation'} />} />
        </Routes>
      )}
    </>
  );
}
