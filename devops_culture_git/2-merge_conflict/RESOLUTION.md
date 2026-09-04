# Merge Conflict Resolution

## Context
Two feature branches modified the same file, `config.yml`, both starting
from a common base on `main`:

- `feature/scale-up` — bumped `version` to `1.1.0` and `replicas` to `4`
- `feature/dark-mode` — bumped `version` to `2.0.0` and set `feature_dark_mode` to `true`

Merging `feature/dark-mode` into `feature/scale-up` produced exactly one conflict.

## Which line was in conflict
Only **one** line conflicted: **`version`**. Git reported:

Auto-merging config.yml
CONFLICT (content): Merge conflict in config.yml


The conflict block was:
<<<<<<< HEAD
version: 1.1.0
version: 2.0.0

feature/dark-mode


## Why that line and not the others
A merge conflict happens only when the **same line** is changed
**differently on both branches**, relative to the common base.

| Line                | base (main) | scale-up | dark-mode | Changed by      | Result             |
|---------------------|-------------|----------|-----------|-----------------|--------------------|
| `version`           | 1.0.0       | 1.1.0    | 2.0.0     | both branches   | **conflict**       |
| `replicas`          | 2           | 4        | 2         | scale-up only   | auto-merged → 4    |
| `feature_dark_mode` | false       | false    | true      | dark-mode only  | auto-merged → true |

- `replicas` was changed by `feature/scale-up` only → Git safely keeps `4`.
- `feature_dark_mode` was changed by `feature/dark-mode` only → Git safely keeps `true`.
- `version` was changed by **both** branches to **different values** → Git cannot
  decide, so it hands the choice to a human. That is why the output shows
  `Auto-merging config.yml` (most of the file merged on its own) immediately
  followed by `CONFLICT` on the one truly ambiguous line.

## My choice
I resolved `version` to **`2.0.0`**: I removed the conflict markers and the
`1.1.0` line, keeping the `2.0.0` value, while leaving the auto-merged
`replicas: 4` and `feature_dark_mode: true` untouched.

Final values:
- `version: 2.0.0`
- `replicas: 4`
- `feature_dark_mode: true`

## Why smaller, focused changes reduce merge conflicts
- **Fewer overlapping lines.** A conflict is triggered by two branches editing
  the *same line*. The smaller and more focused each change is, the lower the
  chance two branches touch the same line at once.
- **Short-lived branches.** Small changes merge quickly, so a branch doesn't
  drift far from `main`. The longer a branch lives, the more the base moves
  underneath it and the more lines diverge.
- **One concern per branch/commit.** Keeping version bumps, scaling, and feature
  flags in separate focused changes makes an overlapping edit obvious instead of
  buried in a large diff.
- **Easier resolution when it happens.** A small diff means the conflict is a
  couple of lines you fully understand — not a giant block where you risk
  dropping someone else's work.

In short: conflicts come from *shared lines edited in parallel*, not from shared
files. Keeping changes small, focused, and integrated often keeps that overlap
— and the fear — to a minimum.