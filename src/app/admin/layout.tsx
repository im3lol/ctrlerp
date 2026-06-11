'use client'

import { useEffect, useState, type ElementType } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Key,
  Sparkles,
  LogOut,
  Menu,
  Shield,
  Activity,
  BarChart3,
  Heart,
  DollarSign,
  HardDrive,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const ADMIN_TOKEN_KEY = 'ctrl_admin_token'
const ADMIN_USER_KEY = 'ctrl_admin_user'

interface AdminUser {
  id: string
  name: string
  username: string
  email: string | null
  role: string
}

interface NavItem {
  id: string
  label: string
  icon: ElementType
  path: string
}

const navigation: NavItem[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, path: '/admin' },
  { id: 'analytics', label: 'التحليلات', icon: BarChart3, path: '/admin/analytics' },
  { id: 'revenue', label: 'الإيرادات', icon: DollarSign, path: '/admin/revenue' },
  { id: 'system', label: 'صحة النظام', icon: Heart, path: '/admin/system' },
  { id: 'tenants', label: 'المستأجرون', icon: Building2, path: '/admin/tenants' },
  { id: 'licenses', label: 'التراخيص', icon: Key, path: '/admin/licenses' },
  { id: 'backups', label: 'النسخ الاحتياطية', icon: HardDrive, path: '/admin/backups' },
  { id: 'activity', label: 'سجل الأنشطة', icon: Activity, path: '/admin/activity-logs' },
]

// ── Sidebar Component (defined outside render to avoid lint error) ──
function SidebarContent({
  collapsed = false,
  admin,
  pathname,
  onNavigate,
  onLogout,
}: {
  collapsed?: boolean
  admin: AdminUser | null
  pathname: string
  onNavigate: (path: string) => void
  onLogout: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-700/50 shrink-0">
        <div className="h-9 w-9 bg-gradient-to-bl from-[#7C3AED] to-[#5B21B6] rounded-lg flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <span className="font-bold text-white text-lg" style={{ fontFamily: "var(--font-thmanyah-serif)" }}>
              كنترول
            </span>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-amber-400" />
              <span className="text-amber-400 text-[10px] font-medium">لوحة المدير</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path))
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.path)}
                className={cn(
                  'w-full flex flex-row-reverse items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="flex-1 text-right">{item.label}</span>}
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User section */}
      {!collapsed && (
        <div className="border-t border-slate-700/50 p-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-300 font-bold text-sm shrink-0">
              {(admin?.name || 'م')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{admin?.name}</p>
              <p className="text-xs text-slate-500 truncate">{admin?.username}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 justify-start gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>تسجيل الخروج</span>
          </Button>
        </div>
      )}
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check if on login page
    if (pathname === '/admin/login') {
      setChecking(false)
      return
    }

    const token = localStorage.getItem(ADMIN_TOKEN_KEY)
    const userStr = localStorage.getItem(ADMIN_USER_KEY)

    if (!token || !userStr) {
      router.replace('/admin/login')
      return
    }

    try {
      const user = JSON.parse(userStr)
      setAdmin(user)
    } catch {
      router.replace('/admin/login')
      return
    }

    // Verify token with API
    fetch('/api/admin/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem(ADMIN_TOKEN_KEY)
          localStorage.removeItem(ADMIN_USER_KEY)
          router.replace('/admin/login')
        }
      })
      .catch(() => {
        // Network error - still allow access if token exists locally
      })
      .finally(() => {
        setChecking(false)
      })
  }, [pathname, router])

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)
    router.push('/admin/login')
  }

  const handleNavigate = (path: string) => {
    router.push(path)
    setMobileOpen(false)
  }

  // Login page - no layout
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // Checking auth
  if (checking) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">جاري التحقق...</p>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen flex bg-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-l border-slate-700/50 flex-col shrink-0">
        <SidebarContent
          admin={admin}
          pathname={pathname}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-slate-800/50 border-b border-slate-700/50 flex items-center px-4 gap-3 sticky top-0 z-40 shrink-0 backdrop-blur-sm">
          {/* Mobile menu trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-slate-400 hover:text-white">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 bg-slate-900 border-slate-700/50">
              <SheetTitle className="sr-only">القائمة الرئيسية</SheetTitle>
              <SidebarContent
                admin={admin}
                pathname={pathname}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          {/* Header admin info */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-300 font-bold text-xs">
              {(admin?.name || 'م')[0]}
            </div>
            <span className="text-sm text-slate-300 hidden sm:inline">{admin?.name}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
