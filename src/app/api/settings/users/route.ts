import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Simple base64 hash for password (placeholder for real hashing)
function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64')
}

// GET /api/settings/users - List users in a company via CompanyUser
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const companyUsers = await db.companyUser.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            image: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    // Flatten to include the company-specific role
    const result = companyUsers.map((cu) => ({
      ...cu.user,
      companyRole: cu.role,
      companyUserId: cu.id,
      joinedAt: cu.joinedAt,
      isActiveInCompany: cu.isActive,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/settings/users - Create user AND CompanyUser record
// Only admin/super_admin can create users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, username, name, email, password, role, companyRole, isActive } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    if (!username || !name || !password) {
      return NextResponse.json(
        { error: 'username, name, and password are required' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { error: `User with username "${username}" already exists` },
        { status: 409 }
      )
    }

    // Create user and CompanyUser in a transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          name,
          email: email ?? null,
          password: hashPassword(password),
          role: role ?? 'viewer',
          isActive: isActive ?? true,
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      // Create CompanyUser link
      const companyUser = await tx.companyUser.create({
        data: {
          companyId,
          userId: user.id,
          role: companyRole ?? role ?? 'viewer',
          isActive: true,
        },
      })

      return {
        ...user,
        companyRole: companyUser.role,
        companyUserId: companyUser.id,
        joinedAt: companyUser.joinedAt,
        isActiveInCompany: companyUser.isActive,
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}

// PUT /api/settings/users - Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, id, username, name, email, password, role, companyRole, isActive } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // If username is being changed, check for duplicates
    if (username && username !== existing.username) {
      const duplicate = await db.user.findUnique({ where: { username } })
      if (duplicate) {
        return NextResponse.json(
          { error: `User with username "${username}" already exists` },
          { status: 409 }
        )
      }
    }

    // Update user and optionally CompanyUser role
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          ...(username !== undefined && { username }),
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(password !== undefined && { password: hashPassword(password) }),
          ...(role !== undefined && { role }),
          ...(isActive !== undefined && { isActive }),
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      // Update CompanyUser role if provided
      if (companyRole !== undefined) {
        await tx.companyUser.updateMany({
          where: { companyId, userId: id },
          data: { role: companyRole },
        })
      }

      // Get the company user record
      const companyUser = await tx.companyUser.findUnique({
        where: { companyId_userId: { companyId, userId: id } },
      })

      return {
        ...user,
        companyRole: companyUser?.role ?? role ?? 'viewer',
        companyUserId: companyUser?.id,
        joinedAt: companyUser?.joinedAt,
        isActiveInCompany: companyUser?.isActive ?? true,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/users - Delete user
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, id } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (existing.role === 'admin' || existing.role === 'super_admin') {
      // Check if this is the last admin in the company
      const adminCount = await db.companyUser.count({
        where: {
          companyId,
          role: { in: ['admin', 'super_admin'] },
        },
      })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin user in this company' },
          { status: 400 }
        )
      }
    }

    // Delete the CompanyUser record (this removes user from this company)
    await db.companyUser.deleteMany({
      where: { companyId, userId: id },
    })

    // If user has no more company associations, delete the user entirely
    const remainingCompanies = await db.companyUser.count({
      where: { userId: id },
    })
    if (remainingCompanies === 0) {
      await db.user.delete({ where: { id } })
    }

    return NextResponse.json({ message: 'User removed from company successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
