# Pourboire — Mini système de paiement avec Stripe

Application Next.js 14 (App Router) + TypeScript + Stripe Checkout + Webhooks + PostgreSQL pour accepter des pourboires.

---

## Résumé des fichiers

| Fichier | Rôle |
|--------|------|
| `app/page.tsx` | Page d'accueil : boutons 1€, 2€, 5€, 10€ + montant personnalisé. Appelle `POST /api/create-checkout` avec le montant en centimes. |
| `app/success/page.tsx` | Page après paiement réussi (redirection Stripe). |
| `app/cancel/page.tsx` | Page si l'utilisateur annule sur Stripe. |
| `app/api/create-checkout/route.ts` | Crée une Stripe Checkout Session et renvoie l'URL de redirection. Valide le montant (min/max). |
| `app/api/webhook/route.ts` | Reçoit les événements Stripe, vérifie la signature, et sur `checkout.session.completed` enregistre le paiement en base (idempotence). |
| `lib/stripe.ts` | Client Stripe singleton (clé secrète, serveur uniquement). |
| `lib/db.ts` | Client Prisma pour PostgreSQL (singleton en dev). |
| `lib/constants.ts` | Montants prédéfinis, min/max, devise. |
| `prisma/schema.prisma` | Modèle `Payment` (session Stripe, montant, email, etc.). |
| `.env.example` | Template des variables d'environnement avec explications. |

---

## Prérequis

- Node.js 18+
- Compte [Stripe](https://dashboard.stripe.com) (mode test pour commencer)
- PostgreSQL (local ou hébergé : Neon, Supabase, etc.)

---

## Installation

```bash
# Cloner / aller dans le projet
cd pourboire

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env.local

# Éditer .env.local et remplir (voir section suivante)
```

---

## Variables d'environnement

Remplir `.env.local` (voir `.env.example` pour les détails) :

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL de connexion PostgreSQL (`postgresql://user:pass@host:5432/dbname`) |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (Dashboard → Développeurs → Clés API), ex. `sk_test_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publique (optionnel ici car on utilise Checkout redirect), ex. `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret du webhook (voir section Webhook ci-dessous), ex. `whsec_...` |
| `NEXT_PUBLIC_APP_URL` | URL de l'app (ex. `http://localhost:3000` en dev, `https://votredomaine.com` en prod) |

---

## Base de données

```bash
# Générer le client Prisma
npm run db:generate

# Créer les tables (sans migration versionnée)
npm run db:push

# Ou utiliser les migrations
npm run db:migrate
```

Optionnel : `npm run db:studio` pour ouvrir l’interface Prisma Studio.

---

## Tester en mode Stripe Sandbox (développement)

1. **Stripe en mode Test**  
   Dans le Dashboard Stripe, laisse le mode « Test » activé (toggle en haut à droite). Toutes les clés doivent être en `sk_test_...` et `pk_test_...`.

2. **Créer un webhook local**  
   Stripe doit pouvoir appeler ton API. En local, utilise le Stripe CLI :
   ```bash
   # Installer Stripe CLI : https://stripe.com/docs/stripe-cli
   stripe login
   stripe listen --forward-to localhost:3000/api/webhook
   ```
   Le CLI affiche un **Signing secret** du type `whsec_...`. Mets-le dans `STRIPE_WEBHOOK_SECRET` dans `.env.local`.

3. **Démarrer l’app**
   ```bash
   npm run dev
   ```
   Ouvre `http://localhost:3000`, clique sur un montant (ex. 1€). Tu seras redirigé vers Stripe Checkout.

4. **Carte de test**  
   Sur la page de paiement Stripe, utilise par exemple :
   - Numéro : `4242 4242 4242 4242`
   - Date : n’importe quelle date future
   - CVC : n’importe quel 3 chiffres

5. **Vérifier**  
   Après paiement : redirection vers `/success`. Dans la base, une ligne doit être créée dans la table `Payment` (via le webhook). Tu peux vérifier avec `npm run db:studio` ou en consultant les logs du `stripe listen`.

---

## Passer en production

1. **Stripe en mode Live**  
   - Passe le Dashboard en mode « Live ».  
   - Utilise les clés **live** : `sk_live_...` et `pk_live_...` dans les variables d’environnement de production.

2. **Webhook en production**  
   - Dashboard Stripe → Développeurs → Webhooks → Ajouter un endpoint.  
   - URL : `https://votredomaine.com/api/webhook`.  
   - Événement à écouter : `checkout.session.completed`.  
   - Récupère le **Signing secret** de cet endpoint et configure `STRIPE_WEBHOOK_SECRET` en production (pas le secret du `stripe listen`).

3. **Base de données**  
   - Utilise une base PostgreSQL de production (Neon, Supabase, etc.).  
   - `DATABASE_URL` doit pointer vers cette base.  
   - Exécuter `npm run db:push` ou `npm run db:migrate` sur la base de prod.

4. **URL de l’app**  
   - `NEXT_PUBLIC_APP_URL` doit être l’URL réelle (ex. `https://votredomaine.com`) pour que les liens success/cancel de la Checkout Session soient corrects.

5. **Sécurité**  
   - Ne jamais commiter `.env` ou `.env.local`.  
   - En production : HTTPS obligatoire, limiter les CORS si besoin, garder les clés secrètes côté serveur uniquement.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Démarrer le serveur après build |
| `npm run db:generate` | Génère le client Prisma |
| `npm run db:push` | Pousse le schéma vers la DB (sans migration) |
| `npm run db:migrate` | Crée et applique une migration |
| `npm run db:studio` | Ouvre Prisma Studio |

---

## Flux résumé

1. Utilisateur choisit un montant (bouton ou personnalisé) → `POST /api/create-checkout` avec `{ amountCents }`.
2. L’API crée une Checkout Session Stripe et renvoie `{ url }`.
3. Le front redirige vers Stripe ; l’utilisateur paie (ou annule).
4. Stripe envoie un événement `checkout.session.completed` à `POST /api/webhook`.
5. Le webhook vérifie la signature, puis enregistre le paiement en base (idempotence via `stripeSessionId`).
6. L’utilisateur est redirigé vers `/success` ou `/cancel`.

---

## Licence

MIT.
