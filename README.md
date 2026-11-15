# Vintflow — Back-Office Multi-Plateformes pour Revendeurs

Vintflow est une plateforme SaaS tout-en-un conçue pour les vendeurs et acheteurs-revendeurs sur **Vinted, Leboncoin, TikTok Shop, eBay et Whatnot**.

## Fonctionnalités incluses

- **Landing page SaaS & Tarifs** : présentation complète, aperçu interactif du crosslisting et de l'assistant IA, grille tarifaire **Essentiel (9 €/mois)**, **Vendeur Plus (29 €/mois)** et **Pro Scale (49 €/mois)** avec facturation Mensuelle / Annuelle (-2 mois offerts) et **essai gratuit 14 jours**.
- **Vue d'ensemble, Trésorerie & Marge commerciale** : suivi du chiffre d'affaires, calcul automatique de la marge commerciale après coût de revient, frais et boosts, suivi des lots/ballots, dépenses d'activité et jauge de seuil TVA.
- **Dressing, Stock SKU & Crosslisting Vinted ↔ Leboncoin** : studio d'annonce avec génération SEO Vinted/Leboncoin, Crosslist Express en 1 clic, interrupteur *Publier tout seul (8h–23h)*, retrait automatique quand un article est vendu, détection des articles dormants (+14 jours).
- **Ventes, Bordereaux 10×15 & Factures PDF** : génération de factures numérotées conformes France/Belgique, étiquettes thermiques 10×15 (4×6) avec SKU, export CSV/Excel du livre des recettes.
- **Messagerie unifiée multi-comptes** : centralisation des messages acheteurs avec réponses rapides en 1 clic.
- **Assistant IA Nova** : connecté aux chiffres réels en base de données, avec cartes de modification *Avant / Après* applicables en un clic.

## Lancer en local

Le projet fonctionne sans configuration externe grâce à `@electric-sql/pglite` (Postgres embarqué en développement) :

```bash
npm install
npm run dev
```

Sans `STRIPE_SECRET_KEY`, seul l'**essai Essentiel 14 jours** est disponible : toutes les API cockpit renvoient **402** une fois l'essai terminé. Les formules **Vendeur Plus** et **Pro Scale** ne s'activent qu'après paiement Stripe vérifié (`/api/billing/verify`).

**Référencement** : `sitemap.xml`, `robots.txt`, page guide `/guide-revente-vinted` et données structurées Schema.org sur la home. L’indexation Google nécessite le domaine **`https://vintflow.io`** branché sur l’app (les URLs `*.apps.grok.bot` renvoient `X-Robots-Tag: noindex`). Vérifier : `node scripts/check-seo-headers.mjs https://vintflow.io`.

## Vintflow Perso (`personal/`)

Édition personnelle avec toutes les fonctionnalités **Pro Scale**, sans abonnement ni Cursor : connexion **email + mot de passe** classique. Optionnel : limite les inscriptions avec `PERSO_ALLOWED_EMAILS=ton@email.com` sur l'hébergement.

```bash
cd personal
npm install
npm run dev
```
