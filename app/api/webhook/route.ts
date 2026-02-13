import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';

/**
 * POST /api/webhook
 *
 * Endpoint appelé par Stripe lorsqu'un événement se produit (paiement réussi, etc.).
 * On n'utilise pas request.json() pour garder le body brut et vérifier la signature.
 *
 * Sécurité :
 * - Vérification obligatoire de la signature avec STRIPE_WEBHOOK_SECRET.
 * - Sans ça, quelqu'un pourrait envoyer de faux événements à notre API.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET manquant');
    return NextResponse.json(
      { error: 'Webhook non configuré' },
      { status: 500 }
    );
  }

  // On lit le body en texte brut (obligatoire pour vérifier la signature Stripe)
  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: 'Body invalide' }, { status: 400 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature invalide';
    console.error('[webhook] Signature invalide:', message);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Idempotence : éviter d'enregistrer deux fois la même session
    const existing = await prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
    });
    if (existing) {
      return NextResponse.json({ received: true });
    }

    const amountCents = session.amount_total ?? 0;
    const currency = (session.currency ?? 'eur').toLowerCase();
    const customerEmail = session.customer_email ?? session.customer_details?.email ?? null;
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    await prisma.payment.create({
      data: {
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        amountCents,
        currency,
        status: 'completed',
        customerEmail,
      },
    });
  }

  return NextResponse.json({ received: true });
}
