import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-guard'
import { initializeAccountMappings } from '@/lib/account-mapping'

// GET /api/accounting/accounts - List all accounts for a company
export async function GET(request: NextRequest) {
  try {
    await requirePermission('accounting.view', request)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const accounts = await db.account.findMany({
      where: { companyId },
      orderBy: { code: 'asc' },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            nameAr: true,
            nameEn: true,
          },
        },
      },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    if (error instanceof Error && (error.message.includes('غير مصرح') || error.message.includes('صلاحية'))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Get accounts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

// POST /api/accounting/accounts - Create new account
export async function POST(request: NextRequest) {
  try {
    await requirePermission('accounting.create', request)

    const body = await request.json()
    const { companyId, code, nameAr, nameEn, type, parentId, isLeaf, isActive } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    if (!code || !nameAr || !type) {
      return NextResponse.json(
        { error: 'code, nameAr, and type are required' },
        { status: 400 }
      )
    }

    // Validate account type
    const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid account type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if account code already exists within the company
    const existing = await db.account.findUnique({
      where: { companyId_code: { companyId, code } },
    })
    if (existing) {
      return NextResponse.json(
        { error: `Account with code "${code}" already exists in this company` },
        { status: 409 }
      )
    }

    // If parentId is provided, verify it exists and belongs to the same company
    if (parentId) {
      const parent = await db.account.findUnique({ where: { id: parentId } })
      if (!parent) {
        return NextResponse.json(
          { error: 'Parent account not found' },
          { status: 404 }
        )
      }
      if (parent.companyId !== companyId) {
        return NextResponse.json(
          { error: 'Parent account does not belong to this company' },
          { status: 403 }
        )
      }
      // Validate that child account type matches parent type
      if (parent.type !== type) {
        return NextResponse.json(
          { error: `Child account type (${type}) must match parent account type (${parent.type})` },
          { status: 400 }
        )
      }
      // If parent was a leaf, update it to non-leaf
      if (parent.isLeaf) {
        await db.account.update({
          where: { id: parentId },
          data: { isLeaf: false },
        })
      }
    }

    const account = await db.account.create({
      data: {
        companyId,
        code,
        nameAr,
        nameEn: nameEn ?? null,
        type,
        parentId: parentId ?? null,
        isLeaf: isLeaf ?? true,
        isActive: isActive ?? true,
      },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            nameAr: true,
            nameEn: true,
          },
        },
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    if (error instanceof Error && (error.message.includes('غير مصرح') || error.message.includes('صلاحية'))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Create account error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}

// PUT /api/accounting/accounts - Update account
export async function PUT(request: NextRequest) {
  try {
    await requirePermission('accounting.edit', request)

    const body = await request.json()
    const { companyId, id, code, nameAr, nameEn, type, parentId, isLeaf, isActive } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.account.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Verify the account belongs to the company
    if (existing.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Account does not belong to this company' },
        { status: 403 }
      )
    }

    // Validate account type if provided
    if (type) {
      const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Invalid account type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // If type is being changed, validate it matches parent and children
    const newType = type || existing.type
    if (type && type !== existing.type) {
      // Check parent type match
      if (existing.parentId) {
        const parent = await db.account.findUnique({ where: { id: existing.parentId } })
        if (parent && parent.type !== type) {
          return NextResponse.json(
            { error: `Account type must match parent account type (${parent.type})` },
            { status: 400 }
          )
        }
      }
      // Check children type match
      const children = await db.account.findMany({ where: { parentId: id } })
      if (children.length > 0 && children.some(c => c.type !== type)) {
        return NextResponse.json(
          { error: `Cannot change account type: child accounts exist with type "${children[0].type}". All children must match the new type.` },
          { status: 400 }
        )
      }
    }

    // If code is being changed, check for duplicates within company
    if (code && code !== existing.code) {
      const duplicate = await db.account.findUnique({
        where: { companyId_code: { companyId, code } },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: `Account with code "${code}" already exists in this company` },
          { status: 409 }
        )
      }
    }

    // If parentId is being changed, verify it exists and no circular reference
    if (parentId !== undefined && parentId !== existing.parentId) {
      if (parentId) {
        const parent = await db.account.findUnique({ where: { id: parentId } })
        if (!parent) {
          return NextResponse.json(
            { error: 'Parent account not found' },
            { status: 404 }
          )
        }
        if (parent.companyId !== companyId) {
          return NextResponse.json(
            { error: 'Parent account does not belong to this company' },
            { status: 403 }
          )
        }
        // Prevent circular reference (account can't be its own parent)
        if (parentId === id) {
          return NextResponse.json(
            { error: 'Account cannot be its own parent' },
            { status: 400 }
          )
        }
        // Deep circular reference check: walk up the parent chain
        let currentParentId: string | null = parentId
        const visited = new Set<string>()
        while (currentParentId) {
          if (visited.has(currentParentId)) break // safety
          visited.add(currentParentId)
          if (currentParentId === id) {
            return NextResponse.json(
              { error: 'Circular reference detected: the selected parent would create a loop in the account hierarchy' },
              { status: 400 }
            )
          }
          const ancestor = await db.account.findUnique({
            where: { id: currentParentId },
            select: { parentId: true },
          })
          currentParentId = ancestor?.parentId || null
        }
        // Validate that child account type matches new parent type
        if (parent.type !== newType) {
          return NextResponse.json(
            { error: `Account type (${newType}) must match parent account type (${parent.type})` },
            { status: 400 }
          )
        }
        // If parent was a leaf, update it to non-leaf
        if (parent.isLeaf) {
          await db.account.update({
            where: { id: parentId },
            data: { isLeaf: false },
          })
        }
      }
    }

    const account = await db.account.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(nameAr !== undefined && { nameAr }),
        ...(nameEn !== undefined && { nameEn }),
        ...(type !== undefined && { type }),
        ...(parentId !== undefined && { parentId }),
        ...(isLeaf !== undefined && { isLeaf }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            nameAr: true,
            nameEn: true,
          },
        },
      },
    })

    return NextResponse.json(account)
  } catch (error) {
    if (error instanceof Error && (error.message.includes('غير مصرح') || error.message.includes('صلاحية'))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Update account error:', error)
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    )
  }
}

// DELETE /api/accounting/accounts - Delete an account (only if no journal entry lines reference it)
export async function DELETE(request: NextRequest) {
  try {
    await requirePermission('accounting.delete', request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const companyId = searchParams.get('companyId')

    if (!id || !companyId) {
      return NextResponse.json(
        { error: 'id and companyId are required' },
        { status: 400 }
      )
    }

    const account = await db.account.findUnique({
      where: { id },
      include: {
        children: true,
        entryLines: { take: 1 },
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    if (account.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Account does not belong to this company' },
        { status: 403 }
      )
    }

    // Cannot delete if account has journal entry lines
    if (account.entryLines.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account: it has journal entry lines. Deactivate it instead.' },
        { status: 400 }
      )
    }

    // Cannot delete if account has children
    if (account.children.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account: it has child accounts. Delete or move children first.' },
        { status: 400 }
      )
    }

    // Delete any account mapping that references this account
    await db.companyAccountMapping.deleteMany({
      where: { accountId: id },
    })

    // If this was the last child, mark parent as leaf
    if (account.parentId) {
      const siblings = await db.account.count({
        where: { parentId: account.parentId, id: { not: id } },
      })
      if (siblings === 0) {
        await db.account.update({
          where: { id: account.parentId },
          data: { isLeaf: true },
        })
      }
    }

    await db.account.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Account deleted successfully' })
  } catch (error) {
    if (error instanceof Error && (error.message.includes('غير مصرح') || error.message.includes('صلاحية'))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
