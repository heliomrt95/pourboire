'use client';

/**
 * Page prototype "Paiement crypto" — UX uniquement, pas d’intégration blockchain.
 * Montant passé en query (?amount=500 en centimes), affichage en €, adresse fictive, QR, bouton → /success.
 */

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

// Adresse wallet fictive pour le prototype (format Ethereum)
const FAKE_WALLET_ADDRESS = '0xA1b2C3D4E5F6789012345678901234567890aBcD';

// Cours simulé EUR → ETH pour l’affichage (ex: 1 ETH = 3000 €)
const ETH_PRICE_EUR = 3000;

function CryptoContent() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  // Récupération du montant depuis l’URL (?amount=500 → centimes)
  const amountCents = useMemo(() => {
    const raw = searchParams.get('amount');
    if (raw === null) return null;
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < 0) return null;
    return parsed;
  }, [searchParams]);

  // Conversion centimes → euros pour l’affichage (ex: 500 → "5,00")
  const amountEurFormatted = useMemo(() => {
    if (amountCents === null) return null;
    const euros = amountCents / 100;
    return euros.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [amountCents]);

  // Estimation en ETH (simulation : montant_eur / 3000)
  const estimatedEth = useMemo(() => {
    if (amountCents === null) return null;
    const euros = amountCents / 100;
    return euros / ETH_PRICE_EUR;
  }, [amountCents]);

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(FAKE_WALLET_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback si clipboard non dispo
      setCopied(false);
    }
  }, []);

  // Pas de montant ou invalide → message court
  if (amountCents === null || amountEurFormatted === null) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950">
        <div className="text-center text-zinc-400">
          <p>Indiquez un montant dans l’URL.</p>
          <p className="mt-2 text-sm">Exemple : /crypto?amount=500 (pour 5,00 €)</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-zinc-800 px-4 py-2 text-zinc-200 hover:bg-zinc-700"
          >
            Retour à l’accueil
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-950 text-zinc-100">
      {/* En-tête */}
      <header className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Paiement en crypto
        </h1>
        <p className="mt-2 text-zinc-400 text-sm sm:text-base">
          Envoyez le montant à l&apos;adresse ci-dessous
        </p>
      </header>

      {/* Carte centrale */}
      <div className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-900/90 shadow-xl shadow-black/20 p-6 sm:p-8">
        {/* Montant en euros */}
        <div className="text-center mb-6">
          <p className="text-zinc-500 text-sm uppercase tracking-wider">Montant</p>
          <p className="text-3xl sm:text-4xl font-bold text-white mt-1">
            {amountEurFormatted} €
          </p>
        </div>

        {/* QR code : contient l’adresse wallet pour que les apps crypto puissent la lire */}
        <div className="flex justify-center mb-6 p-4 rounded-xl bg-white">
          <QRCodeSVG
            value={FAKE_WALLET_ADDRESS}
            size={180}
            level="M"
            includeMargin={false}
            className="w-[180px] h-[180px]"
          />
        </div>

        {/* Adresse + bouton copier */}
        <div className="mb-6">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">
            Adresse du wallet
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-zinc-800/80 px-4 py-3 border border-zinc-700/50">
            <code className="flex-1 truncate text-sm text-zinc-200 font-mono">
              {FAKE_WALLET_ADDRESS}
            </code>
            <button
              type="button"
              onClick={copyAddress}
              className="shrink-0 rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600 transition"
            >
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
        </div>

        {/* Réseau et montant en ETH (simulation) */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-zinc-800/50 px-4 py-3 border border-zinc-700/50 mb-8">
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Réseau</p>
            <p className="font-medium text-zinc-200">Ethereum</p>
          </div>
          <div className="text-right">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">
              Montant estimé (ETH)
            </p>
            <p className="font-mono font-medium text-emerald-400">
              {estimatedEth != null && estimatedEth < 0.001
                ? '< 0.001'
                : estimatedEth?.toFixed(5)}{' '}
              ETH
            </p>
          </div>
        </div>

        {/* Bouton "J'ai payé" → redirection vers /success sans backend */}
        <Link
          href="/success"
          className="block w-full rounded-xl bg-emerald-600 py-3.5 text-center font-semibold text-white hover:bg-emerald-500 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
        >
          J&apos;ai payé
        </Link>

        <p className="mt-4 text-center text-zinc-500 text-xs">
          Confirmation manuelle pour le moment
        </p>
      </div>

      <Link
        href="/"
        className="mt-6 text-sm text-zinc-500 hover:text-zinc-400 transition"
      >
        ← Retour à l&apos;accueil
      </Link>
    </main>
  );
}

export default function CryptoPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-zinc-950">
          <p className="text-zinc-500">Chargement…</p>
        </main>
      }
    >
      <CryptoContent />
    </Suspense>
  );
}
