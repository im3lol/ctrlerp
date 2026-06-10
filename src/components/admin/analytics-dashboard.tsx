'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Infinity,
  Key,
  Users,
  Building2,
  Package,
  ShoppingCart,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Loader2,
  RefreshCw,
  Target,
  PieChart,
  AlertTriangle,
  LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
  trial: '#f59e0b',
  basic: '#3b82f6',
  professional: '#7c3aed',
  enterprise: '#10b981',
  lifetime: '#06b6d4',
}

const typeBgColors: Record<string, string> = {
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  basic: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  professional: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  enterprise: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  lifetime: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

interface AnalyticsData {
  revenueTrends: { month: string; subscription: number; lifetime: number; renewal: number; other: number; total: number }[]
  tenantGrowth: { month: string; newTenants: number; activeTenants: number; suspendedTenants: number; totalTenants: number }[]
  licenseTypeDistribution: { type: string; count: number }[]
  licenseStatusDistribution: { status: string; count: number }[]
  revenueByLicenseType: { type: string; count: number; totalRevenue: number; monthlyRecurring: number }[]
  topTenants: any[]
  systemUsage: {
    totalUsers: number; activeUsers: number; totalCompanies: number
    totalSalesInvoices: number; totalPurchaseInvoices: number
    totalItems: number; totalCustomers: number; totalSuppliers: number
  }
  tenantUsage: { id: string; name: string; status: string; companyCount: number; userCount: number }[]
  mrr: number
  arr: number
  trialConversion: {
    totalTrials: number; trialToBasic: number; trialToPro: number
    trialToEnterprise: number; trialToLifetime: number; conversionRate: number
  }
}

// Multi-bar chart component for revenue trends
function RevenueChart({ data }: { data: AnalyticsData['revenueTrends'] }) {
  if (!data.length) return <EmptyChart text="لا توجد بيانات إيرادات بعد" />

  const max = Math.max(...data.map(d => d.total), 1)

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2" style={{ height: 200 }}>
        {data.map((d, i) => {
          const totalH = max > 0 ? (d.total / max) * 100 : 0
          const subH = d.subscription > 0 ? (d.subscription / max) * 100 : 0
          const lifeH = d.lifetime > 0 ? (d.lifetime / max) * 100 : 0
          const renewH = d.renewal > 0 ? (d.renewal / max) * 100 : 0

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div className="absolute -top-24 bg-slate-700 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none min-w-[120px]">
                <p className="font-bold mb-1">{d.month}</p>
                {d.subscription > 0 && <p>اشتراكات: {d.subscription.toLocaleString()}</p>}
                {d.lifetime > 0 && <p>مدى الحياة: {d.lifetime.toLocaleString()}</p>}
                {d.renewal > 0 && <p>تجديدات: {d.renewal.toLocaleString()}</p>}
                <p className="border-t border-slate-600 pt-1 mt-1">الإجمالي: {d.total.toLocaleString()}</p>
              </div>

              {/* Stacked bar */}
              <div className="w-full flex flex-col justify-end" style={{ height: `${Math.max(totalH, 2)}%` }}>
                {d.renewal > 0 && <div className="w-full bg-amber-500/60 rounded-t" style={{ height: `${(renewH / Math.max(totalH, 1)) * 100}%` }} />}
                {d.lifetime > 0 && <div className="w-full bg-cyan-500/60" style={{ height: `${(lifeH / Math.max(totalH, 1)) * 100}%` }} />}
                {d.subscription > 0 && <div className="w-full bg-violet-500/80" style={{ height: `${(subH / Math.max(totalH, 1)) * 100}%` }} />}
                {d.total === 0 && <div className="w-full bg-slate-700/30 rounded-t min-h-[2px]" />}
              </div>
              <span className="text-[9px] text-slate-500 truncate w-full text-center">{d.month.split(' ')[0]}</span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center">
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-violet-500/80" /><span className="text-[10px] text-slate-400">اشتراكات</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-cyan-500/60" /><span className="text-[10px] text-slate-400">مدى الحياة</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-amber-500/60" /><span className="text-[10px] text-slate-400">تجديدات</span></div>
      </div>
    </div>
  )
}

// Tenant growth chart
function TenantGrowthChart({ data }: { data: AnalyticsData['tenantGrowth'] }) {
  if (!data.length) return <EmptyChart text="لا توجد بيانات نمو بعد" />

  const max = Math.max(...data.map(d => d.totalTenants), 1)

  return (
    <div className="flex items-end gap-2" style={{ height: 200 }}>
      {data.map((d, i) => {
        const totalH = max > 0 ? (d.totalTenants / max) * 100 : 0
        const newH = d.newTenants > 0 ? (d.newTenants / max) * 100 : 0

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-16 bg-slate-700 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <p className="font-bold">{d.month}</p>
              <p>الإجمالي: {d.totalTenants}</p>
              <p>جديد: +{d.newTenants}</p>
            </div>
            <div className="w-full relative" style={{ height: `${Math.max(totalH, 2)}%` }}>
              <div className="absolute bottom-0 w-full bg-blue-500/30 rounded-t" style={{ height: '100%' }} />
              <div className="absolute bottom-0 w-full bg-blue-500/80 rounded-t" style={{ height: `${Math.max(newH, 2)}%` }} />
            </div>
            <span className="text-[9px] text-slate-500 truncate w-full text-center">{d.month.split(' ')[0]}</span>
          </div>
        )
      })}
    </div>
  )
}

// Donut chart using SVG
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return <EmptyChart text="لا توجد بيانات" />

  const size = 160
  const strokeWidth = 30
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius

  let currentOffset = 0
  const arcs = segments.map(seg => {
    const percent = seg.value / total
    const dashLength = circumference * percent
    const arc = {
      ...seg,
      percent,
      dashLength,
      offset: currentOffset,
    }
    currentOffset += dashLength
    return arc
  })

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="shrink-0">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgb(51, 65, 85)" strokeWidth={strokeWidth} />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${center} ${center})`}
            className="transition-all duration-500"
          />
        ))}
      </svg>
      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-slate-300">{seg.label}</span>
            <span className="text-xs font-bold text-white mr-auto">{seg.value}</span>
            <span className="text-[10px] text-slate-500">({Math.round((seg.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
      {text}
    </div>
  )
}

export default function AnalyticsDashboard() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('6m')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (!token) {
        router.replace('/admin/login')
        return
      }
      const res = await fetch(`/api/admin/analytics?period=${period}`, {
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
          setErrorMsg(errData.error || errData.message || 'فشل تحميل البيانات')
        } catch {
          setErrorMsg('فشل تحميل البيانات')
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('خطأ في الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }, [period, router])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
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
        <p className="text-sm">{errorMsg || 'فشل تحميل البيانات'}</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gradient-to-bl from-[#7C3AED]/20 to-[#3B82F6]/20 rounded-xl flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-[#7C3AED]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">التحليلات</h1>
            <p className="text-slate-400 text-sm">تحليلات المنصة والإيرادات</p>
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
            ].map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  period === p.value ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:text-white'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button onClick={fetchData} variant="outline" size="icon" className="border-slate-600 text-slate-300 hover:bg-slate-700">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-slate-400">MRR (الاشتراكات الشهرية)</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{data.mrr.toLocaleString()} EGP</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-slate-400">ARR (الإيرادات السنوية المتوقعة)</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">{data.arr.toLocaleString()} EGP</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-violet-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-violet-400" />
              <span className="text-xs text-slate-400">معدل تحويل التجارب</span>
            </div>
            <p className="text-2xl font-bold text-violet-400">{data.trialConversion.conversionRate}%</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Key className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-slate-400">إجمالي التراخيص النشطة</span>
            </div>
            <p className="text-2xl font-bold text-cyan-400">
              {data.licenseTypeDistribution.reduce((s, d) => s + d.count, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends & Tenant Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              اتجاه الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.revenueTrends} />
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              نمو المستأجرين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TenantGrowthChart data={data.tenantGrowth} />
          </CardContent>
        </Card>
      </div>

      {/* License Distribution & Trial Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* License Type Donut */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <PieChart className="h-4 w-4 text-violet-400" />
              توزيع أنواع التراخيص
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              segments={data.licenseTypeDistribution.map(d => ({
                label: typeLabels[d.type] || d.type,
                value: d.count,
                color: typeColors[d.type] || '#64748b',
              }))}
            />
          </CardContent>
        </Card>

        {/* Trial Conversion Funnel */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-400" />
              قمع تحويل التجارب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Total Trials */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300">إجمالي التجارب</span>
                  <span className="text-sm font-bold text-white">{data.trialConversion.totalTrials}</span>
                </div>
                <div className="h-4 bg-amber-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              {/* Converted to Basic */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-sm text-slate-300">تحويل لأساسي</span>
                  </div>
                  <span className="text-sm font-bold text-blue-400">{data.trialConversion.trialToBasic}</span>
                </div>
                <div className="h-3 bg-blue-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${data.trialConversion.totalTrials > 0 ? (data.trialConversion.trialToBasic / data.trialConversion.totalTrials) * 100 : 0}%` }} />
                </div>
              </div>

              {/* Converted to Professional */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-violet-500" />
                    <span className="text-sm text-slate-300">تحويل لاحترافي</span>
                  </div>
                  <span className="text-sm font-bold text-violet-400">{data.trialConversion.trialToPro}</span>
                </div>
                <div className="h-3 bg-violet-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${data.trialConversion.totalTrials > 0 ? (data.trialConversion.trialToPro / data.trialConversion.totalTrials) * 100 : 0}%` }} />
                </div>
              </div>

              {/* Converted to Enterprise */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm text-slate-300">تحويل لمؤسسي</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">{data.trialConversion.trialToEnterprise}</span>
                </div>
                <div className="h-3 bg-emerald-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.trialConversion.totalTrials > 0 ? (data.trialConversion.trialToEnterprise / data.trialConversion.totalTrials) * 100 : 0}%` }} />
                </div>
              </div>

              {/* Converted to Lifetime */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-cyan-500" />
                    <span className="text-sm text-slate-300">تحويل لمدى الحياة</span>
                  </div>
                  <span className="text-sm font-bold text-cyan-400">{data.trialConversion.trialToLifetime}</span>
                </div>
                <div className="h-3 bg-cyan-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${data.trialConversion.totalTrials > 0 ? (data.trialConversion.trialToLifetime / data.trialConversion.totalTrials) * 100 : 0}%` }} />
                </div>
              </div>

              {/* Total Conversion */}
              <div className="mt-4 pt-3 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">إجمالي معدل التحويل</span>
                  <span className="text-2xl font-bold text-emerald-400">{data.trialConversion.conversionRate}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by License Type & Top Tenants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by License Type */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              الإيرادات حسب نوع الترخيص
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenueByLicenseType.length > 0 ? (
              <div className="space-y-3">
                {data.revenueByLicenseType.map((item) => (
                  <div key={item.type} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={cn('text-xs', typeBgColors[item.type] || '')}>
                        {typeLabels[item.type] || item.type}
                      </Badge>
                      <span className="text-xs text-slate-500">{item.count} ترخيص</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-emerald-400">{item.totalRevenue.toLocaleString()} EGP</p>
                      {item.monthlyRecurring > 0 && (
                        <p className="text-[10px] text-blue-400">MRR: {item.monthlyRecurring.toLocaleString()} EGP</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyChart text="لا توجد بيانات إيرادات بعد" />
            )}
          </CardContent>
        </Card>

        {/* Top Tenants by Revenue */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-violet-400" />
              أعلى المستأجرين بالإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topTenants.length > 0 ? (
              <div className="space-y-2">
                {data.topTenants.map((tenant: any, i: number) => (
                  <div key={tenant.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                    <div className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      i === 0 ? 'bg-amber-500/20 text-amber-400' :
                      i === 1 ? 'bg-slate-400/20 text-slate-300' :
                      i === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-slate-600/20 text-slate-400'
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{tenant.name}</p>
                      <p className="text-[10px] text-slate-500">{tenant.recordCount} معاملة</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-400">{tenant.totalRevenue.toLocaleString()} EGP</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyChart text="لا توجد بيانات إيرادات بعد" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Usage Overview */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Package className="h-4 w-4 text-amber-400" />
            نظرة عامة على استخدام النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {[
              { label: 'المستخدمون', value: data.systemUsage.totalUsers, sub: `${data.systemUsage.activeUsers} نشط`, icon: Users, color: 'text-violet-400' },
              { label: 'الشركات', value: data.systemUsage.totalCompanies, icon: Building2, color: 'text-blue-400' },
              { label: 'فواتير البيع', value: data.systemUsage.totalSalesInvoices, icon: FileText, color: 'text-emerald-400' },
              { label: 'فواتير الشراء', value: data.systemUsage.totalPurchaseInvoices, icon: ShoppingCart, color: 'text-amber-400' },
              { label: 'الأصناف', value: data.systemUsage.totalItems, icon: Package, color: 'text-cyan-400' },
              { label: 'العملاء', value: data.systemUsage.totalCustomers, icon: Users, color: 'text-pink-400' },
              { label: 'الموردين', value: data.systemUsage.totalSuppliers, icon: Users, color: 'text-orange-400' },
              { label: 'MRR', value: `${data.mrr.toLocaleString()}`, sub: 'EGP/شهر', icon: DollarSign, color: 'text-emerald-400' },
            ].map(m => (
              <div key={m.label} className="text-center">
                <m.icon className={cn('h-5 w-5 mx-auto mb-1.5', m.color)} />
                <p className={cn('text-lg font-bold', m.color)}>{m.value}</p>
                <p className="text-[10px] text-slate-500">{m.label}</p>
                {m.sub && <p className="text-[9px] text-slate-600">{m.sub}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tenant Usage Table */}
      {data.tenantUsage.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              استخدام المستأجرين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-right text-xs font-medium text-slate-400 p-3">المستأجر</th>
                    <th className="text-right text-xs font-medium text-slate-400 p-3">الحالة</th>
                    <th className="text-right text-xs font-medium text-slate-400 p-3">الشركات</th>
                    <th className="text-right text-xs font-medium text-slate-400 p-3">المستخدمون</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tenantUsage.map(t => (
                    <tr key={t.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="p-3 text-sm text-white">{t.name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={cn('text-[10px]', t.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
                          {t.status === 'active' ? 'نشط' : 'معلق'}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-slate-300">{t.companyCount}</td>
                      <td className="p-3 text-sm text-slate-300">{t.userCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
