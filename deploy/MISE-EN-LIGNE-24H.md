# VintFlow en ligne 24/7 + Google

## Pourquoi le sitemap affiche encore grok.bot ?

Vercel déploie depuis **GitHub** (`eliopolidoro73-code/vintflow`).  
Le code à jour est sur **Cursor/Origin**. Tant que GitHub est **vide**, Vercel garde l’**ancien** build (sitemap `*.apps.grok.bot`).

## À faire une fois (10 min) — sync GitHub → Vercel

### Option A — `git push` depuis Cursor (la seule qui marche)

GitHub **Import** échoue en général avec Origin privé (`could not read Username for origin.cursor.com`).  
Il faut **pousser** le code depuis Cursor sur **ton PC** (GitHub déjà connecté) :

```bash
git pull origin main
git remote remove github 2>/dev/null
git remote add github https://github.com/eliopolidoro73-code/vintflow.git
git push -u github main
```

Dépôt cible : **`vintflow`** (pas `vintflow-`). Tu peux supprimer [vintflow-](https://github.com/eliopolidoro73-code/vintflow-) sur GitHub si tu l’as créé par erreur.

Puis sur **Vercel** → **Deployments** → attendre **Ready** → vérifier `https://vintflow-vint4.vercel.app/sitemap.xml`.

### Option B — Redeploy manuel (si GitHub est déjà à jour)

1. Vercel → **Deployments** → **⋯** → **Redeploy**
2. Décoche **Use existing Build Cache**

## Google Search Console

- Propriété : `https://vintflow-vint4.vercel.app/`
- Sitemap : `sitemap.xml`
- Inspection d’URL → accueil → **Demander l’indexation**

**24/7** : Vercel garde le site en ligne en permanence (plan Hobby).  
**« Trouvable sur Google »** : après indexation (souvent quelques jours), pas instantané.

## Liens officiels

| Usage | URL |
|--------|-----|
| Site public + SEO | https://vintflow-vint4.vercel.app |
| App + comptes | https://https-vintflow-io.apps.grok.bot |