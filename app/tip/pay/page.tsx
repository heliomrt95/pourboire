'use client';

/**
 * ScanTip — ÉTAPE 2 : Choix du moyen de paiement.
 * Montant lu depuis ?amount= (en euros). 4 blocs : Apple Pay, Google Pay, Carte, Crypto.
 * Crypto ouvre un modal (BTC / ETH / USDC) puis redirection Coinbase Commerce.
 */

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type FiatMethod = 'apple_pay' | 'google_pay' | 'card';
type CryptoChoice = 'BTC' | 'ETH' | 'USDC';

function PayContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<FiatMethod | 'crypto' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);
  const [cryptoLoading, setCryptoLoading] = useState<CryptoChoice | null>(null);

  const amountEur = useMemo(() => {
    const raw = searchParams.get('amount');
    if (raw === null) return null;
    const parsed = parseFloat(raw.trim().replace(',', '.'));
    if (Number.isNaN(parsed) || parsed <= 0) return null;
    return parsed;
  }, [searchParams]);

  const amountCents = useMemo(() => (amountEur != null ? Math.round(amountEur * 100) : null), [amountEur]);
  const amountFormatted = useMemo(
    () => (amountEur != null ? amountEur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null),
    [amountEur]
  );

  const apiBase = typeof window !== 'undefined' ? window.location.origin : '';

  const startStripe = useCallback(
    async (method: FiatMethod) => {
      if (amountCents == null) return;
      setError(null);
      setLoading(method);
      try {
        const res = await fetch(`${apiBase}/api/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountCents }),
        });
        const raw = await res.text();
        let data: { url?: string; error?: string } = {};
        try {
          data = raw.length ? JSON.parse(raw) : {};
        } catch {
          throw new Error(res.ok ? 'Réponse invalide' : 'Erreur serveur.');
        }
        if (!res.ok) throw new Error(data.error ?? 'Erreur');
        if (!data.url) throw new Error('URL manquante');
        window.location.href = data.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setLoading(null);
      }
    },
    [amountCents, apiBase]
  );

  const startCrypto = useCallback(
    async (currency: CryptoChoice) => {
      if (amountEur == null) return;
      setError(null);
      setCryptoLoading(currency);
      try {
        const res = await fetch(`${apiBase}/api/create-crypto-charge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountEur, currency }),
        });
        const raw = await res.text();
        let data: { hosted_url?: string; error?: string } = {};
        try {
          data = raw.length ? JSON.parse(raw) : {};
        } catch {
          throw new Error(res.ok ? 'Réponse invalide' : 'Erreur serveur.');
        }
        if (!res.ok) throw new Error(data.error ?? 'Erreur');
        if (!data.hosted_url) throw new Error('URL Coinbase manquante');
        window.location.href = data.hosted_url;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setCryptoLoading(null);
      }
    },
    [amountEur, apiBase]
  );

  if (amountEur === null || amountFormatted === null) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-zinc-100">
        <p className="text-zinc-400">Montant invalide ou manquant.</p>
        <Link href="/tip" className="mt-4 text-sm text-emerald-400 hover:text-emerald-300">
          Choisir un montant
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center py-8 px-4 bg-zinc-950 text-zinc-100">
      <Link href="/tip" className="self-start mb-4 text-sm text-zinc-500 hover:text-zinc-300">
        ← Modifier le montant
      </Link>

      <header className="text-center mb-8 w-full max-w-md">
        <div className="flex justify-center mb-4">
          <Image
            src="/scantips_logo.png"
            alt="ScanTips"
            width={220}
            height={60}
            className="h-10 w-auto sm:h-12 invert"
            priority
          />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          Vous laissez un pourboire de {amountFormatted} €
        </h1>
        <p className="mt-2 text-zinc-400 text-sm">Choisissez votre moyen de paiement</p>
      </header>

      <div className="w-full max-w-md space-y-3">
        <button
          type="button"
          onClick={() => startStripe('apple_pay')}
          disabled={!!loading}
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/80 p-5 text-left transition hover:border-zinc-500 hover:bg-zinc-900 disabled:opacity-50 flex items-center gap-4"
        >
          <span className="text-2xl" aria-hidden>🍎</span>
          <div className="flex-1">
            <span className="font-semibold text-white">Apple Pay</span>
            <p className="text-sm text-zinc-400">Paiement rapide sur iPhone / Mac</p>
          </div>
          {loading === 'apple_pay' ? <span className="text-zinc-400">…</span> : <span className="text-zinc-500">→</span>}
        </button>

        <button
          type="button"
          onClick={() => startStripe('google_pay')}
          disabled={!!loading}
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/80 p-5 text-left transition hover:border-zinc-500 hover:bg-zinc-900 disabled:opacity-50 flex items-center gap-4"
        >
          <span className="text-2xl" aria-hidden>G</span>
          <div className="flex-1">
            <span className="font-semibold text-white">Google Pay</span>
            <p className="text-sm text-zinc-400">Paiement rapide sur Android / Chrome</p>
          </div>
          {loading === 'google_pay' ? <span className="text-zinc-400">…</span> : <span className="text-zinc-500">→</span>}
        </button>

        <button
          type="button"
          onClick={() => startStripe('card')}
          disabled={!!loading}
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/80 p-5 text-left transition hover:border-zinc-500 hover:bg-zinc-900 disabled:opacity-50 flex items-center gap-4"
        >
          <span className="text-2xl" aria-hidden>💳</span>
          <div className="flex-1">
            <span className="font-semibold text-white">Carte bancaire</span>
            <p className="text-sm text-zinc-400">Visa, Mastercard, etc.</p>
          </div>
          {loading === 'card' ? <span className="text-zinc-400">…</span> : <span className="text-zinc-500">→</span>}
        </button>

        <button
          type="button"
          onClick={() => setCryptoModalOpen(true)}
          disabled={!!loading}
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/80 p-5 text-left transition hover:border-zinc-500 hover:bg-zinc-900 disabled:opacity-50 flex items-center gap-4"
        >
          <span className="text-2xl" aria-hidden>₿</span>
          <div className="flex-1">
            <span className="font-semibold text-white">Crypto</span>
            <p className="text-sm text-zinc-400">Bitcoin, Ethereum, USDC</p>
          </div>
          <span className="text-zinc-500">→</span>
        </button>
      </div>

      {error && (
        <p className="mt-6 w-full max-w-md rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Modal crypto : choix BTC / ETH / USDC */}
      {cryptoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby="crypto-modal-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <h2 id="crypto-modal-title" className="text-lg font-semibold text-white mb-4">
              Choisir la crypto
            </h2>
            <div className="space-y-2">
              {(['BTC', 'ETH', 'USDC'] as const).map((currency) => (
                <button
                  key={currency}
                  type="button"
                  onClick={() => startCrypto(currency)}
                  disabled={!!cryptoLoading}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-3 font-medium text-white hover:bg-zinc-700 disabled:opacity-50 flex items-center justify-between px-4"
                >
                  <span>
                    {currency === 'BTC' && 'Bitcoin (BTC)'}
                    {currency === 'ETH' && 'Ethereum (ETH)'}
                    {currency === 'USDC' && 'Stablecoins (USDC)'}
                  </span>
                  {cryptoLoading === currency ? <span className="text-zinc-400">…</span> : <span>→</span>}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCryptoModalOpen(false)}
              className="mt-4 w-full rounded-xl py-2 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Retour à l&apos;accueil</Link>
      </p>
    </main>
  );
}

export default function TipPayPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-zinc-950">
          <p className="text-zinc-500">Chargement…</p>
        </main>
      }
    >
      <PayContent />
    </Suspense>
  );
}
