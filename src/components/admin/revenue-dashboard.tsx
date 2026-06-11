'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  RefreshCw,
  Loader2,
  AlertTriangle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Key,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  LogIn,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ADMIN_TOKEN_KEY = 'ctrl_admin_token'
const ADMIN_USER_KEY = 'ctrl_admin_user'

const typeLabels: Record<string, string> = {
  trial: 'تجريبي',
  basic: 'أساسي',
  professional: 'احترافي',
  enterprise: 'مؤسسي',
  lifetime: 'مدى الحياة',
}

const typeColors: Record<string, string> = {
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  basic: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  professional: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  enterprise: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  lifetime: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

const typeBarColors: Record<string, string> = {
  trial: '#f59e0b',
  basic: '#3b82f6',
  professional: '#7c3aed',
  enterprise: '#10b981',
  lifetime: '#06b6d4',
}

const recordTypeLabels: Record<string, string> = {
  subscription: 'اشتراك',
  renewal: 'تجديد',
  upgrade: 'ترقية',
  lifetime: 'مدى الحياة',
  trial_extension: 'تمديد تجريبي',
  other: 'أخرى',
}

interface RevenueData {
  summary: {
    totalRevenue: number
    currentMRR: number
    arr: number
    arpu: number
    ltv: number
    avgLifespanMonths: number
    activePaidTenants: number
    totalRecords: number
  }
  monthlyBreakdown: {
    month: string
    subscription: number
    renewal: number
    upgrade: number
    lifetime: number
    trial_extension: number
    other: number
    total: number
  }[]
  revenueByLicenseType: {
    type: string
    amount: number
    count: number
  }[]
  revenueByCurrency: {
    currency: string
    amount: number
    count: number
  }[]
  revenueByRecordType: {
    type: string
    amount: number
    count: number
  }[]
  mrrTrend: {
    month: string
    mrr: number
  }[]
  topTenants: {
    tenantId: string
    name: string
    email: string | null
    status: string
    totalRevenue: number
    recordCount: number
  }[]
  forecast: {
    basedOn: { month: string; amount: number }[]
    projected: { month: string; projectedAmount: number }[]
  }
  records: {
    data: {
      id: string
      amount: number
      currency: string
      type: string
      periodStart: string
      periodEnd: string
      description: string | null
      createdAt: string
      tenant: { id: string; name: string; email: string | null }
      license: { id: string; type: string; key: string } | null
    }[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch { return dateStr }
}

// Multi-bar chart component for revenue trends
function RevenueBreakdownChart({ data }: { data: RevenueData['monthlyBreakdown'] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        لا توجد بيانات إيرادات بعد
      </div>
    )
  }

  const max = Math.max(...data.map(d => d.total), 1)

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1.5" style={{ height: 200 }}>
        {data.map((d, i) => {
          const totalH = max > 0 ? (d.total / max) * 100 : 0

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div className="absolute -top-28 bg-slate-700 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none min-w-[130px]">
                <p className="font-bold mb-1">{d.month}</p>
                {d.subscription > 0 && <p>اشتراكات: {d.subscription.toLocaleString()}</p>}
                {d.lifetime > 0 && <p>مدى الحياة: {d.lifetime.toLocaleString()}</p>}
                {d.renewal > 0 && <p>تجديدات: {d.renewal.toLocaleString()}</p>}
                {d.upgrade > 0 && <p>ترقيات: {d.upgrade.toLocaleString()}</p>}
                <p className="border-t border-slate-600 pt-1 mt-1">الإجمالي: {d.total.toLocaleString()}</p>
              </div>

              {/* Stacked bar */}
              <div className="w-full flex flex-col justify-end" style={{ height: `${Math.max(totalH, 2)}%` }}>
                {d.other > 0 && <div className="w-full bg-slate-500/60 rounded-t" style={{ height: `${(d.other / Math.max(d.total, 1)) * 100}%` }} />}
                {d.upgrade > 0 && <div className="w-full bg-emerald-500/60" style={{ height: `${(d.upgrade / Math.max(d.total, 1)) * 100}%` }} />}
                {d.renewal > 0 && <div className="w-full bg-amber-500/60" style={{ height: `${(d.renewal / Math.max(d.total, 1)) * 100}%` }} />}
                {d.lifetime > 0 && <div className="w-full bg-cyan-500/60" style={{ height: `${(d.lifetime / Math.max(d.total, 1)) * 100}%` }} />}
                {d.subscription > 0 && <div className="w-full bg-violet-500/80" style={{ height: `${(d.subscription / Math.max(d.total, 1)) * 100}%` }} />}
                {d.total === 0 && <div className="w-full bg-slate-700/30 rounded-t min-h-[2px]" />}
              </div>
              <span className="text-[9px] text-slate-500 truncate w-full text-center">{d.month.split(' ')[0]}</span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 justify-center flex-wrap">
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-violet-500/80" /><span className="text-[10px] text-slate-400">اشتراكات</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-cyan-500/60" /><span className="text-[10px] text-slate-400">مدى الحياة</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-amber-500/60" /><span className="text-[10px] text-slate-400">تجديدات</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-emerald-500/60" /><span className="text-[10px] text-slate-400">ترقيات</span></div>
      </div>
    </div>
  )
}

// MRR Line Chart
function MRRTrendChart({ data }: { data: RevenueData['mrrTrend'] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        لا توجد بيانات MRR بعد
      </div>
    )
  }

  const max = Math.max(...data.map(d => d.mrr), 1)
  const min = Math.min(...data.map(d => d.mrr), 0)
  const range = max - min || 1

  const chartWidth = 500
  const chartHeight = 160
  const padding = { top: 20, right: 10, bottom: 25, left: 10 }

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * (chartWidth - padding.left - padding.right),
    y: padding.top + (1 - (d.mrr - min) / range) * (chartHeight - padding.top - padding.bottom),
    ...d,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${points[0].x} ${chartHeight - padding.bottom} Z`

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="min-w-[400px]">
        <path d={areaPath} fill="url(#mrrGradient)" opacity={0.3} />
        <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="#8b5cf6" className="opacity-0 hover:opacity-100 transition-opacity" />
            <text x={p.x} y={chartHeight - 5} textAnchor="middle" className="fill-slate-500 text-[8px]">{p.month.split(' ')[0]}</text>
            <title>{p.month}: {p.mrr.toLocaleString()} EGP</title>
          </g>
        ))}
        <defs>
          <linearGradient id="mrrGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// Horizontal bar chart for revenue by license type
function HorizontalBarChart({ data }: { data: RevenueData['revenueByLicenseType'] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        لا توجد بيانات بعد
      </div>
    )
  }

  const max = Math.max(...data.map(d => d.amount), 1)

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.type}>
          <div className="flex items-center justify-between mb-1">
            <Badge variant="outline" className={cn('text-xs', typeColors[item.type] || '')}>
              {typeLabels[item.type] || item.type}
            </Badge>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{item.count} ترخيص</span>
              <span className="text-sm font-bold text-emerald-400">{item.amount.toLocaleString()} EGP</span>
            </div>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.amount / max) * 100}%`,
                backgroundColor: typeBarColors[item.type] || '#64748b',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function RevenueDashboard() {
  const router = useRouter()
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('1y')
  const [recordPage, setRecordPage] = useState(1)
  const [filterType, setFilterType] = useState('')
  const [filterCurrency, setFilterCurrency] = useState('')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const exportCSV = async () => {
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      const res = await fetch(`/api/admin/reports?type=revenue&period=this_month&format=csv`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'revenue_report.csv'
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error('Export failed:', e)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (!token) {
        router.replace('/admin/login')
        return
      }
      const params = new URLSearchParams({ period, page: String(recordPage), limit: '20' })
      if (filterType) params.set('type', filterType)
      if (filterCurrency) params.set('currency', filterCurrency)

      const res = await fetch(`/api/admin/revenue?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        localStorage.removeItem(ADMIN_USER_KEY)
        router.replace('/admin/login')
        return
      }
      if (res.ok) {
        setData(await res.json())
      } else {
        try {
          const errData = await res.json()
          setErrorMsg(errData.error || errData.message || 'فشل تحميل بيانات الإيرادات')
        } catch {
          setErrorMsg('فشل تحميل بيانات الإيرادات')
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('خطأ في الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }, [period, recordPage, filterType, filterCurrency, router])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <AlertTriangle className="h-12 w-12 mb-3 text-slate-600" />
        <p className="text-sm">{errorMsg || 'فشل تحميل بيانات الإيرادات'}</p>
        <div className="flex items-center gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={fetchData} className="border-slate-600 text-slate-300 hover:bg-slate-700">إعادة المحاولة</Button>
          <Button variant="outline" size="sm" onClick={() => { localStorage.removeItem(ADMIN_TOKEN_KEY); localStorage.removeItem(ADMIN_USER_KEY); router.replace('/admin/login') }} className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-1">
            <LogIn className="h-3.5 w-3.5" />
            إعادة تسجيل الدخول
          </Button>
        </div>
      </div>
    )
  }

  const { summary, monthlyBreakdown, revenueByLicenseType, revenueByCurrency, mrrTrend, topTenants, forecast, records } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gradient-to-bl from-[#10B981]/20 to-[#F59E0B]/20 rounded-xl flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">الإيرادات</h1>
            <p className="text-slate-400 text-sm">تحليلات الإيرادات والاشتراكات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700/50 p-0.5">
            {[
              { value: '1m', label: 'شهر' },
              { value: '3m', label: '3 أشهر' },
              { value: '6m', label: '6 أشهر' },
              { value: '1y', label: 'سنة' },
              { value: 'all', label: 'الكل' },
            ].map(p => (
              <button
                key={p.value}
                onClick={() => { setPeriod(p.value); setRecordPage(1) }}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  period === p.value ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:text-white'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-1">
            <Download className="h-4 w-4" /> تصدير CSV
          </Button>
          <Button onClick={fetchData} variant="outline" size="icon" className="border-slate-600 text-slate-300 hover:bg-slate-700">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-slate-400">MRR (الاشتراكات الشهرية)</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{summary.currentMRR.toLocaleString()} EGP</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-slate-400">ARR (الإيرادات السنوية المتوقعة)</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">{summary.arr.toLocaleString()} EGP</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-violet-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-violet-400" />
              <span className="text-xs text-slate-400">ARPU (متوسط الإيرادات لكل مستخدم)</span>
            </div>
            <p className="text-2xl font-bold text-violet-400">{summary.arpu.toLocaleString()} EGP</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-slate-400">LTV (القيمة الدائمة)</span>
            </div>
            <p className="text-2xl font-bold text-cyan-400">{summary.ltv.toLocaleString()} EGP</p>
            <p className="text-[10px] text-slate-500 mt-1">متوسط {summary.avgLifespanMonths} شهر</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart + Revenue by License Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend Chart */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-400" />
              اتجاه الإيرادات الشهرية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueBreakdownChart data={monthlyBreakdown} />
          </CardContent>
        </Card>

        {/* Revenue by License Type */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-400" />
              الإيرادات حسب نوع الترخيص
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={revenueByLicenseType} />
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Currency + MRR Trend + Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue by Currency */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-400" />
              الإيرادات حسب العملة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByCurrency.length > 0 ? (
              <div className="space-y-3">
                {revenueByCurrency.map((rc) => (
                  <div key={rc.currency} className="p-3 rounded-lg bg-slate-700/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{rc.currency}</span>
                      <span className="text-xs text-slate-500">{rc.count} معاملة</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-400">{rc.amount.toLocaleString()} {rc.currency}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                لا توجد بيانات بعد
              </div>
            )}
          </CardContent>
        </Card>

        {/* MRR Trend */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-400" />
              اتجاه MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MRRTrendChart data={mrrTrend} />
          </CardContent>
        </Card>

        {/* Revenue Forecast */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-400" />
              توقعات الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-[10px] text-slate-500 mb-2">بناءً على بيانات آخر 3 أشهر</p>
              {forecast.basedOn.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-700/20">
                  <span className="text-xs text-slate-400">{m.month}</span>
                  <span className="text-xs text-slate-300">{m.amount.toLocaleString()} EGP</span>
                </div>
              ))}
              <div className="border-t border-slate-700/50 pt-3 mt-3">
                <p className="text-xs text-slate-400 mb-2">التوقعات</p>
                {forecast.projected.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-blue-500/5 border border-blue-500/10 mb-2">
                    <span className="text-xs text-blue-300">{p.month}</span>
                    <span className="text-sm font-bold text-blue-400">{p.projectedAmount.toLocaleString()} EGP</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Tenants by Revenue */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-violet-400" />
            أعلى 20 مستأجر بالإيرادات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topTenants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {topTenants.map((tenant, i) => (
                <div key={tenant.tenantId} className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                      i === 0 ? 'bg-amber-500/20 text-amber-400' :
                      i === 1 ? 'bg-slate-400/20 text-slate-300' :
                      i === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-slate-600/20 text-slate-400'
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{tenant.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">{tenant.recordCount} معاملة</span>
                    <span className="text-sm font-bold text-emerald-400">{tenant.totalRevenue.toLocaleString()} EGP</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
              لا توجد بيانات إيرادات بعد
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Records Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              سجلات الإيرادات
            </CardTitle>
            <span className="text-xs text-slate-500">{records.total} سجل</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={filterType} onValueChange={(v) => { setFilterType(v === '__all__' ? '' : v); setRecordPage(1) }}>
                <SelectTrigger className="w-full sm:w-44 bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="نوع السجل" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="__all__">كل الأنواع</SelectItem>
                  <SelectItem value="subscription">اشتراك</SelectItem>
                  <SelectItem value="renewal">تجديد</SelectItem>
                  <SelectItem value="upgrade">ترقية</SelectItem>
                  <SelectItem value="lifetime">مدى الحياة</SelectItem>
                  <SelectItem value="trial_extension">تمديد تجريبي</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCurrency} onValueChange={(v) => { setFilterCurrency(v === '__all__' ? '' : v); setRecordPage(1) }}>
                <SelectTrigger className="w-full sm:w-36 bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="العملة" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="__all__">كل العملات</SelectItem>
                  {revenueByCurrency.map(rc => (
                    <SelectItem key={rc.currency} value={rc.currency}>{rc.currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-right text-xs font-medium text-slate-400 p-3">التاريخ</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">المستأجر</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">المبلغ</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">النوع</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">الوصف</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-violet-400 mx-auto" />
                      <p className="text-sm text-slate-500 mt-2">جاري التحميل...</p>
                    </td>
                  </tr>
                ) : records.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <CreditCard className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">لا توجد سجلات إيرادات</p>
                    </td>
                  </tr>
                ) : (
                  records.data.map((record) => (
                    <tr key={record.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="p-3 text-xs text-slate-300">{formatDate(record.createdAt)}</td>
                      <td className="p-3">
                        <p className="text-sm text-white">{record.tenant?.name || '—'}</p>
                        {record.license && (
                          <Badge variant="outline" className={cn('text-[9px] mt-0.5', typeColors[record.license.type] || '')}>
                            {typeLabels[record.license.type] || record.license.type}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-bold text-emerald-400">{record.amount.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500 mr-1">{record.currency}</span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] bg-slate-700/50 text-slate-300 border-slate-600">
                          {recordTypeLabels[record.type] || record.type}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-500 max-w-[200px] truncate">{record.description || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {records.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-slate-700/50">
              <p className="text-xs text-slate-500">
                صفحة {records.page} من {records.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={recordPage <= 1}
                  onClick={() => setRecordPage(recordPage - 1)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={recordPage >= records.totalPages}
                  onClick={() => setRecordPage(recordPage + 1)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
