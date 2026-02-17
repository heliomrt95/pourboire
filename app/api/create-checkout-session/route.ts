import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { CURRENCY, MIN_AMOUNT_CENTS, MAX_AMOUNT_CENTS } from '@/lib/constants';

/**
 * POST /api/create-checkout-session
 * Flow ScanTip : crée une session Stripe Checkout (carte, Apple Pay, Google Pay selon dispo).
 * Body : { amountCents: number }
 * Réponse : { url: string }
 */
export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const body = await request.json();
    const amountCents = typeof body?.amountCents === 'number' ? body.amountCents : null;

    if (amountCents == null || amountCents < MIN_AMOUNT_CENTS || amountCents > MAX_AMOUNT_CENTS) {
      return NextResponse.json(
        {
          error: `Montant invalide. Entre ${MIN_AMOUNT_CENTS / 100} et ${MAX_AMOUNT_CENTS / 100} €.`,
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
              name: 'Pourboire ScanTip',
              description: `Pourboire de ${(amountCents / 100).toFixed(2)} €`,
              images: [],
            },
          },
        },
      ],
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/tip/pay?amount=${(amountCents / 100).toFixed(2)}`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe n\'a pas renvoyé d\'URL.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout-session]', err);
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { error: isDev ? message : 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
