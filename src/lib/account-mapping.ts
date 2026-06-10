import { db } from '@/lib/db'

/**
 * Account Role Constants
 * These are logical identifiers for system accounts that business logic depends on.
 * Instead of hardcoding account codes (1101, 1103, etc.), we use these roles
 * to look up the actual account ID per company via the CompanyAccountMapping table.
 *
 * Fallback: If no mapping exists, we fall back to the legacy hardcoded codes
 * to maintain backward compatibility with existing data.
 */
export const ACCOUNT_ROLES = {
  DEFAULT_CASH: 'DEFAULT_CASH',                    // النقدية (was 1101)
  DEFAULT_BANK: 'DEFAULT_BANK',                    // البنوك (was 1102)
  DEFAULT_CUSTOMER: 'DEFAULT_CUSTOMER',            // العملاء (was 1103)
  DEFAULT_INVENTORY: 'DEFAULT_INVENTORY',          // المخزون (was 1104)
  DEFAULT_SUPPLIER: 'DEFAULT_SUPPLIER',            // الموردين (was 2101)
  DEFAULT_TAX_PAYABLE: 'DEFAULT_TAX_PAYABLE',      // الضريبة المستحقة (was 2102)
  DEFAULT_INVESTOR_PROFIT_PAYABLE: 'DEFAULT_INVESTOR_PROFIT_PAYABLE', // أرباح مستحقة للمستثمرين (was 2104)
  DEFAULT_CAPITAL: 'DEFAULT_CAPITAL',              // رأس المال (was 31)
  DEFAULT_RETAINED_EARNINGS: 'DEFAULT_RETAINED_EARNINGS', // الأرباح المحتجزة (was 32)
  DEFAULT_SALES: 'DEFAULT_SALES',                  // المبيعات (was 41)
  DEFAULT_COGS: 'DEFAULT_COGS',                    // تكلفة البضاعة المباعة (was 51)
  DEFAULT_CURRENT_LIABILITIES: 'DEFAULT_CURRENT_LIABILITIES', // الخصوم المتداولة (was 21)
} as const

export type AccountRole = keyof typeof ACCOUNT_ROLES

/**
 * Legacy account codes - used as fallback when no mapping exists.
 * This ensures backward compatibility with companies created before the mapping system.
 */
const LEGACY_CODES: Record<string, string> = {
  [ACCOUNT_ROLES.DEFAULT_CASH]: '1101',
  [ACCOUNT_ROLES.DEFAULT_BANK]: '1102',
  [ACCOUNT_ROLES.DEFAULT_CUSTOMER]: '1103',
  [ACCOUNT_ROLES.DEFAULT_INVENTORY]: '1104',
  [ACCOUNT_ROLES.DEFAULT_SUPPLIER]: '2101',
  [ACCOUNT_ROLES.DEFAULT_TAX_PAYABLE]: '2102',
  [ACCOUNT_ROLES.DEFAULT_INVESTOR_PROFIT_PAYABLE]: '2104',
  [ACCOUNT_ROLES.DEFAULT_CAPITAL]: '31',
  [ACCOUNT_ROLES.DEFAULT_RETAINED_EARNINGS]: '32',
  [ACCOUNT_ROLES.DEFAULT_SALES]: '41',
  [ACCOUNT_ROLES.DEFAULT_COGS]: '51',
  [ACCOUNT_ROLES.DEFAULT_CURRENT_LIABILITIES]: '21',
}

/**
 * Get a single mapped account by role.
 * First tries the CompanyAccountMapping table, then falls back to legacy code lookup.
 */
export async function getMappedAccount(companyId: string, role: string) {
  // 1. Try the mapping table first
  const mapping = await db.companyAccountMapping.findUnique({
    where: { companyId_role: { companyId, role } },
    include: { account: true },
  })

  if (mapping?.account && mapping.account.isActive) {
    return mapping.account
  }

  // 2. Fallback to legacy code lookup
  const legacyCode = LEGACY_CODES[role]
  if (!legacyCode) return null

  const account = await db.account.findFirst({
    where: { companyId, code: legacyCode, isActive: true },
  })

  return account
}

/**
 * Get multiple mapped accounts by roles in a single query.
 * Returns a Map<role, account> for easy lookup.
 *
 * This is optimized to do only 2 queries total instead of N queries:
 * 1. Fetch all mappings for the given roles
 * 2. Fetch all legacy code accounts for roles not found in mappings
 */
export async function getMappedAccounts(companyId: string, roles: string[]): Promise<Map<string, { id: string; code: string; nameAr: string; type: string }>> {
  const result = new Map<string, { id: string; code: string; nameAr: string; type: string }>()

  // 1. Try mapping table for all roles
  const mappings = await db.companyAccountMapping.findMany({
    where: { companyId, role: { in: roles } },
    include: { account: true },
  })

  const foundRoles = new Set<string>()
  for (const mapping of mappings) {
    if (mapping.account?.isActive) {
      result.set(mapping.role, mapping.account)
      foundRoles.add(mapping.role)
    }
  }

  // 2. Fallback to legacy codes for roles not found in mappings
  const missingRoles = roles.filter(r => !foundRoles.has(r))
  const legacyCodesToFetch = missingRoles
    .map(r => ({ role: r, code: LEGACY_CODES[r] }))
    .filter(x => x.code)

  if (legacyCodesToFetch.length > 0) {
    const accounts = await db.account.findMany({
      where: {
        companyId,
        code: { in: legacyCodesToFetch.map(x => x.code!) },
        isActive: true,
      },
    })

    for (const { role, code } of legacyCodesToFetch) {
      const account = accounts.find(a => a.code === code)
      if (account) {
        result.set(role, account)
      }
    }
  }

  return result
}

/**
 * Initialize default account mappings for a company.
 * This should be called after creating a company's chart of accounts.
 *
 * It creates mappings from each ACCOUNT_ROLE to the corresponding account
 * by looking up the legacy codes in the company's chart of accounts.
 */
export async function initializeAccountMappings(companyId: string) {
  const roles = Object.values(ACCOUNT_ROLES)
  const legacyCodes = roles
    .map(role => ({ role, code: LEGACY_CODES[role] }))
    .filter(x => x.code)

  if (legacyCodes.length === 0) return

  // Fetch all accounts by their legacy codes
  const accounts = await db.account.findMany({
    where: {
      companyId,
      code: { in: legacyCodes.map(x => x.code) },
    },
  })

  // Create mappings
  const mappingData = []
  for (const { role, code } of legacyCodes) {
    const account = accounts.find(a => a.code === code)
    if (account) {
      mappingData.push({
        companyId,
        role,
        accountId: account.id,
      })
    }
  }

  // Upsert all mappings
  if (mappingData.length > 0) {
    await Promise.all(
      mappingData.map(data =>
        db.companyAccountMapping.upsert({
          where: { companyId_role: { companyId: data.companyId, role: data.role } },
          create: data,
          update: { accountId: data.accountId },
        })
      )
    )
  }
}

/**
 * Get all account mappings for a company (for the settings UI)
 */
export async function getCompanyAccountMappings(companyId: string) {
  return db.companyAccountMapping.findMany({
    where: { companyId },
    include: {
      account: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          type: true,
          isActive: true,
        },
      },
    },
    orderBy: { role: 'asc' },
  })
}

/**
 * Update a single account mapping
 */
export async function updateAccountMapping(companyId: string, role: string, accountId: string) {
  return db.companyAccountMapping.upsert({
    where: { companyId_role: { companyId, role } },
    create: { companyId, role, accountId },
    update: { accountId },
  })
}
