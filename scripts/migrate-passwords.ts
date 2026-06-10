/**
 * Password Migration Script
 * Migrates all base64-encoded passwords to bcrypt hashes
 * 
 * Usage: npx tsx scripts/migrate-passwords.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

async function migratePasswords() {
  const db = new PrismaClient()
  
  console.log('🔄 Starting password migration from Base64 to bcrypt...\n')
  
  try {
    // Migrate PlatformAdmin passwords
    const admins = await db.platformAdmin.findMany()
    let adminMigrated = 0
    
    for (const admin of admins) {
      // Skip if already bcrypt
      if (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$') || admin.password.startsWith('$2y$')) {
        console.log(`  ⏭️  Admin "${admin.username}" already using bcrypt - skipping`)
        continue
      }
      
      // Decode base64 to get original password
      const originalPassword = Buffer.from(admin.password, 'base64').toString('utf-8')
      const bcryptHash = await bcrypt.hash(originalPassword, SALT_ROUNDS)
      
      await db.platformAdmin.update({
        where: { id: admin.id },
        data: { password: bcryptHash },
      })
      
      adminMigrated++
      console.log(`  ✅ Admin "${admin.username}" migrated to bcrypt`)
    }
    
    console.log(`\n📊 Admin migration: ${adminMigrated}/${admins.length} migrated\n`)
    
    // Note: User passwords in tenant databases will be auto-migrated on next login
    // This is handled by the verifyPassword + isLegacyPassword functions
    
    console.log('✨ Migration complete!')
    console.log('ℹ️  Note: User passwords in tenant databases will be auto-migrated on next login.')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

migratePasswords()
