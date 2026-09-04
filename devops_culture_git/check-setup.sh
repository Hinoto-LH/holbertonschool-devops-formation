#!/usr/bin/env bash
# Vérifie que l'environnement est prêt pour le cours DevOps & Docker.
# Usage : bash check-setup.sh

ok()   { printf "  [ OK ] %s\n" "$1"; }
ko()   { printf "  [ KO ] %s\n" "$1"; FAILS=$((FAILS+1)); }
warn() { printf "  [ !  ] %s\n" "$1"; }

FAILS=0
echo "=== Vérification de l'environnement ==="

# Docker
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    ok "Docker installé et démon actif ($(docker --version | cut -d',' -f1))"
  else
    ko "Docker installé mais le démon ne répond pas (lance Docker Desktop ?)"
  fi
else
  ko "Docker introuvable"
fi

# Git
if command -v git >/dev/null 2>&1; then
  ok "Git installé ($(git --version))"
  [ -n "$(git config --global user.name)" ]  && ok "git user.name configuré"  || ko "git user.name non configuré (git config --global user.name \"...\")"
  [ -n "$(git config --global user.email)" ] && ok "git user.email configuré" || ko "git user.email non configuré"
else
  ko "Git introuvable"
fi

# SSH vers GitHub (GitHub renvoie un code 1 même en cas de succès → on lit le message)
if command -v ssh >/dev/null 2>&1; then
  SSH_OUT=$(ssh -T -o StrictHostKeyChecking=no -o BatchMode=yes git@github.com 2>&1 || true)
  case "$SSH_OUT" in
    *"successfully authenticated"*) ok "Clé SSH GitHub fonctionnelle" ;;
    *"Permission denied"*)          ko "Clé SSH non reconnue par GitHub" ;;
    *)                              warn "Statut SSH GitHub indéterminé : $SSH_OUT" ;;
  esac
else
  warn "ssh introuvable (vérification GitHub ignorée)"
fi

# Un runtime applicatif
if command -v node >/dev/null 2>&1; then ok "Node.js présent ($(node --version))"
elif command -v python3 >/dev/null 2>&1; then ok "Python présent ($(python3 --version))"
else warn "Ni Node ni Python détectés (au moins un est utile pour les labs)"
fi

echo "======================================="
if [ "$FAILS" -eq 0 ]; then
  printf "Tout est pret. Bon cours !\n"
else
  printf "%d point(s) a corriger avant de commencer.\n" "$FAILS"
  exit 1
fi
