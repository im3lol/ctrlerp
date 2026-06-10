'use client'

import { useState } from 'react'
import { Building2, Loader2, Globe, Database, CheckCircle2, AlertCircle } from 'lucide-react'
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

const ADMIN_TOKEN_KEY = 'ctrl_admin_token'

interface CreateTenantDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateTenantDialog({ open, onClose, onSuccess }: CreateTenantDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminName, setAdminName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [provisionResult, setProvisionResult] = useState<{
    success: boolean
    databaseName?: string
    error?: string
    loginUrl?: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('اسم المستأجر مطلوب')
      return
    }

    if (subdomain && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
      setError('صيغة النطاق الفرعي غير صالحة. استخدم أحرف صغيرة وأرقام وشرطات فقط')
      return
    }

    if (adminUsername && adminPassword && adminPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    setLoading(true)
    setProvisionResult(null)
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          subdomain: subdomain.trim() || undefined,
          customDomain: customDomain.trim() || null,
          adminUsername: adminUsername.trim() || 'admin',
          adminPassword: adminPassword.trim() || 'Admin@2026',
          adminName: adminName.trim() || 'مدير النظام',
          companyName: companyName.trim() || name.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء إنشاء المستأجر')
        return
      }

      setProvisionResult({
        success: data.provision?.success ?? false,
        databaseName: data.provision?.databaseName,
        error: data.provision?.error,
        loginUrl: `https://${data.tenant?.subdomain || subdomain}.ctrlerp.com/app`,
      })

      // Auto-close after showing result for a moment
      if (data.provision?.success) {
        setTimeout(() => {
          setName('')
          setEmail('')
          setPhone('')
          setSubdomain('')
          setCustomDomain('')
          setAdminUsername('')
          setAdminPassword('')
          setAdminName('')
          setCompanyName('')
          setProvisionResult(null)
          onSuccess()
        }, 2000)
      }
    } catch (err) {
      console.error(err)
      setError('حدث خطأ في الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setName('')
      setEmail('')
      setPhone('')
      setSubdomain('')
      setCustomDomain('')
      setAdminUsername('')
      setAdminPassword('')
      setAdminName('')
      setCompanyName('')
      setError('')
      setProvisionResult(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700/50 text-white max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Building2 className="h-5 w-5 text-violet-400" />
            إضافة مستأجر جديد
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {provisionResult && (
            <div className={`rounded-lg p-3 ${provisionResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
              <div className="flex items-center gap-2">
                {provisionResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                )}
                <p className={`text-sm ${provisionResult.success ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {provisionResult.success
                    ? 'تم إنشاء المستأجر وقاعدة البيانات بنجاح!'
                    : 'تم إنشاء المستأجر لكن قاعدة البيانات لم تكن متاحة'}
                </p>
              </div>
              {provisionResult.databaseName && (
                <p className="text-xs text-slate-400 mt-1" dir="ltr">
                  Database: {provisionResult.databaseName}
                </p>
              )}
              {provisionResult.loginUrl && (
                <p className="text-xs text-violet-400 mt-1" dir="ltr">
                  Login URL: {provisionResult.loginUrl}
                </p>
              )}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-violet-400" />
              معلومات أساسية
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">اسم المستأجر *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسم الشركة أو المؤسسة"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">اسم الشركة الافتراضية</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={name || 'اسم الشركة'}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">البريد الإلكتروني</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  dir="ltr"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">رقم الهاتف</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 xxx xxx xxxx"
                  dir="ltr"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Domain Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Globe className="h-4 w-4 text-cyan-400" />
              إعدادات النطاق
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">النطاق الفرعي *</Label>
                <div className="flex items-center">
                  <Input
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder={name ? name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'my-company'}
                    dir="ltr"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500 rounded-l-none"
                    disabled={loading}
                  />
                  <span className="bg-slate-700 border border-slate-600 border-r-0 px-2 py-2 text-xs text-slate-400 whitespace-nowrap rounded-l-md">
                    .ctrlerp.com
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">نطاق مخصص (اختياري)</Label>
                <Input
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="erp.mycompany.com"
                  dir="ltr"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Admin User */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-400" />
              حساب المدير وقاعدة البيانات
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">اسم المستخدم</Label>
                <Input
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  dir="ltr"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">اسم المدير</Label>
                <Input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="مدير النظام"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">كلمة المرور</Label>
              <Input
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Admin@2026"
                type="password"
                dir="ltr"
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500"
                disabled={loading}
              />
            </div>
          </div>

          <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
            <p className="text-violet-400 text-xs">
              سيتم إنشاء ترخيص تجريبي لمدة 7 أيام تلقائياً مع قاعدة بيانات منفصلة ودومين فرعي خاص
            </p>
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
                  جاري الإنشاء وتوفير قاعدة البيانات...
                </>
              ) : (
                'إنشاء المستأجر'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
