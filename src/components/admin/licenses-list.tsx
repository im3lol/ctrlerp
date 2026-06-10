'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Key,
  Plus,
  Copy,
  CheckCircle2,
  Loader2,
  Filter,
  Clock,
  Calendar,
  Infinity,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import CreateLicenseDialog from './create-license-dialog'

const ADMIN_TOKEN_KEY = 'ctrl_admin_token'
const ADMIN_USER_KEY = 'ctrl_admin_user'

const statusLabels: Record<string, string> = {
  active: 'نشط',
  expired: 'منتهي',
  suspended: 'معلق',
  cancelled: 'ملغي',
  all: 'الكل',
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  expired: 'bg-red-500/10 text-red-400 border-red-500/20',
  suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

const typeLabels: Record<string, string> = {
  trial: 'تجريبي',
  basic: 'أساسي',
  professional: 'احترافي',
  enterprise: 'مؤسسي',
  lifetime: 'مدى الحياة',
  all: 'الكل',
}

const typeColors: Record<string, string> = {
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  basic: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  professional: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  enterprise: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  lifetime: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

interface LicenseRow {
  id: string
  key: string
  type: string
  status: string
  maxUsers: number
  maxCompanies: number
  isLifetime: boolean
  price: number
  currency: string
  startedAt: string
  expiresAt: string
  createdAt: string
  tenant: {
    id: string
    name: string
    email: string | null
    status: string
  }
}

function getDaysLeft(expiresAt: string): number {
  const now = new Date()
  const expiry = new Date(expiresAt)
  return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
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

function formatPrice(price: number, currency: string) {
  if (price === 0) return '—'
  return `${price.toLocaleString()} ${currency}`
}

export default function LicensesList() {
  const router = useRouter()
  const [licenses, setLicenses] = useState<LicenseRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [extendingId, setExtendingId] = useState<string | null>(null)
  const [revenue, setRevenue] = useState<{ totalRevenue: number; monthlyRecurring: number; lifetimeRevenue: number; activePaidCount: number } | null>(null)

  // Dialog states for actions
  const [actionDialog, setActionDialog] = useState<{
    type: 'extendTrial' | 'activateMonths' | 'activateLifetime' | 'extendMonths'
    license: LicenseRow | null
  }>({ type: 'extendTrial', license: null })
  const [actionDays, setActionDays] = useState('7')
  const [actionMonths, setActionMonths] = useState('1')
  const [actionPrice, setActionPrice] = useState('')
  const [actionMonthlyPrice, setActionMonthlyPrice] = useState('')
  const [actionCurrency, setActionCurrency] = useState('EGP')
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const fetchLicenses = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (!token) {
        router.replace('/admin/login')
        return
      }
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      })
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/admin/licenses?${params}`, {
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
        setLicenses(data.licenses)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        if (data.revenue) setRevenue(data.revenue)
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
  }, [page, typeFilter, statusFilter, router])

  useEffect(() => {
    fetchLicenses()
  }, [fetchLicenses])

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleStatusChange = async (licenseId: string, status: string) => {
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (!token) {
        router.replace('/admin/login')
        return
      }
      const res = await fetch(`/api/admin/licenses/${licenseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      if (res.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        localStorage.removeItem(ADMIN_USER_KEY)
        router.replace('/admin/login')
        return
      }
      if (res.ok) {
        fetchLicenses()
      } else {
        try {
          const errData = await res.json()
          setErrorMsg(errData.error || errData.message || 'فشل تحديث الحالة')
        } catch {
          setErrorMsg('فشل تحديث الحالة')
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('خطأ في الاتصال بالخادم')
    }
  }

  const handleAction = async () => {
    if (!actionDialog.license) return
    setActionLoading(true)
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (!token) {
        router.replace('/admin/login')
        return
      }
      let body: any = {}

      switch (actionDialog.type) {
        case 'extendTrial':
          body = { extendDays: parseInt(actionDays), status: 'active' }
          break
        case 'activateMonths':
          body = {
            activateMonths: parseInt(actionMonths),
            price: actionPrice ? parseFloat(actionPrice) : undefined,
            monthlyPrice: actionMonthlyPrice ? parseFloat(actionMonthlyPrice) : undefined,
            currency: actionCurrency,
          }
          break
        case 'activateLifetime':
          body = {
            activateLifetime: true,
            price: actionPrice ? parseFloat(actionPrice) : undefined,
            currency: actionCurrency,
          }
          break
        case 'extendMonths':
          body = {
            extendMonths: parseInt(actionMonths),
          }
          break
      }

      const res = await fetch(`/api/admin/licenses/${actionDialog.license.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (res.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        localStorage.removeItem(ADMIN_USER_KEY)
        router.replace('/admin/login')
        return
      }
      if (res.ok) {
        fetchLicenses()
        setActionDialog({ type: 'extendTrial', license: null })
      } else {
        try {
          const errData = await res.json()
          setErrorMsg(errData.error || errData.message || 'فشل تنفيذ الإجراء')
        } catch {
          setErrorMsg('فشل تنفيذ الإجراء')
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('خطأ في الاتصال بالخادم')
    } finally {
      setActionLoading(false)
    }
  }

  const openActionDialog = (type: 'extendTrial' | 'activateMonths' | 'activateLifetime' | 'extendMonths', license: LicenseRow) => {
    setActionDialog({ type, license })
    setActionDays('7')
    setActionMonths('1')
    setActionPrice(license.price > 0 ? String(license.price) : '')
    setActionMonthlyPrice('')
    setActionCurrency(license.currency || 'EGP')
  }

  const getDialogTitle = () => {
    switch (actionDialog.type) {
      case 'extendTrial': return 'مد فترة التجربة'
      case 'activateMonths': return 'تفعيل الاشتراك بالأشهر'
      case 'activateLifetime': return 'تفعيل مدى الحياة'
      case 'extendMonths': return 'تمديد الاشتراك بالأشهر'
    }
  }

  const getDialogIcon = () => {
    switch (actionDialog.type) {
      case 'extendTrial': return <Clock className="h-5 w-5 text-amber-400" />
      case 'activateMonths': return <Calendar className="h-5 w-5 text-blue-400" />
      case 'activateLifetime': return <Infinity className="h-5 w-5 text-cyan-400" />
      case 'extendMonths': return <Calendar className="h-5 w-5 text-violet-400" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">التراخيص</h1>
          <p className="text-slate-400 text-sm">{total} ترخيص</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          إنشاء ترخيص
        </Button>
      </div>

      {/* Revenue Stats */}
      {revenue && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-slate-800/50 border-emerald-500/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-slate-400">إجمالي الإيرادات</span>
              </div>
              <p className="text-xl font-bold text-emerald-400">{revenue.totalRevenue.toLocaleString()} EGP</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-blue-500/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-slate-400">الاشتراكات الشهرية</span>
              </div>
              <p className="text-xl font-bold text-blue-400">{revenue.monthlyRecurring.toLocaleString()} EGP</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-cyan-500/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Infinity className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-slate-400">إيرادات مدى الحياة</span>
              </div>
              <p className="text-xl font-bold text-cyan-400">{revenue.lifetimeRevenue.toLocaleString()} EGP</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-violet-500/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Key className="h-4 w-4 text-violet-400" />
                <span className="text-xs text-slate-400">تراخيص مدفوعة نشطة</span>
              </div>
              <p className="text-xl font-bold text-violet-400">{revenue.activePaidCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40 bg-slate-700/50 border-slate-600 text-white">
                <Filter className="h-4 w-4 text-slate-400 ml-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="trial">تجريبي</SelectItem>
                <SelectItem value="basic">أساسي</SelectItem>
                <SelectItem value="professional">احترافي</SelectItem>
                <SelectItem value="enterprise">مؤسسي</SelectItem>
                <SelectItem value="lifetime">مدى الحياة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40 bg-slate-700/50 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="expired">منتهي</SelectItem>
                <SelectItem value="suspended">معلق</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-right text-xs font-medium text-slate-400 p-3">مفتاح الترخيص</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">المستأجر</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">النوع</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">الحالة</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">سعر الاشتراك</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">الانتهاء</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {errorMsg ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <AlertTriangle className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">{errorMsg}</p>
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <Button variant="outline" size="sm" onClick={fetchLicenses} className="border-slate-600 text-slate-300 hover:bg-slate-700">إعادة المحاولة</Button>
                        <Button variant="outline" size="sm" onClick={() => { localStorage.removeItem(ADMIN_TOKEN_KEY); localStorage.removeItem(ADMIN_USER_KEY); router.replace('/admin/login') }} className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-1">
                          <LogIn className="h-3.5 w-3.5" />
                          إعادة تسجيل الدخول
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-violet-400 mx-auto" />
                      <p className="text-sm text-slate-500 mt-2">جاري التحميل...</p>
                    </td>
                  </tr>
                ) : licenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Key className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">لا توجد تراخيص</p>
                      <p className="text-xs text-slate-600 mt-1">ابدأ بإنشاء ترخيص جديد</p>
                    </td>
                  </tr>
                ) : (
                  licenses.map((license) => {
                    const daysLeft = getDaysLeft(license.expiresAt)
                    const isExpired = daysLeft <= 0 && !license.isLifetime
                    return (
                      <tr
                        key={license.id}
                        className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded font-mono" dir="ltr">
                              {license.key}
                            </code>
                            <button
                              onClick={() => copyKey(license.key)}
                              className="text-slate-400 hover:text-violet-400 transition-colors"
                            >
                              {copiedKey === license.key ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="text-sm text-white">{license.tenant.name}</p>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={cn(typeColors[license.type] || 'bg-slate-500/10 text-slate-400')}
                          >
                            {typeLabels[license.type] || license.type}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={cn(statusColors[license.status] || 'bg-slate-500/10 text-slate-400')}
                          >
                            {statusLabels[license.status] || license.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className={cn('text-sm', license.price > 0 ? 'text-emerald-400 font-medium' : 'text-slate-600')}>
                            {formatPrice(license.price, license.currency)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div>
                            {license.isLifetime ? (
                              <div className="flex items-center gap-1">
                                <Infinity className="h-3.5 w-3.5 text-cyan-400" />
                                <span className="text-xs font-medium text-cyan-400">مدى الحياة</span>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs text-slate-500">{formatDate(license.expiresAt)}</span>
                                <span className={cn(
                                  'block text-xs font-medium',
                                  isExpired ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-emerald-400'
                                )}>
                                  {isExpired ? 'منتهي' : `${daysLeft} يوم متبقي`}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* Trial: Extend days */}
                            {license.type === 'trial' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openActionDialog('extendTrial', license)}
                                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-7 text-xs gap-1"
                              >
                                <Clock className="h-3 w-3" />
                                مد التجربة
                              </Button>
                            )}

                            {/* Activate with months */}
                            {(license.type === 'trial' || isExpired || license.status !== 'active') && !license.isLifetime && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openActionDialog('activateMonths', license)}
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-7 text-xs gap-1"
                              >
                                <Calendar className="h-3 w-3" />
                                تفعيل بأشهر
                              </Button>
                            )}

                            {/* Activate lifetime */}
                            {!license.isLifetime && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openActionDialog('activateLifetime', license)}
                                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-7 text-xs gap-1"
                              >
                                <Infinity className="h-3 w-3" />
                                مدى الحياة
                              </Button>
                            )}

                            {/* Extend months for active subscriptions */}
                            {license.status === 'active' && !license.isLifetime && license.type !== 'trial' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openActionDialog('extendMonths', license)}
                                className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 h-7 text-xs gap-1"
                              >
                                <Calendar className="h-3 w-3" />
                                تمديد
                              </Button>
                            )}

                            {/* Suspend */}
                            {license.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(license.id, 'suspended')}
                                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-7 text-xs gap-1"
                              >
                                تعليق
                              </Button>
                            )}

                            {/* Reactivate suspended */}
                            {license.status === 'suspended' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(license.id, 'active')}
                                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 text-xs gap-1"
                              >
                                تفعيل
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-slate-700/50">
              <p className="text-xs text-slate-500">
                صفحة {page} من {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create License Dialog */}
      <CreateLicenseDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={fetchLicenses}
      />

      {/* Action Dialog */}
      <Dialog
        open={!!actionDialog.license}
        onOpenChange={(open) => {
          if (!open) setActionDialog({ type: 'extendTrial', license: null })
        }}
      >
        <DialogContent className="bg-slate-800 border-slate-700/50 text-white max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              {getDialogIcon()}
              {getDialogTitle()}
            </DialogTitle>
          </DialogHeader>

          {actionDialog.license && (
            <div className="space-y-4">
              {/* License info */}
              <div className="bg-slate-700/30 rounded-lg p-3">
                <p className="text-sm text-white font-medium">{actionDialog.license.tenant.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={cn('text-xs', typeColors[actionDialog.license.type] || '')}
                  >
                    {typeLabels[actionDialog.license.type] || actionDialog.license.type}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', statusColors[actionDialog.license.status] || '')}
                  >
                    {statusLabels[actionDialog.license.status] || actionDialog.license.status}
                  </Badge>
                </div>
              </div>

              {/* Extend Trial: Days input */}
              {actionDialog.type === 'extendTrial' && (
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">عدد الأيام للمد</Label>
                  <Input
                    type="number"
                    value={actionDays}
                    onChange={(e) => setActionDays(e.target.value)}
                    min="1"
                    max="365"
                    className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500"
                    dir="ltr"
                  />
                  <p className="text-xs text-slate-500">سيتم إضافة {actionDays} يوم للفترة التجريبية</p>
                </div>
              )}

              {/* Activate/Extend Months */}
              {(actionDialog.type === 'activateMonths' || actionDialog.type === 'extendMonths') && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">عدد الأشهر</Label>
                    <Input
                      type="number"
                      value={actionMonths}
                      onChange={(e) => setActionMonths(e.target.value)}
                      min="1"
                      max="120"
                      className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500"
                      dir="ltr"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActionMonths('1')}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      شهر
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActionMonths('3')}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      3 أشهر
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActionMonths('12')}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      سنة
                    </Button>
                  </div>
                </div>
              )}

              {/* Price input for activation */}
              {(actionDialog.type === 'activateMonths' || actionDialog.type === 'activateLifetime') && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        سعر الاشتراك
                      </Label>
                      <Input
                        type="number"
                        value={actionPrice}
                        onChange={(e) => setActionPrice(e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="0"
                        className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500"
                        dir="ltr"
                      />
                    </div>
                    {actionDialog.type === 'activateMonths' && (
                      <div className="space-y-2">
                        <Label className="text-slate-300 text-sm flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          الشهري (MRR)
                        </Label>
                        <Input
                          type="number"
                          value={actionMonthlyPrice}
                          onChange={(e) => setActionMonthlyPrice(e.target.value)}
                          min="0"
                          step="0.01"
                          placeholder="0"
                          className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500"
                          dir="ltr"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">العملة</Label>
                      <Select value={actionCurrency} onValueChange={setActionCurrency}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="EGP">EGP</SelectItem>
                          <SelectItem value="SAR">SAR</SelectItem>
                          <SelectItem value="AED">AED</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">الاشتراك الشهري يُستخدم لحساب MRR/ARR</p>
                </div>
              )}

              {/* Lifetime confirmation */}
              {actionDialog.type === 'activateLifetime' && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Infinity className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-medium text-cyan-400">تفعيل مدى الحياة</span>
                  </div>
                  <p className="text-xs text-slate-400">سيتم تفعيل الترخيص للأبد بدون تاريخ انتهاء</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActionDialog({ type: 'extendTrial', license: null })}
              disabled={actionLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleAction}
              disabled={actionLoading}
              className={cn(
                'text-white gap-2',
                actionDialog.type === 'activateLifetime'
                  ? 'bg-cyan-600 hover:bg-cyan-700'
                  : actionDialog.type === 'extendTrial'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-violet-600 hover:bg-violet-700'
              )}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري التنفيذ...
                </>
              ) : (
                'تأكيد'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
