# Revue critique — version 0.2

_24 octobre 2026_

Cette revue relit la première version de l'application (commit `4619176`) comme le ferait une équipe de qualité d'un grand service public. Chaque constat porte une gravité, une correction et la preuve de la correction.

Gravités :
- **Bloquant** : risque clinique ou de sécurité.
- **Majeur** : écart net avec les pratiques de l'industrie.
- **Mineur** : finition.

## Constats

| # | Constat | Gravité | État |
|---|---|---|---|
| 1 | Une liste d'allergies vide s'affichait « Aucune allergie connue ». C'est une affirmation clinique que personne n'avait faite. | Bloquant | **Corrigé.** Trois états : présentes, aucune connue (constat daté et signé par un professionnel), non documentées. Testé en API et de bout en bout. |
| 2 | L'accès d'urgence reposait sur un texte libre, sans durée affichée ni revue. | Bloquant | **Corrigé.** Motifs normalisés, précision obligatoire pour « autre », expiration affichée, revue par l'exploitation (justifié ou enquête). |
| 3 | L'identification du patient côté clinique n'était pas conforme aux usages : nom peu distinct, date ambiguë, rien de fixe à l'écran. | Bloquant | **Corrigé.** Bandeau patient fixe : NOM DE FAMILLE en majuscules, date de naissance en toutes lettres avec l'âge, sexe, numéro QC, drapeau d'allergies. Inspiré de la norme du NHS sur l'identification du patient à l'écran. |
| 4 | L'écran des droits écrivait 9 entrées au journal à chaque visite. Ce bruit noie les vrais accès. | Majeur | **Corrigé.** Évaluation sans lecture ni journalisation. Testé : le nombre d'entrées ne change pas. |
| 5 | Le design était générique : des cartes arrondies partout, des tuiles, aucune référence à un système de design public. | Majeur | **Corrigé.** Gabarit de service public : bandeau de phase, pied de page, fil d'Ariane, focus jaune, listes de résumé, étiquettes, bandeaux, résumé des erreurs. Illustrations au trait propres au projet, en filigrane par catégorie et par service. |
| 6 | Les polices étaient chargées depuis Google : chaque visite d'un dossier de santé informait un tiers. | Majeur | **Corrigé.** Polices hébergées avec l'application. |
| 7 | Les erreurs de formulaire n'étaient pas normées : pas de résumé ni de focus, titre de page inchangé. | Majeur | **Corrigé.** Un résumé en haut de page prend le focus, le message est sur le champ et le titre d'onglet commence par « Erreur : ». |
| 8 | Le parcours de bout en bout n'était pas dans le dépôt, et l'accessibilité n'était pas vérifiée. | Majeur | **Corrigé.** Playwright sur téléphone et ordinateur avec axe (WCAG 2.1 AA et critères AA des WCAG 2.2), y compris en thème sombre. Ces tests ont trouvé deux vrais défauts, corrigés : une zone défilante inaccessible au clavier et des contrastes du thème sombre. |
| 9 | Les données de départ n'étaient pas déterministes : impossible de se connecter en tant que Nadia. | Majeur | **Corrigé.** Numéros fixes pour tous les personnages, historique d'accès réel passé par la passerelle. |
| 10 | La connexion par texto a été inventée. Un texto est un authentificateur « restreint » selon le NIST SP 800-63B, et un service public québécois passe par le Service d'authentification gouvernementale du SQIN. | Majeur | **Décision écrite** ([0003](decisions/0003-authentification.md)). Le texto reste un substitut de développement. |
| 11 | Le modèle de données était inventé, sans référence à HL7 FHIR ni aux terminologies canadiennes. | Majeur | **Décision écrite** ([0004](decisions/0004-fhir.md)). La correspondance est faite ; l'exposition en FHIR est à venir. |
| 12 | Le journal est protégé par des déclencheurs, mais un superutilisateur de la base peut les désactiver. | Majeur | **Décision écrite** ([0002](decisions/0002-journal.md)). Rôles séparés et ancrage externe de l'empreinte. |
| 13 | Les heures étaient coupées en fin de ligne (« 9 h / 30 »), et il manquait les espaces insécables de la typographie française. | Mineur | **Corrigé.** |
| 14 | Les promesses non tenues dans l'interface (« Le lieu vous est rappelé la veille ») ont été retirées. | Mineur | **Corrigé.** |

## Ce qui n'est pas encore fait, et pourquoi

- **Essais avec de vraies personnes.** Aucune affirmation du type « pensé pour les aînés » ne vaut sans essais : personnes âgées, aidants, personnes aveugles ou sourdes, urgentologues. C'est la prochaine étape, avant tout ajout de fonctions.
- **Écrans de la bureaucratie et de l'exploitation.** Les routes de l'API existent et sont testées. Les écrans viendront.
- **Écriture clinique** : inscrire une allergie, une dose, une rencontre, un constat d'absence.
- **Revue de sécurité indépendante** et analyse d'impact sur la vie privée (EFVP), obligatoires avant tout usage réel au Québec.

## Références

- Standard sur l'accessibilité des sites Web, SGQRI 008 3.0 (Québec, 2024)
- GOV.UK Design System : modèles d'erreurs, de bandeaux, de listes de résumé
- NHS Digital : identification du patient à l'écran (bandeau patient)
- NIST SP 800-63B : authentificateurs restreints (texto)
- HL7 FHIR R4 : AllergyIntolerance, Consent, AuditEvent, Immunization
