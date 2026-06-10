'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LayoutDashboard, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser, setCompanies, setCurrentCompany, setAccessToken, setLicenseInfo } = useAppStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Use our custom token-based login API
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const loginData = await loginRes.json()

      if (!loginRes.ok) {
        setError(loginData.error || 'اسم المستخدم أو كلمة المرور غير صحيحة')
        setLoading(false)
        return
      }

      // Store the access token
      if (loginData.token) {
        setAccessToken(loginData.token)
      }

      // Set user data from the verified login response
      if (loginData.user) {
        const userData = {
          id: loginData.user.id || '',
          name: loginData.user.name || '',
          username: loginData.user.username || '',
          role: loginData.user.role || 'viewer',
          email: loginData.user.email || undefined,
        }
        setUser(userData)

        // Set companies from login response
        if (loginData.companies && loginData.companies.length > 0) {
          setCompanies(loginData.companies)

          // Auto-select if only one company
          if (loginData.companies.length === 1) {
            setCurrentCompany(loginData.companies[0].id)
          }
        }

        // Set license info from login response
        if (loginData.license) {
          setLicenseInfo(loginData.license)
        }
        // Redirect to app after successful login
        setTimeout(() => {
          window.location.href = '/app'
        }, 200)
      } else {
        setError('فشل في استرجاع بيانات المستخدم')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-bl from-[#050510] via-[#0a0a14] to-[#050510] p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#7C3AED]/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#F59E0B]/8 rounded-full blur-2xl" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl shadow-black/20 border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-2 pt-8 px-8">
          {/* Logo */}
          <div className="mx-auto mb-4">
            <div className="h-16 w-16 bg-gradient-to-bl from-[#7C3AED] to-[#F59E0B] rounded-2xl flex items-center justify-center shadow-lg shadow-[#7C3AED]/30 mx-auto rotate-3 hover:rotate-0 transition-transform duration-300">
              <LayoutDashboard className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">كنترول</h1>
          <p className="text-slate-500 mt-1 text-sm">نظام كنترول - إدارة موارد مؤسسية متكاملة</p>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="h-2 w-2 bg-red-500 rounded-full shrink-0" />
                {error}
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                اسم المستخدم أو البريد الإلكتروني
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم أو البريد الإلكتروني"
                  className="h-11 pe-4 ps-11 text-right rounded-xl border-slate-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 bg-slate-50/50 hover:bg-white transition-colors"
                  disabled={loading}
                  autoComplete="username"
                  required
                />
                <div className="absolute start-3 top-1/2 -translate-y-1/2">
                  <LayoutDashboard className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                كلمة المرور
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="h-11 pe-4 ps-11 text-right rounded-xl border-slate-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 bg-slate-50/50 hover:bg-white transition-colors"
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-l from-[#7C3AED] to-[#F59E0B] hover:from-[#8B5CF6] hover:to-[#FBBF24] text-white rounded-xl font-medium text-base shadow-lg shadow-[#7C3AED]/30 transition-all duration-200 hover:shadow-[#7C3AED]/50 mt-2"
              disabled={loading}
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
        </CardContent>
      </Card>
    </div>
  )
}
