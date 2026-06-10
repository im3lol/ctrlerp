'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Lock, Key, CheckCircle, XCircle, Loader2, Shield } from 'lucide-react'

export default function LicenseActivatePage() {
  const [licenseKey, setLicenseKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [licenseStatus, setLicenseStatus] = useState<any>(null)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/license/status')
      const data = await res.json()
      setLicenseStatus(data)
    } catch (e) {
      console.error(e)
    } finally {
      setChecking(false)
    }
  }

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('يرجى إدخال مفتاح الترخيص')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey.trim() }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setLicenseStatus(data.status)
        // Redirect to app after 3 seconds
        setTimeout(() => {
          window.location.href = '/app'
        }, 3000)
      } else {
        setError(data.error || 'فشل تفعيل الترخيص')
      }
    } catch (e: any) {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600 dark:text-gray-400">جاري التحقق من الترخيص...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
            <Shield className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">كنترول ERP</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">تفعيل ترخيص النظام</p>
        </div>

        {/* Current Status */}
        {licenseStatus && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {licenseStatus.locked ? (
                  <><Lock className="w-5 h-5 text-red-500" /> النظام مقفل</>
                ) : (
                  <><CheckCircle className="w-5 h-5 text-green-500" /> النظام مفعل</>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {licenseStatus.active ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">نوع الترخيص:</span>
                    <Badge variant="outline">{licenseStatus.type}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">الأيام المتبقية:</span>
                    <span>{licenseStatus.isLifetime ? 'مدى الحياة' : licenseStatus.daysRemaining}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">الحد الأقصى للمستخدمين:</span>
                    <span>{licenseStatus.maxUsers}</span>
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>
                    {licenseStatus.reason === 'NO_LICENSE' && 'لا يوجد ترخيص مفعل. يرجى إدخال مفتاح الترخيص الذي حصلت عليه من مالك المنصة.'}
                    {licenseStatus.reason === 'LICENSE_EXPIRED' && 'انتهت صلاحية الترخيص. يرجى التجديد.'}
                    {licenseStatus.reason === 'SIGNATURE_MISMATCH' && 'مفتاح الترخيص غير صالح أو تم التلاعب به.'}
                    {licenseStatus.reason === 'MACHINE_MISMATCH' && 'مفتاح الترخيص مرتبط بجهاز آخر.'}
                    {licenseStatus.reason === 'INVALID_SIGNATURE' && 'مفتاح الترخيص غير صالح - تم رفض التوقيع.'}
                    {licenseStatus.reason === 'VERIFICATION_ERROR' && 'فشل التحقق من الترخيص.'}
                    {!['NO_LICENSE', 'LICENSE_EXPIRED', 'SIGNATURE_MISMATCH', 'MACHINE_MISMATCH', 'INVALID_SIGNATURE', 'VERIFICATION_ERROR'].includes(licenseStatus.reason) && 'النظام مقفل. يرجى التواصل مع مالك المنصة.'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activation Form */}
        {(!licenseStatus?.active) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                إدخال مفتاح الترخيص
              </CardTitle>
              <CardDescription>
                أدخل مفتاح الترخيص الذي حصلت عليه من مالك المنصة لتفعيل النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">مفتاح الترخيص</label>
                  <Input
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="أدخل مفتاح الترخيص هنا..."
                    className="font-mono text-sm"
                    dir="ltr"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-200 bg-green-50 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      تم تفعيل الترخيص بنجاح! سيتم تحويلك تلقائياً...
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleActivate}
                  disabled={loading || !licenseKey.trim()}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري التفعيل...</>
                  ) : (
                    <><Key className="mr-2 h-4 w-4" /> تفعيل الترخيص</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          للحصول على مفتاح الترخيص، يرجى التواصل مع مالك المنصة
        </p>
      </div>
    </div>
  )
}
