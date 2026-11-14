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

Sans `STRIPE_SECRET_KEY`, le choix d'un forfait lance un essai gratuit de 14 jours sans carte ; à la fin de l'essai, le compte repasse sur Essentiel tant qu'aucun abonnement Stripe n'est vérifié.

## Vintflow Perso (`personal/`)

Édition personnelle avec toutes les fonctionnalités Pro Scale, sans abonnement. À la première visite, tu crées ton email et ton mot de passe ; ensuite tu te connectes depuis n'importe quel navigateur (ordinateur ou téléphone).

```bash
cd personal
npm install
npm run dev
```
