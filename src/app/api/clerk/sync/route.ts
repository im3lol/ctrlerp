import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

/**
 * POST /api/clerk/sync
 * Syncs a Clerk-authenticated user with the local ERP database.
 * If the user doesn't exist, it creates one with a default role.
 * If the user exists, it updates their info from Clerk.
 * Also generates an access token for the ERP token-based auth system.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clerkId, email, fullName, firstName, lastName } = body

    if (!clerkId || !email) {
      return NextResponse.json(
        { error: 'clerkId and email are required' },
        { status: 400 }
      )
    }

    // Try to find existing user by email or by username matching clerkId
    let user = await db.user.findFirst({
      where: {
        OR: [
          { email },
          { username: `clerk_${clerkId}` },
        ]
      }
    })

    if (!user) {
      // Create new user from Clerk data
      const displayName = fullName || `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0]
      const base64Password = Buffer.from(`clerk_${clerkId}_${Date.now()}`).toString('base64')

      user = await db.user.create({
        data: {
          username: `clerk_${clerkId}`,
          name: displayName,
          email,
          password: base64Password, // Random password since auth is via Clerk
          role: 'viewer', // Default role - can be upgraded by admin
          isActive: true,
        }
      })

      console.log(`[Clerk Sync] Created new user: ${user.id} (${email})`)
    } else {
      // Update existing user info from Clerk
      const displayName = fullName || `${firstName || ''} ${lastName || ''}`.trim()
      if (displayName && displayName !== user.name) {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            name: displayName,
            email,
            isActive: true,
          }
        })
      }
      console.log(`[Clerk Sync] Updated existing user: ${user.id} (${email})`)
    }

    // Get user's companies
    const companyUsers = await db.companyUser.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        companyId: true,
        role: true,
        company: {
          select: { id: true, nameAr: true, nameEn: true, vatRate: true },
        },
      },
    })

    const companies = companyUsers.map((cu) => ({
      id: cu.company.id,
      nameAr: cu.company.nameAr,
      nameEn: cu.company.nameEn,
      vatRate: cu.company.vatRate,
      role: cu.role,
    }))

    // Clean up expired tokens
    await db.accessToken.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    })

    // Generate a new access token (valid for 24 hours)
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await db.accessToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      companies,
      token,
    })
  } catch (error) {
    console.error('[Clerk Sync] Error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
