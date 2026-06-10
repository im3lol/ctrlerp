'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  DollarSign,
  Ruler,
  UserCog,
  GitBranch,
  Settings,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Shield,
  Globe,
  Calendar,
  MapPin,
  Phone,
  Mail,
  FileText,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'
import { formatDate } from '@/lib/erp-utils'

interface SettingsPageProps {
  onNavigate: (view: string) => void
}

interface CompanyInfo {
  nameAr: string
  nameEn: string
  address: string
  phone: string
  email: string
  taxNumber: string
  fiscalYearStart: string
  vatRate: number
}

interface SystemStats {
  usersCount: number
  activeUsersCount: number
  currenciesCount: number
  uomCount: number
  accountsCount: number
  companiesCount: number
  // Category counts
  accountTypes: { type: string; count: number; label: string }[]
}

const settingsItems = [
  {
    id: 'company',
    title: 'بيانات الشركة',
    description: 'تعديل المعلومات الأساسية',
    icon: Building2,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    hover: 'hover:border-violet-300 hover:shadow-violet-100',
  },
  {
    id: 'companies',
    title: 'إدارة الشركات',
    description: 'عرض وإدارة الشركات المسجلة',
    icon: Building2,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    hover: 'hover:border-indigo-300 hover:shadow-indigo-100',
  },
  {
    id: 'currencies',
    title: 'العملات',
    description: 'أسعار الصرف والعملة الأساسية',
    icon: DollarSign,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    hover: 'hover:border-amber-300 hover:shadow-amber-100',
  },
  {
    id: 'uom',
    title: 'وحدات القياس',
    description: 'تعريف وحدات القياس',
    icon: Ruler,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-100',
    hover: 'hover:border-teal-300 hover:shadow-teal-100',
  },
  {
    id: 'users',
    title: 'المستخدمين',
    description: 'إدارة الحسابات والصلاحيات',
    icon: UserCog,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    hover: 'hover:border-blue-300 hover:shadow-blue-100',
  },
  {
    id: 'chart-of-accounts',
    title: 'شجرة الحسابات',
    description: 'الدليل المحاسبي',
    icon: GitBranch,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    hover: 'hover:border-orange-300 hover:shadow-orange-100',
  },
]

const accountTypeColors: Record<string, string> = {
  ASSET: 'bg-violet-100 text-violet-700',
  LIABILITY: 'bg-orange-100 text-orange-700',
  EQUITY: 'bg-purple-100 text-purple-700',
  REVENUE: 'bg-teal-100 text-teal-700',
  EXPENSE: 'bg-red-100 text-red-700',
}

const accountTypeLabels: Record<string, string> = {
  ASSET: 'أصول',
  LIABILITY: 'خصوم',
  EQUITY: 'حقوق ملكية',
  REVENUE: 'إيرادات',
  EXPENSE: 'مصروفات',
}

export default function SettingsLanding({ onNavigate }: SettingsPageProps) {
  const { companies, currentCompanyId } = useAppStore()
  const currentCompany = companies.find((c) => c.id === currentCompanyId)
  const companyName = currentCompany?.nameAr || 'الشركة'

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSettingsData = useCallback(async () => {
    if (!currentCompanyId) return
    setLoading(true)
    try {
      // Fetch company info and system stats in parallel
      const [companyRes, usersRes, currenciesRes, uomRes, accountsRes] = await Promise.allSettled([
        fetch(`/api/settings/company?companyId=${currentCompanyId}`),
        fetch(`/api/settings/users?companyId=${currentCompanyId}`),
        fetch(`/api/settings/currencies?companyId=${currentCompanyId}`),
        fetch(`/api/settings/uom?companyId=${currentCompanyId}`),
        fetch(`/api/accounting/accounts?companyId=${currentCompanyId}`),
      ])

      const companyData = companyRes.status === 'fulfilled' && companyRes.value.ok ? await companyRes.value.json() : null
      const usersData = usersRes.status === 'fulfilled' && usersRes.value.ok ? await usersRes.value.json() : []
      const currenciesData = currenciesRes.status === 'fulfilled' && currenciesRes.value.ok ? await currenciesRes.value.json() : []
      const uomData = uomRes.status === 'fulfilled' && uomRes.value.ok ? await uomRes.value.json() : []
      const accountsData = accountsRes.status === 'fulfilled' && accountsRes.value.ok ? await accountsRes.value.json() : []

      if (companyData) {
        setCompanyInfo({
          nameAr: companyData.nameAr || '',
          nameEn: companyData.nameEn || '',
          address: companyData.address || '',
          phone: companyData.phone || '',
          email: companyData.email || '',
          taxNumber: companyData.taxNumber || '',
          fiscalYearStart: companyData.fiscalYearStart || '01-01',
          vatRate: companyData.vatRate || 0,
        })
      }

      // Count account types
      const typeCountMap: Record<string, number> = {}
      for (const acc of Array.isArray(accountsData) ? accountsData : []) {
        const t = acc.type || 'UNKNOWN'
        typeCountMap[t] = (typeCountMap[t] || 0) + 1
      }

      const accountTypes = Object.entries(typeCountMap).map(([type, count]) => ({
        type,
        count,
        label: accountTypeLabels[type] || type,
      }))

      const users = Array.isArray(usersData) ? usersData : []
      setStats({
        usersCount: users.length,
        activeUsersCount: users.filter((u: { isActive: boolean }) => u.isActive).length,
        currenciesCount: Array.isArray(currenciesData) ? currenciesData.length : 0,
        uomCount: Array.isArray(uomData) ? uomData.length : 0,
        accountsCount: Array.isArray(accountsData) ? accountsData.length : 0,
        companiesCount: companies.length,
        accountTypes,
      })
    } catch (err) {
      console.error('Failed to load settings data:', err)
    } finally {
      setLoading(false)
    }
  }, [currentCompanyId, companies.length])

  useEffect(() => {
    fetchSettingsData()
  }, [fetchSettingsData])

  // ─── Stat Card Component ──────────────────────────────────────────────────────

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    bg,
    border,
    subtitle,
    onClick,
  }: {
    title: string
    value: string | number
    icon: React.ElementType
    color: string
    bg: string
    border: string
    subtitle?: string
    onClick?: () => void
  }) => (
    <Card
      className={`border ${border} hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">{title}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // ─── System Health Check ──────────────────────────────────────────────────────

  const getSystemHealth = () => {
    const checks: { label: string; status: 'ok' | 'warning'; detail: string }[] = []

    // Check company info completeness
    const companyFields = companyInfo
      ? [companyInfo.nameAr, companyInfo.phone, companyInfo.email, companyInfo.taxNumber]
      : []
    const filledFields = companyFields.filter(Boolean).length
    const totalFields = 4
    if (filledFields === totalFields) {
      checks.push({ label: 'بيانات الشركة', status: 'ok', detail: 'مكتملة' })
    } else {
      checks.push({ label: 'بيانات الشركة', status: 'warning', detail: `${totalFields - filledFields} حقول ناقصة` })
    }

    // Check users
    if (stats && stats.usersCount > 0) {
      checks.push({ label: 'المستخدمين', status: 'ok', detail: `${stats.activeUsersCount} نشط` })
    } else {
      checks.push({ label: 'المستخدمين', status: 'warning', detail: 'لا يوجد مستخدمين' })
    }

    // Check chart of accounts
    if (stats && stats.accountsCount > 0) {
      checks.push({ label: 'شجرة الحسابات', status: 'ok', detail: `${stats.accountsCount} حساب` })
    } else {
      checks.push({ label: 'شجرة الحسابات', status: 'warning', detail: 'لم يتم إعدادها' })
    }

    // Check currencies
    if (stats && stats.currenciesCount > 0) {
      checks.push({ label: 'العملات', status: 'ok', detail: `${stats.currenciesCount} عملة` })
    } else {
      checks.push({ label: 'العملات', status: 'warning', detail: 'لم يتم تعريف عملات' })
    }

    return checks
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-gradient-to-bl from-[#7C3AED] to-[#5B21B6] rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">الإعدادات</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            إدارة إعدادات {companyName} وتكوين النظام
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <p className="text-sm text-slate-500">جاري تحميل بيانات الإعدادات...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ─── Company Info Card ──────────────────────────────────────────────────── */}
          <Card className="border-violet-200 overflow-hidden">
            <div className="bg-gradient-to-l from-violet-600 to-violet-700 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {companyInfo?.nameAr || companyName}
                    </h3>
                    {companyInfo?.nameEn && (
                      <p className="text-sm text-violet-200" dir="ltr">{companyInfo.nameEn}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-0 gap-1.5"
                  onClick={() => onNavigate('company')}
                >
                  <Settings className="h-3.5 w-3.5" />
                  تعديل
                </Button>
              </div>
            </div>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {companyInfo?.address && (
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">العنوان</p>
                      <p className="text-xs text-slate-700 truncate">{companyInfo.address}</p>
                    </div>
                  </div>
                )}
                {companyInfo?.phone && (
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">الهاتف</p>
                      <p className="text-xs text-slate-700" dir="ltr">{companyInfo.phone}</p>
                    </div>
                  </div>
                )}
                {companyInfo?.email && (
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">البريد الإلكتروني</p>
                      <p className="text-xs text-slate-700 truncate" dir="ltr">{companyInfo.email}</p>
                    </div>
                  </div>
                )}
                {companyInfo?.taxNumber && (
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">الرقم الضريبي</p>
                      <p className="text-xs text-slate-700 font-mono" dir="ltr">{companyInfo.taxNumber}</p>
                    </div>
                  </div>
                )}
                {companyInfo?.fiscalYearStart && (
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">بداية السنة المالية</p>
                      <p className="text-xs text-slate-700 font-mono" dir="ltr">{companyInfo.fiscalYearStart}</p>
                    </div>
                  </div>
                )}
                {companyInfo?.vatRate !== undefined && companyInfo.vatRate > 0 && (
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">نسبة الضريبة</p>
                      <p className="text-xs text-slate-700 font-mono" dir="ltr">{companyInfo.vatRate}%</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400">عدد الشركات</p>
                    <p className="text-xs text-slate-700">{stats?.companiesCount || 1} شركة مسجلة</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ─── System Stats Grid ──────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1.5 w-6 bg-violet-500 rounded-full" />
              <h3 className="text-sm font-semibold text-slate-700">إحصائيات النظام</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard
                title="المستخدمين"
                value={stats?.usersCount || 0}
                icon={Users}
                color="text-blue-600"
                bg="bg-blue-50"
                border="border-blue-200"
                subtitle={stats ? `${stats.activeUsersCount} نشط` : undefined}
                onClick={() => onNavigate('users')}
              />
              <StatCard
                title="الحسابات"
                value={stats?.accountsCount || 0}
                icon={GitBranch}
                color="text-orange-600"
                bg="bg-orange-50"
                border="border-orange-200"
                onClick={() => onNavigate('chart-of-accounts')}
              />
              <StatCard
                title="العملات"
                value={stats?.currenciesCount || 0}
                icon={DollarSign}
                color="text-amber-600"
                bg="bg-amber-50"
                border="border-amber-200"
                onClick={() => onNavigate('currencies')}
              />
              <StatCard
                title="وحدات القياس"
                value={stats?.uomCount || 0}
                icon={Ruler}
                color="text-teal-600"
                bg="bg-teal-50"
                border="border-teal-200"
                onClick={() => onNavigate('uom')}
              />
              <StatCard
                title="الشركات"
                value={stats?.companiesCount || 0}
                icon={Building2}
                color="text-indigo-600"
                bg="bg-indigo-50"
                border="border-indigo-200"
                onClick={() => onNavigate('companies')}
              />
              <StatCard
                title="أنواع الحسابات"
                value={stats?.accountTypes.length || 0}
                icon={Shield}
                color="text-violet-600"
                bg="bg-violet-50"
                border="border-violet-200"
                onClick={() => onNavigate('chart-of-accounts')}
              />
            </div>
          </div>

          {/* ─── System Health + Account Breakdown ────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* System Health */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-violet-600" />
                  حالة النظام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getSystemHealth().map((check) => (
                    <div
                      key={check.label}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        check.status === 'ok' ? 'bg-green-50' : 'bg-amber-50'
                      }`}
                    >
                      {check.status === 'ok' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${check.status === 'ok' ? 'text-green-800' : 'text-amber-800'}`}>
                          {check.label}
                        </p>
                      </div>
                      <Badge
                        className={
                          check.status === 'ok'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                        }
                      >
                        {check.detail}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Overall status */}
                <Separator className="my-4" />
                <div className="flex items-center gap-3">
                  {getSystemHealth().every((c) => c.status === 'ok') ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="text-sm font-bold text-green-800">النظام جاهز بالكامل</p>
                        <p className="text-xs text-green-600">جميع الإعدادات الأساسية مكتملة</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-6 w-6 text-amber-600" />
                      <div>
                        <p className="text-sm font-bold text-amber-800">يحتاج إعداد</p>
                        <p className="text-xs text-amber-600">
                          {getSystemHealth().filter((c) => c.status === 'warning').length} إعدادات تحتاج اهتمام
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Account Type Breakdown */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-orange-600" />
                    توزيع الحسابات
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-violet-600 hover:text-violet-800 gap-1"
                    onClick={() => onNavigate('chart-of-accounts')}
                  >
                    التفاصيل
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {stats && stats.accountTypes.length > 0 ? (
                  <div className="space-y-3">
                    {stats.accountTypes.map((at) => {
                      const total = stats.accountsCount || 1
                      const percentage = ((at.count / total) * 100).toFixed(0)
                      return (
                        <div key={at.type} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={accountTypeColors[at.type] || 'bg-slate-100 text-slate-700'}>
                                {at.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-slate-600">{at.count} حساب</span>
                              <span className="text-xs text-slate-400">({percentage}%)</span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                at.type === 'ASSET'
                                  ? 'bg-violet-400'
                                  : at.type === 'LIABILITY'
                                    ? 'bg-orange-400'
                                    : at.type === 'EQUITY'
                                      ? 'bg-purple-400'
                                      : at.type === 'REVENUE'
                                        ? 'bg-teal-400'
                                        : 'bg-red-400'
                              }`}
                              style={{ width: `${Math.max((at.count / total) * 100, 2)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}

                    <Separator className="my-2" />

                    {/* Total */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">إجمالي الحسابات</span>
                      <span className="font-bold text-slate-800 font-mono">{stats.accountsCount}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <GitBranch className="h-12 w-12 mb-3 text-slate-200" />
                    <p className="text-sm">لم يتم إنشاء شجرة الحسابات بعد</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-violet-600 border-violet-200 hover:bg-violet-50"
                      onClick={() => onNavigate('chart-of-accounts')}
                    >
                      إعداد شجرة الحسابات
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── Quick Settings Navigation ──────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1.5 w-6 bg-violet-500 rounded-full" />
              <h3 className="text-sm font-semibold text-slate-700">الإعدادات السريعة</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {settingsItems.map((item) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-all duration-200 border ${item.border} ${item.hover} hover:shadow-md group`}
                  onClick={() => onNavigate(item.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shrink-0`}
                      >
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 text-sm">{item.title}</h3>
                        <p className="text-[11px] text-slate-500">{item.description}</p>
                      </div>
                      <ArrowLeft className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
