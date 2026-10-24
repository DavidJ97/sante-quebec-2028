import { useReducer, useState } from 'react';
import { creerMonde } from './monde.js';
import Patient from './portes/Patient.jsx';
import Clinique from './portes/Clinique.jsx';
import Bureaucratie from './portes/Bureaucratie.jsx';
import AdminTech from './portes/AdminTech.jsx';
import Parcours from './portes/Parcours.jsx';

const PORTES = [
  { id: 'patient', nom: 'Patients et proches', Composant: Patient },
  { id: 'clinique', nom: 'Employés cliniques', Composant: Clinique },
  { id: 'bureau', nom: 'Bureaucratie', Composant: Bureaucratie },
  { id: 'tech', nom: 'Admin tech', Composant: AdminTech },
  { id: 'vie', nom: 'Fiche, toute une vie', Composant: Parcours },
];

export default function App() {
  const [monde, setMonde] = useState(creerMonde);
  const [, rafraichir] = useReducer((x) => x + 1, 0);
  const [porte, setPorte] = useState(() => PORTES.find((p) => p.id === location.hash.slice(1))?.id ?? 'patient');
  const { Composant } = PORTES.find((p) => p.id === porte);

  const changer = (id) => { setPorte(id); history.replaceState(null, '', `#${id}`); };

  return (
    <>
      <header className="bande">
        <div className="bande-int">
          <p className="marque">Santé Québec 2037 · prototype</p>
          <nav className="portes" aria-label="Les quatre portes">
            {PORTES.map((p) => (
              <button key={p.id} type="button" aria-pressed={porte === p.id} onClick={() => changer(p.id)}>{p.nom}</button>
            ))}
          </nav>
          <p className="avis-demo">
            Données fictives · <button type="button" onClick={() => { setMonde(creerMonde()); rafraichir(); }} style={{ background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Remettre à zéro</button>
          </p>
        </div>
      </header>
      <main className="page">
        <Composant monde={monde} rafraichir={rafraichir} />
      </main>
    </>
  );
}
