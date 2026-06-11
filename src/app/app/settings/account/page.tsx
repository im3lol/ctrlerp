'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Shield, Users, Building2, Clock, Key, CheckCircle, XCircle,
  Loader2, RefreshCw
} from 'lucide-react'

interface LicenseStatus {
  locked: boolean
  active: boolean
  type: string | null
  isTrial: boolean
  isLifetime: boolean
  daysRemaining: number
  maxUsers: number
  maxCompanies: number
  features: string[]
  expiresAt: string | null
  tenantId: string | null
  licenseKey: string | null
  reason?: string
}

export default function AccountSettingsPage() {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const loadLicenseStatus = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/license/status')
      const data = await res.json()
      setLicenseStatus(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLicenseStatus()
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case 'trial': return 'تجريبي'
      case 'basic': return 'أساسي'
      case 'professional': return 'احترافي'
      case 'enterprise': return 'مؤسسي'
      case 'lifetime': return 'مدى الحياة'
      default: return type || 'غير محدد'
    }
  }

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'trial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'basic': return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
      case 'professional': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'enterprise': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'lifetime': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <span className="mr-3 text-gray-500">جاري تحميل معلومات الحساب...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إعدادات الحساب</h1>
          <p className="text-gray-500">معلومات الترخيص والاشتراك</p>
        </div>
        <Button variant="outline" onClick={loadLicenseStatus}>
          <RefreshCw className="mr-2 h-4 w-4" /> تحديث
        </Button>
      </div>

      {/* License Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            حالة الترخيص
          </CardTitle>
        </CardHeader>
        <CardContent>
          {licenseStatus?.active ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-bold text-green-700 dark:text-green-400">الترخيص مفعل</p>
                  <Badge className={getTypeColor(licenseStatus.type)}>
                    {getTypeLabel(licenseStatus.type)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {/* Days Remaining */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Clock className="h-4 w-4" />
                    {licenseStatus.isLifetime ? 'مدى الحياة' : 'الأيام المتبقية'}
                  </div>
                  <p className="text-2xl font-bold">
                    {licenseStatus.isLifetime ? '∞' : licenseStatus.daysRemaining}
                  </p>
                  {!licenseStatus.isLifetime && licenseStatus.expiresAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      ينتهي في: {formatDate(licenseStatus.expiresAt)}
                    </p>
                  )}
                </div>

                {/* Max Users */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Users className="h-4 w-4" />
                    الحد الأقصى للمستخدمين
                  </div>
                  <p className="text-2xl font-bold">{licenseStatus.maxUsers}</p>
                </div>

                {/* Max Companies */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Building2 className="h-4 w-4" />
                    الحد الأقصى للشركات
                  </div>
                  <p className="text-2xl font-bold">{licenseStatus.maxCompanies}</p>
                </div>
              </div>

              {/* License Key */}
              {licenseStatus.licenseKey && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mt-4">
                  <p className="text-xs text-gray-500 mb-1">مفتاح الترخيص</p>
                  <p className="font-mono text-sm" dir="ltr">{licenseStatus.licenseKey}</p>
                </div>
              )}

              {/* Trial Warning */}
              {licenseStatus.isTrial && (
                <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                    أنت على ترخيص تجريبي. متبقي {licenseStatus.daysRemaining} يوم.
                    يرجى التواصل مع مالك المنصة للحصول على ترخيص كامل.
                  </AlertDescription>
                </Alert>
              )}

              {/* Expiring Soon Warning */}
              {!licenseStatus.isLifetime && !licenseStatus.isTrial && licenseStatus.daysRemaining <= 7 && licenseStatus.daysRemaining > 0 && (
                <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200">
                    ترخيصك ينتهي خلال {licenseStatus.daysRemaining} يوم. يرجى التجديد للمتابعة.
                  </AlertDescription>
                </Alert>
              )}

              {/* Features */}
              {licenseStatus.features && licenseStatus.features.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">المميزات المفعلة:</p>
                  <div className="flex flex-wrap gap-2">
                    {licenseStatus.features.map((feature, i) => (
                      <Badge key={i} variant="outline">{feature}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="font-bold text-red-700 dark:text-red-400">الترخيص غير مفعل</p>
                  <p className="text-sm text-gray-500">
                    {licenseStatus?.reason === 'NO_LICENSE' && 'لا يوجد ترخيص مفعل'}
                    {licenseStatus?.reason === 'LICENSE_EXPIRED' && 'انتهت صلاحية الترخيص'}
                    {licenseStatus?.reason === 'SIGNATURE_MISMATCH' && 'مفتاح الترخيص غير صالح'}
                    {licenseStatus?.reason === 'MACHINE_MISMATCH' && 'الترخيص مرتبط بجهاز آخر'}
                    {licenseStatus?.reason === 'NO_TENANT' && 'لم يتم تحديد حساب مستأجر'}
                    {licenseStatus?.reason === 'VERIFICATION_ERROR' && 'خطأ في التحقق من الترخيص'}
                    {!licenseStatus?.reason && 'يرجى تفعيل الترخيص'}
                  </p>
                </div>
              </div>
              <Button asChild>
                <a href="/license-activate">
                  <Key className="mr-2 h-4 w-4" /> تفعيل الترخيص
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>الدعم الفني</CardTitle>
          <CardDescription>للحصول على الدعم أو تجديد الترخيص</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>للحصول على مفتاح ترخيص جديد أو تجديد اشتراكك، يرجى التواصل مع مالك المنصة.</p>
            <p className="text-gray-400">كنترول ERP - نظام إدارة الأعمال المتكامل</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
