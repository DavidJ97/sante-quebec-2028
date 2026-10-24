import { useMemo } from 'react';
import QRCode from 'qrcode';
import { formaterNumero } from '@sante/noyau';
import { Avatar, photoPersonne } from './Avatar';
import { jourAnnee } from '../format';

/**
 * Code QR dessiné en SVG à partir des modules calculés localement (aucun service externe).
 * Prototype : il contient le numéro. En production, ce serait une attestation signée et de courte durée,
 * vérifiable hors ligne au comptoir, sans exposer le numéro en clair.
 */
function CodeQR({ valeur }: { valeur: string }) {
  const { taille, chemin } = useMemo(() => {
    const qr = QRCode.create(valeur, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
    return { taille: n, chemin: d };
  }, [valeur]);
  return (
    <svg viewBox={`-1 -1 ${taille + 2} ${taille + 2}`} shapeRendering="crispEdges" aria-hidden="true">
      <path d={chemin} fill="#0E2440" />
    </svg>
  );
}

export function CarteSante({ numero, nom, dateNaissance, photoPriseLe }: { numero: string; nom: string; dateNaissance: string | null; photoPriseLe: string | null }) {
  return (
    <section className="carte-sante" aria-label="Carte santé numérique">
      <div className="haut">
        <span>Carte santé numérique</span>
        <span className="valide"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>Valide</span>
      </div>
      <div className="identite">
        <Avatar src={photoPersonne(numero)} nom={nom} taille={84} carre alt={photoPriseLe ? `Photo de ${nom}, prise le ${jourAnnee(photoPriseLe)}` : ''} />
        <div>
          <p className="nom">{nom}</p>
          {dateNaissance && <p className="ne">Né·e le {jourAnnee(dateNaissance)}</p>}
        </div>
      </div>
      <div className="numero">
        <span>Numéro QC</span>
        <strong>{formaterNumero(numero).slice(3)}</strong>
      </div>
      <div className="qr"><CodeQR valeur={`QC:${numero}`} /></div>
    </section>
  );
}
