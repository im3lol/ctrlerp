'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Download, Trash2, Plus, RefreshCw, HardDrive, Clock,
  Database, Loader2, CheckCircle, XCircle
} from 'lucide-react'

// Match the admin layout's token key
const ADMIN_TOKEN_KEY = 'ctrl_admin_token'

interface BackupInfo {
  id: string
  filename: string
  size: number
  createdAt: string
  type: 'manual' | 'auto' | 'pre-migration'
  tenantId?: string
  tenantName?: string
  checksum: string
}

export function BackupsList() {
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadBackups = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      const res = await fetch('/api/admin/backups', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setBackups(data.backups || [])
      } else {
        setError(data.error || 'فشل تحميل النسخ الاحتياطية')
      }
    } catch {
      setError('فشل الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBackups()
  }, [])

  const createNewBackup = async () => {
    try {
      setCreating(true)
      setError('')
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'manual' }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('تم إنشاء النسخة الاحتياطية بنجاح')
        setTimeout(() => setSuccess(''), 3000)
        loadBackups()
      } else {
        setError(data.error || 'فشل إنشاء النسخة الاحتياطية')
      }
    } catch {
      setError('فشل الاتصال بالخادم')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه النسخة الاحتياطية؟')) return

    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      const res = await fetch(`/api/admin/backups?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setSuccess('تم حذف النسخة الاحتياطية')
        setTimeout(() => setSuccess(''), 3000)
        loadBackups()
      }
    } catch {
      setError('فشل حذف النسخة الاحتياطية')
    }
  }

  const downloadBackup = (filename: string) => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY)
    window.open(`/api/admin/backups/download?filename=${encodeURIComponent(filename)}&token=${token}`, '_blank')
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'manual': return <Badge variant="default">يدوي</Badge>
      case 'auto': return <Badge variant="secondary">تلقائي</Badge>
      case 'pre-migration': return <Badge variant="outline">قبل الترحيل</Badge>
      default: return <Badge variant="secondary">{type}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <span className="mr-3 text-slate-400">جاري تحميل النسخ الاحتياطية...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={createNewBackup} disabled={creating}>
            {creating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري الإنشاء...</>
            ) : (
              <><Plus className="mr-2 h-4 w-4" /> نسخة احتياطية جديدة</>
            )}
          </Button>
          <Button variant="outline" onClick={loadBackups}>
            <RefreshCw className="mr-2 h-4 w-4" /> تحديث
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Database className="h-4 w-4" />
          <span>{backups.length} نسخة احتياطية</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-violet-600" />
              <div>
                <p className="text-sm text-slate-400">إجمالي المساحة</p>
                <p className="text-xl font-bold text-white">{formatSize(backups.reduce((acc, b) => acc + b.size, 0))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-slate-400">آخر نسخة</p>
                <p className="text-sm font-bold text-white">
                  {backups.length > 0 ? formatDate(backups[0].createdAt) : 'لا توجد'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-slate-400">نسخ يدوية</p>
                <p className="text-xl font-bold text-white">{backups.filter(b => b.type === 'manual').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle>النسخ الاحتياطية</CardTitle>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Database className="h-12 w-12 mx-auto mb-3 text-slate-600" />
              <p>لا توجد نسخ احتياطية</p>
              <p className="text-sm">اضغط على &quot;نسخة احتياطية جديدة&quot; لإنشاء واحدة</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {backups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-3 border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-5 w-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-sm font-mono text-slate-200" dir="ltr">{backup.filename}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getTypeBadge(backup.type)}
                        <span className="text-xs text-slate-400">{formatSize(backup.size)}</span>
                        <span className="text-xs text-slate-600">•</span>
                        <span className="text-xs text-slate-400">{formatDate(backup.createdAt)}</span>
                        {backup.tenantName && (
                          <>
                            <span className="text-xs text-slate-600">•</span>
                            <span className="text-xs text-violet-400">{backup.tenantName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => downloadBackup(backup.filename)} className="text-slate-400 hover:text-white">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDeleteBackup(backup.filename)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
