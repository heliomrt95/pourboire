/**
 * Client Stripe côté serveur (API Routes uniquement).
 *
 * Pourquoi un singleton (lazy) ?
 * - Évite de recréer une instance à chaque requête.
 * - Stripe recommande de réutiliser le même client.
 * - L'instance n'est créée qu'au premier appel de getStripe(), ce qui permet
 *   au build Next.js de réussir sans .env (aucune clé au moment du build).
 *
 * Sécurité : STRIPE_SECRET_KEY ne doit jamais être exposée au client.
 * Elle est utilisée uniquement dans les Route Handlers (côté serveur).
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Retourne le client Stripe (créé à la demande).
 * Lance une erreur si STRIPE_SECRET_KEY est absente.
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY est manquante dans les variables d\'environnement.');
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
  return stripeInstance;
}
