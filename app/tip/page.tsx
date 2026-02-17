'use client';

/**
 * ScanTip — ÉTAPE 1 : Sélection du montant uniquement.
 * Aucun moyen de paiement affiché. Redirection vers /tip/pay?amount=XX (XX en euros).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PRESET_AMOUNTS_CENTS, MIN_AMOUNT_CENTS, MAX_AMOUNT_CENTS } from '@/lib/constants';

export default function TipPage() {
  const router = useRouter();
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const goToPay = (amountEur: number) => {
    setError(null);
    const url = `/tip/pay?amount=${encodeURIComponent(String(amountEur))}`;
    router.push(url);
  };

  const handlePreset = (cents: number) => {
    goToPay(cents / 100);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = customAmount.trim().replace(',', '.');
    const euros = parseFloat(value);
    if (Number.isNaN(euros) || euros <= 0) {
      setError('Veuillez entrer un montant valide.');
      return;
    }
    const cents = Math.round(euros * 100);
    if (cents < MIN_AMOUNT_CENTS) {
      setError(`Montant minimum : ${MIN_AMOUNT_CENTS / 100} €`);
      return;
    }
    if (cents > MAX_AMOUNT_CENTS) {
      setError(`Montant maximum : ${MAX_AMOUNT_CENTS / 100} €`);
      return;
    }
    goToPay(cents / 100);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md space-y-8">
        <header className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">ScanTip</h1>
          <p className="mt-2 text-zinc-400 text-sm sm:text-base">
            Choisissez le montant de votre pourboire
          </p>
        </header>

        {/* Montants fixes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESET_AMOUNTS_CENTS.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => handlePreset(cents)}
              className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-lg font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              {cents / 100} €
            </button>
          ))}
        </div>

        {/* Autre montant */}
        <form onSubmit={handleCustomSubmit} className="space-y-2">
          <label htmlFor="custom-amount" className="block text-sm text-zinc-400">
            Autre montant (€)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="custom-amount"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 3,50"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <button
              type="submit"
              className="rounded-2xl bg-white px-4 py-3 font-semibold text-zinc-900 hover:bg-zinc-200 transition"
            >
              Continuer
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Min. {MIN_AMOUNT_CENTS / 100} € — max. {MAX_AMOUNT_CENTS / 100} €
          </p>
        </form>

        {error && (
          <p className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <p className="text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  );
}
