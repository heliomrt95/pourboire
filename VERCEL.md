# Déployer sur Vercel

## 1. Pousser le code sur GitHub

Le dépôt doit être à jour sur GitHub (ex. `heliomrt95/pourboire`).

## 2. Créer le projet sur Vercel

1. Va sur [vercel.com](https://vercel.com) et connecte-toi (avec GitHub).
2. **Add New** → **Project**.
3. Importe le repo **pourboire** (autorise Vercel si besoin).
4. **Framework Preset** : Next.js (détecté automatiquement).
5. Ne déploie pas tout de suite : on ajoute les variables d’environnement avant.

## 3. Variables d’environnement (Vercel)

Dans le projet Vercel : **Settings** → **Environment Variables**. Ajoute :

| Name | Value | Environnement |
|------|--------|----------------|
| `DATABASE_URL` | Ton URL Neon (celle de prod ou la même que en dev) | Production, Preview |
| `STRIPE_SECRET_KEY` | `sk_test_...` ou `sk_live_...` | Production, Preview |
| `STRIPE_WEBHOOK_SECRET` | Voir étape 4 ci‑dessous | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | `https://ton-projet.vercel.app` (remplace par l’URL réelle après 1er déploiement) | Production, Preview |

Optionnel : `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test_... ou pk_live_...).

## 4. Webhook Stripe pour la prod

Le secret du webhook **en prod** ne vient pas de `stripe listen`, mais du Dashboard Stripe :

1. [Dashboard Stripe](https://dashboard.stripe.com) → **Développeurs** → **Webhooks**.
2. **Ajouter un endpoint**.
3. **URL** : `https://ton-projet.vercel.app/api/webhook` (ton URL Vercel réelle).
4. **Événements** : coche `checkout.session.completed`.
5. Crée l’endpoint, puis clique dessus et **Révéler** le **Signing secret** (`whsec_...`).
6. Copie ce `whsec_...` dans la variable **STRIPE_WEBHOOK_SECRET** sur Vercel.

Tu peux faire cette étape après le premier déploiement (une fois que tu connais l’URL Vercel).

## 5. Base de données

- Utilise la **même** base Neon (ou une dédiée prod). Colle son URL dans `DATABASE_URL` sur Vercel.
- Les tables doivent exister : depuis ta machine, avec la même `DATABASE_URL`, lance une fois :
  ```bash
  npm run db:push
  ```
  Ou crée un projet Neon dédié prod et fais `db:push` avec cette URL.

## 6. Déployer

- **Deploy** sur Vercel. Le build exécute `prisma generate` puis `next build`.
- Après le déploiement, mets à jour **NEXT_PUBLIC_APP_URL** avec l’URL réelle (ex. `https://pourboire-xxx.vercel.app`) et refais un **Redeploy** si tu veux que les liens Stripe (success/cancel) pointent au bon domaine.

## 7. Vérifier

- Ouvre l’URL Vercel, clique sur un montant, paie avec une carte test : tu dois être redirigé vers Stripe puis vers `/success`, et l’événement doit apparaître dans **Stripe** → Webhooks (et le paiement en base si le webhook est bien configuré).
