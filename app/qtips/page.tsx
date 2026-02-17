'use client';

/**
 * Q-Tips — page de paiement hybride (fiat + crypto)
 *
 * Objectif UX :
 * 1) L'utilisateur choisit un montant (1€, 2€, 5€, 10€) ou saisit un autre montant
 * 2) On affiche 4 blocs de paiement :
 *    - Carte bancaire (Stripe Checkout)
 *    - Apple Pay (Stripe Checkout, si activé côté Stripe)
 *    - Google Pay (Stripe Checkout, si activé côté Stripe)
 *    - Crypto (prototype : QR + adresse + bouton "J’ai payé")
 *
 * Notes importantes :
 * - Pour les 3 méthodes fiat, on appelle ton endpoint existant `POST /api/create-checkout`.
 *   Stripe Checkout décidera des moyens de paiement disponibles selon ta config (Apple Pay/Google Pay).
 * - Pour la crypto : aucune intégration blockchain (UX uniquement). L’adresse est fictive.
 * - Compatible Vercel : pas d'accès serveur ici, uniquement du client + fetch vers /api.
 */

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MAX_AMOUNT_CENTS, MIN_AMOUNT_CENTS, PRESET_AMOUNTS_CENTS } from '@/lib/constants';

// Prototype : adresse Ethereum fictive
const FAKE_WALLET_ADDRESS = '0xA1b2C3D4E5F6789012345678901234567890aBcD';

// Simulation simple : 1 ETH ≈ 3000 €
const ETH_PRICE_EUR = 3000;

type PayMethod = 'card' | 'apple_pay' | 'google_pay' | 'crypto';

function formatEurFromCents(cents: number): string {
  const euros = cents / 100;
  return euros.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseEurToCents(input: string): number | null {
  // Accepte virgule ou point, ignore les espaces
  const cleaned = input.trim().replace(/\s+/g, '').replace(',', '.');
  if (!cleaned) return null;
  const euros = Number.parseFloat(cleaned);
  if (Number.isNaN(euros) || euros <= 0) return null;
  return Math.round(euros * 100);
}

function PaymentTile({
  title,
  subtitle,
  method,
  onClick,
  disabled,
  selected,
  loading,
  icon,
}: {
  title: string;
  subtitle: string;
  method: PayMethod;
  onClick: (m: PayMethod) => void;
  disabled: boolean;
  selected: boolean;
  loading: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(method)}
      disabled={disabled || loading}
      className={[
        'group w-full text-left rounded-2xl border p-4 transition',
        'bg-zinc-900/80 border-zinc-700/70 hover:border-zinc-500 hover:bg-zinc-900',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        selected ? 'ring-2 ring-emerald-500/70 border-emerald-500/60' : 'ring-0',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-2">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{title}</h3>
            {loading && <span className="text-xs text-zinc-400">• ouverture…</span>}
          </div>
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
        </div>
        <div className="shrink-0 text-zinc-500 group-hover:text-zinc-300 transition" aria-hidden>
          →
        </div>
      </div>
    </button>
  );
}

export default function QTipsPage() {
  const [amountInput, setAmountInput] = useState(''); // euros (saisie utilisateur)
  const [selectedAmountCents, setSelectedAmountCents] = useState<number | null>(null);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [loadingMethod, setLoadingMethod] = useState<PayMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Option UX/branding : "conversion automatique en fiat" (placeholder, pas de backend)
  const [autoConvertToFiat, setAutoConvertToFiat] = useState(true);

  const amountIsValid = useMemo(() => {
    if (selectedAmountCents == null) return false;
    return selectedAmountCents >= MIN_AMOUNT_CENTS && selectedAmountCents <= MAX_AMOUNT_CENTS;
  }, [selectedAmountCents]);

  const amountEurFormatted = useMemo(() => {
    if (!amountIsValid || selectedAmountCents == null) return null;
    return formatEurFromCents(selectedAmountCents);
  }, [amountIsValid, selectedAmountCents]);

  const estimatedEth = useMemo(() => {
    if (!amountIsValid || selectedAmountCents == null) return null;
    const eur = selectedAmountCents / 100;
    return eur / ETH_PRICE_EUR;
  }, [amountIsValid, selectedAmountCents]);

  const handlePreset = (cents: number) => {
    setError(null);
    setSelectedAmountCents(cents);
    setAmountInput(String(cents / 100)); // affichage simple ; l'UI formatte ensuite
  };

  const handleAmountChange = (v: string) => {
    setError(null);
    setAmountInput(v);
    const cents = parseEurToCents(v);
    setSelectedAmountCents(cents);
  };

  const startStripeCheckout = useCallback(async (amountCents: number) => {
    setError(null);
    setLoadingMethod(method ?? 'card');
    try {
      // Toujours même origine (localhost, vercel.app, domaine custom)
      const apiBase = window.location.origin;
      const res = await fetch(`${apiBase}/api/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents }),
      });

      // La route renvoie du JSON ; si c'est du HTML (erreur), on affiche un message clair
      const raw = await res.text();
      let data: { url?: string; error?: string } = {};
      try {
        data = raw.length ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          res.ok
            ? 'Réponse invalide du serveur.'
            : 'Erreur serveur. Vérifiez les variables Stripe sur Vercel.'
        );
      }

      if (!res.ok) throw new Error(data.error ?? 'Erreur Stripe');
      if (!data.url) throw new Error('URL Stripe manquante');

      // Transition fluide : redirection vers Stripe Checkout
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoadingMethod(null);
    }
  }, [method]);

  const handlePayMethod = async (m: PayMethod) => {
    setMethod(m);
    setError(null);

    if (!amountIsValid || selectedAmountCents == null) {
      setError(`Choisis un montant valide (min. ${MIN_AMOUNT_CENTS / 100} €).`);
      return;
    }

    // Fiat : Stripe Checkout (mêmes backend/endpoint que ton système existant)
    if (m === 'card' || m === 'apple_pay' || m === 'google_pay') {
      await startStripeCheckout(selectedAmountCents);
      return;
    }

    // Crypto : on reste sur la page et on affiche le bloc crypto (prototype)
  };

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(FAKE_WALLET_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Fond futuriste léger (dégradés) */}
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-[-260px] right-[-180px] h-[520px] w-[520px] rounded-full bg-cyan-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <header className="text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-400">Q-Tips</p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Laisser un pourboire
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Choisis un montant, puis sélectionne ton moyen de paiement.
          </p>
        </header>

        {/* Étape 1 : montant */}
        <section className="mt-10 rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-white">Montant</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Montants rapides ou autre montant.
          </p>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESET_AMOUNTS_CENTS.map((c) => {
              const isSelected = selectedAmountCents === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => handlePreset(c)}
                  className={[
                    'rounded-2xl border px-4 py-3 text-lg font-semibold transition',
                    'bg-zinc-950/40 border-zinc-700/70 hover:border-zinc-500 hover:bg-zinc-950/60',
                    isSelected ? 'ring-2 ring-emerald-500/70 border-emerald-500/60' : '',
                  ].join(' ')}
                >
                  {c / 100} €
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <label htmlFor="amount" className="block text-sm text-zinc-400 mb-2">
              Autre montant (€)
            </label>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 12,50"
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <p className="mt-2 text-xs text-zinc-500">
              Min. {MIN_AMOUNT_CENTS / 100} € — max. {MAX_AMOUNT_CENTS / 100} €
            </p>
          </div>
        </section>

        {/* Étape 2 : options de paiement */}
        <section className="mt-6 rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Payer avec</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {amountEurFormatted ? (
                  <>
                    Montant sélectionné : <span className="text-white font-medium">{amountEurFormatted} €</span>
                  </>
                ) : (
                  'Sélectionne un montant pour débloquer les options.'
                )}
              </p>
            </div>
            <span
              className={[
                'shrink-0 rounded-full border px-3 py-1 text-xs',
                amountIsValid ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700/60 bg-zinc-950/40 text-zinc-400',
              ].join(' ')}
            >
              {amountIsValid ? 'prêt' : 'montant requis'}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PaymentTile
              title="Carte bancaire"
              subtitle="Paiement sécurisé via Stripe Checkout."
              method="card"
              onClick={handlePayMethod}
              disabled={!amountIsValid}
              selected={method === 'card'}
              loading={loadingMethod === 'card'}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" className="text-zinc-200">
                  <path fill="currentColor" d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V6Zm0 6v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6H4Zm3 4h6v2H7v-2Z" />
                </svg>
              }
            />
            <PaymentTile
              title="Apple Pay"
              subtitle="Disponible si activé sur ton compte Stripe et sur l’appareil."
              method="apple_pay"
              onClick={handlePayMethod}
              disabled={!amountIsValid}
              selected={method === 'apple_pay'}
              loading={loadingMethod === 'apple_pay'}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" className="text-zinc-200">
                  <path fill="currentColor" d="M16.7 13.3c0-1.5 1.3-2.2 1.4-2.3-.8-1.1-2-1.3-2.4-1.4-1-.1-1.9.6-2.4.6s-1.2-.6-2-.6c-1 .1-2 .6-2.5 1.5-1.1 1.8-.3 4.6.8 6.1.6.8 1.3 1.6 2.2 1.6.9 0 1.2-.5 2.3-.5s1.3.5 2.3.5c1 0 1.6-.8 2.1-1.6.7-1 .9-2 1-2.1-.1 0-1.8-.7-1.8-2.8Zm-1.6-4.8c.4-.5.7-1.2.6-1.9-.6 0-1.3.4-1.7.9-.4.5-.7 1.2-.6 1.9.6 0 1.3-.4 1.7-.9Z" />
                </svg>
              }
            />
            <PaymentTile
              title="Google Pay"
              subtitle="Disponible si activé sur Stripe et navigateur compatible."
              method="google_pay"
              onClick={handlePayMethod}
              disabled={!amountIsValid}
              selected={method === 'google_pay'}
              loading={loadingMethod === 'google_pay'}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" className="text-zinc-200">
                  <path fill="currentColor" d="M12 11v2.8h3.9c-.4 2-2.3 3.4-3.9 3.4-2.3 0-4.2-1.9-4.2-4.2S9.7 8.8 12 8.8c1.1 0 2 .4 2.7 1.1l1.9-1.9C15.4 6.8 13.8 6 12 6 8.7 6 6 8.7 6 12s2.7 6 6 6c3.4 0 5.8-2.4 5.8-5.8 0-.4 0-.7-.1-1.2H12Z" />
                </svg>
              }
            />
            <PaymentTile
              title="Crypto"
              subtitle="Prototype UX : ETH / USDC (stablecoin). Pas d’intégration réelle pour l’instant."
              method="crypto"
              onClick={handlePayMethod}
              disabled={!amountIsValid}
              selected={method === 'crypto'}
              loading={loadingMethod === 'crypto'}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" className="text-zinc-200">
                  <path fill="currentColor" d="M12 2 4.5 12 12 22l7.5-10L12 2Zm0 3.8 4.2 6.2L12 10.5 7.8 12l4.2-6.2Zm0 9.3 4.1-1.5L12 20.2 7.9 13.6 12 15.1Z" />
                </svg>
              }
            />
          </div>

          {error && (
            <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {/* Bloc crypto (prototype) : affiché après sélection */}
          {method === 'crypto' && amountIsValid && selectedAmountCents != null && (
            <div className="mt-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/30 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">Paiement crypto (prototype)</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Envoyez <span className="text-white font-medium">{amountEurFormatted} €</span> à l’adresse ci-dessous.
                  </p>
                </div>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
                  Réseau : Ethereum
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="rounded-2xl bg-white p-4 flex items-center justify-center">
                  {/* QR code (adresse seulement pour le prototype) */}
                  <QRCodeSVG value={FAKE_WALLET_ADDRESS} size={180} level="M" />
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
                    <p className="text-xs uppercase tracking-wider text-zinc-400">Adresse wallet</p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 truncate font-mono text-sm text-zinc-200">{FAKE_WALLET_ADDRESS}</code>
                      <button
                        type="button"
                        onClick={copyAddress}
                        className="rounded-xl bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition"
                      >
                        {copied ? 'Copié' : 'Copier'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
                    <p className="text-xs uppercase tracking-wider text-zinc-400">Montant estimé (ETH)</p>
                    <p className="mt-2 font-mono text-emerald-300">
                      {estimatedEth != null && estimatedEth < 0.001 ? '< 0.001' : estimatedEth?.toFixed(5)} ETH
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Simulation : montant_eur / 3000.
                    </p>
                  </div>
                </div>
              </div>

              {/* Placeholder conversion fiat/crypto */}
              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Conversion automatique en fiat</p>
                  <p className="text-xs text-zinc-400">
                    Placeholder UX : à connecter plus tard (ex: Coinbase Commerce / provider).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoConvertToFiat((v) => !v)}
                  className={[
                    'relative inline-flex h-7 w-12 items-center rounded-full transition',
                    autoConvertToFiat ? 'bg-emerald-500/80' : 'bg-zinc-700',
                  ].join(' ')}
                  aria-pressed={autoConvertToFiat}
                  aria-label="Activer ou désactiver la conversion automatique"
                >
                  <span
                    className={[
                      'inline-block h-5 w-5 transform rounded-full bg-white transition',
                      autoConvertToFiat ? 'translate-x-6' : 'translate-x-1',
                    ].join(' ')}
                  />
                </button>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/success"
                  className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-center font-semibold text-white hover:bg-emerald-500 transition"
                >
                  J’ai payé
                </Link>
                <p className="flex-1 text-xs text-zinc-500 self-center">
                  Confirmation manuelle pour le moment.
                </p>
              </div>
            </div>
          )}
        </section>

        <footer className="mt-8 text-center text-xs text-zinc-500">
          <p>
            Besoin d’aide ? <span className="text-zinc-300">Paiement sécurisé</span> (fiat) et <span className="text-zinc-300">prototype crypto</span>.
          </p>
          <p className="mt-2">
            <Link href="/" className="hover:text-zinc-300 underline">Retour</Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

