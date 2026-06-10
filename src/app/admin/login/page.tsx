'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Eye, EyeOff, Loader2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ADMIN_TOKEN_KEY = 'ctrl_admin_token'
const ADMIN_USER_KEY = 'ctrl_admin_user'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء تسجيل الدخول')
        return
      }

      // Store admin token and user info
      if (data.token) {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
      }
      if (data.admin) {
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin))
      }

      router.push('/admin')
    } catch (err) {
      console.error('Admin login error:', err)
      setError('حدث خطأ في الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gradient-to-bl from-[#050510] via-[#0a0a14] to-[#050510] p-4 relative overflow-hidden"
      style={{ fontFamily: "var(--font-thmanyah-sans)" }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#7C3AED]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#7C3AED]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#F59E0B]/5 rounded-full blur-2xl" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-2">
          <div className="mx-auto mb-4">
            <div className="h-16 w-16 bg-gradient-to-bl from-[#7C3AED] to-[#F59E0B] rounded-2xl flex items-center justify-center shadow-lg shadow-[#7C3AED]/20 mx-auto rotate-3 hover:rotate-0 transition-transform duration-300">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1
            className="text-3xl font-bold text-white mb-2"
            style={{ fontFamily: "var(--font-thmanyah-serif)" }}
          >
            كنترول
          </h1>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-amber-400" />
            <p className="text-amber-400 text-sm font-medium">لوحة تحكم المدير</p>
          </div>
          <p className="text-slate-400 text-xs">تسجيل دخول مدير النظام</p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full bg-white/95 backdrop-blur-sm shadow-2xl shadow-black/20 border-0 rounded-2xl p-6 space-y-5"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-slate-700">
              اسم المستخدم
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="platformadmin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 rounded-xl border-slate-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 bg-slate-50/50 hover:bg-white transition-colors"
              dir="ltr"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              كلمة المرور
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border-slate-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 bg-slate-50/50 hover:bg-white transition-colors ps-4 pe-11"
                dir="ltr"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7C3AED] hover:bg-[#8B5CF6] text-white rounded-xl h-11 font-medium shadow-lg shadow-[#7C3AED]/20"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin me-2" />
                جاري تسجيل الدخول...
              </>
            ) : (
              'تسجيل الدخول'
            )}
          </Button>
        </form>

        {/* Back to ERP */}
        <a
          href="/"
          className="text-slate-400 hover:text-white text-sm transition-colors mt-2"
        >
          العودة إلى الصفحة الرئيسية
        </a>
      </div>
    </div>
  )
}
