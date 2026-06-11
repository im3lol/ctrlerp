import { NextResponse } from 'next/server'

/**
 * Export data as CSV file
 */
export function exportToCSV(data: Record<string, any>[], filename: string, columns?: { key: string; label: string }[]): NextResponse {
  // Determine columns
  const cols = columns || (data.length > 0 
    ? Object.keys(data[0]).map(key => ({ key, label: key }))
    : [])
  
  // Build CSV content
  const header = cols.map(c => `"${c.label}"`).join(',')
  const rows = data.map(row => 
    cols.map(c => {
      const value = row[c.key]
      if (value === null || value === undefined) return '""'
      if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      return `"${String(value).replace(/"/g, '""')}"`
    }).join(',')
  )
  
  const csv = '\uFEFF' + [header, ...rows].join('\n') // BOM for Arabic support
  
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  })
}

/**
 * Export data as JSON file
 */
export function exportToJSON(data: any, filename: string): NextResponse {
  const json = JSON.stringify(data, null, 2)
  
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.json"`,
    },
  })
}

/**
 * Format a number for display in reports
 */
export function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString('ar-EG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format currency for display in reports
 */
export function formatCurrency(amount: number, currency = 'EGP'): string {
  return amount.toLocaleString('ar-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  })
}

/**
 * Calculate percentage change between two values
 */
export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0
  return ((newValue - oldValue) / oldValue) * 100
}

/**
 * Report date range helper
 */
export function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  let start: Date

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      break
    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0)
      end.setDate(end.getDate() - 1)
      break
    case 'this_week':
      const dayOfWeek = now.getDay()
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0)
      break
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      break
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
      end.setDate(0) // Last day of previous month
      break
    case 'this_quarter':
      const quarter = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0)
      break
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      break
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  }

  return { start, end }
}

/**
 * Get period label in Arabic
 */
export function getPeriodLabel(period: string): string {
  const labels: Record<string, string> = {
    today: 'اليوم',
    yesterday: 'أمس',
    this_week: 'هذا الأسبوع',
    this_month: 'هذا الشهر',
    last_month: 'الشهر الماضي',
    this_quarter: 'هذا الربع',
    this_year: 'هذا العام',
  }
  return labels[period] || period
}
