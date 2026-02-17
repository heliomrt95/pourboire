import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/crypto-webhook
 * Webhook Coinbase Commerce : vérification de la signature puis traitement des événements.
 * Header : X-CC-Webhook-Signature (HMAC-SHA256 du body avec COINBASE_WEBHOOK_SECRET).
 * Si event.type === "charge:confirmed" → log "Crypto payment confirmed".
 */
export async function POST(request: NextRequest) {
  const secret = process.env.COINBASE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[crypto-webhook] COINBASE_WEBHOOK_SECRET manquant');
    return NextResponse.json(
      { error: 'Webhook non configuré' },
      { status: 500 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Body invalide' }, { status: 400 });
  }

  const signature = request.headers.get('X-CC-Webhook-Signature') ?? request.headers.get('x-cc-webhook-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const sigBuf = Buffer.from(signature.trim(), 'hex');
  if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
    console.error('[crypto-webhook] Signature invalide');
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  let event: { type?: string; [k: string]: unknown };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  if (event?.type === 'charge:confirmed') {
    console.log('Crypto payment confirmed');
  }

  return NextResponse.json({ received: true });
}
