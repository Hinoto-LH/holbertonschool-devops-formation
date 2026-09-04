#!/usr/bin/env bash
# Génère un dépôt Git avec un conflit de merge GARANTI, pour s'entraîner.
# Conçu pour qu'UNE ligne soit en conflit et d'autres fusionnent automatiquement.
# Usage : bash setup-conflit.sh [nom-du-dossier]
set -e

DIR="${1:-conflit-demo}"
rm -rf "$DIR"
mkdir "$DIR"
cd "$DIR"

git init -q
git config user.name  "TP DevOps"
git config user.email "tp@cours.local"

# 1) Base commune sur main
cat > config.yml <<'YAML'
app: monservice
environment: production
version: 1.0.0
description: service principal
replicas: 2
max_connections: 100
feature_dark_mode: false
log_level: info
YAML
git add config.yml
git commit -qm "chore: configuration initiale"
git branch -M main

# 2) Branche A : montée en charge (version 1.1.0 + replicas 4)
git switch -qc feature/scale-up
cat > config.yml <<'YAML'
app: monservice
environment: production
version: 1.1.0
description: service principal
replicas: 4
max_connections: 100
feature_dark_mode: false
log_level: info
YAML
git commit -qam "feat: passe a 4 replicas"

# 3) Branche B : dark mode (version 2.0.0 + flag true)
git switch -q main
git switch -qc feature/dark-mode
cat > config.yml <<'YAML'
app: monservice
environment: production
version: 2.0.0
description: service principal
replicas: 2
max_connections: 100
feature_dark_mode: true
log_level: info
YAML
git commit -qam "feat: active le dark mode"

# 4) Retour sur la branche A, prête à fusionner B
git switch -q feature/scale-up

echo
echo "Dépôt '$DIR' prêt."
echo "Tu es sur la branche feature/scale-up."
echo "Lance maintenant :   git merge feature/dark-mode"
echo "...puis résous le conflit dans config.yml."
