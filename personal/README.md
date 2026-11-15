# VintFlow Édition perso

Cockpit **Pro Scale** (toutes fonctionnalités) pour toi seul, sans Stripe.

## Accès partout (sans Cursor)

1. **Publie** ce dossier `personal/` en app Cursor **Public** (ou partage le lien).
2. Secrets obligatoires :
   - **`PERSO_ALLOWED_EMAILS`** : ton e-mail (ex. `toi@proton.me`)
   - **`PERSO_PASSWORD`** : mot de passe de connexion (≥ 8 caractères)
   - **`SESSION_SECRET`** : session sécurisée
   - **`OPENAI_API_KEY`** + **`PERSO_ENABLE_CLOUD_AI=true`** (optionnel, Nova)
3. Ouvre l’URL → `/app` → **e-mail + mot de passe**.

Sur téléphone, tablette ou PC : même lien, pas besoin de Cursor.

## Connexion Cursor (optionnel)

Lien mobile (Vercel) : `https://vintflow-perso.vercel.app/app` — ouverture directe, données sauvegardées (Vercel Blob). Paramètres studio et onglet mémorisés automatiquement.

### Vercel (`vint4/vintflow-perso`)

- **Root Directory** du projet : `personal` (pas la racine du monorepo).
- Variables **Production** (Secret) :
  - `GEMINI_API_KEY` — clé [AI Studio](https://aistudio.google.com/apikey) (`AQ.…` ou `AIza…`)
  - `OPENAI_API_KEY` — secours si Gemini échoue (recommandé)
  - `PERSO_ENABLE_CLOUD_AI` = `true`, `PERSO_AI_POWER` = `true`
  - `PERSO_AI_MONTHLY_CLOUD_CAP` = `120` (appels Gemini/OpenAI max/mois ; au-delà = **blocage cloud**, factures/anti-ban **locaux gratuits**)
  - `PERSO_AI_OPENAI_FALLBACK` = `false` par défaut (0 € — pas d’OpenAI payant sans le demander)
  - `PERSO_AI_HARD_BLOCK_WHEN_EXHAUSTED` = `true` pour tout couper à 403 quand le cap est atteint (sinon local reste actif)
  - `SESSION_SECRET`, `PERSO_PASSWORD`, `PERSO_ALLOWED_EMAILS`, clés Blob si utilisées
- Après toute modification : **Redeploy** → test `GET /api/health/ai`  
  Réponse OK attendue : `"ok": true`, `gemini.keyFormat`, `gemini.status: "ok"`.

## Local

```bash
cd personal
npm install
npm run dev
```

Sans secrets, seul le dev local autorise les e-mails (pas en production).