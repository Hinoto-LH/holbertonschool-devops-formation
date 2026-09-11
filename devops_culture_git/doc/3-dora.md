# Métriques DORA — Quiz en classe (version française)

> Version française du livrable `3-dora.md`. Le fichier officiel de la tâche
> (en anglais) se trouve à la racine de `devops_culture_git/`.

## Q1. Associer chaque métrique DORA à sa définition

- **Fréquence de déploiement (Deployment Frequency)** — à quelle fréquence
  l'équipe met du code en production avec succès (c'est-à-dire livre des
  changements aux utilisateurs finaux). Les équipes « elite » déploient à la
  demande, plusieurs fois par jour.
- **Délai de livraison des changements (Lead Time for Changes)** — le temps
  qu'un changement met pour passer de *code committé / mergé* à *tourner en
  production*. Cela mesure la vitesse à laquelle un changement accepté atteint
  réellement les utilisateurs.
- **Taux d'échec des changements (Change Failure Rate)** — le pourcentage de
  déploiements en production qui provoquent une défaillance (incident, rollback,
  correctif à chaud, ou service dégradé).
- **Temps de rétablissement / MTTR (Mean Time To Restore)** — le temps
  nécessaire pour rétablir le service après une défaillance en production,
  c'est-à-dire de la détection de l'incident jusqu'au retour à la normale.

## Q2. Une équipe déploie une fois par trimestre. Quelle métrique est mauvaise ?

La **Fréquence de déploiement** est mauvaise — déployer seulement 4 fois par an
se situe tout en bas de l'échelle de cette métrique (cela dégrade aussi le lead
time, mais la métrique directement concernée ici est la fréquence de
déploiement).

## Q3. Vous réduisez le temps entre le merge d'une PR et sa mise en production. Quelle métrique s'améliore ?

Le **Délai de livraison des changements (Lead Time for Changes)** s'améliore —
c'est exactement l'intervalle qu'il mesure (du changement mergé/committé jusqu'à
sa mise en production).

## Q4. 1 déploiement sur 4 provoque un incident. Quelle métrique, et une valeur élevée est-elle bonne ou mauvaise ?

Il s'agit du **Taux d'échec des changements (Change Failure Rate)** = 1/4 =
**25 %**.
Une **valeur élevée est mauvaise** : cela signifie qu'une plus grande part des
déploiements casse la production. On veut ce chiffre le plus **bas** possible.

## Q5. Que signifie l'acronyme CALMS ?

- **C** — Culture
- **A** — Automation (Automatisation)
- **L** — Lean
- **M** — Measurement (Mesure)
- **S** — Sharing (Partage)

## Q6. Vrai ou faux : les équipes « elite » déploient moins souvent mais en plus gros lots. Justifiez.

**Faux.** Les équipes « elite » déploient **plus souvent**, en **plus petits
lots**.
De petits déploiements fréquents transportent moins de changements chacun, donc
ils sont moins risqués : une panne est plus facile à isoler, le lead time reste
court, et le rétablissement est plus rapide. Les gros lots peu fréquents font
l'inverse — ils augmentent le taux d'échec et dégradent le MTTR, car beaucoup de
changements partent d'un coup et une défaillance devient difficile à localiser
et à annuler.

## Q7. Quelle pratique améliore le plus le MTTR ?

**(b) monitoring et alerting + rollback automatisé.**
Le MTTR, c'est *rétablir vite* : un bon monitoring/alerting détecte la panne
rapidement, et le rollback automatisé restaure le service rapidement. L'option
(a) ajoute des délais, et (c) dégrade à la fois le débit et le rétablissement.

## Q8. Parmi les 4 métriques DORA, lesquelles mesurent le débit et lesquelles la stabilité ?

- **Débit / vitesse (throughput) :** Fréquence de déploiement, Délai de
  livraison des changements (Lead Time).
- **Stabilité / fiabilité :** Taux d'échec des changements, Temps de
  rétablissement (MTTR).

L'idée clé : les deux paires s'équilibrent. Une bonne équipe est rapide **et**
stable — accélérer ne doit pas se payer en fiabilité.

## Q9. Pourquoi fait-on des post-mortems « blameless » (sans blâme) ?

Pour se concentrer sur les **causes systémiques et de process** d'un incident
plutôt que de blâmer les individus. Quand les personnes ne sont pas mises en
cause, elles racontent honnêtement et complètement ce qui s'est réellement
passé, ce qui permet à l'équipe de trouver la vraie cause racine et de mettre en
place des correctifs qui évitent que ça se reproduise. Une culture du blâme
pousse au contraire à cacher les erreurs, ce qui détruit l'apprentissage et la
sécurité psychologique — et les mêmes pannes reviennent sans cesse.
