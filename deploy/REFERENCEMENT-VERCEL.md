# Référencement Google — `https://vintflow-vint4.vercel.app`

## État du code (déjà sur Origin)

- Sitemap / robots : URLs **uniquement** `vintflow-vint4.vercel.app`
- Sur Vercel, `getPublicSiteUrl()` force cette URL (même si `APP_URL` = `vintflow.io`)
- Page guide : `/guide-revente-vinted` + JSON-LD, métadonnées marque **VintFlow**
- Fichier Search Console : `/google69a22bc60fd55e06.html`

## Débloquer le site en prod (obligatoire une fois)

Le build Vercel actuel date d’**avant** ces changements. Il faut **un `git push`** vers  
`https://github.com/eliopolidoro73-code/vintflow` (dépôt vide aujourd’hui).

Depuis Cursor sur ton PC :

```bash
git pull origin main
git push -u https://github.com/eliopolidoro73-code/vintflow.git main
```

Attendre **Vercel → Ready**, puis :

```bash
node scripts/check-seo-headers.mjs https://vintflow-vint4.vercel.app
```

Le sitemap doit lister `vintflow-vint4.vercel.app` uniquement.

## Google Search Console

1. Propriété : **https://vintflow-vint4.vercel.app/**
2. Validation : métadonnée `google-site-verification` (secret `GOOGLE_SITE_VERIFICATION` sur l’app) **ou** fichier HTML ci-dessus
3. Sitemaps → **`sitemap.xml`**
4. Inspection d’URL → `/` → **Demander l’indexation**
5. Idem pour `/guide-revente-vinted`

Indexation : souvent **quelques jours**, pas instantané.