'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Scale,
  PieChart,
  TrendingUp,
  Package,
  BarChart3,
  ShoppingCart,
  Users,
  Building2,
  ArrowLeft,
  FileBarChart,
  Loader2,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/erp-utils'

interface ReportsLandingProps {
  onNavigate: (view: string) => void
}

// ─── KPI data interfaces ──────────────────────────────────────────────────────

interface KpiData {
  totalSales: number
  totalPurchases: number
  netIncome: number
  inventoryValue: number
  customerReceivables: number
  supplierPayables: number
  totalDebit: number
  totalCredit: number
  isTrialBalanceBalanced: boolean
  lowStockItems: number
  totalItems: number
  salesVsPurchases: Array<{ month: string; sales: number; purchases: number }>
}

const reportItems = [
  {
    id: 'trial-balance',
    title: 'ميزان المراجعة',
    description: 'أرصدة الحسابات المدينة والدائنة',
    icon: Scale,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    hover: 'hover:border-violet-300 hover:shadow-violet-100',
    tag: 'محاسبة',
    tagColor: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'balance-sheet',
    title: 'الميزانية العمومية',
    description: 'الأصول والخصوم وحقوق الملكية',
    icon: PieChart,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    hover: 'hover:border-indigo-300 hover:shadow-indigo-100',
    tag: 'محاسبة',
    tagColor: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'income-statement',
    title: 'قائمة الدخل',
    description: 'الإيرادات والمصروفات وصافي الربح',
    icon: TrendingUp,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-100',
    hover: 'hover:border-teal-300 hover:shadow-teal-100',
    tag: 'محاسبة',
    tagColor: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'inventory-report',
    title: 'تقرير المخازن',
    description: 'حركة المخزون والأرصدة والقيم',
    icon: Package,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    hover: 'hover:border-cyan-300 hover:shadow-cyan-100',
    tag: 'مخازن',
    tagColor: 'bg-cyan-100 text-cyan-700',
  },
  {
    id: 'sales-report',
    title: 'تقرير المبيعات',
    description: 'تحليل حركات المبيعات والإيرادات',
    icon: BarChart3,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    hover: 'hover:border-orange-300 hover:shadow-orange-100',
    tag: 'مبيعات',
    tagColor: 'bg-orange-100 text-orange-700',
  },
  {
    id: 'purchase-report',
    title: 'تقرير المشتريات',
    description: 'تحليل حركات المشتريات والمصروفات',
    icon: ShoppingCart,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    hover: 'hover:border-blue-300 hover:shadow-blue-100',
    tag: 'مشتريات',
    tagColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'customer-aging',
    title: 'أرصدة العملاء',
    description: 'مبالغ مستحقة وتقادم المديونيات',
    icon: Users,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    hover: 'hover:border-amber-300 hover:shadow-amber-100',
    tag: 'مبيعات',
    tagColor: 'bg-orange-100 text-orange-700',
  },
  {
    id: 'supplier-aging',
    title: 'أرصدة الموردين',
    description: 'مبالغ مستحقة ومواعيد السداد',
    icon: Building2,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    hover: 'hover:border-purple-300 hover:shadow-purple-100',
    tag: 'مشتريات',
    tagColor: 'bg-blue-100 text-blue-700',
  },
]

export default function ReportsLanding({ onNavigate }: ReportsLandingProps) {
  const companyId = useAppStore((s) => s.currentCompanyId)
  const [kpiData, setKpiData] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch aggregated KPI data from multiple report APIs
  const fetchKpiData = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      const firstOfYear = `${new Date().getFullYear()}-01-01`

      // Parallel fetches for speed
      const [salesRes, purchaseRes, incomeRes, inventoryRes, customerAgingRes, supplierAgingRes, trialBalanceRes] =
        await Promise.allSettled([
          fetch(`/api/reports/sales-report?companyId=${companyId}&fromDate=${firstOfYear}&toDate=${today}`),
          fetch(`/api/reports/purchase-report?companyId=${companyId}&fromDate=${firstOfYear}&toDate=${today}`),
          fetch(`/api/reports/income-statement?companyId=${companyId}&fromDate=${firstOfYear}&toDate=${today}`),
          fetch(`/api/reports/inventory-report?companyId=${companyId}`),
          fetch(`/api/reports/customer-aging?companyId=${companyId}`),
          fetch(`/api/reports/supplier-aging?companyId=${companyId}`),
          fetch(`/api/reports/trial-balance?companyId=${companyId}&asOfDate=${today}`),
        ])

      const salesData = salesRes.status === 'fulfilled' && salesRes.value.ok ? await salesRes.value.json() : null
      const purchaseData = purchaseRes.status === 'fulfilled' && purchaseRes.value.ok ? await purchaseRes.value.json() : null
      const incomeData = incomeRes.status === 'fulfilled' && incomeRes.value.ok ? await incomeRes.value.json() : null
      const inventoryData = inventoryRes.status === 'fulfilled' && inventoryRes.value.ok ? await inventoryRes.value.json() : null
      const customerAgingData = customerAgingRes.status === 'fulfilled' && customerAgingRes.value.ok ? await customerAgingRes.value.json() : null
      const supplierAgingData = supplierAgingRes.status === 'fulfilled' && supplierAgingRes.value.ok ? await supplierAgingRes.value.json() : null
      const trialBalanceData = trialBalanceRes.status === 'fulfilled' && trialBalanceRes.value.ok ? await trialBalanceRes.value.json() : null

      // Build monthly comparison data
      const salesByMonth: Record<string, number> = {}
      const purchaseByMonth: Record<string, number> = {}

      if (salesData?.byMonth) {
        for (const m of salesData.byMonth) {
          salesByMonth[m.month] = m.totalSales
        }
      }
      if (purchaseData?.byMonth) {
        for (const m of purchaseData.byMonth) {
          purchaseByMonth[m.month] = m.totalPurchases
        }
      }

      const allMonths = Array.from(new Set([...Object.keys(salesByMonth), ...Object.keys(purchaseByMonth)])).sort()
      const salesVsPurchases = allMonths.map((month) => ({
        month,
        sales: salesByMonth[month] || 0,
        purchases: purchaseByMonth[month] || 0,
      }))

      setKpiData({
        totalSales: salesData?.totalSales || 0,
        totalPurchases: purchaseData?.totalPurchases || 0,
        netIncome: incomeData?.netIncome || 0,
        inventoryValue: inventoryData?.grandTotal || 0,
        customerReceivables: customerAgingData?.grandTotal?.totalOutstanding || 0,
        supplierPayables: supplierAgingData?.grandTotal?.totalOutstanding || 0,
        totalDebit: trialBalanceData?.grandTotals?.totalDebit || 0,
        totalCredit: trialBalanceData?.grandTotals?.totalCredit || 0,
        isTrialBalanceBalanced: trialBalanceData?.grandTotals?.balance === 0,
        lowStockItems: inventoryData?.lines?.filter((l: { isLowStock: boolean }) => l.isLowStock).length || 0,
        totalItems: inventoryData?.lines?.length || 0,
        salesVsPurchases,
      })
    } catch (err) {
      console.error('Failed to load KPI data:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchKpiData()
  }, [fetchKpiData])

  // ─── KPI Card Component ──────────────────────────────────────────────────────

  const KpiCard = ({
    title,
    value,
    icon: Icon,
    color,
    bg,
    border,
    subtitle,
    trend,
    onClick,
  }: {
    title: string
    value: string
    icon: React.ElementType
    color: string
    bg: string
    border: string
    subtitle?: string
    trend?: 'up' | 'down' | 'neutral'
    onClick?: () => void
  }) => (
    <Card
      className={`border ${border} hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          {trend === 'up' && (
            <Badge className="bg-green-50 text-green-700 border-green-200 gap-0.5 text-[10px]">
              <ArrowUpRight className="h-3 w-3" />
              ربح
            </Badge>
          )}
          {trend === 'down' && (
            <Badge className="bg-red-50 text-red-700 border-red-200 gap-0.5 text-[10px]">
              <ArrowDownRight className="h-3 w-3" />
              خسارة
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-1">{title}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        {subtitle && <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )

  // ─── Mini Bar Chart Component ─────────────────────────────────────────────────

  const MiniBarChart = ({ data }: { data: Array<{ month: string; sales: number; purchases: number }> }) => {
    if (data.length === 0) return null

    const maxVal = Math.max(...data.map((d) => Math.max(d.sales, d.purchases)), 1)

    return (
      <div className="space-y-3">
        {data.slice(-6).map((item) => {
          const salesWidth = maxVal > 0 ? (item.sales / maxVal) * 100 : 0
          const purchaseWidth = maxVal > 0 ? (item.purchases / maxVal) * 100 : 0
          return (
            <div key={item.month} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">{item.month}</span>
                <div className="flex items-center gap-3">
                  <span className="text-violet-600 font-semibold">{formatCurrency(item.sales)}</span>
                  <span className="text-orange-600 font-semibold">{formatCurrency(item.purchases)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-violet-500 to-violet-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(salesWidth, 1)}%` }}
                  />
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-orange-500 to-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(purchaseWidth, 1)}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gradient-to-bl from-[#7C3AED] to-[#5B21B6] rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
            <FileBarChart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">التقارير والتحليلات</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              نظرة شاملة على أداء الشركة والأرقام الرئيسية
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="h-4 w-4" />
          <span>بيانات حتى {formatDate(new Date())}</span>
        </div>
      </div>

      {/* ─── KPI Summary Cards ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <p className="text-sm text-slate-500">جاري تحميل بيانات التقارير...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Row 1: Financial Overview */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1.5 w-6 bg-violet-500 rounded-full" />
              <h3 className="text-sm font-semibold text-slate-700">نظرة مالية عامة</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard
                title="إجمالي المبيعات"
                value={formatCurrency(kpiData?.totalSales || 0)}
                icon={TrendingUp}
                color="text-violet-600"
                bg="bg-violet-50"
                border="border-violet-200"
                subtitle="من بداية السنة"
                onClick={() => onNavigate('sales-report')}
              />
              <KpiCard
                title="إجمالي المشتريات"
                value={formatCurrency(kpiData?.totalPurchases || 0)}
                icon={ShoppingCart}
                color="text-orange-600"
                bg="bg-orange-50"
                border="border-orange-200"
                subtitle="من بداية السنة"
                onClick={() => onNavigate('purchase-report')}
              />
              <KpiCard
                title="صافي الربح"
                value={formatCurrency(Math.abs(kpiData?.netIncome || 0))}
                icon={kpiData && kpiData.netIncome >= 0 ? TrendingUp : TrendingDown}
                color={kpiData && kpiData.netIncome >= 0 ? 'text-teal-600' : 'text-red-600'}
                bg={kpiData && kpiData.netIncome >= 0 ? 'bg-teal-50' : 'bg-red-50'}
                border={kpiData && kpiData.netIncome >= 0 ? 'border-teal-200' : 'border-red-200'}
                trend={kpiData ? (kpiData.netIncome >= 0 ? 'up' : 'down') : 'neutral'}
                onClick={() => onNavigate('income-statement')}
              />
              <KpiCard
                title="قيمة المخزون"
                value={formatCurrency(kpiData?.inventoryValue || 0)}
                icon={Package}
                color="text-cyan-600"
                bg="bg-cyan-50"
                border="border-cyan-200"
                subtitle={kpiData ? `${kpiData.totalItems} صنف` : undefined}
                onClick={() => onNavigate('inventory-report')}
              />
              <KpiCard
                title="ذمم العملاء"
                value={formatCurrency(kpiData?.customerReceivables || 0)}
                icon={Users}
                color="text-amber-600"
                bg="bg-amber-50"
                border="border-amber-200"
                subtitle="مبالغ مستحقة"
                onClick={() => onNavigate('customer-aging')}
              />
              <KpiCard
                title="ذمم الموردين"
                value={formatCurrency(kpiData?.supplierPayables || 0)}
                icon={Building2}
                color="text-purple-600"
                bg="bg-purple-50"
                border="border-purple-200"
                subtitle="مبالغ مستحقة"
                onClick={() => onNavigate('supplier-aging')}
              />
            </div>
          </div>

          {/* Row 2: Trial Balance + Monthly Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Trial Balance Summary */}
            <Card className="border-violet-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Scale className="h-5 w-5 text-violet-600" />
                    ملخص ميزان المراجعة
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-violet-600 hover:text-violet-800 gap-1"
                    onClick={() => onNavigate('trial-balance')}
                  >
                    التفاصيل
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Balance indicator */}
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      kpiData?.isTrialBalanceBalanced
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    {kpiData?.isTrialBalanceBalanced ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p
                        className={`font-bold text-sm ${
                          kpiData?.isTrialBalanceBalanced ? 'text-green-800' : 'text-red-800'
                        }`}
                      >
                        {kpiData?.isTrialBalanceBalanced ? 'الميزان متوازن' : 'الميزان غير متوازن'}
                      </p>
                      <p
                        className={`text-xs ${
                          kpiData?.isTrialBalanceBalanced ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {kpiData?.isTrialBalanceBalanced
                          ? 'إجمالي المدين = إجمالي الدائن'
                          : 'يوجد فرق بين المدين والدائن'}
                      </p>
                    </div>
                  </div>

                  {/* Debit / Credit totals */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-violet-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500 mb-1">إجمالي المدين</p>
                      <p className="text-lg font-bold text-violet-700 font-mono">
                        {formatCurrency(kpiData?.totalDebit || 0)}
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500 mb-1">إجمالي الدائن</p>
                      <p className="text-lg font-bold text-orange-700 font-mono">
                        {formatCurrency(kpiData?.totalCredit || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Sales vs Purchases */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-violet-600" />
                    المبيعات مقابل المشتريات
                  </CardTitle>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                      <span className="text-slate-500">مبيعات</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                      <span className="text-slate-500">مشتريات</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {kpiData && kpiData.salesVsPurchases.length > 0 ? (
                  <MiniBarChart data={kpiData.salesVsPurchases} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <BarChart3 className="h-10 w-10 mb-2 text-slate-200" />
                    <p className="text-sm">لا توجد بيانات شهرية بعد</p>
                    <p className="text-xs mt-1 text-slate-300">ستظهر البيانات عند إجراء عمليات بيع وشراء</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Inventory & Profitability Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Gross Profit Margin */}
            <Card className="border-teal-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-50">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">هامش الربح الإجمالي</p>
                    <p className="text-lg font-bold text-teal-700">
                      {kpiData && kpiData.totalSales > 0
                        ? `${(((kpiData.totalSales - kpiData.totalPurchases) / kpiData.totalSales) * 100).toFixed(1)}%`
                        : '0%'}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-teal-500 to-teal-400 rounded-full transition-all duration-700"
                    style={{
                      width: kpiData && kpiData.totalSales > 0
                        ? `${Math.max(Math.min(((kpiData.totalSales - kpiData.totalPurchases) / kpiData.totalSales) * 100, 100), 0)}%`
                        : '0%',
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Net Profit Margin */}
            <Card className={kpiData && kpiData.netIncome >= 0 ? 'border-violet-200' : 'border-red-200'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${kpiData && kpiData.netIncome >= 0 ? 'bg-violet-50' : 'bg-red-50'}`}>
                    <TrendingUp className={`h-4 w-4 ${kpiData && kpiData.netIncome >= 0 ? 'text-violet-600' : 'text-red-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">هامش صافي الربح</p>
                    <p className={`text-lg font-bold ${kpiData && kpiData.netIncome >= 0 ? 'text-violet-700' : 'text-red-700'}`}>
                      {kpiData && kpiData.totalSales > 0
                        ? `${((kpiData.netIncome / kpiData.totalSales) * 100).toFixed(1)}%`
                        : '0%'}
                    </p>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      kpiData && kpiData.netIncome >= 0
                        ? 'bg-gradient-to-l from-violet-500 to-violet-400'
                        : 'bg-gradient-to-l from-red-500 to-red-400'
                    }`}
                    style={{
                      width: kpiData && kpiData.totalSales > 0
                        ? `${Math.max(Math.min(Math.abs((kpiData.netIncome / kpiData.totalSales) * 100), 100), 0)}%`
                        : '0%',
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            <Card className={kpiData && kpiData.lowStockItems > 0 ? 'border-red-200' : 'border-green-200'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${kpiData && kpiData.lowStockItems > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    {kpiData && kpiData.lowStockItems > 0 ? (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">أصناف منخفضة المخزون</p>
                    <p className={`text-lg font-bold ${kpiData && kpiData.lowStockItems > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {kpiData?.lowStockItems || 0} / {kpiData?.totalItems || 0}
                    </p>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      kpiData && kpiData.lowStockItems > 0 ? 'bg-red-400' : 'bg-green-400'
                    }`}
                    style={{
                      width: kpiData && kpiData.totalItems > 0
                        ? `${(kpiData.lowStockItems / kpiData.totalItems) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
              </CardContent>
            </Card>

              {/* Receivables vs Payables */}
              <Card className="border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500">صافي الذمم</p>
                      <p className={`text-lg font-bold ${
                        kpiData && (kpiData.customerReceivables - kpiData.supplierPayables) >= 0
                          ? 'text-amber-700' : 'text-red-700'
                      }`}>
                        {formatCurrency(Math.abs((kpiData?.customerReceivables || 0) - (kpiData?.supplierPayables || 0)))}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {kpiData && (kpiData.customerReceivables - kpiData.supplierPayables) >= 0
                      ? 'لصالح الشركة (مستحقات أكثر من التزامات)'
                      : 'على الشركة (التزامات أكثر من مستحقات)'}
                  </p>
                </CardContent>
              </Card>
          </div>
        </>
      )}

      {/* ─── Reports Navigation Grid ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-1.5 w-6 bg-violet-500 rounded-full" />
          <h3 className="text-sm font-semibold text-slate-700">التقارير التفصيلية</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {reportItems.map((item) => (
            <Card
              key={item.id}
              className={`cursor-pointer transition-all duration-200 border ${item.border} ${item.hover} hover:shadow-md group`}
              onClick={() => onNavigate(item.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div
                    className={`h-9 w-9 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}
                  >
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${item.tagColor}`}>
                      {item.tag}
                    </span>
                    <ArrowLeft className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 text-sm mb-0.5">{item.title}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
