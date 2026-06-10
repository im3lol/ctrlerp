'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pause,
  Play,
  Trash2,
  Loader2,
  Filter,
  X,
  Infinity,
  AlertTriangle,
  LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CreateTenantDialog from './create-tenant-dialog'
import TenantDetailDialog from './tenant-detail-dialog'

const ADMIN_TOKEN_KEY = 'ctrl_admin_token'
const ADMIN_USER_KEY = 'ctrl_admin_user'

const statusLabels: Record<string, string> = {
  active: 'نشط',
  suspended: 'معلق',
  cancelled: 'ملغي',
  all: 'الكل',
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
  lifetime: 'مدى الحياة',
}

const typeColors: Record<string, string> = {
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  basic: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  professional: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  enterprise: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  lifetime: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

interface TenantRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string
  ownerId: string | null
  owner: { id: string; name: string; username: string } | null
  createdAt: string
  companyCount: number
  license: {
    id: string
    type: string
    status: string
    expiresAt: string
    key: string
    isLifetime: boolean
    price: number
    currency: string
  } | null
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

export default function TenantsList() {
  const router = useRouter()
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const fetchTenants = useCallback(async () => {
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
      if (search) params.set('search', search)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/admin/tenants?${params}`, {
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
        setTenants(data.tenants)
        setTotal(data.total)
        setTotalPages(data.totalPages)
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
  }, [page, search, statusFilter, router])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  // Check URL for initial tenant ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) setDetailId(id)
  }, [])

  const handleStatusChange = async (tenantId: string, newStatus: string) => {
    setActionLoading(tenantId)
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (!token) {
        router.replace('/admin/login')
        return
      }
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        localStorage.removeItem(ADMIN_USER_KEY)
        router.replace('/admin/login')
        return
      }
      if (res.ok) {
        fetchTenants()
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
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (tenantId: string) => {
    if (!confirm('هل أنت متأكد من حذف (إلغاء) هذا المستأجر؟')) return
    setActionLoading(tenantId)
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (!token) {
        router.replace('/admin/login')
        return
      }
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        localStorage.removeItem(ADMIN_USER_KEY)
        router.replace('/admin/login')
        return
      }
      if (res.ok) {
        fetchTenants()
      } else {
        try {
          const errData = await res.json()
          setErrorMsg(errData.error || errData.message || 'فشل حذف المستأجر')
        } catch {
          setErrorMsg('فشل حذف المستأجر')
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('خطأ في الاتصال بالخادم')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">المستأجرون</h1>
          <p className="text-slate-400 text-sm">{total} مستأجر</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة مستأجر
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="بحث بالاسم أو البريد أو الهاتف..."
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 pr-9 focus:border-violet-500"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setPage(1) }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40 bg-slate-700/50 border-slate-600 text-white">
                <Filter className="h-4 w-4 text-slate-400 ml-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
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
                  <th className="text-right text-xs font-medium text-slate-400 p-3">المستأجر</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">الحالة</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">الترخيص</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">الشركات</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3">تاريخ الإنشاء</th>
                  <th className="text-right text-xs font-medium text-slate-400 p-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {errorMsg ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <AlertTriangle className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">{errorMsg}</p>
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <Button variant="outline" size="sm" onClick={fetchTenants} className="border-slate-600 text-slate-300 hover:bg-slate-700">إعادة المحاولة</Button>
                        <Button variant="outline" size="sm" onClick={() => { localStorage.removeItem(ADMIN_TOKEN_KEY); localStorage.removeItem(ADMIN_USER_KEY); router.replace('/admin/login') }} className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-1">
                          <LogIn className="h-3.5 w-3.5" />
                          إعادة تسجيل الدخول
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-violet-400 mx-auto" />
                      <p className="text-sm text-slate-500 mt-2">جاري التحميل...</p>
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">لا يوجد مستأجرون</p>
                      <p className="text-xs text-slate-600 mt-1">ابدأ بإضافة مستأجر جديد</p>
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="p-3">
                        <div
                          className="cursor-pointer"
                          onClick={() => setDetailId(tenant.id)}
                        >
                          <p className="text-sm font-medium text-white">{tenant.name}</p>
                          <p className="text-xs text-slate-500" dir="ltr">
                            {tenant.email || tenant.phone || '—'}
                          </p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={cn(statusColors[tenant.status] || 'bg-slate-500/10 text-slate-400')}
                        >
                          {statusLabels[tenant.status] || tenant.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {tenant.license ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={cn(typeColors[tenant.license.type] || 'bg-slate-500/10 text-slate-400')}
                              >
                                {typeLabels[tenant.license.type] || tenant.license.type}
                              </Badge>
                              {tenant.license.isLifetime && (
                                <Infinity className="h-3 w-3 text-cyan-400" />
                              )}
                            </div>
                            {tenant.license.isLifetime ? (
                              <span className="block text-xs mt-1 text-cyan-400">مدى الحياة</span>
                            ) : tenant.license.type === 'trial' ? (
                              <span className={cn(
                                'block text-xs mt-1',
                                getDaysLeft(tenant.license.expiresAt) <= 3 ? 'text-red-400' : 'text-amber-400'
                              )}>
                                {getDaysLeft(tenant.license.expiresAt)} يوم متبقي
                              </span>
                            ) : (
                              <span className={cn(
                                'block text-xs mt-1',
                                getDaysLeft(tenant.license.expiresAt) <= 0 ? 'text-red-400' : getDaysLeft(tenant.license.expiresAt) <= 7 ? 'text-amber-400' : 'text-emerald-400'
                              )}>
                                {getDaysLeft(tenant.license.expiresAt) <= 0 ? 'منتهي' : `${getDaysLeft(tenant.license.expiresAt)} يوم`}
                              </span>
                            )}
                            {tenant.license.price > 0 && (
                              <span className="block text-[10px] mt-0.5 text-emerald-400">
                                {tenant.license.price.toLocaleString()} {tenant.license.currency}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-slate-300">{tenant.companyCount}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-slate-500">{formatDate(tenant.createdAt)}</span>
                      </td>
                      <td className="p-3">
                        {actionLoading === tenant.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="bg-slate-800 border-slate-700">
                              <DropdownMenuItem
                                onClick={() => setDetailId(tenant.id)}
                                className="text-slate-300 hover:bg-slate-700 cursor-pointer"
                              >
                                <Eye className="h-4 w-4 ml-2" />
                                عرض التفاصيل
                              </DropdownMenuItem>
                              {tenant.status === 'active' && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(tenant.id, 'suspended')}
                                  className="text-amber-400 hover:bg-slate-700 cursor-pointer"
                                >
                                  <Pause className="h-4 w-4 ml-2" />
                                  تعليق
                                </DropdownMenuItem>
                              )}
                              {tenant.status === 'suspended' && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(tenant.id, 'active')}
                                  className="text-emerald-400 hover:bg-slate-700 cursor-pointer"
                                >
                                  <Play className="h-4 w-4 ml-2" />
                                  تفعيل
                                </DropdownMenuItem>
                              )}
                              {tenant.status !== 'cancelled' && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(tenant.id)}
                                  className="text-red-400 hover:bg-slate-700 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4 ml-2" />
                                  إلغاء
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))
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

      {/* Dialogs */}
      <CreateTenantDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={fetchTenants}
      />
      <TenantDetailDialog
        open={!!detailId}
        onClose={() => setDetailId(null)}
        tenantId={detailId}
      />
    </div>
  )
}
