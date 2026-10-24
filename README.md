# Santé Québec 2028

Application publique de santé du Québec : un identifiant QC unique de la naissance au décès, un registre des personnes, une passerelle qui décide qui voit quoi, et un journal des accès que personne ne peut modifier.

Toutes les personnes dans les données de départ sont **fictives**.

## Structure

```
packages/noyau   Règles pures, sans dépendance : numéro QC, cycle de vie du registre,
                 règles d'accès, forme du journal chaîné, calcul de la parenté.
apps/api         Serveur Fastify + PostgreSQL. Applique la passerelle et écrit le journal.
apps/web         Application React : connexion, espace citoyen, espace clinique.
```

## Démarrer

Node 22 ou plus récent.

```bash
npm install
npm run seed      # crée une base de développement locale avec les données fictives
npm run dev       # API sur :3100, application sur http://localhost:5173
```

En développement, aucun texto n'est envoyé : le code de connexion s'affiche à l'écran.

| Pour essayer | Identifiant |
|---|---|
| Gisèle, 87 ans, mode simplifié | `4829 1357 066` |
| Sarah, enceinte | `5196 4037 286` |
| Médecin d'urgence (aucun lien de soins) | `aouellet` |
| Médecin de famille de Gisèle | `proy` |
| Agent du registre | `mgagnon` |
| Exploitation, Québec Tech | `lchen` |

Les numéros de Nadia (procuration « Organiser » pour sa mère), Marc et Léo sont tirés au hasard au moment du semis. `npm run seed` les affiche à la fin.

```bash
npm test               # 18 tests du noyau, 19 tests de l'API par HTTP
npm run verifier-types # TypeScript strict sur les trois paquets
```

## Garanties de sécurité

- **La passerelle décide côté serveur.** Chaque lecture et chaque écriture passent par `decider()` du noyau. Le navigateur ne reçoit que ce qui est permis.
- **Le journal est inaltérable.** Chaque entrée contient l'empreinte SHA-256 de la précédente. Des déclencheurs PostgreSQL refusent `UPDATE`, `DELETE` et `TRUNCATE`.
- **Un refus reste inscrit.** La transaction est validée avant de renvoyer l'erreur 403.
- **Connexion.**
  - Un code à 6 chiffres envoyé au téléphone inscrit, valide 10 minutes, avec 5 essais au maximum.
  - Un témoin de session `httpOnly`, `SameSite=Strict`.
  - L'API n'accepte que du JSON.
- **Rien n'est supprimé du registre.** Un numéro fusionné ou remplacé renvoie vers le bon, et aucun numéro n'est jamais réattribué.
- **Les quatre portes sont étanches.** Le personnel administratif et l'équipe technique ne voient jamais le contenu clinique.

## Production

Définir `DATABASE_URL` (PostgreSQL 15 ou plus récent) et `SANTE_SECRET`. Les migrations dans `apps/api/db/migrations` s'appliquent au démarrage. Sans `DATABASE_URL`, l'API utilise PGlite, c'est-à-dire PostgreSQL en WebAssembly, dans `.donnees/`.

## Suite

1. Écrans de la bureaucratie : naissances, fusions, décès. Les routes existent déjà.
2. Écrans de l'exploitation : vérification du journal, revue des accès d'urgence.
3. Écriture clinique : inscrire une allergie, une dose de vaccin, une rencontre.
4. Grossesse et choix prénataux. Ligne citoyenne.

Le premier prototype, entièrement en mémoire, se trouve au commit `f415155`.
