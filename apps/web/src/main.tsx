import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { FournisseurSession } from './session';
// Polices hébergées avec l'application : aucune requête vers un tiers (confidentialité, souveraineté).
// Atkinson Hyperlegible Next : conçue par le Braille Institute pour les personnes malvoyantes.
import '@fontsource-variable/atkinson-hyperlegible-next';
import '@fontsource-variable/atkinson-hyperlegible-mono';
import './styles.css';

createRoot(document.getElementById('racine')!).render(
  <StrictMode>
    <BrowserRouter>
      <FournisseurSession>
        <App />
      </FournisseurSession>
    </BrowserRouter>
  </StrictMode>,
);
