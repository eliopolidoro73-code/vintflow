# vintflow.io devant l’app Cursor (indexation Google)

Les URLs `*.apps.grok.bot` envoient `X-Robots-Tag: noindex`. Ce worker affiche le site sur **vintflow.io** sans ce blocage.

## Prérequis

- Compte [Cloudflare](https://dash.cloudflare.com) gratuit
- Domaine **vintflow.io** ajouté à Cloudflare (nameservers chez le registrar)

## Déploiement (10 min)

```bash
cd deploy/cloudflare-worker
npm install
npx wrangler login
npm run deploy
```

Ensuite : **Workers & Pages** → ton worker → **Triggers** : routes `vintflow.io/*` et `www.vintflow.io/*`.

## Vérifier

```bash
node ../../scripts/check-seo-headers.mjs https://vintflow.io
```

Puis Search Console : propriété `https://vintflow.io/`, sitemap `sitemap.xml`.