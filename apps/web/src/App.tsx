import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from './session';
import { Entete, Pied } from './composants/Gabarit';
import Connexion from './pages/Connexion';
import APropos from './pages/APropos';
import Accueil from './pages/citoyen/Accueil';
import RendezVous from './pages/citoyen/RendezVous';
import { Aide, Famille, Medicaments, PourUnProche, QuiAVu, Resume, Vaccins } from './pages/citoyen/Dossier';
import { Fiche, PorteAVenir, Recherche } from './pages/clinique/Clinique';

/** À chaque navigation : haut de page, et focus sur le contenu pour les lecteurs d'écran. */
function FocusNavigation() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('contenu')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

export default function App() {
  const { moi, pret, deconnecter } = useSession();
  const naviguer = useNavigate();
  const service = moi?.type === 'employe' ? 'Dossier clinique' : 'Mon dossier santé';
  const utilisateur = moi ? (moi.type === 'citoyen' ? `${moi.prenom} ${moi.nom}` : `${moi.nom}, ${moi.role}`) : undefined;

  return (
    <>
      <Entete service={service} utilisateur={utilisateur} deconnecter={async () => { await deconnecter(); naviguer('/connexion'); }} />
      <FocusNavigation />
      {!pret ? <main id="contenu" style={{ flex: 1 }} aria-busy="true" /> : (
        <Routes>
          <Route path="/a-propos/:page" element={<APropos />} />
          {!moi ? (
            <>
              <Route path="/connexion" element={<Connexion />} />
              <Route path="*" element={<Navigate to="/connexion" replace />} />
            </>
          ) : moi.type === 'citoyen' ? (
            <>
              <Route path="/" element={<Accueil />} />
              <Route path="/rendez-vous" element={<RendezVous />} />
              <Route path="/medicaments" element={<Medicaments />} />
              <Route path="/vaccins" element={<Vaccins />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/qui-a-vu" element={<QuiAVu />} />
              <Route path="/famille" element={<Famille />} />
              <Route path="/aide" element={<Aide />} />
              <Route path="/pour/:numero" element={<PourUnProche />} />
              <Route path="/pour/:numero/rendez-vous" element={<RendezVous />} />
              <Route path="/pour/:numero/medicaments" element={<Medicaments />} />
              <Route path="/pour/:numero/vaccins" element={<Vaccins />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : moi.porte === 'clinique' ? (
            <>
              <Route path="/clinique" element={<Recherche />} />
              <Route path="/clinique/:numero" element={<Fiche />} />
              <Route path="*" element={<Navigate to="/clinique" replace />} />
            </>
          ) : (
            <Route path="*" element={<PorteAVenir porte={moi.porte === 'bureaucratie' ? 'administratif' : 'exploitation'} />} />
          )}
        </Routes>
      )}
      <Pied />
    </>
  );
}
