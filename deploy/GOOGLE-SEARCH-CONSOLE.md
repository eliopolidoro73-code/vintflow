# Google — référencement (Search Console)

Site prêt : **https://vintflow-vint4.vercel.app/**

## Déjà en place sur le site

- `sitemap.xml` → URLs `vintflow-vint4.vercel.app` uniquement
- `robots.txt` → indexation autorisée (sauf `/app`, `/api`)
- Balise **meta** `google-site-verification` (secret `GOOGLE_SITE_VERIFICATION` si défini)
- Fichier : https://vintflow-vint4.vercel.app/google69a22bc60fd55e06.html

## Dans Search Console (compte Google)

1. [Ouvrir Search Console](https://search.google.com/search-console)
2. **Ajouter une propriété** → préfixe d’URL : `https://vintflow-vint4.vercel.app/`
3. **Vérifier** : méthode **Balise HTML** (déjà dans la page) ou **Fichier HTML**
4. **Sitemaps** → envoyer : `sitemap.xml` (pas l’URL complète, juste `sitemap.xml`)
5. Si **« 5 erreurs »** (ancien sitemap `grok.bot`) : clique la ligne → **Supprimer le sitemap**, puis renvoie `sitemap.xml`. Attends **24–48 h** que l’état passe au vert.
6. **Inspection d’URL** → **Tester l’URL en direct** → **Demander l’indexation**  
   Limite Google : **quota quotidien** (~10–15 demandes/jour) → message *Quota dépassé* = **réessayer demain** (pas un bug du site).

L’indexation peut prendre **plusieurs jours** ; Google décide seul.

## Ping automatique (découverte, pas obligatoire)

```text
https://www.google.com/ping?sitemap=https://vintflow-vint4.vercel.app/sitemap.xml
```