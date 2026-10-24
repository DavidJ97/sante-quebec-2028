# 0003 — Authentification : le texto n'est qu'un substitut de développement

**Statut :** acceptée · octobre 2026

## Contexte
La version 0.2 connecte par code à 6 chiffres envoyé par texto. C'est simple et utile pour développer, mais :
- le NIST SP 800-63B classe le texto parmi les authentificateurs « restreints » : échange de carte SIM, redirection d'appels ;
- un service public québécois ne doit pas gérer lui-même l'identité des citoyens. Le gouvernement déploie le **Service d'authentification gouvernementale** du programme SQIN, qui remplace graduellement clicSÉQUR.

## Décision
- **Citoyens.** L'application devient une partie utilisatrice (« relying party ») du service d'authentification gouvernementale. Elle demande un niveau d'assurance adapté aux données de santé et ne conserve aucun mot de passe.
- **Personnel.** Fédération avec le fournisseur d'identité des établissements, authentification à plusieurs facteurs obligatoire, rôles et établissement transmis dans le jeton, sessions courtes.
- **Le texto** reste, en environnement de développement seulement. Le code est affiché à l'écran et n'existe jamais en production.

## À faire
1. Isoler la connexion derrière une interface : fournisseur de développement d'un côté, fournisseur fédéré (OpenID Connect) de l'autre.
2. Faire une analyse d'impact sur la vie privée (EFVP) de l'intégration.
