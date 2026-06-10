import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-guard'
import {
  getCompanyAccountMappings,
  updateAccountMapping,
  initializeAccountMappings,
  ACCOUNT_ROLES,
} from '@/lib/account-mapping'

// GET /api/accounting/account-mappings - Get all mappings for a company
export async function GET(request: NextRequest) {
  try {
    await requirePermission('settings.view', request)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const mappings = await getCompanyAccountMappings(companyId)

    // Also return the available roles for the UI
    const availableRoles = Object.entries(ACCOUNT_ROLES).map(([key, role]) => ({
      role,
      label: getRoleLabel(role),
    }))

    return NextResponse.json({ mappings, availableRoles })
  } catch (error) {
    if (error instanceof Error && (error.message.includes('غير مصرح') || error.message.includes('صلاحية'))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Get account mappings error:', error)
    return NextResponse.json({ error: 'Failed to fetch account mappings' }, { status: 500 })
  }
}

// PUT /api/accounting/account-mappings - Update a mapping
export async function PUT(request: NextRequest) {
  try {
    await requirePermission('settings.edit', request)

    const body = await request.json()
    const { companyId, role, accountId } = body

    if (!companyId || !role || !accountId) {
      return NextResponse.json(
        { error: 'companyId, role, and accountId are required' },
        { status: 400 }
      )
    }

    const mapping = await updateAccountMapping(companyId, role, accountId)
    return NextResponse.json(mapping)
  } catch (error) {
    if (error instanceof Error && (error.message.includes('غير مصرح') || error.message.includes('صلاحية'))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Update account mapping error:', error)
    return NextResponse.json({ error: 'Failed to update account mapping' }, { status: 500 })
  }
}

// POST /api/accounting/account-mappings - Initialize default mappings for a company
export async function POST(request: NextRequest) {
  try {
    await requirePermission('settings.edit', request)

    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    await initializeAccountMappings(companyId)
    const mappings = await getCompanyAccountMappings(companyId)
    return NextResponse.json(mappings)
  } catch (error) {
    if (error instanceof Error && (error.message.includes('غير مصرح') || error.message.includes('صلاحية'))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Initialize account mappings error:', error)
    return NextResponse.json({ error: 'Failed to initialize account mappings' }, { status: 500 })
  }
}

// Arabic labels for account roles
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    [ACCOUNT_ROLES.DEFAULT_CASH]: 'النقدية',
    [ACCOUNT_ROLES.DEFAULT_BANK]: 'البنوك',
    [ACCOUNT_ROLES.DEFAULT_CUSTOMER]: 'العملاء',
    [ACCOUNT_ROLES.DEFAULT_INVENTORY]: 'المخزون',
    [ACCOUNT_ROLES.DEFAULT_SUPPLIER]: 'الموردين',
    [ACCOUNT_ROLES.DEFAULT_TAX_PAYABLE]: 'الضريبة المستحقة',
    [ACCOUNT_ROLES.DEFAULT_INVESTOR_PROFIT_PAYABLE]: 'أرباح مستحقة للمستثمرين',
    [ACCOUNT_ROLES.DEFAULT_CAPITAL]: 'رأس المال',
    [ACCOUNT_ROLES.DEFAULT_RETAINED_EARNINGS]: 'الأرباح المحتجزة',
    [ACCOUNT_ROLES.DEFAULT_SALES]: 'المبيعات',
    [ACCOUNT_ROLES.DEFAULT_COGS]: 'تكلفة البضاعة المباعة',
    [ACCOUNT_ROLES.DEFAULT_CURRENT_LIABILITIES]: 'الخصوم المتداولة',
  }
  return labels[role] || role
}
