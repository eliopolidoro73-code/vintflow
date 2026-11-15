# VintFlow Édition perso (`personal/`)

Cockpit **Pro Scale** pour **toi seul** : pas de Stripe, pas de landing SaaS publique.  
Deux modes d’accès :

| Mode | Usage |
|------|--------|
| **App Cursor privée** (recommandé) | Publication **Private** : connexion via ton compte Cursor → `/api/auth/enter` |
| **Local** | `npm install && npm run dev` — sans `PERSO_ALLOWED_EMAILS`, tout e-mail simulé autorisé |

## Secrets (app publiée `personal/`)

| Secret | Rôle |
|--------|------|
| `PERSO_ALLOWED_EMAILS` | E-mails Cursor autorisés (ex. `toi@proton.me`) |
| `SESSION_SECRET` | Cookies de session |
| `OPENAI_API_KEY` | Assistant Nova (optionnel) |
| `PERSO_ENABLE_CLOUD_AI` | `true` pour activer l’IA cloud |

## Publier

1. Dossier : **`personal/`** (pas la racine SaaS).
2. Visibilité : **Private**.
3. Après publish : ouvre l’URL de l’app → `/app` → bouton connexion → `/api/auth/enter`.

## Différences avec la racine `/`

- Pas de facturation Stripe, statut `personal_free` / quotas Pro Scale.
- Pas de SEO Vercel (surtout usage privé).
- Auth orientée **Cursor Identity** + liste d’e-mails autorisés.