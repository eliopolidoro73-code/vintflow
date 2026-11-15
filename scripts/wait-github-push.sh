#!/usr/bin/env bash
# Attend une session `gh auth login`, puis pousse main vers GitHub (déclenche Vercel).
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE="${GITHUB_REMOTE:-github}"
BRANCH="${GITHUB_BRANCH:-main}"
LOG="${WAIT_GH_PUSH_LOG:-/tmp/wait-github-push.log}"

exec > >(tee -a "$LOG") 2>&1
echo "[wait-github-push] En attente de gh auth (jusqu'à 30 min)..."

deadline=$((SECONDS + 1800))
while (( SECONDS < deadline )); do
  if gh auth status >/dev/null 2>&1; then
    echo "[wait-github-push] gh connecté."
  gh auth setup-git
  git remote set-url "$REMOTE" "https://github.com/eliopolidoro73-code/vintflow.git" 2>/dev/null || true
    if git push -u "$REMOTE" "$BRANCH"; then
      echo "[wait-github-push] OK — Vercel va redéployer."
      curl -sfS "https://vintflow-vint4.vercel.app/robots.txt" | head -5 || true
      exit 0
    fi
    echo "[wait-github-push] push échoué, nouvelle tentative dans 15s..."
  fi
  sleep 15
done
echo "[wait-github-push] timeout — aucun gh auth."
exit 1