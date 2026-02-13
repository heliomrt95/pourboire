import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { CURRENCY, MIN_AMOUNT_CENTS, MAX_AMOUNT_CENTS } from '@/lib/constants';

/**
 * POST /api/create-checkout
 *
 * Crée une session Stripe Checkout pour un pourboire du montant donné.
 * Le client est redirigé vers Stripe pour payer, puis vers success_url ou cancel_url.
 *
 * Body attendu : { amountCents: number }
 * Réponse : { url: string } (URL de redirection Stripe) ou { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const body = await request.json();
    const amountCents = typeof body?.amountCents === 'number' ? body.amountCents : null;

    if (amountCents == null || amountCents < MIN_AMOUNT_CENTS || amountCents > MAX_AMOUNT_CENTS) {
      return NextResponse.json(
        {
          error: `Montant invalide. Doit être entre ${MIN_AMOUNT_CENTS / 100} et ${MAX_AMOUNT_CENTS / 100} € (en centimes : ${MIN_AMOUNT_CENTS}–${MAX_AMOUNT_CENTS}).`,
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: amountCents,
            product_data: {
              name: 'Pourboire',
              description: `Pourboire de ${(amountCents / 100).toFixed(2)} €`,
              images: [], // optionnel : URL d'une image
            },
          },
        },
      ],
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel`,
      // Permet de récupérer l'email du client dans le webhook si tu actives "Collect email" dans le Dashboard Stripe
      customer_email: undefined,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe n\'a pas renvoyé d\'URL de paiement.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout]', err);
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: isDev
          ? message
          : 'Erreur serveur lors de la création du paiement.',
      },
      { status: 500 }
    );
  }
}
