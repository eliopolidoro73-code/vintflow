# VintFlow — Back-Office Multi-Plateformes pour Revendeurs

VintFlow est une plateforme SaaS tout-en-un conçue pour les vendeurs et acheteurs-revendeurs sur **Vinted, Leboncoin, TikTok Shop, eBay et Whatnot**.

## Fonctionnalités incluses

- **Landing page SaaS & Tarifs** : présentation complète, aperçu interactif du crosslisting et de l'assistant IA, grille tarifaire **Starter (29 €/mois)** et **Pro (49 €/mois)** avec facturation Mensuelle / Annuelle (-2 mois offerts) et **essai gratuit 14 jours**.
- **Vue d'ensemble & Marge réelle / URSSAF** : suivi du chiffre d'affaires, calcul automatique de la marge nette après coût d'achat, frais, boosts et cotisations URSSAF, jauge de seuil TVA.
- **Dressing, Stock SKU & Crosslisting Vinted ↔ Leboncoin** : studio d'annonce avec génération SEO Vinted/Leboncoin, crosslisting en 1 clic, interrupteur *Publier tout seul (8h–23h)*, retrait automatique quand un article est vendu, détection des articles dormants (+14 jours).
- **Ventes, Bordereaux 10×15 & Factures PDF** : génération de factures numérotées conformes France/Belgique (micro-entreprise ou TVA sur marge), étiquettes thermiques 10×15 (4×6) avec SKU, export CSV/Excel du livre des recettes.
- **Messagerie unifiée multi-comptes** : centralisation des messages acheteurs avec réponses rapides en 1 clic.
- **Assistant IA Nova** : connecté aux chiffres réels en base de données, avec cartes de modification *Avant / Après* applicables en un clic.

## Lancer en local (0 €)

Le projet fonctionne sans configuration externe grâce à `@electric-sql/pglite` (Postgres embarqué en développement) et au mode d'essai local sans clé Stripe ni clé OpenAI :

```bash
npm install
npm run dev
```

Puis ouvre l'application dans ton navigateur et clique sur **Tester la démo en 1 clic** ou crée ton compte.

## Variables d'environnement optionnelles (Production)

- `DATABASE_URL` : connexion PostgreSQL managée (appliquée via `scripts/migrate.mjs` au build).
- `SESSION_SECRET` : secret HMAC pour signer les cookies de session (auto-généré en base si absent).
- `STRIPE_SECRET_KEY` : active Stripe Checkout pour encaisser les abonnements Starter (29 €) et Pro (49 €).
- `OPENAI_API_KEY` : enrichit les réponses de l'assistant Nova (sinon le moteur analytique SQL local répond gratuitement).
