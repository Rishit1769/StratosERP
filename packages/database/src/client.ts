import { PrismaClient } from '@prisma/client';

function ensureDatabaseUrl(): void {
  if (process.env.DATABASE_URL) {
    return;
  }

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_PORT || !DB_USER || !DB_NAME) {
    return;
  }

  const encodedPassword = encodeURIComponent(DB_PASSWORD ?? '');
  process.env.DATABASE_URL = `mysql://${DB_USER}:${encodedPassword}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

ensureDatabaseUrl();

// Global singleton to prevent multiple instances in dev (hot-reload).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
