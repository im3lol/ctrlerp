import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const userId = (session.user as any).id

    // Get companies the user has access to
    const companyUsers = await db.companyUser.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        company: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
      },
    })

    const companies = companyUsers.map((cu) => ({
      id: cu.company.id,
      nameAr: cu.company.nameAr,
      nameEn: cu.company.nameEn,
      role: cu.role,
    }))

    return NextResponse.json(companies)
  } catch (error) {
    console.error('Get companies error:', error)
    return NextResponse.json(
      { error: 'فشل في تحميل الشركات' },
      { status: 500 }
    )
  }
}
