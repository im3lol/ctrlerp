'use client'

import { useState, useEffect } from 'react'
import { Key, Loader2 } from 'lucide-react'
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
  const [durationDays, setDurationDays] = useState('365')
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
        setDurationDays('7')
        break
      case 'basic':
        setMaxUsers('5')
        setMaxCompanies('2')
        setDurationDays('365')
        break
      case 'professional':
        setMaxUsers('20')
        setMaxCompanies('5')
        setDurationDays('365')
        break
      case 'enterprise':
        setMaxUsers('100')
        setMaxCompanies('20')
        setDurationDays('365')
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
          durationDays: durationDays ? parseInt(durationDays) : undefined,
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
      setDurationDays('365')
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
              </SelectContent>
            </Select>
          </div>

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

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">المدة (بالأيام)</Label>
            <Input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              min="1"
              className="bg-slate-700/50 border-slate-600 text-white focus:border-violet-500"
              dir="ltr"
            />
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
