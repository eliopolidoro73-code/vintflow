# URL gratuite pour Google (sans acheter de domaine)

1. Ouvre **une seule fois** (compte Vercel gratuit, 30 s) :  
   https://vercel.com/claim-deployment?code=dc22c570-c27f-40a8-aac1-1b162a2cae18  
   → URL **gratuite** permanente `*.vercel.app` (indexable Google).

   En attendant : **https://turbo-sitar-4pw2aia.tmp.now** (temporaire ~1 h).

2. Ou déploie depuis le dossier du projet (après `vercel login`) :  
   `npx vercel --prod --yes --name vintflow-saas`

3. (Optionnel) **Cursor → Secrets** : `APP_URL` = ta URL Vercel (pas `vintflow.io` si tu n’as pas acheté le domaine).

4. **Search Console** : propriété = cette URL → sitemap = `sitemap.xml`

Les URLs `*.apps.grok.bot` restent en **noindex** : utilise **Vercel** comme site public.