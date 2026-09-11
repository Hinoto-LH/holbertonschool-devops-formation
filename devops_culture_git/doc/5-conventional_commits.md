# Conventional Commits — HolbieBot (version française)

> Version française du livrable `5-conventional-commits/5-conventional_commits.md`.

## Journal Git (`git log --oneline -5`)

```text
09e727b docs: add README with usage and test instructions
53b8d16 test: add tests for validate_energy
4272d9c refactor: extract energy validation into its own function
98fc138 fix: clamp energy between 0 and 100
4507630 feat: add deploy capacity
```

## Pourquoi chaque type correspond à son changement

- **`feat: add deploy capacity`** — `feat` car on ajoute une capacité toute
  neuve (la fonction `deploy()`) que le bot n'avait pas avant. C'est un nouveau
  comportement visible par l'utilisateur : la définition même de `feat`.
- **`fix: clamp energy between 0 and 100`** — `fix` car on corrige un
  comportement défectueux : le bot acceptait des valeurs d'énergie impossibles
  (ex. 150, -20). L'énergie devait toujours rester valide, donc c'est une
  correction de bug, pas une nouveauté.
- **`refactor: extract energy validation into its own function`** — `refactor`
  car le comportement ne change pas ; la logique de validation a seulement été
  sortie de `bot_status()` vers `validate_energy()` pour améliorer la structure
  interne du code.
- **`test: add tests for validate_energy`** — `test` car le changement ajoute
  uniquement des tests automatiques (unittest) qui vérifient la validation. Il
  n'ajoute aucune feature et ne corrige aucun bug.
- **`docs: add README with usage and test instructions`** — `docs` car on ajoute
  seulement de la documentation (le README) expliquant ce que fait le bot et
  comment le lancer ainsi que ses tests. Aucun comportement du code ne change.
