'use client';

/**
 * Page d'accueil — Choix du montant du pourboire.
 *
 * Les montants sont envoyés en centimes à l'API pour éviter les problèmes
 * de virgule flottante (Stripe attend des entiers en centimes).
 */

import { useState } from 'react';
import { PRESET_AMOUNTS_CENTS, MIN_AMOUNT_CENTS, MAX_AMOUNT_CENTS } from '@/lib/constants';

export default function HomePage() {
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Toujours appeler l'API sur la même origine que la page (localhost, 127.0.0.1, ou le domaine en prod)
  const getApiUrl = () =>
    typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? '';

  const startCheckout = async (amountCents: number) => {
    setError(null);
    setLoading(String(amountCents));

    try {
      const res = await fetch(`${getApiUrl()}/api/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Erreur lors de la création du paiement');
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('Pas d\'URL de redirection reçue');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      const isNetworkError =
        msg.includes('fetch') ||
        msg.includes('Failed to fetch') ||
        msg.includes('Network') ||
        msg === 'Erreur inconnue';
      if (isNetworkError) {
        setError(
          'Impossible de joindre le serveur. Vérifiez que "npm run dev" tourne et que vous ouvrez la page sur la même adresse (ex: http://localhost:3000).'
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(null);
    }
  };

  const handlePreset = (cents: number) => {
    startCheckout(cents);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = customAmount.replace(',', '.');
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
    startCheckout(cents);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Pourboire</h1>
          <p className="mt-2 text-zinc-400">
            Choisissez un montant pour laisser un pourboire.
          </p>
        </div>

        {/* Boutons montants prédéfinis */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESET_AMOUNTS_CENTS.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => handlePreset(cents)}
              disabled={!!loading}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === String(cents) ? '…' : `${cents / 100} €`}
            </button>
          ))}
        </div>

        {/* Montant personnalisé */}
        <form onSubmit={handleCustomSubmit} className="flex flex-col gap-2">
          <label htmlFor="custom" className="text-sm text-zinc-400">
            Montant personnalisé (€)
          </label>
          <div className="flex gap-2">
            <input
              id="custom"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 3,50"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <button
              type="submit"
              disabled={!!loading}
              className="rounded-xl bg-white px-4 py-3 font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '…' : 'Payer'}
            </button>
          </div>
        </form>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
