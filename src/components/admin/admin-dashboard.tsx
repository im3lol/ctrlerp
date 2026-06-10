'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  Key,
  AlertTriangle,
  TrendingUp,
  Clock,
  Plus,
  Sparkles,
  CheckCircle2,
  XCircle,
  PauseCircle,
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
    id: string
    type: string
    status: string
    expiresAt: string
    key: string
  } | null
}

interface DashboardData {
  stats: DashboardStats
  recentTenants: RecentTenant[]
  licenseDistribution: { type: string; count: number }[]
  licenseStatusDistribution: { status: string; count: number }[]
}

const statusLabels: Record<string, string> = {
  active: 'نشط',
  suspended: 'معلق',
  cancelled: 'ملغي',
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const typeLabels: Record<string, string> = {
  trial: 'تجريبي',
  basic: 'أساسي',
  professional: 'احترافي',
  enterprise: 'مؤسسي',
}

const typeColors: Record<string, string> = {
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  basic: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  professional: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  enterprise: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getDaysLeft(expiresAt: string): number {
  const now = new Date()
  const expiry = new Date(expiresAt)
  return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

export default function AdminDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedDone, setSeedDone] = useState(false)

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

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSeed = async () => {
    setSeedLoading(true)
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSeedDone(true)
      } else {
        setSeedDone(true) // Already exists
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSeedLoading(false)
    }
  }

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
        <Button variant="outline" size="sm" onClick={fetchData} className="mt-3">
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  const { stats, recentTenants, licenseDistribution } = data

  const statCards = [
    {
      key: 'totalTenants',
      title: 'إجمالي المستأجرين',
      value: stats.totalTenants,
      icon: Building2,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
    },
    {
      key: 'activeTenants',
      title: 'المستأجرون النشطون',
      value: stats.activeTenants,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      key: 'trialTenants',
      title: 'فترة تجريبية',
      value: stats.trialTenants,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      key: 'expiredTenants',
      title: 'منتهي/معلق',
      value: stats.expiredTenants,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    {
      key: 'activePaidLicenses',
      title: 'التراخيص المدفوعة',
      value: stats.activePaidLicenses,
      icon: Key,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
  ]

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
            <p className="text-slate-400 text-sm">نظرة عامة على المنصة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push('/admin/tenants')}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            إضافة مستأجر
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card
            key={stat.key}
            className={cn('bg-slate-800/50 border shadow-sm', stat.border)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2.5 rounded-xl', stat.bg)}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 truncate">{stat.title}</p>
                  <p className="text-2xl font-bold text-white mt-0.5">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribution & Recent Tenants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* License Distribution */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-white">
                توزيع التراخيص
              </CardTitle>
              <Key className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            {licenseDistribution.length > 0 ? (
              <div className="space-y-3">
                {licenseDistribution.map((item) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={cn('text-xs', typeColors[item.type] || 'bg-slate-500/10 text-slate-400')}
                    >
                      {typeLabels[item.type] || item.type}
                    </Badge>
                    <span className="text-lg font-bold text-white">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <Key className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                <p className="text-sm">لا توجد تراخيص بعد</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tenants */}
        <Card className="bg-slate-800/50 border-slate-700/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-white">
                آخر المستأجرين
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/tenants')}
                className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
              >
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentTenants.length > 0 ? (
              <div className="space-y-3">
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
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            statusColors[tenant.status] || 'bg-slate-500/10 text-slate-400'
                          )}
                        >
                          {statusLabels[tenant.status] || tenant.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {tenant.license && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1.5 py-0',
                              typeColors[tenant.license.type] || 'bg-slate-500/10 text-slate-400'
                            )}
                          >
                            {typeLabels[tenant.license.type] || tenant.license.type}
                          </Badge>
                        )}
                        <span className="text-xs text-slate-500">
                          {tenant.companyCount} شركة
                        </span>
                        <span className="text-xs text-slate-600">
                          {formatDate(tenant.createdAt)}
                        </span>
                      </div>
                    </div>
                    {tenant.license && tenant.license.type === 'trial' && (
                      <div className="text-left">
                        <span className={cn(
                          'text-xs font-medium',
                          getDaysLeft(tenant.license.expiresAt) <= 3 ? 'text-red-400' : 'text-amber-400'
                        )}>
                          {getDaysLeft(tenant.license.expiresAt)} يوم
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Building2 className="h-10 w-10 mx-auto mb-2 text-slate-600" />
                <p className="text-sm">لا يوجد مستأجرون بعد</p>
                <p className="text-xs text-slate-600 mt-1">ابدأ بإضافة مستأجر جديد</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Seed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white">
              إجراءات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/admin/tenants')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-slate-600 hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors group"
              >
                <div className="h-10 w-10 rounded-lg bg-slate-700/50 group-hover:bg-violet-500/20 flex items-center justify-center transition-colors">
                  <Building2 className="h-5 w-5 text-slate-400 group-hover:text-violet-400 transition-colors" />
                </div>
                <span className="text-xs text-slate-400 group-hover:text-violet-300 font-medium transition-colors">
                  إضافة مستأجر
                </span>
              </button>
              <button
                onClick={() => router.push('/admin/licenses')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-slate-600 hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors group"
              >
                <div className="h-10 w-10 rounded-lg bg-slate-700/50 group-hover:bg-amber-500/20 flex items-center justify-center transition-colors">
                  <Key className="h-5 w-5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                </div>
                <span className="text-xs text-slate-400 group-hover:text-amber-300 font-medium transition-colors">
                  إنشاء ترخيص
                </span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Seed Admin */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white">
              إعداد النظام
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                إنشاء حساب مدير النظام الافتراضي (اسم المستخدم: platformadmin)
              </p>
              <Button
                onClick={handleSeed}
                disabled={seedLoading || seedDone}
                variant="outline"
                className={cn(
                  'gap-2',
                  seedDone
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                )}
              >
                {seedLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : seedDone ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    تم إنشاء مدير النظام
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    إنشاء مدير النظام
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
