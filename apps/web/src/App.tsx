import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { formaterNumero } from '@sante/noyau';
import { api, type MoiCitoyen, type MoiEmploye, type RendezVous as Rdv, type Reponse } from './api';
import { useSession } from './session';
import { Coquille, Marque, type EntreeNav } from './composants/Gabarit';
import { photoPersonne, photoPersonnel } from './composants/Avatar';
import Connexion from './pages/Connexion';
import APropos from './pages/APropos';
import Accueil from './pages/citoyen/Accueil';
import RendezVous from './pages/citoyen/RendezVous';
import Profil from './pages/citoyen/Profil';
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

function EspaceCitoyen({ moi, deconnecter }: { moi: MoiCitoyen; deconnecter: () => void }) {
  const { pathname } = useLocation();
  const [aConfirmer, setAConfirmer] = useState(0);
  useEffect(() => {
    api.get<Reponse<Rdv[]>>(`/personnes/${moi.numero}/donnees/rendezvous`)
      .then((r) => setAConfirmer(r.valeur.filter((x) => x.statut === 'propose').length)).catch(() => {});
  }, [moi.numero, pathname]);

  const navigation: EntreeNav[] = [
    { vers: '/', texte: 'Accueil', icone: 'accueil' },
    { vers: '/rendez-vous', texte: 'Rendez-vous', icone: 'rendezvous', badge: aConfirmer },
    { vers: '/medicaments', texte: 'Médicaments', icone: 'medicaments' },
    { vers: '/vaccins', texte: 'Vaccins', icone: 'vaccins' },
    { vers: '/resume', texte: 'Résumé de santé', icone: 'maladies' },
    { vers: '/qui-a-vu', texte: 'Qui a consulté', icone: 'journal' },
    { vers: '/famille', texte: 'Ma famille', icone: 'famille' },
    { vers: '/aide', texte: 'Obtenir de l\'aide', icone: 'aide' },
  ];
  const onglets: EntreeNav[] = [
    { vers: '/', texte: 'Accueil', icone: 'accueil' },
    { vers: '/rendez-vous', texte: 'Rendez-vous', icone: 'rendezvous' },
    { vers: '/resume', texte: 'Santé', icone: 'maladies' },
    { vers: '/profil', texte: 'Profil', icone: 'proches' },
  ];
  const nom = `${moi.prenom} ${moi.nom}`;

  return (
    <Coquille
      service="Mon dossier santé"
      utilisateur={{ nom, detail: formaterNumero(moi.numero), photo: photoPersonne(moi.numero), vers: '/profil' }}
      navigation={navigation}
      sections={[{ titre: 'Je m\'occupe de', entrees: moi.pourQui.map((p) => ({ vers: `/pour/${p.numero}`, texte: p.nom, detail: p.lien })) }]}
      onglets={onglets}
      deconnecter={deconnecter}
    >
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/rendez-vous" element={<RendezVous />} />
        <Route path="/medicaments" element={<Medicaments />} />
        <Route path="/vaccins" element={<Vaccins />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/qui-a-vu" element={<QuiAVu />} />
        <Route path="/famille" element={<Famille />} />
        <Route path="/aide" element={<Aide />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/pour/:numero" element={<PourUnProche />} />
        <Route path="/pour/:numero/rendez-vous" element={<RendezVous />} />
        <Route path="/pour/:numero/medicaments" element={<Medicaments />} />
        <Route path="/pour/:numero/vaccins" element={<Vaccins />} />
        <Route path="/a-propos/:page" element={<APropos />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Coquille>
  );
}

function EspacePersonnel({ moi, deconnecter }: { moi: MoiEmploye; deconnecter: () => void }) {
  const clinique = moi.porte === 'clinique';
  const navigation: EntreeNav[] = clinique
    ? [{ vers: '/clinique', texte: 'Trouver un patient', icone: 'clinique', fin: true }]
    : [{ vers: '/', texte: 'Accueil', icone: 'journal' }];
  return (
    <Coquille
      className="clinique"
      service={clinique ? 'Dossier clinique' : moi.porte === 'bureaucratie' ? 'Espace administratif' : 'Exploitation'}
      utilisateur={{ nom: moi.nom, detail: moi.role, photo: photoPersonnel(moi.id) }}
      navigation={navigation}
      onglets={navigation}
      deconnecter={deconnecter}
    >
      <Routes>
        <Route path="/a-propos/:page" element={<APropos />} />
        {clinique ? (
          <>
            <Route path="/clinique" element={<Recherche />} />
            <Route path="/clinique/:numero" element={<Fiche />} />
            <Route path="*" element={<Navigate to="/clinique" replace />} />
          </>
        ) : <Route path="*" element={<PorteAVenir porte={moi.porte === 'bureaucratie' ? 'administratif' : 'exploitation'} />} />}
      </Routes>
    </Coquille>
  );
}

export default function App() {
  const { moi, pret, deconnecter } = useSession();
  const naviguer = useNavigate();
  const sortir = async () => { await deconnecter(); naviguer('/connexion'); };

  return (
    <>
      <FocusNavigation />
      {!pret ? <main id="contenu" aria-busy="true" /> : !moi ? (
        <Routes>
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/a-propos/:page" element={<div className="hors-session"><header><Marque service="Santé Québec" /></header><APropos /></div>} />
          <Route path="*" element={<Navigate to="/connexion" replace />} />
        </Routes>
      ) : moi.type === 'citoyen' ? <EspaceCitoyen moi={moi} deconnecter={sortir} /> : <EspacePersonnel moi={moi} deconnecter={sortir} />}
    </>
  );
}
