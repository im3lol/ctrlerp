'use client'

import { useState, useEffect } from 'react'
import { Building2, Key, Users, Calendar, Mail, Phone, Loader2, Copy, CheckCircle2, Infinity, DollarSign } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const ADMIN_TOKEN_KEY = 'ctrl_admin_token'

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
  lifetime: 'مدى الحياة',
}

const typeColors: Record<string, string> = {
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  basic: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  professional: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  enterprise: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  lifetime: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

interface TenantDetail {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string
  createdAt: string
  updatedAt: string
  ownerId: string | null
  owner: { id: string; name: string; username: string; email: string; phone: string } | null
  licenses: Array<{
    id: string
    key: string
    type: string
    status: string
    maxUsers: number
    maxCompanies: number
    isLifetime: boolean
    price: number
    currency: string
    expiresAt: string
    createdAt: string
  }>
  companies: Array<{
    id: string
    nameAr: string
    nameEn: string
    status: string
    createdAt: string
  }>
  userCount: number
}

interface TenantDetailDialogProps {
  open: boolean
  onClose: () => void
  tenantId: string | null
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

function formatPrice(price: number, currency: string) {
  if (price === 0) return '—'
  return `${price.toLocaleString()} ${currency}`
}

export default function TenantDetailDialog({ open, onClose, tenantId }: TenantDetailDialogProps) {
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    if (open && tenantId) {
      fetchTenant()
    }
  }, [open, tenantId])

  const fetchTenant = async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        setTenant(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700/50 text-white max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Building2 className="h-5 w-5 text-violet-400" />
            تفاصيل المستأجر
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        ) : tenant ? (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{tenant.name}</h3>
                <Badge
                  variant="outline"
                  className={cn(statusColors[tenant.status] || 'bg-slate-500/10 text-slate-400')}
                >
                  {statusLabels[tenant.status] || tenant.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {tenant.email && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate" dir="ltr">{tenant.email}</span>
                  </div>
                )}
                {tenant.phone && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="h-3.5 w-3.5" />
                    <span dir="ltr">{tenant.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>تاريخ الإنشاء: {formatDate(tenant.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Users className="h-3.5 w-3.5" />
                  <span>المستخدمون: {tenant.userCount}</span>
                </div>
              </div>

              {tenant.owner && (
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">المالك</p>
                  <p className="text-sm text-white font-medium">{tenant.owner.name}</p>
                  <p className="text-xs text-slate-400" dir="ltr">{tenant.owner.email || tenant.owner.username}</p>
                </div>
              )}
            </div>

            <Separator className="bg-slate-700/50" />

            {/* Licenses */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-400" />
                التراخيص ({tenant.licenses.length})
              </h4>
              {tenant.licenses.length > 0 ? (
                <div className="space-y-2">
                  {tenant.licenses.map((license) => (
                    <div key={license.id} className="bg-slate-700/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(typeColors[license.type] || 'bg-slate-500/10 text-slate-400')}
                          >
                            {typeLabels[license.type] || license.type}
                          </Badge>
                          {license.isLifetime && (
                            <Badge
                              variant="outline"
                              className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                            >
                              <Infinity className="h-3 w-3 ml-1" />
                              مدى الحياة
                            </Badge>
                          )}
                        </div>
                        {license.isLifetime ? (
                          <span className="text-xs font-medium text-cyan-400">لا تنتهي</span>
                        ) : (
                          <span className={cn(
                            'text-xs font-medium',
                            getDaysLeft(license.expiresAt) <= 0
                              ? 'text-red-400'
                              : getDaysLeft(license.expiresAt) <= 7
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          )}>
                            {getDaysLeft(license.expiresAt) <= 0
                              ? 'منتهي'
                              : `${getDaysLeft(license.expiresAt)} يوم متبقي`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-slate-300 bg-slate-700/50 px-2 py-0.5 rounded font-mono" dir="ltr">
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
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>الحد الأقصى للمستخدمين: {license.maxUsers}</span>
                        <span>الحد الأقصى للشركات: {license.maxCompanies}</span>
                      </div>
                      {license.price > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <DollarSign className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">
                            {formatPrice(license.price, license.currency)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">لا توجد تراخيص</p>
              )}
            </div>

            <Separator className="bg-slate-700/50" />

            {/* Companies */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-cyan-400" />
                الشركات ({tenant.companies.length})
              </h4>
              {tenant.companies.length > 0 ? (
                <div className="space-y-1">
                  {tenant.companies.map((company) => (
                    <div key={company.id} className="flex items-center justify-between bg-slate-700/20 rounded px-3 py-1.5">
                      <span className="text-sm text-white">{company.nameAr}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0',
                          company.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        )}
                      >
                        {company.status === 'active' ? 'نشطة' : 'غير نشطة'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">لا توجد شركات</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">لم يتم العثور على المستأجر</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
