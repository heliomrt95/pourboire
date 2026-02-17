import { NextRequest, NextResponse } from 'next/server';

const COINBASE_COMMERCE_API = 'https://api.commerce.coinbase.com';

/**
 * POST /api/create-crypto-charge
 * Flow ScanTip : crée une charge Coinbase Commerce (montant en EUR), retourne hosted_url.
 * Body : { amountEur: number, currency: 'BTC' | 'ETH' | 'USDC' } (currency = préférence affichée)
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
  if (!apiKey) {
    console.error('[create-crypto-charge] COINBASE_COMMERCE_API_KEY manquant');
    return NextResponse.json(
      { error: 'Crypto non configuré.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const amountEur = typeof body?.amountEur === 'number' ? body.amountEur : null;
    const currency = body?.currency; // BTC | ETH | USDC (préférence / description)

    if (amountEur == null || amountEur <= 0) {
      return NextResponse.json(
        { error: 'Montant invalide.' },
        { status: 400 }
      );
    }

    const amountStr = amountEur.toFixed(2);

    const res = await fetch(`${COINBASE_COMMERCE_API}/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': apiKey,
      },
      body: JSON.stringify({
        name: 'Pourboire ScanTip',
        description: `Pourboire ${amountStr} €${currency ? ` (${currency})` : ''}`,
        pricing_type: 'fixed_price',
        local_price: {
          amount: amountStr,
          currency: 'EUR',
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[create-crypto-charge] Coinbase error', data);
      return NextResponse.json(
        { error: data?.error?.message ?? 'Erreur Coinbase Commerce.' },
        { status: res.status >= 400 && res.status < 500 ? res.status : 500 }
      );
    }

    const hostedUrl = data?.data?.hosted_url ?? data?.hosted_url;
    if (!hostedUrl) {
      return NextResponse.json(
        { error: 'URL de paiement Coinbase manquante.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ hosted_url: hostedUrl });
  } catch (err) {
    console.error('[create-crypto-charge]', err);
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' ? message : 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
