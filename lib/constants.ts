/**
 * Constantes partagées (montants en centimes, devise, etc.).
 * Les montants Stripe sont toujours en centimes pour éviter les erreurs de virgule flottante.
 */

export const CURRENCY = 'eur' as const;

/** Montants prédéfinis en centimes (1€ = 100 centimes) */
export const PRESET_AMOUNTS_CENTS = [100, 200, 500, 1000] as const;

/** Montant minimum accepté (en centimes), ex: 50 = 0,50€ */
export const MIN_AMOUNT_CENTS = 50;

/** Montant maximum (sécurité), ex: 100000 = 1000€ */
export const MAX_AMOUNT_CENTS = 100_000;
