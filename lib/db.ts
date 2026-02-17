/**
 * Client Prisma (accès à PostgreSQL).
 *
 * En développement, Next.js peut recharger les modules à chaud.
 * On évite de créer trop d'instances Prisma en les stockant dans globalThis.
 * Voir : https://pris.ly/d/help-next-js-best-practice
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Initialisation paresseuse (lazy) :
 * - Certaines étapes de build/collecte Next.js importent les modules côté serveur.
 * - Créer PrismaClient au chargement du module peut ralentir voire faire timeouter le build
 *   selon l'environnement.
 * - Ici, on ne crée le client qu'au premier accès.
 */
export function getPrisma(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing) return existing;

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // En dev : mémoriser pour éviter plusieurs instances lors du HMR
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}
