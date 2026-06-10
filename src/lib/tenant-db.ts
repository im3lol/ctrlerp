import { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'

// ─────────────────────────────────────────────────────────
// Tenant Database Manager
// Manages a pool of PrismaClient instances, one per tenant DB
// ─────────────────────────────────────────────────────────

// Cache of PrismaClient instances keyed by tenantId
const clientPool = new Map<string, PrismaClient>()

// Track last access time for eviction
const lastAccess = new Map<string, number>()

// Pool configuration
const MAX_POOL_SIZE = parseInt(process.env.TENANT_DB_POOL_SIZE || '50', 10)
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes idle = disconnect

// Periodically clean up idle connections
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [tenantId, lastTime] of lastAccess.entries()) {
      if (now - lastTime > IDLE_TIMEOUT_MS) {
        const client = clientPool.get(tenantId)
        if (client) {
          client.$disconnect().catch(() => {})
          clientPool.delete(tenantId)
          lastAccess.delete(tenantId)
        }
      }
    }
  }, 60_000).unref()
}

/**
 * Get the base connection info from the platform DATABASE_URL
 * Used to construct tenant database URLs on the same server
 */
function getBaseConnectionInfo(): {
  host: string
  port: string
  user: string
  password: string
  poolerHost: string
  directHost: string
} {
  const directUrl = process.env.DIRECT_URL || ''
  const poolerUrl = process.env.DATABASE_URL || ''

  // Parse direct URL for DDL operations
  const directMatch = directUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  // Parse pooler URL for application queries
  const poolerMatch = poolerUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)

  if (!directMatch || !poolerMatch) {
    throw new Error('Invalid DATABASE_URL or DIRECT_URL format')
  }

  return {
    host: poolerMatch[3],
    port: poolerMatch[4],
    user: poolerMatch[1],
    password: poolerMatch[2],
    poolerHost: poolerMatch[3],
    directHost: directMatch[3],
  }
}

/**
 * Build a connection URL for a tenant database
 * Uses the pooler (pgbouncer) for regular queries
 */
export function buildTenantDbUrl(databaseName: string, usePooler = true): string {
  const info = getBaseConnectionInfo()
  const host = usePooler ? info.poolerHost : info.directHost
  const port = usePooler ? '6543' : '5432'
  return `postgresql://${info.user}:${info.password}@${host}:${port}/${databaseName}?pgbouncer=${usePooler}`
}

/**
 * Get or create a PrismaClient for a specific tenant
 * Uses cached connection from the pool if available
 */
export async function getTenantDb(tenantId: string): Promise<PrismaClient> {
  // Check pool first
  const existing = clientPool.get(tenantId)
  if (existing) {
    lastAccess.set(tenantId, Date.now())
    return existing
  }

  // Evict idle connections if pool is full
  if (clientPool.size >= MAX_POOL_SIZE) {
    let oldestKey = ''
    let oldestTime = Infinity
    for (const [key, time] of lastAccess.entries()) {
      if (time < oldestTime) {
        oldestTime = time
        oldestKey = key
      }
    }
    if (oldestKey) {
      const oldClient = clientPool.get(oldestKey)
      if (oldClient) {
        await oldClient.$disconnect().catch(() => {})
      }
      clientPool.delete(oldestKey)
      lastAccess.delete(oldestKey)
    }
  }

  // Look up tenant's database URL from platform DB
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { databaseUrl: true, databaseName: true, subdomain: true },
  })

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`)
  }

  if (!tenant.databaseUrl && !tenant.databaseName) {
    throw new Error(`Tenant database not provisioned: ${tenant.subdomain}`)
  }

  const connectionString = tenant.databaseUrl || buildTenantDbUrl(tenant.databaseName!)

  // Create new PrismaClient for this tenant
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasourceUrl: connectionString,
  })

  // Cache it
  clientPool.set(tenantId, client)
  lastAccess.set(tenantId, Date.now())

  return client
}

/**
 * Get tenant DB by subdomain (used in middleware/request context)
 */
export async function getTenantDbBySubdomain(subdomain: string): Promise<{ tenantId: string; prisma: PrismaClient } | null> {
  const tenant = await db.tenant.findUnique({
    where: { subdomain },
    select: { id: true, databaseUrl: true, databaseName: true, status: true, dbStatus: true },
  })

  if (!tenant || tenant.status === 'suspended' || tenant.status === 'cancelled') {
    return null
  }

  if (tenant.dbStatus !== 'ready') {
    return null
  }

  const prisma = await getTenantDb(tenant.id)
  return { tenantId: tenant.id, prisma }
}

/**
 * Get tenant DB by custom domain
 */
export async function getTenantDbByDomain(domain: string): Promise<{ tenantId: string; prisma: PrismaClient } | null> {
  const tenant = await db.tenant.findUnique({
    where: { customDomain: domain },
    select: { id: true, databaseUrl: true, databaseName: true, status: true, dbStatus: true },
  })

  if (!tenant || tenant.status === 'suspended' || tenant.status === 'cancelled') {
    return null
  }

  if (tenant.dbStatus !== 'ready') {
    return null
  }

  const prisma = await getTenantDb(tenant.id)
  return { tenantId: tenant.id, prisma }
}

/**
 * Provision a new database for a tenant
 * Creates the database and runs Prisma migrations
 */
export async function provisionTenantDatabase(tenantId: string): Promise<{ success: boolean; databaseName: string; databaseUrl: string; error?: string }> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, subdomain: true, name: true },
  })

  if (!tenant) {
    return { success: false, databaseName: '', databaseUrl: '', error: 'Tenant not found' }
  }

  // Update status to provisioning
  await db.tenant.update({
    where: { id: tenantId },
    data: { dbStatus: 'provisioning' },
  })

  try {
    // Generate a safe database name from subdomain
    const dbName = `tenant_${tenant.subdomain.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`

    // Create the database using raw SQL via pg
    const { Pool } = await import('pg')
    const directUrl = process.env.DIRECT_URL || ''

    // Connect to the default 'postgres' database to create a new DB
    const adminPool = new Pool({
      connectionString: directUrl,
    })

    try {
      // Check if database already exists
      const dbCheck = await adminPool.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName]
      )

      if (dbCheck.rows.length === 0) {
        // Create the database
        await adminPool.query(`CREATE DATABASE "${dbName}"`)
      }
    } finally {
      await adminPool.end()
    }

    // Build the connection URL for the new database
    const tenantDbUrl = buildTenantDbUrl(dbName)
    const tenantDirectUrl = buildTenantDbUrl(dbName, false)

    // Run Prisma schema push on the new database
    const { execSync } = await import('child_process')

    // Set environment variables temporarily for the migration
    const originalDbUrl = process.env.DATABASE_URL
    const originalDirectUrl = process.env.DIRECT_URL

    try {
      process.env.DATABASE_URL = tenantDbUrl
      process.env.DIRECT_URL = tenantDirectUrl

      // Push schema to the new tenant database
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 120_000,
        env: { ...process.env },
      })
    } finally {
      // Restore original env vars
      process.env.DATABASE_URL = originalDbUrl
      process.env.DIRECT_URL = originalDirectUrl
    }

    // Update tenant record with database info
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        databaseName: dbName,
        databaseUrl: tenantDbUrl,
        dbStatus: 'ready',
      },
    })

    return { success: true, databaseName: dbName, databaseUrl: tenantDbUrl }
  } catch (error: any) {
    // Update status to error
    await db.tenant.update({
      where: { id: tenantId },
      data: { dbStatus: 'error' },
    })

    console.error(`Failed to provision database for tenant ${tenant.subdomain}:`, error)
    return { success: false, databaseName: '', databaseUrl: '', error: error.message }
  }
}

/**
 * Seed initial data in a tenant database
 */
export async function seedTenantDatabase(
  tenantId: string,
  adminUsername: string,
  adminPassword: string,
  adminName: string,
  companyName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantDb = await getTenantDb(tenantId)

    // Create admin user
    const admin = await tenantDb.user.create({
      data: {
        username: adminUsername,
        name: adminName,
        password: Buffer.from(adminPassword).toString('base64'),
        role: 'super_admin',
        isActive: true,
      },
    })

    // Create default company
    const company = await tenantDb.company.create({
      data: {
        nameAr: companyName,
        nameEn: companyName,
        tenantId: tenantId,
        status: 'active',
      },
    })

    // Link admin to company
    await tenantDb.companyUser.create({
      data: {
        companyId: company.id,
        userId: admin.id,
        role: 'super_admin',
        isActive: true,
      },
    })

    // Create default currency (EGP)
    await tenantDb.currency.create({
      data: {
        companyId: company.id,
        code: 'EGP',
        nameAr: 'جنيه مصري',
        nameEn: 'Egyptian Pound',
        symbol: 'E£',
        isBase: true,
        exchangeRate: 1.0,
      },
    })

    // Create default warehouse
    await tenantDb.warehouse.create({
      data: {
        companyId: company.id,
        code: 'WH-001',
        nameAr: 'المخزن الرئيسي',
        nameEn: 'Main Warehouse',
        type: 'WAREHOUSE',
        isActive: true,
      },
    })

    // Create default chart of accounts
    const defaultAccounts = [
      { code: '1000', nameAr: 'الأصول', nameEn: 'Assets', type: 'ASSET' },
      { code: '1100', nameAr: 'الأصول المتداولة', nameEn: 'Current Assets', type: 'ASSET' },
      { code: '1110', nameAr: 'النقدية', nameEn: 'Cash', type: 'ASSET' },
      { code: '1120', nameAr: 'البنك', nameEn: 'Bank', type: 'ASSET' },
      { code: '1130', nameAr: 'العملاء', nameEn: 'Customers', type: 'ASSET' },
      { code: '1140', nameAr: 'المخزون', nameEn: 'Inventory', type: 'ASSET' },
      { code: '1200', nameAr: 'الأصول الثابتة', nameEn: 'Fixed Assets', type: 'ASSET' },
      { code: '2000', nameAr: 'الخصوم', nameEn: 'Liabilities', type: 'LIABILITY' },
      { code: '2100', nameAr: 'الخصوم المتداولة', nameEn: 'Current Liabilities', type: 'LIABILITY' },
      { code: '2110', nameAr: 'الموردون', nameEn: 'Suppliers', type: 'LIABILITY' },
      { code: '3000', nameAr: 'حقوق الملكية', nameEn: 'Equity', type: 'EQUITY' },
      { code: '3100', nameAr: 'رأس المال', nameEn: 'Capital', type: 'EQUITY' },
      { code: '4000', nameAr: 'الإيرادات', nameEn: 'Revenue', type: 'REVENUE' },
      { code: '4100', nameAr: 'إيرادات المبيعات', nameEn: 'Sales Revenue', type: 'REVENUE' },
      { code: '5000', nameAr: 'المصروفات', nameEn: 'Expenses', type: 'EXPENSE' },
      { code: '5100', nameAr: 'تكلفة المبيعات', nameEn: 'Cost of Sales', type: 'EXPENSE' },
      { code: '5200', nameAr: 'المصروفات الإدارية', nameEn: 'Administrative Expenses', type: 'EXPENSE' },
      { code: '5300', nameAr: 'المصروفات العامة', nameEn: 'General Expenses', type: 'EXPENSE' },
    ]

    const createdAccounts: Record<string, string> = {}
    for (const acc of defaultAccounts) {
      const account = await tenantDb.account.create({
        data: {
          companyId: company.id,
          code: acc.code,
          nameAr: acc.nameAr,
          nameEn: acc.nameEn,
          type: acc.type,
          isLeaf: !acc.code.endsWith('00'),
          isActive: true,
        },
      })
      createdAccounts[acc.code] = account.id
    }

    // Create account mappings
    const mappings = [
      { role: 'DEFAULT_CASH', code: '1110' },
      { role: 'DEFAULT_BANK', code: '1120' },
      { role: 'DEFAULT_CUSTOMER', code: '1130' },
      { role: 'DEFAULT_SUPPLIER', code: '2110' },
      { role: 'DEFAULT_INVENTORY', code: '1140' },
      { role: 'DEFAULT_SALES_REVENUE', code: '4100' },
      { role: 'DEFAULT_COST_OF_SALES', code: '5100' },
      { role: 'DEFAULT_CAPITAL', code: '3100' },
    ]

    for (const mapping of mappings) {
      if (createdAccounts[mapping.code]) {
        await tenantDb.companyAccountMapping.create({
          data: {
            companyId: company.id,
            role: mapping.role,
            accountId: createdAccounts[mapping.code],
          },
        })
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error(`Failed to seed tenant database:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Close all tenant database connections
 */
export async function closeAllTenantConnections(): Promise<void> {
  const closePromises: Promise<void>[] = []
  for (const [tenantId, client] of clientPool.entries()) {
    closePromises.push(client.$disconnect().catch(() => {}))
  }
  await Promise.all(closePromises)
  clientPool.clear()
  lastAccess.clear()
}

/**
 * Get pool statistics for monitoring
 */
export function getPoolStats(): { size: number; maxSize: number; tenants: string[] } {
  return {
    size: clientPool.size,
    maxSize: MAX_POOL_SIZE,
    tenants: Array.from(clientPool.keys()),
  }
}

/**
 * Generate a unique subdomain from a name
 */
export function generateSubdomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30) || `tenant-${Date.now().toString(36)}`
}
