# Santé Québec 2037 — prototype

Premier prototype codé de l'application santé publique du Québec, bâtie à l'interne par Québec Tech.
Toutes les personnes et tous les dossiers sont **fictifs**.

## Ce qui fonctionne

**Le noyau** (`core/`, en JavaScript sans aucune dépendance) :

| Module | Rôle |
|---|---|
| `numero.js` | Identifiant QC : 11 chiffres affichés `QC 4829 1357 066`. 10 chiffres au hasard (jamais de 0 en tête) et un chiffre de contrôle de Damm, qui détecte toute faute de frappe d'un chiffre et toute inversion de deux chiffres voisins. Aucune information encodée. |
| `registre.js` | Registre des personnes : clé interne invisible, numéro public remplaçable. Statuts Réservé, Actif, Temporaire, Décédé, Fusionné, Remplacé, Annulé. Rien n'est supprimé et un numéro n'est jamais réattribué. Correspondance avec le NAM. |
| `filiation.js` | Seul le lien parent → enfant est stocké. Fratrie, grands-parents, oncles, tantes et cousins sont calculés. Le second parent vient de l'État civil, jamais d'un test biologique. |
| `passerelle.js` | Passerelle d'accès : qui demande, sur qui, quelle donnée, pourquoi. Règles d'âge (bébé à naître, moins de 14 ans, 14 à 17 ans, adulte), procuration en 4 niveaux, lien de soins actif obligatoire, accès d'urgence, portes sans contenu clinique. |
| `journal.js` | Journal d'accès chaîné par SHA-256 : modifier une entrée passée casse la chaîne. Alertes d'accès inhabituel. |

**L'interface** (`web/`, React) : les quatre portes.

- **Patients et proches** : accueil en mode simplifié pour les aînés (Gisèle, 87 ans), rendez-vous à confirmer ou changer, médicaments par moment de la journée, bouton Aidez-moi, « Qui a vu mon dossier », famille calculée, profil du bébé à naître (Sarah) avec choix du VRS, vue d'une aidante (Nadia) et d'un parent d'ado (Marc).
- **Employés cliniques** : recherche par numéro QC ou NAM, fiche de niveau 1, accès d'urgence justifié.
- **Bureaucratie** : naissance confirmée en 48 h, fusion de fiches en double, procurations. Aucun contenu clinique.
- **Admin tech** : état du journal, revue des accès d'urgence, alertes, test d'inviolabilité, carte des dépendances.

Chaque lecture passe par la passerelle et s'inscrit au journal.

## Lancer

```bash
npm install
npm test        # 16 tests du noyau
npm run dev     # interface sur http://localhost:5173
```

## Carte des dépendances

`public/carte.html` montre les 62 fonctionnalités prévues et ce qui dépend de quoi. Elle sert de plan de construction : on bâtit d'abord les gros cercles du centre.

## Suite prévue

Étape 2 : carnet vaccinal complet, résultats, registre des rencontres. Étape 3 : logistique, IA publique de prévision, aînés en hébergement. Voir le plan complet dans le document « Application Santé Québec 2037 — plan de A à Z ».
