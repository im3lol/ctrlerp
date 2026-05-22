import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Supabase PostgreSQL connection - override any system DATABASE_URL that points to SQLite
const SUPABASE_URL = 'postgresql://postgres.hojpkyszlbjkscbwquuz:3lolScar%4025%23@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true'

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    datasourceUrl: process.env.DATABASE_URL?.startsWith('file:') ? SUPABASE_URL : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db