import { PrismaClient } from '@prisma/client';

declare global {
  // Allow global var in development to prevent duplicate PrismaClient connections during HMR
  var globalPrisma: PrismaClient | undefined;
}

function getDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL;
  if (!envUrl) return undefined;

  // In production (Vercel), cloud DNS resolves Neon host directly
  if (process.env.VERCEL) {
    return envUrl;
  }

  // In local development, residential ISPs / home Wi-Fi routers frequently fail to resolve *.aws.neon.tech.
  // We route through Neon's AWS gateway IP with the project endpoint identifier.
  try {
    const raw = envUrl.replace(/^["']|["']$/g, '');
    const u = new URL(raw);
    if (u.hostname.includes('neon.tech') && !u.searchParams.has('options')) {
      const endpointId = u.hostname.split('.')[0].replace('-pooler', '');
      u.hostname = '52.76.246.190';
      u.searchParams.set('options', `endpoint=${endpointId}`);
      u.searchParams.set('sslmode', 'require');
      u.searchParams.delete('channel_binding');
      return u.toString();
    }
    return raw;
  } catch {
    return envUrl;
  }
}

const dbUrl = getDatabaseUrl();

export const prisma: PrismaClient =
  globalThis.globalPrisma ||
  new PrismaClient({
    ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.globalPrisma = prisma;
}

export default prisma;

