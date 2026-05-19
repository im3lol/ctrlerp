import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/companies/[id] - Get company details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const company = await db.company.findUnique({
      where: { id },
      include: {
        currencies: { orderBy: { code: 'asc' } },
        unitOfMeasures: { orderBy: { code: 'asc' } },
        warehouses: { orderBy: { code: 'asc' } },
        companyUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            accounts: true,
            items: true,
            customers: true,
            suppliers: true,
          },
        },
      },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'الشركة غير موجودة' },
        { status: 404 }
      )
    }

    return NextResponse.json(company)
  } catch (error) {
    console.error('Get company error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    )
  }
}

// PUT /api/companies/[id] - Update company
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      nameAr,
      nameEn,
      legalName,
      taxNumber,
      address,
      phone,
      email,
      logo,
      baseCurrencyId,
      fiscalYearStart,
      vatRate,
      status,
    } = body

    const existing = await db.company.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'الشركة غير موجودة' },
        { status: 404 }
      )
    }

    const updatedCompany = await db.company.update({
      where: { id },
      data: {
        ...(nameAr !== undefined && { nameAr }),
        ...(nameEn !== undefined && { nameEn }),
        ...(legalName !== undefined && { legalName }),
        ...(taxNumber !== undefined && { taxNumber }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(logo !== undefined && { logo }),
        ...(baseCurrencyId !== undefined && { baseCurrencyId }),
        ...(fiscalYearStart !== undefined && { fiscalYearStart }),
        ...(vatRate !== undefined && { vatRate }),
        ...(status !== undefined && { status }),
      },
    })

    return NextResponse.json(updatedCompany)
  } catch (error) {
    console.error('Update company error:', error)
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    )
  }
}
