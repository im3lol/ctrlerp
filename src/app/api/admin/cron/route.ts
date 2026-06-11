import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-guard'
import { checkLicenseExpiry } from '@/lib/license-checker'
import { cleanupNotifications } from '@/lib/notifications'

/**
 * Cron endpoint for periodic checks
 * Can be called by external cron service (e.g., cron-job.org) or manually
 * Protected by admin auth OR cron secret
 */
export async function POST(request: NextRequest) {
  try {
    // Allow access via admin auth OR cron secret
    const admin = await getAdminFromRequest(request)
    const cronSecret = request.headers.get('X-Cron-Secret')
    const validCronSecret = process.env.CRON_SECRET
    
    if (!admin && (!validCronSecret || cronSecret !== validCronSecret)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // Run periodic checks in parallel
    const [licenseCheck, notifCleanup] = await Promise.all([
      checkLicenseExpiry(),
      cleanupNotifications(),
    ])

    return NextResponse.json({
      message: 'تم تنفيذ المهام المجدولة',
      results: {
        licenseCheck,
        notificationsCleaned: notifCleanup,
      },
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: 'فشل تنفيذ المهام المجدولة' }, { status: 500 })
  }
}
