import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-guard'
import * as XLSX from 'xlsx'

// Parse barcodes string format: "TYPE:CODE,PRIMARY:true;TYPE2:CODE2"
function parseBarcodes(barcodesStr: string) {
  if (!barcodesStr || !barcodesStr.trim()) return []
  
  const barcodes: Array<{ codeType: string; code: string; isPrimary: boolean }> = []
  const parts = barcodesStr.split(';')
  
  for (const part of parts) {
    if (!part.trim()) continue
    const pairs = part.split(',')
    const barcode: any = { codeType: '', code: '', isPrimary: false }
    
    for (const pair of pairs) {
      const [key, value] = pair.split(':')
      if (key && value) {
        const k = key.trim().toLowerCase()
        const v = value.trim()
        if (k === 'type' || k === 'codetype') barcode.codeType = v.toUpperCase()
        if (k === 'code') barcode.code = v
        if (k === 'primary' || k === 'isprimary') barcode.isPrimary = v.toLowerCase() === 'true'
      }
    }
    
    if (barcode.codeType && barcode.code) {
      barcodes.push(barcode)
    }
  }
  
  return barcodes
}

// POST /api/inventory/items/import - Import items from xlsx file
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('inventory.create', request)
    const formData = await request.formData()
    const companyId = formData.get('companyId') as string
    const file = formData.get('file') as File

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
    }

    const validCostMethods = ['FIFO', 'WAC']
    let createdCount = 0
    let updatedCount = 0
    let errorCount = 0
    const results: Array<{ row: number; code: string; status: 'created' | 'updated' | 'error'; message: string }> = []

    // Get existing data for reference resolution
    const [existingItems, existingCategories, existingUoms] = await Promise.all([
      db.item.findMany({ where: { companyId }, select: { id: true, code: true } }),
      db.category.findMany({ where: { companyId }, select: { id: true, code: true } }),
      db.uOM.findMany({ where: { companyId }, select: { id: true, code: true } }),
    ])

    const itemCodeToIdMap = new Map(existingItems.map((i) => [i.code, i.id]))
    const categoryCodeToIdMap = new Map(existingCategories.map((c) => [c.code, c.id]))
    const uomCodeToIdMap = new Map(existingUoms.map((u) => [u.code, u.id]))

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // Excel row number (1-indexed + header)

      const code = String(row['code'] || '').trim()
      const nameAr = String(row['nameAr'] || '').trim() || null
      const nameEn = String(row['nameEn'] || '').trim() || null
      const categoryCode = String(row['categoryCode'] || '').trim()
      const uomCode = String(row['uomCode'] || '').trim()
      const costMethod = String(row['costMethod'] || 'FIFO').trim().toUpperCase()
      const sellPrice = row['sellPrice'] !== undefined ? parseFloat(row['sellPrice']) : undefined
      const minStock = row['minStock'] !== undefined ? parseFloat(row['minStock']) : undefined
      const maxStock = row['maxStock'] !== undefined ? (row['maxStock'] ? parseFloat(row['maxStock']) : null) : undefined
      const description = row['description'] !== undefined ? (String(row['description']).trim() || null) : undefined
      const isActive = row['isActive'] !== undefined ? Boolean(row['isActive']) : undefined
      const imageUrl = row['imageUrl'] ? String(row['imageUrl']).trim() : undefined
      const barcodesStr = row['barcodes'] ? String(row['barcodes']).trim() : undefined

      if (!code) {
        results.push({ row: rowNum, code: '', status: 'error', message: 'code is required' })
        errorCount++
        continue
      }

      if (costMethod && !validCostMethods.includes(costMethod)) {
        results.push({ row: rowNum, code, status: 'error', message: `invalid costMethod "${costMethod}", must be one of: ${validCostMethods.join(', ')}` })
        errorCount++
        continue
      }

      // Resolve category code
      let categoryId: string | null | undefined = undefined
      if (categoryCode !== undefined) {
        if (categoryCode === '') {
          categoryId = null
        } else {
          categoryId = categoryCodeToIdMap.get(categoryCode) || null
          if (!categoryId) {
            results.push({ row: rowNum, code, status: 'error', message: `category code "${categoryCode}" not found` })
            errorCount++
            continue
          }
        }
      }

      // Resolve UOM code
      let uomId: string | null | undefined = undefined
      if (uomCode !== undefined) {
        if (uomCode === '') {
          uomId = null
        } else {
          uomId = uomCodeToIdMap.get(uomCode) || null
          if (!uomId) {
            results.push({ row: rowNum, code, status: 'error', message: `UOM code "${uomCode}" not found` })
            errorCount++
            continue
          }
        }
      }

      // Parse barcodes
      let barcodes: any[] = []
      if (barcodesStr) {
        try {
          barcodes = parseBarcodes(barcodesStr)
        } catch {
          results.push({ row: rowNum, code, status: 'error', message: 'invalid barcodes format' })
          errorCount++
          continue
        }
      }

      try {
        const existingItemId = itemCodeToIdMap.get(code)
        
        if (existingItemId) {
          // Update existing item
          const updateData: any = {}
          if (nameAr !== undefined) updateData.nameAr = nameAr
          if (nameEn !== undefined) updateData.nameEn = nameEn
          if (categoryId !== undefined) updateData.categoryId = categoryId
          if (uomId !== undefined) updateData.uomId = uomId
          if (costMethod) updateData.costMethod = costMethod
          if (sellPrice !== undefined) updateData.sellPrice = sellPrice
          if (minStock !== undefined) updateData.minStock = minStock
          if (maxStock !== undefined) updateData.maxStock = maxStock
          if (description !== undefined) updateData.description = description
          if (isActive !== undefined) updateData.isActive = isActive
          if (imageUrl !== undefined) updateData.image = imageUrl

          await db.item.update({
            where: { id: existingItemId },
            data: updateData,
          })

          // Update barcodes if provided
          if (barcodesStr !== undefined) {
            // Delete existing barcodes
            await db.itemCode.deleteMany({
              where: { itemId: existingItemId },
            })
            
            // Create new barcodes
            for (const barcode of barcodes) {
              await db.itemCode.create({
                data: {
                  itemId: existingItemId,
                  codeType: barcode.codeType,
                  code: barcode.code,
                  isPrimary: barcode.isPrimary,
                  companyId,
                },
              })
            }
          }

          results.push({ row: rowNum, code, status: 'updated', message: 'تم التحديث بنجاح' })
          updatedCount++
        } else {
          // Create new item
          const item = await db.item.create({
            data: {
              companyId,
              code,
              nameAr: nameAr || code,
              nameEn: nameEn || null,
              categoryId: categoryId || null,
              uomId: uomId || null,
              costMethod: costMethod || 'FIFO',
              sellPrice: sellPrice || 0,
              minStock: minStock || 0,
              maxStock: maxStock || null,
              description: description || null,
              isActive: isActive !== undefined ? isActive : true,
              image: imageUrl || null,
            },
          })
          
          // Create barcodes
          for (const barcode of barcodes) {
            await db.itemCode.create({
              data: {
                itemId: item.id,
                codeType: barcode.codeType,
                code: barcode.code,
                isPrimary: barcode.isPrimary,
                companyId,
              },
            })
          }

          itemCodeToIdMap.set(code, item.id)
          results.push({ row: rowNum, code, status: 'created', message: 'تم الإنشاء بنجاح' })
          createdCount++
        }
      } catch (err: any) {
        results.push({ row: rowNum, code, status: 'error', message: err.message || 'Failed to process record' })
        errorCount++
      }
    }

    return NextResponse.json({
      createdCount,
      updatedCount,
      errorCount,
      totalRows: rows.length,
      results,
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes('غير مصرح') || error.message.includes('صلاحية'))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Import items error:', error)
    return NextResponse.json(
      { error: 'Failed to import items' },
      { status: 500 }
    )
  }
}
