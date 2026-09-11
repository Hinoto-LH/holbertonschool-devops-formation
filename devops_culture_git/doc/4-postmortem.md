# Post-mortem — L'incident du vendredi soir (PixelCart)

*Post-mortem blameless (sans blâme). Le but est de comprendre ce qui, dans le
système, a laissé l'erreur atteindre les clients — pas qui l'a commise.*

> Version française du livrable `4-postmortem.md`.

## Résumé

Lors du déploiement de la nouvelle page de paiement, un changement de
configuration contenant une faute de frappe dans l'URL de la base de données a
été mis en production un vendredi soir. Le paiement (checkout) est tombé en
panne. Sans monitoring ni personne pour surveiller, la panne est restée
invisible jusqu'au lendemain matin, et le rétablissement a nécessité de retrouver
la seule personne ayant les accès pour corriger le fichier à la main. Résultat :
**~15 heures d'indisponibilité du checkout sur un week-end et une perte de
chiffre d'affaires.**

## Timeline (faits)

| Quand | Événement |
|-------|-----------|
| **Ven 17h40** | Un correctif est préparé avant le week-end. Le déploiement est 100 % manuel : SSH en prod, copie des fichiers à la main, édition de la config directement sur le serveur. |
| **Ven 17h52** *(occurred)* | Une mauvaise valeur de config (faute de frappe dans l'URL de la base) est déployée en prod. Pas d'environnement de test identique à la prod ; changement testé « plus ou moins » en local. Le checkout est cassé. |
| **Ven 18h05** | Fin de journée. Personne ne surveille le site ; aucune alerte automatique. |
| **Ven 20h30** | Un client signale la panne du checkout sur les réseaux sociaux. Personne dans l'équipe ne le voit. |
| **Sam 9h15** *(detected)* | Inès, d'astreinte officieuse, découvre les plaintes. Elle n'a pas d'accès serveur, aucune trace de ce qui a été déployé, et aucun moyen simple de revenir en arrière. |
| **Sam 11h40** *(resolved)* | Après avoir joint Karim, identifié la faute et corrigé le fichier à la main, le service est rétabli. |

**Deux écarts ressortent :**
- **occurred → detected ≈ 15h30** : le site est cassé sans que personne ne le sache.
- **detected → resolved ≈ 2h30** : même une fois connu, le rétablissement est lent et manuel.

## Causes systémiques (zéro doigt pointé)

L'incident n'a pas été causé par la faute de frappe d'une personne — une faute de
frappe est normale et prévisible. Elle a atteint les clients et est restée en
ligne 15 heures parce que le *système* n'avait aucun filet de sécurité à aucune
étape :

1. **Aucun pipeline de déploiement automatisé.** Déployer = SSH manuel, copie de
   fichiers, édition de la config en direct sur le serveur — source d'erreurs et
   non reproductible.
2. **Aucun environnement de staging identique à la prod.** Les changements ne
   pouvaient être testés que « plus ou moins » sur un portable ; impossible de
   détecter une mauvaise config avant la prod.
3. **Aucun test automatisé ni validation avant déploiement.** Rien ne vérifiait
   la config (ex. l'URL de la base) avant la mise en ligne.
4. **Aucun monitoring ni alerting.** Un checkout cassé ne produisait aucun
   signal ; la détection dépendait d'un client qui remarque et d'un membre de
   l'équipe qui tombe dessus le lendemain.
5. **Aucun suivi des changements / journal.** Aucune trace de ce qui avait été
   déployé, donc diagnostic à partir de zéro.
6. **Aucun rollback simple.** Le rétablissement a exigé une correction manuelle
   au lieu d'un retour à la dernière version saine.
7. **Point unique de défaillance (accès & connaissance).** Seul Karim avait
   l'accès et savait ce qui avait été livré ; la personne disponible le samedi ne
   pouvait pas agir seule.

## Actions prioritaires (priorisées et justifiées)

Classées selon leur impact pour prévenir ou raccourcir *cet* incident.

1. **Mettre en place du monitoring + alerting sur le checkout, relié à une
   astreinte.**
   *Pourquoi en premier :* le plus gros coût ici, c'est ~15 heures de panne
   **non détectée**. Un simple health check sur le parcours de paiement, alertant
   l'équipe en quelques minutes, aurait transformé une panne de 15h en panne
   courte — le correctif au meilleur rapport valeur/effort.
   → Dégrade le **Temps de rétablissement (MTTR)** (la détection fait partie du
   temps de récupération).

2. **Remplacer les déploiements manuels par un pipeline automatisé qui trace
   chaque changement et permet un rollback en une étape.**
   *Pourquoi :* on supprime l'édition à la main sur le serveur (l'origine du typo
   arrivé en prod), on obtient un journal permettant à chacun de voir ce qui a
   changé, et n'importe quel ingénieur peut revenir en arrière instantanément au
   lieu d'attendre la seule personne qui sait.
   → Dégrade le **MTTR** (rétablissement lent, manuel, dépendant d'une personne)
   et la **Fréquence de déploiement** / le **Lead Time** (des déploiements
   manuels risqués découragent de livrer et allongent le chemin vers la prod).

3. **Introduire un environnement de staging identique à la prod avec des tests /
   une validation de config automatisés, en barrière avant la prod.**
   *Pourquoi :* un environnement prod-like plus une étape de validation auraient
   attrapé le typo de l'URL de base avant que le moindre client ne le voie,
   stoppant l'incident à la source plutôt que d'avoir à s'en remettre.
   → Dégrade le **Taux d'échec des changements (Change Failure Rate)**.

## Métriques DORA dégradées par cet incident

| Problème systémique | Métrique DORA dégradée |
|---------------------|------------------------|
| Pas de monitoring/alerting → 15h avant même de s'en apercevoir | **Temps de rétablissement (MTTR)** |
| Pas de rollback + correction manuelle + savoir concentré sur une personne → récupération lente | **Temps de rétablissement (MTTR)** |
| Pas de staging + pas de tests → une mauvaise config atteint la prod | **Taux d'échec des changements** |
| Déploiements manuels, risqués, « seulement quand on y est forcé » | **Fréquence de déploiement** |
| Déploiement manuel multi-étapes, pas de pipeline → long chemin du prêt-à-livrer à la mise en ligne | **Lead Time for Changes** |

Les quatre métriques DORA sont touchées : les filets de sécurité manquants
pénalisent à la fois le **débit** (fréquence de déploiement, lead time) et la
**stabilité** (taux d'échec, temps de rétablissement).

## Conclusion blameless

Une faute de frappe finira toujours par arriver. Un système sain le suppose et en
fait un non-événement : attrapée avant la prod, ou détectée et annulée en
quelques minutes. Les actions ci-dessus reconstruisent ces filets de sécurité
manquants pour que la prochaine erreur reste petite.
