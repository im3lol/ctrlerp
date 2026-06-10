'use client'

import {
  Building2,
  DollarSign,
  Ruler,
  UserCog,
  GitBranch,
  Settings,
  ArrowLeft,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'

interface SettingsPageProps {
  onNavigate: (view: string) => void
}

const settingsItems = [
  {
    id: 'company',
    title: 'بيانات الشركة',
    description: 'تعديل المعلومات الأساسية للشركة الحالية مثل الاسم والعنوان والرقم الضريبي',
    icon: Building2,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    hover: 'hover:border-violet-300 hover:shadow-violet-100',
  },
  {
    id: 'companies',
    title: 'إدارة الشركات',
    description: 'عرض جميع الشركات المسجلة وإضافتها والتبديل بينها وإدارة بياناتها',
    icon: Building2,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    hover: 'hover:border-indigo-300 hover:shadow-indigo-100',
  },
  {
    id: 'currencies',
    title: 'العملات',
    description: 'إعداد العملات وأسعار الصرف وتحديد العملة الأساسية للشركة',
    icon: DollarSign,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    hover: 'hover:border-amber-300 hover:shadow-amber-100',
  },
  {
    id: 'uom',
    title: 'وحدات القياس',
    description: 'تعريف وحدات القياس المستخدمة في النظام مثل القطعة والكيلو واللتر',
    icon: Ruler,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-100',
    hover: 'hover:border-teal-300 hover:shadow-teal-100',
  },
  {
    id: 'users',
    title: 'المستخدمين',
    description: 'إدارة حسابات المستخدمين وأدوارهم وصلاحياتهم في النظام',
    icon: UserCog,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    hover: 'hover:border-blue-300 hover:shadow-blue-100',
  },
  {
    id: 'chart-of-accounts',
    title: 'شجرة الحسابات',
    description: 'إعداد الدليل المحاسبي للشركة وتعريف الحسابات الرئيسية والفرعية',
    icon: GitBranch,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    hover: 'hover:border-orange-300 hover:shadow-orange-100',
  },
]

export default function SettingsLanding({ onNavigate }: SettingsPageProps) {
  const companyName = useAppStore((s) => {
    const cid = s.currentCompanyId
    const company = s.companies.find((c) => c.id === cid)
    return company?.nameAr || 'الشركة'
  })

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

      {/* Settings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsItems.map((item) => (
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
                <ArrowLeft className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors mt-1" />
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
            <Settings className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-violet-800">نصيحة</p>
            <p className="text-xs text-violet-600">يمكنك الوصول لأي صفحة إعدادات مباشرة من القائمة الجانبية تحت قسم الإعدادات</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
