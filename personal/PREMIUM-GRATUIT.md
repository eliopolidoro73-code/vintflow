# Vérification — tout Pro Scale gratuit (perso)

## Ce qui est garanti dans le code

| Élément | Comportement |
|--------|----------------|
| `personal_free` | Compte perso obligatoire pour se connecter |
| `getEffectivePlan()` | = **Pro Scale** avec limites 100k articles, crosslist ∞, crédits IA ∞ |
| `BackOffice` | `PLANS.pro` + outils IA en `planId="pro"` |
| API | **Pas de** `402` Stripe ni essai expiré |
| Assistant Nova | Débloqué si `isPersoUnlimited` |
| Connexion | **E-mail + mot de passe** (`/app`) — **pas Cursor obligatoire** |

## Téléphone (sans Cursor)

1. Publie `personal/` en visibilité **Public**.
2. Secrets : `PERSO_ALLOWED_EMAILS`, `PERSO_PASSWORD`, `SESSION_SECRET`.
3. Sur le téléphone : Safari/Chrome → URL de l’app → `/app` → connexion.
4. `viewport` mobile OK dans `layout.tsx`.

## Tester après login

- Dressing, crosslist, outils IA, ventes/factures, messagerie, Nova, export CSV.