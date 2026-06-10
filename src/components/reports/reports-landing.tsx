'use client'

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
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface ReportsLandingProps {
  onNavigate: (view: string) => void
}

const reportItems = [
  {
    id: 'trial-balance',
    title: 'ميزان المراجعة',
    description: 'تقرير شامل بأرصدة جميع الحسابات المدينة والدائنة مع التحقق من توازن القيود',
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
    description: 'عرض الأصول والخصوم وحقوق الملكية مع التحقق من توازن الميزانية في تاريخ محدد',
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
    description: 'حساب صافي الربح أو الخسارة خلال فترة محددة بعرض الإيرادات والمصروفات',
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
    description: 'ملخص شامل لحركة المخزون والأرصدة في جميع المخازن مع الكميات والقيم',
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
    description: 'تحليل مفصل لحركات المبيعات والفواتير والإيرادات خلال فترة زمنية محددة',
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
    description: 'تحليل حركات المشتريات والفواتير والمصروفات خلال فترة زمنية محددة',
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
    description: 'تقرير تفصيلي بمبالغ العملاء المستحقة ومواعيد الاستحقاق وتأخر السداد',
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
    description: 'تقرير تفصيلي بمبالغ الموردين المستحقة ومواعيد السداد المطلوبة',
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
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-gradient-to-bl from-[#7C3AED] to-[#5B21B6] rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
          <FileBarChart className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">التقارير</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            تقارير وتحليلات شاملة لمتابعة أداء الشركة
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportItems.map((item) => (
          <Card
            key={item.id}
            className={`cursor-pointer transition-all duration-200 border ${item.border} ${item.hover} hover:shadow-md group`}
            onClick={() => onNavigate(item.id)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`h-10 w-10 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${item.tagColor}`}>
                    {item.tag}
                  </span>
                  <ArrowLeft className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Info */}
      <Card className="border-violet-100 bg-gradient-to-l from-violet-50/50 to-white">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-8 w-8 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
            <FileBarChart className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-violet-800">تلميح</p>
            <p className="text-xs text-violet-600">جميع التقارير تدعم الطباعة. اختر التاريخ المناسب ثم اضغط على زر الطباعة في أعلى التقرير</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
