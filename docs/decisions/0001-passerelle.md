# 0001 — Les règles d'accès sont une fonction pure, appliquée par le serveur

**Statut :** acceptée · octobre 2026

## Contexte
Qui voit quoi dépend de plusieurs choses à la fois : l'âge, la filiation, les procurations, le lien de soins, l'urgence et la porte d'entrée (citoyen, clinique, administratif, technique). Si ces règles étaient dispersées dans le code, on ne pourrait ni les relire ni les tester ni les auditer.

## Décision
- Les règles vivent dans une seule fonction pure, `decider()` dans `packages/noyau`. Elle n'accède ni au réseau ni à la base de données, et ne lit pas l'heure système : on lui passe tout.
- Le serveur charge le contexte, appelle `decider()`, inscrit le verdict au journal dans la même transaction, puis lit la donnée seulement si l'accès est permis.
- Un refus est inscrit au journal. L'erreur 403 n'est renvoyée qu'après la validation de la transaction.
- Le navigateur ne décide jamais rien.

## Conséquences
- Chaque règle se teste en une ligne. Les tests du noyau servent de spécification.
- Changer une règle passe par une revue de code et par les tests.
- La prochaine étape : versionner les règles et indiquer au journal quelle version a décidé.
