import Link from 'next/link';

/**
 * Page affichée si l'utilisateur annule le paiement sur Stripe (bouton "Retour").
 * Aucun prélèvement n'est effectué.
 */
export default function CancelPage() {
  return (
    <main className="h-screen min-h-0 flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="rounded-full bg-zinc-700/50 p-4 w-fit mx-auto">
          <svg
            className="w-12 h-12 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Paiement annulé</h1>
        <p className="text-zinc-400">
          Aucun prélèvement n&apos;a été effectué. Vous pouvez réessayer quand vous voulez.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-white px-6 py-3 font-medium text-zinc-900 transition hover:bg-zinc-200"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
