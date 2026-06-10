'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Heart,
  Database,
  Clock,
  Cpu,
  Users,
  UserX,
  Key,
  AlertTriangle,
  Building2,
  RefreshCw,
  Loader2,
  HardDrive,
  MemoryStick,
  Server,
  ArrowRight,
  Activity,
  Shield,
  FileText,
  ShoppingCart,
  Package,
  CreditCard,
  TrendingDown,
  LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const ADMIN_TOKEN_KEY = 'ctrl_admin_token'
const ADMIN_USER_KEY = 'ctrl_admin_user'

interface SystemHealthData {
  database: {
    status: string
    responseTimeMs: number
    recordCounts: {
      tenants: number
      licenses: number
      licenseHistories: number
      activityLogs: number
      revenueRecords: number
      platformAdmins: number
      platformAdminTokens: number
      users: number
      companies: number
      companyUsers: number
    }
  }
  users: {
    active: number
    inactive: number
    total: number
  }
  licenses: {
    active: number
    expired: number
    suspended: number
    cancelled: number
    total: number
  }
  recentLogins: {
    last24h: number
    last7d: number
    last30d: number
  }
  system: {
    uptime: {
      seconds: number
      formatted: string
      days: number
      hours: number
      minutes: number
    }
    memory: {
      rss: { bytes: number; mb: number; formatted: string }
      heapTotal: { bytes: number; mb: number; formatted: string }
      heapUsed: { bytes: number; mb: number; formatted: string }
      external: { bytes: number; mb: number; formatted: string }
      arrayBuffers: { bytes: number; mb: number; formatted: string }
    }
  }
  licenseWarnings: {
    expiring1Day: number
    expiring3Days: number
    expiring7Days: number
    expiring14Days: number
    expiring30Days: number
  }
  tenants: {
    statusBreakdown: { status: string; count: number }[]
    averageTenantsPerMonth: number
    churnRate: number
    cancelledTenants: number
    totalTenants: number
  }
}

const warningConfigs = [
  { key: 'expiring1Day' as const, label: 'يوم واحد', color: 'bg-red-500', textColor: 'text-red-400', borderColor: 'border-red-500/30', bgColor: 'bg-red-500/5' },
  { key: 'expiring3Days' as const, label: '3 أيام', color: 'bg-orange-500', textColor: 'text-orange-400', borderColor: 'border-orange-500/30', bgColor: 'bg-orange-500/5' },
  { key: 'expiring7Days' as const, label: '7 أيام', color: 'bg-amber-500', textColor: 'text-amber-400', borderColor: 'border-amber-500/30', bgColor: 'bg-amber-500/5' },
  { key: 'expiring14Days' as const, label: '14 يوم', color: 'bg-yellow-500', textColor: 'text-yellow-400', borderColor: 'border-yellow-500/30', bgColor: 'bg-yellow-500/5' },
  { key: 'expiring30Days' as const, label: '30 يوم', color: 'bg-blue-500', textColor: 'text-blue-400', borderColor: 'border-blue-500/30', bgColor: 'bg-blue-500/5' },
]

const tenantStatusLabels: Record<string, string> = {
  active: 'نشط',
  suspended: 'معلق',
  cancelled: 'ملغي',
}

const tenantStatusColors: Record<string, string> = {
  active: '#10b981',
  suspended: '#f59e0b',
  cancelled: '#ef4444',
}

const recordLabels: Record<string, { label: string; icon: typeof Users }> = {
  tenants: { label: 'المستأجرون', icon: Building2 },
  licenses: { label: 'التراخيص', icon: Key },
  licenseHistories: { label: 'سجل التراخيص', icon: FileText },
  activityLogs: { label: 'سجل الأنشطة', icon: Activity },
  revenueRecords: { label: 'سجلات الإيرادات', icon: CreditCard },
  platformAdmins: { label: 'المديرون', icon: Shield },
  platformAdminTokens: { label: 'رموز المديرين', icon: Key },
  users: { label: 'المستخدمون', icon: Users },
  companies: { label: 'الشركات', icon: Building2 },
  companyUsers: { label: 'مستخدمو الشركات', icon: Users },
}

// Donut chart using SVG
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        لا توجد بيانات
      </div>
    )
  }

  const size = 140
  const strokeWidth = 28
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius

  // Compute arc offsets using reduce to avoid reassigning variables
  const arcs = segments.reduce<{ offset: number; dashLength: number; percent: number; label: string; value: number; color: string }[]>((acc, seg, i) => {
    const percent = seg.value / total
    const dashLength = circumference * percent
    const prevOffset = i === 0 ? 0 : acc[i - 1].offset + acc[i - 1].dashLength
    acc.push({ ...seg, percent, dashLength, offset: prevOffset })
    return acc
  }, [])

  return (
    <div className="flex items-center gap-4">
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
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-slate-300">{seg.label}</span>
            <span className="text-xs font-bold text-white mr-auto">{seg.value}</span>
            <span className="text-[10px] text-slate-500">({Math.round((seg.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SystemHealth() {
  const router = useRouter()
  const [data, setData] = useState<SystemHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    setErrorMsg('')
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (!token) {
        router.replace('/admin/login')
        return
      }
      const res = await fetch('/api/admin/system-health', {
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
        setLastRefresh(new Date())
      } else {
        try {
          const errData = await res.json()
          setErrorMsg(errData.error || errData.message || 'فشل تحميل بيانات صحة النظام')
        } catch {
          setErrorMsg('فشل تحميل بيانات صحة النظام')
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('خطأ في الاتصال بالخادم')
    } finally {
      setLoading(false)
      setRefreshing(false)
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
        <p className="text-sm">{errorMsg || 'فشل تحميل بيانات صحة النظام'}</p>
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

  const { database, users, licenses, recentLogins, system, licenseWarnings, tenants } = data

  const memoryPercent = system.memory.heapTotal.mb > 0
    ? Math.round((system.memory.heapUsed.mb / system.memory.heapTotal.mb) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gradient-to-bl from-[#10B981]/20 to-[#06B6D4]/20 rounded-xl flex items-center justify-center">
            <Heart className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">صحة النظام</h1>
            <p className="text-slate-400 text-sm">مراقبة حالة النظام والأداء</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-slate-500">
              آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA')}
            </span>
          )}
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Row 1: System Status + User Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Status Card */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-400" />
              حالة النظام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* DB Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-3 w-3 rounded-full',
                  database.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                )} />
                <div>
                  <p className="text-sm text-white">قاعدة البيانات</p>
                  <p className="text-[10px] text-slate-500">{database.responseTimeMs}ms استجابة</p>
                </div>
              </div>
              <Badge variant="outline" className={cn(
                'text-xs',
                database.status === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              )}>
                {database.status === 'connected' ? 'متصل' : 'غير متصل'}
              </Badge>
            </div>

            {/* Uptime */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-sm text-white">وقت التشغيل</p>
                  <p className="text-[10px] text-slate-500">منذ بدء الخادم</p>
                </div>
              </div>
              <span className="text-sm font-bold text-blue-400">{system.uptime.formatted}</span>
            </div>

            {/* Memory Usage */}
            <div className="p-3 rounded-lg bg-slate-700/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MemoryStick className="h-4 w-4 text-violet-400" />
                  <span className="text-sm text-white">استخدام الذاكرة</span>
                </div>
                <span className="text-xs text-slate-400">{memoryPercent}%</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500">RSS</span>
                    <span className="text-[10px] text-slate-400">{system.memory.rss.formatted}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, (system.memory.rss.mb / (system.memory.heapTotal.mb * 2)) * 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500">Heap Total</span>
                    <span className="text-[10px] text-slate-400">{system.memory.heapTotal.formatted}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500">Heap Used</span>
                    <span className="text-[10px] text-slate-400">{system.memory.heapUsed.formatted}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${memoryPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Activity Card */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              نشاط المستخدمين
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active/Inactive Users */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-slate-400">نشطون</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{users.active}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {users.total > 0 ? Math.round((users.active / users.total) * 100) : 0}% من الإجمالي
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <UserX className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-slate-400">غير نشطين</span>
                </div>
                <p className="text-2xl font-bold text-red-400">{users.inactive}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {users.total > 0 ? Math.round((users.inactive / users.total) * 100) : 0}% من الإجمالي
                </p>
              </div>
            </div>

            {/* Recent Logins */}
            <div className="p-3 rounded-lg bg-slate-700/30">
              <p className="text-sm text-white mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-400" />
                عمليات تسجيل الدخول الأخيرة
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">آخر 24 ساعة</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${recentLogins.last30d > 0 ? Math.max(5, (recentLogins.last24h / recentLogins.last30d) * 100) : 0}%` }} />
                    </div>
                    <span className="text-sm font-bold text-emerald-400">{recentLogins.last24h}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">آخر 7 أيام</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${recentLogins.last30d > 0 ? Math.max(5, (recentLogins.last7d / recentLogins.last30d) * 100) : 0}%` }} />
                    </div>
                    <span className="text-sm font-bold text-blue-400">{recentLogins.last7d}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">آخر 30 يوم</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                    <span className="text-sm font-bold text-violet-400">{recentLogins.last30d}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* License Status */}
            <div className="p-3 rounded-lg bg-slate-700/30">
              <p className="text-sm text-white mb-3 flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-400" />
                حالة التراخيص
              </p>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">{licenses.active}</p>
                  <p className="text-[10px] text-slate-500">نشطة</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-400">{licenses.expired}</p>
                  <p className="text-[10px] text-slate-500">منتهية</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-400">{licenses.suspended}</p>
                  <p className="text-[10px] text-slate-500">معلقة</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-400">{licenses.cancelled}</p>
                  <p className="text-[10px] text-slate-500">ملغاة</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: License Warnings + Tenant Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* License Warnings Card */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                تحذيرات التراخيص
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/licenses')}
                className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 text-xs gap-1"
              >
                عرض الكل <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3">
              {warningConfigs.map((wc) => (
                <div key={wc.key} className={cn('p-3 rounded-xl border text-center', wc.bgColor, wc.borderColor)}>
                  <p className={cn('text-2xl font-bold', wc.textColor)}>{licenseWarnings[wc.key]}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{wc.label}</p>
                  <div className={cn('h-1 w-8 rounded-full mx-auto mt-2', wc.color)} />
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-slate-700/30">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">إجمالي التراخيص المنتهية قريباً</span>
                <span className="text-sm font-bold text-amber-400">{licenseWarnings.expiring30Days}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tenant Status Card */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-violet-400" />
                حالة المستأجرين
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/tenants')}
                className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 text-xs gap-1"
              >
                عرض الكل <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <DonutChart
              segments={tenants.statusBreakdown.map(sb => ({
                label: tenantStatusLabels[sb.status] || sb.status,
                value: sb.count,
                color: tenantStatusColors[sb.status] || '#64748b',
              }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-700/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">متوسط المستأجرين/شهر</span>
                  <span className="text-sm font-bold text-blue-400">{tenants.averageTenantsPerMonth}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-700/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">إجمالي المستأجرين</span>
                  <span className="text-sm font-bold text-white">{tenants.totalTenants}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Database Records + Churn Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Database Records Card */}
        <Card className="bg-slate-800/50 border-slate-700/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-400" />
              سجلات قاعدة البيانات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(database.recordCounts).map(([key, count]) => {
                const config = recordLabels[key]
                if (!config) return null
                return (
                  <div key={key} className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                    <config.icon className="h-4 w-4 text-slate-500 mb-2" />
                    <p className="text-lg font-bold text-white">{count.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500">{config.label}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Churn Rate Card */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              معدل الفقد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative h-32 w-32 mb-4">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgb(51, 65, 85)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={tenants.churnRate > 10 ? '#ef4444' : tenants.churnRate > 5 ? '#f59e0b' : '#10b981'}
                    strokeWidth="10"
                    strokeDasharray={`${(tenants.churnRate / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">{tenants.churnRate}%</span>
                  <span className="text-[10px] text-slate-500">معدل الفقد</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">
                {tenants.cancelledTenants} مستأجر ملغي من أصل {tenants.totalTenants}
              </p>
              <div className={cn(
                'mt-3 px-3 py-1 rounded-full text-xs',
                tenants.churnRate > 10 ? 'bg-red-500/10 text-red-400' :
                tenants.churnRate > 5 ? 'bg-amber-500/10 text-amber-400' :
                'bg-emerald-500/10 text-emerald-400'
              )}>
                {tenants.churnRate > 10 ? 'مرتفع' : tenants.churnRate > 5 ? 'متوسط' : 'منخفض'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
