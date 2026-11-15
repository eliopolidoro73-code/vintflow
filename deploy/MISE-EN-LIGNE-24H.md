# VintFlow en ligne 24/7 + Google

## Pourquoi le sitemap affiche encore grok.bot ?

Vercel déploie depuis **GitHub** (`charles-oliveira/vintflow`).  
Le code à jour est sur **Cursor/Origin**. Tant que GitHub n’est pas synchronisé, Vercel ne reçoit pas le nouveau sitemap.

## À faire une fois (10 min) — sync GitHub → Vercel

### Option A — Importer Origin dans GitHub (recommandé)

1. Va sur [github.com/new/import](https://github.com/new/import)
2. **Clone URL** : `https://origin.cursor.com/charles-oliveira/vintflow.git`
3. Nom du dépôt : `vintflow` (remplace l’ancien si besoin)
4. **Begin import** (connecte-toi à Origin si demandé)
5. Sur **Vercel** → projet `vintflow` → **Deployments** → un nouveau build démarre tout seul
6. Quand c’est **Ready**, ouvre : `https://vintflow-vint4.vercel.app/sitemap.xml`  
   → tu dois voir uniquement `vintflow-vint4.vercel.app`

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