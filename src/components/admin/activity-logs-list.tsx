'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  Filter,
  Loader2,
  Building2,
  Key,
  Shield,
  Settings,
  User,
  Clock,
  AlertTriangle,
  LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ADMIN_TOKEN_KEY = 'ctrl_admin_token'
const ADMIN_USER_KEY = 'ctrl_admin_user'

const categoryLabels: Record<string, string> = {
  tenant: 'المستأجرون',
  license: 'التراخيص',
  auth: 'المصادقة',
  system: 'النظام',
  user: 'المستخدمون',
}

const categoryIcons: Record<string, any> = {
  tenant: Building2,
  license: Key,
  auth: Shield,
  system: Settings,
  user: User,
}

const categoryColors: Record<string, string> = {
  tenant: 'text-blue-400 bg-blue-500/10',
  license: 'text-violet-400 bg-violet-500/10',
  auth: 'text-emerald-400 bg-emerald-500/10',
  system: 'text-amber-400 bg-amber-500/10',
  user: 'text-cyan-400 bg-cyan-500/10',
}

const actionLabels: Record<string, string> = {
  tenant_created: 'إنشاء مستأجر',
  tenant_suspended: 'تعليق مستأجر',
  tenant_activated: 'تفعيل مستأجر',
  tenant_cancelled: 'إلغاء مستأجر',
  tenant_updated: 'تحديث مستأجر',
  license_created: 'إنشاء ترخيص',
  license_activated_months: 'تفعيل ترخيص بأشهر',
  license_activated_lifetime: 'تفعيل ترخيص مدى الحياة',
  license_trial_extended: 'مد فترة تجريبية',
  license_months_extended: 'تمديد اشتراك',
  license_suspended: 'تعليق ترخيص',
  license_reactivated: 'إعادة تفعيل ترخيص',
  license_cancelled: 'إلغاء ترخيص',
  license_updated: 'تحديث ترخيص',
  admin_login: 'تسجيل دخول مدير',
}

const actionColors: Record<string, string> = {
  tenant_created: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  tenant_suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  tenant_activated: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  tenant_cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  license_created: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  license_activated_months: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  license_activated_lifetime: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  license_trial_extended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  license_months_extended: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  license_suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  license_reactivated: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  admin_login: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

interface LogEntry {
  id: string
  action: string
  category: string
  description: string
  performedBy: string | null
  performerName: string | null
  targetType: string | null
  targetId: string | null
  targetName: string | null
  details: string | null
  ipAddress: string | null
  createdAt: string
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
  if (days < 30) return `منذ ${Math.floor(days / 7)} أسبوع`
  return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ActivityLogsList() {
  const router = useRouter()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [categoryCounts, setCategoryCounts] = useState<{ category: string; count: number }[]>([])
  const [errorMsg, setErrorMsg] = useState<string>('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (!token) {
        router.replace('/admin/login')
        return
      }
      const params = new URLSearchParams({ page: String(page), limit: '30' })
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter)

      const res = await fetch(`/api/admin/activity-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        localStorage.removeItem(ADMIN_USER_KEY)
        router.replace('/admin/login')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        if (data.categoryCounts) setCategoryCounts(data.categoryCounts)
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
  }, [page, categoryFilter, router])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-violet-400" />
            سجل الأنشطة
          </h1>
          <p className="text-slate-400 text-sm">{total} نشاط مسجل</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2">
          <Clock className="h-4 w-4" />
          تحديث
        </Button>
      </div>

      {/* Category filter tabs */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setCategoryFilter('all'); setPage(1) }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                categoryFilter === 'all'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 border border-transparent'
              )}
            >
              الكل
            </button>
            {categoryCounts.map(cc => {
              const Icon = categoryIcons[cc.category]
              return (
                <button
                  key={cc.category}
                  onClick={() => { setCategoryFilter(cc.category); setPage(1) }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
                    categoryFilter === cc.category
                      ? cn(categoryColors[cc.category], 'border border-current/30')
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 border border-transparent'
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {categoryLabels[cc.category] || cc.category}
                  <span className="text-xs opacity-60">({cc.count})</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-0">
          {errorMsg ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">{errorMsg}</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={fetchLogs} className="border-slate-600 text-slate-300 hover:bg-slate-700">إعادة المحاولة</Button>
                <Button variant="outline" size="sm" onClick={() => { localStorage.removeItem(ADMIN_TOKEN_KEY); localStorage.removeItem(ADMIN_USER_KEY); router.replace('/admin/login') }} className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-1">
                  <LogIn className="h-3.5 w-3.5" />
                  إعادة تسجيل الدخول
                </Button>
              </div>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400 mx-auto" />
              <p className="text-sm text-slate-500 mt-2">جاري التحميل...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">لا توجد أنشطة مسجلة</p>
              <p className="text-xs text-slate-600 mt-1">ستظهر الأنشطة هنا عند تنفيذ أي إجراء</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {logs.map((log) => {
                const CategoryIcon = categoryIcons[log.category] || Activity
                return (
                  <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-slate-700/20 transition-colors">
                    {/* Category Icon */}
                    <div className={cn('p-2 rounded-lg shrink-0', categoryColors[log.category] || 'bg-slate-500/10 text-slate-400')}>
                      <CategoryIcon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm text-white">{log.description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className={cn('text-[10px]', actionColors[log.action] || 'bg-slate-500/10 text-slate-400 border-slate-500/20')}>
                              {actionLabels[log.action] || log.action}
                            </Badge>
                            {log.performerName && (
                              <span className="text-[10px] text-slate-500">بواسطة: {log.performerName}</span>
                            )}
                            {log.targetName && (
                              <span className="text-[10px] text-slate-600">→ {log.targetName}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <span className="text-[10px] text-slate-500">{timeAgo(log.createdAt)}</span>
                          <span className="block text-[9px] text-slate-600">{formatFullDate(log.createdAt)}</span>
                        </div>
                      </div>

                      {/* Details */}
                      {log.details && (
                        <details className="mt-2">
                          <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">
                            عرض التفاصيل
                          </summary>
                          <pre className="mt-1 p-2 bg-slate-900/50 rounded text-[10px] text-slate-400 overflow-x-auto" dir="ltr">
                            {(() => {
                              try { return JSON.stringify(JSON.parse(log.details), null, 2) } catch { return log.details }
                            })()}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-slate-700/50">
              <p className="text-xs text-slate-500">صفحة {page} من {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="border-slate-600 text-slate-300 hover:bg-slate-700">السابق</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="border-slate-600 text-slate-300 hover:bg-slate-700">التالي</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
