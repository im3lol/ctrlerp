'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  Key,
  AlertTriangle,
  Clock,
  Plus,
  Sparkles,
  CheckCircle2,
  XCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Infinity,
  Activity,
  BarChart3,
  FileText,
  ShoppingCart,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Eye,
  CalendarDays,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const ADMIN_TOKEN_KEY = 'ctrl_admin_token'

interface DashboardStats {
  totalTenants: number
  activeTenants: number
  trialTenants: number
  expiredTenants: number
  activePaidLicenses: number
  lifetimeTenants: number
  totalUsers: number
  totalCompanies: number
  totalInvoices: number
  totalPurchaseInvoices: number
  totalItems: number
  totalCustomers: number
  totalSuppliers: number
  trialConversionRate: number
}

interface RevenueStats {
  totalRevenue: number
  monthlyRecurring: number
  lifetimeRevenue: number
  activePaidCount: number
  totalFromRecords: number
  thisMonth: number
  lastMonth: number
}

interface GrowthStats {
  newTenantsThisMonth: number
  newTenantsLastMonth: number
  tenantGrowthPercent: number
  revenueGrowthPercent: number
}

interface ChartData {
  revenueTrend: { month: string; amount: number }[]
  tenantGrowth: { month: string; count: number }[]
  revenueByType: { type: string; totalRevenue: number; monthlyRecurring: number; count: number }[]
  licenseDistribution: { type: string; count: number }[]
  licenseStatusDistribution: { status: string; count: number }[]
}

interface AlertData {
  expiringLicenses: {
    id: string; key: string; type: string; expiresAt: string; daysLeft: number;
    tenant: { id: string; name: string; email: string }
  }[]
  recentlyExpired: {
    id: string; key: string; type: string; expiresAt: string;
    tenant: { id: string; name: string; email: string }
  }[]
}

interface RecentTenant {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string
  createdAt: string
  owner: { id: string; name: string; username: string } | null
  companyCount: number
  license: {
    id: string; type: string; status: string; expiresAt: string; key: string
    isLifetime: boolean; price: number; currency: string
  } | null
}

interface RecentActivity {
  id: string
  action: string
  category: string
  description: string
  performerName: string | null
  targetName: string | null
  createdAt: string
}

interface DashboardData {
  stats: DashboardStats
  revenue: RevenueStats
  growth: GrowthStats
  charts: ChartData
  alerts: AlertData
  recentTenants: RecentTenant[]
  recentActivities: RecentActivity[]
}

const statusLabels: Record<string, string> = {
  active: 'نشط',
  suspended: 'معلق',
  cancelled: 'ملغي',
}

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

const categoryIcons: Record<string, string> = {
  tenant: '🏢',
  license: '🔑',
  auth: '🔐',
  system: '⚙️',
  user: '👤',
}

const categoryColors: Record<string, string> = {
  tenant: 'bg-blue-500/10 text-blue-400',
  license: 'bg-violet-500/10 text-violet-400',
  auth: 'bg-emerald-500/10 text-emerald-400',
  system: 'bg-amber-500/10 text-amber-400',
  user: 'bg-cyan-500/10 text-cyan-400',
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch { return dateStr }
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'الآن'
  if (minutes < 60) return `منذ ${minutes} دقيقة`
  if (hours < 24) return `منذ ${hours} ساعة`
  if (days < 7) return `منذ ${days} يوم`
  return formatDate(dateStr)
}

function getDaysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

// Simple bar chart component
function MiniBarChart({ data, height = 120 }: { data: { month: string; amount: number }[]; height?: number }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.amount), 1)

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const barHeight = max > 0 ? (d.amount / max) * 100 : 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-8 bg-slate-700 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {d.amount.toLocaleString()} EGP
            </div>
            <div
              className={cn(
                'w-full rounded-t transition-all duration-300 min-h-[2px]',
                i === data.length - 1 ? 'bg-violet-500' : 'bg-violet-500/40 hover:bg-violet-500/60'
              )}
              style={{ height: `${Math.max(barHeight, 2)}%` }}
            />
            <span className="text-[9px] text-slate-500 truncate w-full text-center">{d.month.split(' ')[0]}</span>
          </div>
        )
      })}
    </div>
  )
}

// Simple line-style area chart
function MiniAreaChart({ data, height = 100, color = 'violet' }: { data: { month: string; count: number }[]; height?: number; color?: string }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.count), 1)

  const colorMap: Record<string, string> = {
    violet: 'bg-violet-500/30 border-violet-500',
    emerald: 'bg-emerald-500/30 border-emerald-500',
    blue: 'bg-blue-500/30 border-blue-500',
  }
  const fillColor = colorMap[color] || colorMap.violet

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const barHeight = max > 0 ? (d.count / max) * 100 : 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-8 bg-slate-700 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {d.count}
            </div>
            <div
              className={cn('w-full rounded-t transition-all min-h-[2px]', fillColor)}
              style={{ height: `${Math.max(barHeight, 2)}%` }}
            />
            <span className="text-[9px] text-slate-500 truncate w-full text-center">{d.month.split(' ')[0]}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      const res = await fetch('/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        setData(await res.json())
      } else if (res.status === 401) {
        router.replace('/admin/login')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <AlertTriangle className="h-12 w-12 mb-3 text-slate-600" />
        <p className="text-sm">فشل تحميل البيانات</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="mt-3">إعادة المحاولة</Button>
      </div>
    )
  }

  const { stats, revenue, growth, charts, alerts, recentTenants, recentActivities } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gradient-to-bl from-[#7C3AED]/20 to-[#F59E0B]/20 rounded-xl flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-[#7C3AED]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">لوحة تحكم المدير</h1>
            <p className="text-slate-400 text-sm">نظرة عامة على المنصة والمراقبة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push('/admin/analytics')} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2">
            <BarChart3 className="h-4 w-4" />
            التحليلات
          </Button>
          <Button onClick={() => router.push('/admin/tenants')} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
            <Plus className="h-4 w-4" />
            إضافة مستأجر
          </Button>
        </div>
      </div>

      {/* Alerts Section - Expiring & Expired */}
      {(alerts.expiringLicenses.length > 0 || alerts.recentlyExpired.length > 0) && (
        <div className="space-y-3">
          {alerts.expiringLicenses.length > 0 && (
            <Card className="bg-amber-500/5 border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                  <h3 className="text-sm font-semibold text-amber-400">تراخيص تنتهي قريبًا ({alerts.expiringLicenses.length})</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {alerts.expiringLicenses.slice(0, 5).map(l => (
                    <div key={l.id} className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-3 py-1.5">
                      <span className="text-sm text-white">{l.tenant.name}</span>
                      <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                        {l.daysLeft} يوم
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {alerts.recentlyExpired.length > 0 && (
            <Card className="bg-red-500/5 border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="h-5 w-5 text-red-400" />
                  <h3 className="text-sm font-semibold text-red-400">تراخيص منتهية ({alerts.recentlyExpired.length})</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {alerts.recentlyExpired.slice(0, 5).map(l => (
                    <div key={l.id} className="flex items-center gap-2 bg-red-500/10 rounded-lg px-3 py-1.5">
                      <span className="text-sm text-white">{l.tenant.name}</span>
                      <Badge variant="outline" className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">
                        منتهي
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4">
        {[
          { title: 'إجمالي المستأجرين', value: stats.totalTenants, icon: Building2, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', growth: growth.tenantGrowthPercent },
          { title: 'المستأجرون النشطون', value: stats.activeTenants, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { title: 'فترة تجريبية', value: stats.trialTenants, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { title: 'مدى الحياة', value: stats.lifetimeTenants, icon: Infinity, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
          { title: 'منتهي/معلق', value: stats.expiredTenants, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
        ].map((stat) => (
          <Card key={stat.title} className={cn('bg-slate-800/50 border shadow-sm', stat.border)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2.5 rounded-xl', stat.bg)}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 truncate">{stat.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    {stat.growth !== undefined && (
                      <span className={cn('text-xs flex items-center', stat.growth >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {stat.growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(stat.growth)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue + Growth Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'إجمالي الإيرادات', value: `${(revenue?.totalRevenue || 0).toLocaleString()} EGP`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', growth: growth.revenueGrowthPercent },
          { title: 'الاشتراكات المتكررة (MRR)', value: `${(revenue?.monthlyRecurring || 0).toLocaleString()} EGP`, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { title: 'إيرادات مدى الحياة', value: `${(revenue?.lifetimeRevenue || 0).toLocaleString()} EGP`, icon: Infinity, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
          { title: 'اشتراكات مدفوعة', value: revenue?.activePaidCount || 0, icon: Key, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
        ].map((stat) => (
          <Card key={stat.title} className={cn('bg-slate-800/50 border shadow-sm', stat.border)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2.5 rounded-xl', stat.bg)}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 truncate">{stat.title}</p>
                  <div className="flex items-center gap-2">
                    <p className={cn('text-xl font-bold mt-0.5', stat.color)}>{stat.value}</p>
                    {stat.growth !== undefined && (
                      <span className={cn('text-xs flex items-center', stat.growth >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {stat.growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(stat.growth)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Usage Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          استخدام النظام
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'المستخدمون', value: stats.totalUsers, icon: Users },
            { label: 'الشركات', value: stats.totalCompanies, icon: Building2 },
            { label: 'فواتير البيع', value: stats.totalInvoices, icon: FileText },
            { label: 'فواتير الشراء', value: stats.totalPurchaseInvoices, icon: ShoppingCart },
            { label: 'الأصناف', value: stats.totalItems, icon: Package },
            { label: 'العملاء', value: stats.totalCustomers, icon: Users },
            { label: 'الموردين', value: stats.totalSuppliers, icon: Users },
          ].map(m => (
            <Card key={m.label} className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-3 text-center">
                <m.icon className="h-4 w-4 text-slate-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{m.value}</p>
                <p className="text-[10px] text-slate-500">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts Row - Revenue Trend & Tenant Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                اتجاه الإيرادات
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/analytics')} className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 text-xs">
                المزيد <Eye className="h-3 w-3 mr-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {charts.revenueTrend.length > 0 ? (
              <MiniBarChart data={charts.revenueTrend} height={140} />
            ) : (
              <div className="flex items-center justify-center h-36 text-slate-500 text-sm">
                لا توجد بيانات إيرادات بعد
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenant Growth */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                نمو المستأجرين
              </CardTitle>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                +{growth.newTenantsThisMonth} هذا الشهر
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {charts.tenantGrowth.length > 0 ? (
              <MiniAreaChart data={charts.tenantGrowth} height={140} color="blue" />
            ) : (
              <div className="flex items-center justify-center h-36 text-slate-500 text-sm">
                لا توجد بيانات نمو بعد
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* License Distribution + Trial Conversion + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* License Distribution */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-white">توزيع التراخيص</CardTitle>
              <Key className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            {charts.licenseDistribution.length > 0 ? (
              <div className="space-y-3">
                {charts.licenseDistribution.map((item) => {
                  const total = charts.licenseDistribution.reduce((s, d) => s + d.count, 0)
                  const percent = total > 0 ? Math.round((item.count / total) * 100) : 0
                  return (
                    <div key={item.type}>
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className={cn('text-xs', typeColors[item.type] || 'bg-slate-500/10 text-slate-400')}>
                          {typeLabels[item.type] || item.type}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">{item.count}</span>
                          <span className="text-xs text-slate-500">({percent}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            item.type === 'trial' ? 'bg-amber-500' :
                            item.type === 'basic' ? 'bg-blue-500' :
                            item.type === 'professional' ? 'bg-violet-500' :
                            item.type === 'enterprise' ? 'bg-emerald-500' :
                            item.type === 'lifetime' ? 'bg-cyan-500' : 'bg-slate-500'
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {stats.trialConversionRate > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">معدل تحويل التجارب</span>
                      <span className="text-sm font-bold text-emerald-400">{stats.trialConversionRate}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.trialConversionRate}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <Key className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                <p className="text-sm">لا توجد تراخيص بعد</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Type */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-white">الإيرادات حسب النوع</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            {charts.revenueByType.length > 0 ? (
              <div className="space-y-3">
                {charts.revenueByType.map((item) => (
                  <div key={item.type} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-700/30">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-xs', typeColors[item.type] || '')}>
                        {typeLabels[item.type] || item.type}
                      </Badge>
                      <span className="text-xs text-slate-500">{item.count} ترخيص</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-emerald-400">{item.totalRevenue.toLocaleString()} EGP</p>
                      {item.monthlyRecurring > 0 && (
                        <p className="text-[10px] text-blue-400">MRR: {item.monthlyRecurring.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                <p className="text-sm">لا توجد إيرادات بعد</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-400" />
                آخر الأنشطة
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/activity-logs')} className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 text-xs">
                عرض الكل <Eye className="h-3 w-3 mr-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-700/30 transition-colors">
                    <span className="text-sm mt-0.5 shrink-0">{categoryIcons[activity.category] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white leading-relaxed">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {activity.performerName && (
                          <span className={cn('text-[10px] px-1.5 py-0 rounded', categoryColors[activity.category] || 'text-slate-500')}>
                            {activity.performerName}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-600">{timeAgo(activity.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <Activity className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                <p className="text-sm">لا توجد أنشطة بعد</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Tenants */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-white">آخر المستأجرين</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/tenants')} className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10">
              عرض الكل
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentTenants.length > 0 ? (
            <div className="space-y-2">
              {recentTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/tenants?id=${tenant.id}`)}
                >
                  <div className="h-9 w-9 bg-violet-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{tenant.name}</p>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', tenant.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : tenant.status === 'suspended' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20')}>
                        {statusLabels[tenant.status] || tenant.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {tenant.license && (
                        <>
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', typeColors[tenant.license.type] || 'bg-slate-500/10 text-slate-400')}>
                            {typeLabels[tenant.license.type] || tenant.license.type}
                          </Badge>
                          {tenant.license.price > 0 && (
                            <span className="text-[10px] text-emerald-400">
                              {tenant.license.price.toLocaleString()} {tenant.license.currency}
                            </span>
                          )}
                        </>
                      )}
                      <span className="text-xs text-slate-500">{tenant.companyCount} شركة</span>
                    </div>
                  </div>
                  {tenant.license && tenant.license.type === 'trial' && !tenant.license.isLifetime && (
                    <span className={cn('text-xs font-medium', getDaysLeft(tenant.license.expiresAt) <= 3 ? 'text-red-400' : 'text-amber-400')}>
                      {getDaysLeft(tenant.license.expiresAt)} يوم
                    </span>
                  )}
                  {tenant.license?.isLifetime && (
                    <div className="flex items-center gap-1">
                      <Infinity className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-xs font-medium text-cyan-400">مدى الحياة</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Building2 className="h-10 w-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm">لا يوجد مستأجرون بعد</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
