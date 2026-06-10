import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Supabase PostgreSQL connection - always use this URL
const SUPABASE_URL = 'postgresql://postgres.hojpkyszlbjkscbwquuz:3lolScar%4025%23@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true'

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasourceUrl: SUPABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Graceful shutdown - close connections properly
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}
