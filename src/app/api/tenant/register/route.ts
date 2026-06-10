import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { provisionTenantDatabase, seedTenantDatabase, generateSubdomain } from '@/lib/tenant-db'
import { logActivity } from '@/lib/activity-logger'

// POST: Self-service tenant registration
// Creates a tenant, provisions a database, and sets up trial license
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      subdomain,
      adminUsername,
      adminPassword,
      adminName,
      companyName,
    } = body

    // ── Validation ──
    if (!name) {
      return NextResponse.json({ error: 'اسم الشركة مطلوب' }, { status: 400 })
    }
    if (!email) {
      return NextResponse.json({ error: 'البريد الإلكتروني مطلوب' }, { status: 400 })
    }
    if (!adminUsername) {
      return NextResponse.json({ error: 'اسم المستخدم مطلوب' }, { status: 400 })
    }
    if (!adminPassword || adminPassword.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 })
    }

    // Generate and validate subdomain
    const tenantSubdomain = subdomain || generateSubdomain(name)

    // Check subdomain uniqueness
    const existingSubdomain = await db.tenant.findUnique({ where: { subdomain: tenantSubdomain } })
    if (existingSubdomain) {
      return NextResponse.json({ error: 'النطاق الفرعي مستخدم بالفعل، اختر غيره' }, { status: 400 })
    }

    // Check email uniqueness
    const existingEmail = await db.tenant.findFirst({ where: { email } })
    if (existingEmail) {
      return NextResponse.json({ error: 'هذا البريد الإلكتروني مسجل بالفعل' }, { status: 400 })
    }

    // ── Create tenant ──
    const tenant = await db.tenant.create({
      data: {
        name,
        email,
        phone,
        subdomain: tenantSubdomain,
        dbStatus: 'pending',
        planType: 'trial',
      },
    })

    // ── Create trial license ──
    const generateKey = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      const group = () =>
        Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      return `CTRL-${group()}-${group()}-${group()}`
    }

    const licenseKey = generateKey()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const license = await db.license.create({
      data: {
        tenantId: tenant.id,
        key: licenseKey,
        type: 'trial',
        status: 'active',
        maxUsers: 1,
        maxCompanies: 1,
        isLifetime: false,
        price: 0,
        monthlyPrice: 0,
        currency: 'EGP',
        expiresAt,
      },
    })

    // ── Provision database ──
    const provisionResult = await provisionTenantDatabase(tenant.id)

    if (!provisionResult.success) {
      logActivity({
        action: 'tenant_registration_db_failed',
        category: 'tenant',
        description: `فشل توفير قاعدة بيانات للمستأجر الجديد: ${name}`,
        targetType: 'tenant',
        targetId: tenant.id,
        targetName: name,
        details: { error: provisionResult.error },
      })

      // Return partial success - tenant created but DB pending
      return NextResponse.json({
        tenant: { id: tenant.id, subdomain: tenantSubdomain },
        license: { key: licenseKey, type: 'trial', expiresAt: expiresAt.toISOString() },
        provision: { success: false, error: provisionResult.error },
        message: 'تم إنشاء الحساب لكن قاعدة البيانات لم تكن متاحة. سيتم توفيرها قريباً.',
      }, { status: 202 })
    }

    // ── Seed initial data ──
    const seedResult = await seedTenantDatabase(
      tenant.id,
      adminUsername,
      adminPassword,
      adminName || 'مدير النظام',
      companyName || name
    )

    if (!seedResult.success) {
      console.error('Seed failed:', seedResult.error)
    }

    // ── Log activity ──
    logActivity({
      action: 'tenant_registered',
      category: 'tenant',
      description: `تسجيل مستأجر جديد: ${name} (${tenantSubdomain}) مع ترخيص تجريبي 7 أيام`,
      targetType: 'tenant',
      targetId: tenant.id,
      targetName: name,
      details: { email, subdomain: tenantSubdomain, databaseName: provisionResult.databaseName },
    })

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name,
        subdomain: tenantSubdomain,
        email,
      },
      license: {
        key: licenseKey,
        type: 'trial',
        expiresAt: expiresAt.toISOString(),
        daysLeft: 7,
      },
      provision: {
        success: true,
        databaseName: provisionResult.databaseName,
      },
      loginUrl: `https://${tenantSubdomain}.ctrlerp.com/app`,
      message: 'تم إنشاء حسابك بنجاح! يمكنك تسجيل الدخول من خلال الرابط المخصص لك.',
    }, { status: 201 })
  } catch (error) {
    console.error('Tenant registration error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
