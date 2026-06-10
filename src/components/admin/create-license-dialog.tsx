'use client'

import { useState, useEffect } from 'react'
import { Key, Loader2, Infinity, Calendar, DollarSign } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const ADMIN_TOKEN_KEY = 'ctrl_admin_token'

interface Tenant {
  id: string
  name: string
}

interface CreateLicenseDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateLicenseDialog({ open, onClose, onSuccess }: CreateLicenseDialogProps) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantId, setTenantId] = useState('')
  const [type, setType] = useState('basic')
  const [maxUsers, setMaxUsers] = useState('')
  const [maxCompanies, setMaxCompanies] = useState('')
  const [durationMode, setDurationMode] = useState<'months' | 'lifetime'>('months')
  const [durationMonths, setDurationMonths] = useState('12')
  const [price, setPrice] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [currency, setCurrency] = useState('EGP')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tenantsLoading, setTenantsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchTenants()
    }
  }, [open])

  const fetchTenants = async () => {
    setTenantsLoading(true)
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      const res = await fetch('/api/admin/tenants?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTenants(data.tenants)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setTenantsLoading(false)
    }
  }

  const handleTypeChange = (newType: string) => {
    setType(newType)
    // Set defaults based on type
    switch (newType) {
      case 'trial':
        setMaxUsers('1')
        setMaxCompanies('1')
        setDurationMode('months')
        setDurationMonths('1') // ~30 days
        setPrice('0')
        break
      case 'basic':
        setMaxUsers('5')
        setMaxCompanies('2')
        setDurationMonths('12')
        setPrice('')
        setMonthlyPrice('')
        break
      case 'professional':
        setMaxUsers('20')
        setMaxCompanies('5')
        setDurationMonths('12')
        setPrice('')
        setMonthlyPrice('')
        break
      case 'enterprise':
        setMaxUsers('100')
        setMaxCompanies('20')
        setDurationMonths('12')
        setPrice('')
        setMonthlyPrice('')
        break
      case 'lifetime':
        setMaxUsers('999')
        setMaxCompanies('999')
        setDurationMode('lifetime')
        setPrice('')
        setMonthlyPrice('')
        break
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!tenantId) {
      setError('يرجى اختيار المستأجر')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      const isLifetime = durationMode === 'lifetime' || type === 'lifetime'

      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantId,
          type,
          maxUsers: maxUsers ? parseInt(maxUsers) : undefined,
          maxCompanies: maxCompanies ? parseInt(maxCompanies) : undefined,
          durationMonths: isLifetime ? undefined : (durationMonths ? parseInt(durationMonths) : undefined),
          isLifetime,
          price: price ? parseFloat(price) : 0,
          monthlyPrice: monthlyPrice ? parseFloat(monthlyPrice) : 0,
          currency,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء إنشاء الترخيص')
        return
      }

      // Reset and close
      setTenantId('')
      setType('basic')
      setMaxUsers('5')
      setMaxCompanies('2')
      setDurationMode('months')
      setDurationMonths('12')
      setPrice('')
      setMonthlyPrice('')
      onSuccess()
    } catch (err) {
      console.error(err)
      setError('حدث خطأ في الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError('')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700/50 text-white max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Key className="h-5 w-5 text-amber-400" />
            إنشاء ترخيص جديد
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Tenant */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">المستأجر *</Label>
            <Select value={tenantId} onValueChange={setTenantId} disabled={tenantsLoading}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder={tenantsLoading ? 'جاري التحميل...' : 'اختر المستأجر'} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">نوع الترخيص</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="trial">تجريبي (7 أيام)</SelectItem>
                <SelectItem value="basic">أساسي</SelectItem>
                <SelectItem value="professional">احترافي</SelectItem>
                <SelectItem value="enterprise">مؤسسي</SelectItem>
                <SelectItem value="lifetime">مدى الحياة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration Mode */}
          {type !== 'lifetime' && type !== 'trial' && (
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">مدة الاشتراك</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDurationMode('months')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border',
                    durationMode === 'months'
                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/50'
                      : 'bg-slate-700/30 text-slate-400 border-slate-600 hover:bg-slate-700/50'
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  بالأشهر
                </button>
                <button
                  type="button"
                  onClick={() => setDurationMode('lifetime')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border',
                    durationMode === 'lifetime'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-700/30 text-slate-400 border-slate-600 hover:bg-slate-700/50'
                  )}
                >
                  <Infinity className="h-4 w-4" />
                  مدى الحياة
                </button>
              </div>
            </div>
          )}

          {/* Duration in months */}
          {durationMode === 'months' && type !== 'lifetime' && (
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">
                {type === 'trial' ? 'المدة بالأيام' : 'المدة بالأشهر'}
              </Label>
              <Input
                type="number"
                value={type === 'trial' ? '7' : durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                min="1"
                disabled={type === 'trial'}
                className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500"
                dir="ltr"
                placeholder={type === 'trial' ? '7' : '12'}
              />
            </div>
          )}

          {/* Max Users & Companies */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">الحد الأقصى للمستخدمين</Label>
              <Input
                type="number"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
                min="1"
                className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">الحد الأقصى للشركات</Label>
              <Input
                type="number"
                value={maxCompanies}
                onChange={(e) => setMaxCompanies(e.target.value)}
                min="1"
                className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500"
                dir="ltr"
              />
            </div>
          </div>

          {/* Price & Monthly Price & Currency */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  سعر الاشتراك
                </Label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  الاشتراك الشهري (MRR)
                </Label>
                <Input
                  type="number"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">العملة</Label>
                <Select value={currency} onValueChange={setCurrency}>
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
            <p className="text-[10px] text-slate-500">الاشتراك الشهري يُستخدم لحساب الإيرادات المتكررة (MRR/ARR)</p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء الترخيص'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
