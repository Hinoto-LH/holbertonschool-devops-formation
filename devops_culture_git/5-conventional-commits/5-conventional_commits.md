# Conventional Commits — HolbieBot

## Git log (`git log --oneline -5`)

```text
09e727b docs: add README with usage and test instructions
53b8d16 test: add tests for validate_energy
4272d9c refactor: extract energy validation into its own function
98fc138 fix: clamp energy between 0 and 100
4507630 feat: add deploy capacity
```

## Why each type matches its change

- **`feat: add deploy capacity`** — `feat` adds a brand-new capability (the
  `deploy()` function) the bot did not have before. It is new, user-visible
  behaviour, which is exactly what `feat` is for.
- **`fix: clamp energy between 0 and 100`** — `fix` corrects broken behaviour:
  the bot used to accept impossible energy values (e.g. 150, -20). Energy was
  always supposed to stay valid, so correcting it is a bug fix, not a feature.
- **`refactor: extract energy validation into its own function`** — `refactor`
  because the behaviour is unchanged; the validation logic was only moved out of
  `bot_status()` into `validate_energy()` to improve the internal structure.
- **`test: add tests for validate_energy`** — `test` because the change only
  adds automated tests (unittest) that verify the validation. It adds no
  feature and fixes no bug.
- **`docs: add README with usage and test instructions`** — `docs` because it
  only adds documentation (the README) explaining what the bot does and how to
  run it and its tests. No code behaviour changes.
