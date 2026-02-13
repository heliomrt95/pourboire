/**
 * Client Prisma (accès à PostgreSQL).
 *
 * En développement, Next.js peut recharger les modules à chaud.
 * On évite de créer trop d'instances Prisma en les stockant dans globalThis.
 * Voir : https://pris.ly/d/help-next-js-best-practice
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
