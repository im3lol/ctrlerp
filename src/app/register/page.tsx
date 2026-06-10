'use client'

import { useState } from 'react'
import { Building2, Globe, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminName, setAdminName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || !adminUsername.trim() || !adminPassword.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    if (adminPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    if (subdomain && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
      setError('صيغة النطاق الفرعي غير صالحة')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/tenant/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          subdomain: subdomain.trim() || undefined,
          adminUsername: adminUsername.trim(),
          adminPassword,
          adminName: adminName.trim() || adminUsername.trim(),
          companyName: name.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء التسجيل')
        return
      }

      setSuccess(data)
    } catch (err) {
      console.error(err)
      setError('حدث خطأ في الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 flex items-center justify-center p-4" dir="rtl">
        <Card className="bg-slate-800/80 border-slate-700/50 text-white max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">تم إنشاء حسابك بنجاح!</h2>
            <p className="text-slate-400 mb-6">{success.message}</p>

            <div className="bg-slate-700/50 rounded-lg p-4 text-right space-y-3 mb-6">
              <div>
                <Label className="text-slate-500 text-xs">النطاق الفرعي</Label>
                <p className="text-cyan-400 font-mono" dir="ltr">{success.tenant.subdomain}.ctrlerp.com</p>
              </div>
              <div>
                <Label className="text-slate-500 text-xs">رابط تسجيل الدخول</Label>
                <a
                  href={success.loginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 font-mono text-sm block" dir="ltr"
                >
                  {success.loginUrl}
                </a>
              </div>
              <div>
                <Label className="text-slate-500 text-xs">الترخيص</Label>
                <p className="text-amber-400 text-sm">تجريبي - {success.license.daysLeft} أيام</p>
              </div>
            </div>

            <a
              href={success.loginUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2 w-full">
                <Globe className="h-4 w-4" />
                الذهاب إلى لوحة التحكم
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 flex items-center justify-center p-4" dir="rtl">
      <Card className="bg-slate-800/80 border-slate-700/50 text-white max-w-lg w-full">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-violet-400" />
          </div>
          <CardTitle className="text-2xl text-white">إنشاء حساب جديد</CardTitle>
          <p className="text-slate-400 text-sm">احصل على نظام ERP خاص بشركتك مع قاعدة بيانات منفصلة ودومين فرعي</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">اسم الشركة *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسم شركتك"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">البريد الإلكتروني *</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@company.com"
                  type="email"
                  dir="ltr"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">النطاق الفرعي</Label>
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
            </div>

            <div className="border-t border-slate-700/50 pt-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">حساب المدير</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">اسم المستخدم *</Label>
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
                  <Label className="text-slate-300 text-sm">الاسم *</Label>
                  <Input
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="اسمك الكامل"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2 mt-3">
                <Label className="text-slate-300 text-sm">كلمة المرور *</Label>
                <Input
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  type="password"
                  dir="ltr"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
              <p className="text-violet-400 text-xs">
                ستحصل على ترخيص تجريبي مجاني لمدة 7 أيام مع قاعدة بيانات منفصلة ودومين فرعي خاص
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2 w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري إنشاء الحساب...
                </>
              ) : (
                'إنشاء الحساب'
              )}
            </Button>

            <div className="text-center">
              <a
                href="/login"
                className="text-sm text-slate-400 hover:text-violet-400 inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                تسجيل الدخول لحساب موجود
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
