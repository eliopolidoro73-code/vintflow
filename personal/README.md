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

## Local

```bash
cd personal
npm install
npm run dev
```

Sans secrets, seul le dev local autorise les e-mails (pas en production).