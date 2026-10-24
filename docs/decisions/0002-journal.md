# 0002 — Journal des accès chaîné et inaltérable

**Statut :** acceptée · octobre 2026

## Décision
- Chaque entrée contient l'empreinte SHA-256 de la précédente, comme une chaîne. Changer ou retirer une entrée casse la chaîne, et `verifierChaine()` le détecte.
- Des déclencheurs PostgreSQL refusent `UPDATE`, `DELETE` et `TRUNCATE` sur la table.
- Un verrou transactionnel garantit une chaîne linéaire.

## Limite connue
Un superutilisateur de la base peut désactiver les déclencheurs. En production, il faudra :
1. que l'application se connecte avec un rôle qui n'a que `INSERT` et `SELECT` sur le journal, sans droit de modifier le schéma ;
2. publier l'empreinte de tête à intervalles réguliers hors de la base : stockage non réinscriptible, ou horodatage par un tiers de confiance (RFC 3161) ;
3. comparer la chaîne à ces ancrages, de façon automatique.

## Conséquences
Le verrou unique limite le débit d'écriture. À grande échelle, il faudra une chaîne par partition (par jour, par région), elles-mêmes chaînées entre elles.
