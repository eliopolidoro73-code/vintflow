# Vercel Git — `vintflow-perso`

Projet : [vint4/vintflow-perso](https://vercel.com/vint4/vintflow-perso)

## Settings → Git

| Option | Valeur |
|--------|--------|
| **Connected Git Repository** | `eliopolidoro73-code/vintflow` |
| **Production Branch** | `main` |
| Deploy Hooks | (optionnel) |

## Settings → General

| Option | Valeur |
|--------|--------|
| **Root Directory** | `personal` |
| Framework | Next.js (détecté) |

Sans **Root Directory = personal**, Vercel build la mauvaise app.

## Déploiements

Chaque `git push` sur **GitHub** `main` doit créer un déploiement.

Commits agent : pousser **les deux** remotes :

```bash
git push github main
git push origin main
```

Vercel lit **GitHub**, pas Origin Cursor.

## Variables Production

`GEMINI_API_KEY`, `OPENAI_API_KEY` (recommandé), `PERSO_ENABLE_CLOUD_AI=true`, etc.

## Vérification

`GET https://vintflow-perso.vercel.app/api/health/ai`

Nouveau build : champs `buildSha`, `gemini.keyFormat`, `gemini.detail`.