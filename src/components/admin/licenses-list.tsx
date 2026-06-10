'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Key,
  Search,
  Plus,
  Copy,
  CheckCircle2,
  Loader2,
  Filter,
  X,
  Clock,
  ArrowRight,
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
import CreateLicenseDialog from './create-license-dialog'

const ADMIN_TOKEN_KEY = 'ctrl_admin_token'

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
  all: 'الكل',
}

const typeColors: Record<string, string> = {
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  basic: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  professional: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  enterprise: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

interface LicenseRow {
  id: string
  key: string
  type: string
  status: string
  maxUsers: number
  maxCompanies: number
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

export default function LicensesList() {
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

  const fetchLicenses = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      })
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/admin/licenses?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setLicenses(data.licenses)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, statusFilter])

  useEffect(() => {
    fetchLicenses()
  }, [fetchLicenses])

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleExtend = async (licenseId: string, days: number) => {
    setExtendingId(licenseId)
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      const res = await fetch(`/api/admin/licenses/${licenseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ extendDays: days, status: 'active' }),
      })
      if (res.ok) {
        fetchLicenses()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setExtendingId(null)
    }
  }

  const handleStatusChange = async (licenseId: string, status: string) => {
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      const res = await fetch(`/api/admin/licenses/${licenseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        fetchLicenses()
      }
    } catch (err) {
      console.error(err)
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
                  <th className="text-right text-xs font-medium text-slate-400 p-3">الانتهاء</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-violet-400 mx-auto" />
                      <p className="text-sm text-slate-500 mt-2">جاري التحميل...</p>
                    </td>
                  </tr>
                ) : licenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Key className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">لا توجد تراخيص</p>
                      <p className="text-xs text-slate-600 mt-1">ابدأ بإنشاء ترخيص جديد</p>
                    </td>
                  </tr>
                ) : (
                  licenses.map((license) => {
                    const daysLeft = getDaysLeft(license.expiresAt)
                    const isExpired = daysLeft <= 0
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
                          <div>
                            <span className="text-xs text-slate-500">{formatDate(license.expiresAt)}</span>
                            <span className={cn(
                              'block text-xs font-medium',
                              isExpired ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-emerald-400'
                            )}>
                              {isExpired ? 'منتهي' : `${daysLeft} يوم متبقي`}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {isExpired && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExtend(license.id, license.type === 'trial' ? 7 : 30)}
                                disabled={extendingId === license.id}
                                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-7 text-xs gap-1"
                              >
                                {extendingId === license.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                                تمديد
                              </Button>
                            )}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExtend(license.id, 30)}
                              disabled={extendingId === license.id}
                              className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 h-7 text-xs gap-1"
                            >
                              <ArrowRight className="h-3 w-3" />
                              +30 يوم
                            </Button>
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

      {/* Dialog */}
      <CreateLicenseDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={fetchLicenses}
      />
    </div>
  )
}
