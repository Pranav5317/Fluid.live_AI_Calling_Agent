import { PrismaClient } from '@prisma/client';

declare global {
  // Allow global var in development to prevent duplicate PrismaClient connections during HMR
  var globalPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.globalPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.globalPrisma = prisma;
}

export default prisma;

