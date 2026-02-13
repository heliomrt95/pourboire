import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pourboire',
  description: 'Système de pourboire sécurisé avec Stripe',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  );
}
