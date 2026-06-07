import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-guard'
import * as XLSX from 'xlsx'

// GET /api/inventory/items/template - Download xlsx template
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission('inventory.view', request)

    const headers = [
      'code', 
      'nameAr', 
      'nameEn', 
      'categoryCode', 
      'uomCode', 
      'costMethod', 
      'sellPrice', 
      'minStock', 
      'maxStock', 
      'description', 
      'isActive', 
      'imageUrl',
      'barcodes'
    ]
    const sampleRow1 = [
      'ITEM-001', 
      'لابتوب HP', 
      'HP Laptop', 
      'CAT-001', 
      'PCS', 
      'FIFO', 
      2500, 
      10, 
      100, 
      'لابتوب احترافي', 
      true, 
      'https://example.com/laptop.jpg',
      'SKU:LP-001,PRIMARY:true;EAN:1234567890123'
    ]
    const sampleRow2 = [
      'ITEM-002', 
      'ماوس لاسلكي', 
      'Wireless Mouse', 
      'CAT-002', 
      'PCS', 
      'WAC', 
      150, 
      50, 
      200, 
      '', 
      true, 
      '',
      ''
    ]

    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow1, sampleRow2])

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // code
      { wch: 25 }, // nameAr
      { wch: 25 }, // nameEn
      { wch: 15 }, // categoryCode
      { wch: 10 }, // uomCode
      { wch: 12 }, // costMethod
      { wch: 12 }, // sellPrice
      { wch: 10 }, // minStock
      { wch: 10 }, // maxStock
      { wch: 30 }, // description
      { wch: 10 }, // isActive
      { wch: 40 }, // imageUrl
      { wch: 50 }, // barcodes
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Items')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="items-template.xlsx"',
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes('غير مصرح') || error.message.includes('صلاحية'))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Download template error:', error)
    return NextResponse.json(
      { error: 'Failed to download template' },
      { status: 500 }
    )
  }
}
