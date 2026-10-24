/** Rubriques du niveau 1, partagées par l'espace citoyen (« Mon résumé ») et l'espace clinique (fiche). */

import type { Adaptation, Allergies, Maladie, Medicament, Volontes } from '../api';
import { CERTITUDE, GRAVITE, jourAnnee } from '../format';
import { Rubrique } from './Gabarit';

export function RubriqueAllergies({ a, pourClinicien }: { a: Allergies; pourClinicien?: boolean }) {
  const grave = a.elements.some((x) => x.gravite === 'grave');
  return (
    <Rubrique nom="allergies" titre="Allergies" alerte={grave}>
      {a.etat === 'presentes' && (
        <ul className="elements">
          {a.elements.map((x) => (
            <li key={x.id}>
              <span className="nom">{x.substance}</span>
              <span>{x.reaction}</span>
              <span className="actions" style={{ gap: 8 }}>
                <span className={`etiquette ${x.gravite === 'grave' ? 'rouge' : x.gravite === 'moderee' ? 'jaune' : 'grise'}`}>{GRAVITE[x.gravite]}</span>
                <span className="etiquette grise">{CERTITUDE[x.certitude][0]!.toUpperCase() + CERTITUDE[x.certitude].slice(1)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {a.etat === 'aucune_connue' && a.verification && (
        <>
          <p className="nom" style={{ fontWeight: 700, fontSize: '1.15rem' }}>Aucune allergie connue</p>
          <p className="secondaire">Vérifié le {jourAnnee(a.verification.le)} par {a.verification.par}.</p>
        </>
      )}
      {a.etat === 'non_documente' && (
        <>
          <span className="etiquette jaune">Non documenté</span>
          <p>{pourClinicien
            ? 'Personne n\'a encore vérifié les allergies de ce patient. Ne pas conclure à une absence d\'allergie : demandez-lui.'
            : 'Aucun professionnel n\'a encore vérifié vos allergies. Parlez-en à votre prochain rendez-vous.'}</p>
        </>
      )}
    </Rubrique>
  );
}

export function RubriqueMedicaments({ m }: { m: Medicament[] }) {
  return (
    <Rubrique nom="medicaments" titre="Médicaments actifs">
      {m.length === 0 ? <p>Aucun médicament actif au Dossier santé Québec.</p> : (
        <ul className="elements">
          {m.map((x) => (
            <li key={x.id}>
              <span className="nom">{x.nom}</span>
              <span>{x.posologie}</span>
              {x.miseEnGarde && <span className="etiquette jaune">{x.miseEnGarde}</span>}
            </li>
          ))}
        </ul>
      )}
      {m.length > 0 && <p className="secondaire petit">Source : {[...new Set(m.map((x) => x.source))].join(', ')}</p>}
    </Rubrique>
  );
}

export function RubriqueAdaptation({ a }: { a: Adaptation[] }) {
  return (
    <Rubrique nom="adaptation" titre="Besoins d'adaptation">
      {a.length === 0 ? <p>Aucun besoin inscrit.</p> : (
        <ul className="elements">{a.map((x) => <li key={x.id}><span className="nom">{x.titre}</span><span>{x.detail}</span></li>)}</ul>
      )}
    </Rubrique>
  );
}

export function RubriqueMaladies({ m }: { m: Maladie[] }) {
  return (
    <Rubrique nom="maladies" titre="Maladies et dispositifs à risque">
      {m.length === 0 ? <p>Rien d'inscrit.</p> : (
        <ul className="elements">
          {m.map((x) => (
            <li key={x.id}>
              <span className="nom">{x.libelle}</span>
              {x.dispositif && <span className="etiquette jaune">Dispositif implanté</span>}
              {x.depuis && <span className="secondaire">Depuis {x.depuis.slice(0, 4)}</span>}
            </li>
          ))}
        </ul>
      )}
    </Rubrique>
  );
}

const NIVEAUX_SOINS: Record<string, string> = {
  A: 'Prolonger la vie par tous les soins nécessaires',
  B: 'Prolonger la vie par des soins limités',
  C: 'Assurer le confort en priorité',
  D: 'Assurer le confort uniquement',
};

export function RubriqueVolontes({ v }: { v: Volontes | null }) {
  return (
    <Rubrique nom="volontes" titre="Volontés">
      {!v ? <p>Aucune volonté inscrite.</p> : (
        <dl className="resume">
          <div>
            <dt>Niveau de soins</dt>
            <dd>{v.niveauSoins ? <><span className="niveau-soins">{v.niveauSoins}</span><br />{NIVEAUX_SOINS[v.niveauSoins]}</> : 'Non précisé'}</dd>
          </div>
          <div><dt>Directives médicales anticipées</dt><dd>{v.directives ? 'Inscrites au registre' : 'Aucune'}</dd></div>
          <div><dt>Don d'organes</dt><dd>{v.donOrganes === null ? 'Non précisé' : v.donOrganes ? 'Consentement inscrit' : 'Refus inscrit'}</dd></div>
        </dl>
      )}
    </Rubrique>
  );
}
