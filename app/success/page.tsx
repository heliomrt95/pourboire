import Link from 'next/link';

/**
 * Page affichée après un paiement réussi sur Stripe Checkout.
 * L'utilisateur est redirigé ici via success_url avec ?session_id=...
 * Le webhook a déjà enregistré le paiement en base.
 */
export default function SuccessPage() {
  return (
    <main className="h-screen min-h-0 flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="rounded-full bg-emerald-500/20 p-4 w-fit mx-auto">
          <svg
            className="w-12 h-12 text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Merci pour votre pourboire</h1>
        <p className="text-zinc-400">
          Votre paiement a bien été enregistré.
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
