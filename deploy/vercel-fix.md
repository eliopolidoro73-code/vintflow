# Corriger vintflow.vercel.app (erreur Route not found)

L’URL **`vintflow.vercel.app`** affiche un **autre** projet Vercel (API vide), pas Vintflow.

## Réparer (5 min)

1. Va sur [vercel.com/dashboard](https://vercel.com/dashboard).
2. **Supprime** le projet vide qui occupe `vintflow` (celui qui renvoie `Route not found`), **ou** laisse-le et utilise un autre nom (étape 4).
3. **Add New → Project** → importe le dépôt **vintflow** (Origin : `charles-oliveira/vintflow`).
4. Nom du projet : **`vintflow-site`** (si `vintflow` est pris) → URL **`vintflow-site.vercel.app`**.
5. Framework : **Next.js** (détecté automatiquement). **Deploy**.
6. Dans **Settings → Environment variables** (optionnel pour la DB) : laisser vide au début (PGlite en secours sur Vercel).

Quand le deploy est vert, ouvre l’URL `.vercel.app` : tu dois voir la landing **VintFlow** violette.

Ensuite : envoie l’URL à l’agent pour l’enregistrer dans `FREE_INDEXABLE_URL`.