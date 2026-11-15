#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
LOG="${WAIT_VERCEL_LOG:-/tmp/wait-vercel-deploy.log}"
exec > >(tee -a "$LOG") 2>&1
deadline=$((SECONDS + 2400))
echo "[wait-vercel] Attente connexion Vercel (max 40 min)..."
while (( SECONDS < deadline )); do
  if npx vercel whoami >/dev/null 2>&1; then
    echo "[wait-vercel] Connecté: $(npx vercel whoami)"
    npx vercel link --project vintflow --yes 2>/dev/null || npx vercel link --yes || true
  if npx vercel deploy --prod --yes; then
      echo "[wait-vercel] Deploy lancé."
      for _ in 1 2 3 4 5 6 7 8 9 10; do
        sleep 30
        body=$(curl -sfS "https://vintflow-vint4.vercel.app/sitemap.xml" | head -3 || true)
        if echo "$body" | grep -q 'vintflow-vint4.vercel.app'; then
          echo "[wait-vercel] Sitemap OK."
          exit 0
        fi
      done
      exit 0
    fi
  fi
  sleep 20
done
echo "[wait-vercel] timeout"
exit 1