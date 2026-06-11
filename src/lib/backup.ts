import { execSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, readFileSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

// Backup directory
const BACKUP_DIR = process.env.BACKUP_DIR || './backups'

// Ensure backup directory exists
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true })
}

export interface BackupInfo {
  id: string
  filename: string
  size: number // bytes
  createdAt: Date
  type: 'manual' | 'auto' | 'pre-migration'
  tenantId?: string
  tenantName?: string
  checksum: string
}

export interface BackupResult {
  success: boolean
  backup?: BackupInfo
  error?: string
}

/**
 * Create a database backup using pg_dump
 */
export async function createBackup(options: {
  type?: 'manual' | 'auto' | 'pre-migration'
  tenantId?: string
  tenantName?: string
  databaseUrl?: string
  description?: string
}): Promise<BackupResult> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const type = options.type || 'manual'
    const dbUrl = options.databaseUrl || process.env.DIRECT_URL || ''

    if (!dbUrl) {
      return { success: false, error: 'لا يوجد اتصال بقاعدة البيانات' }
    }

    const prefix = options.tenantId ? `tenant_${options.tenantId.substring(0, 8)}` : 'platform'
    const filename = `${prefix}_${type}_${timestamp}.sql.gz`
    const filepath = join(BACKUP_DIR, filename)

    // Parse connection info from URL
    const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
    if (!urlMatch) {
      return { success: false, error: 'صيغة اتصال قاعدة البيانات غير صالحة' }
    }

    const [, user, password, host, port, database] = urlMatch

    // Run pg_dump with compression
    const env = { ...process.env, PGPASSWORD: password }
    execSync(
      `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} --no-owner --no-acl | gzip > "${filepath}"`,
      { env, timeout: 300_000, stdio: 'pipe' }
    )

    // Calculate checksum
    const checksum = calculateFileChecksum(filepath)
    const stats = statSync(filepath)

    const backup: BackupInfo = {
      id: createHash('md5').update(`${filename}${Date.now()}`).digest('hex').substring(0, 12),
      filename,
      size: stats.size,
      createdAt: new Date(),
      type,
      tenantId: options.tenantId,
      tenantName: options.tenantName,
      checksum,
    }

    // Cleanup old backups (keep last 10 per type)
    cleanupOldBackups(type, 10)

    return { success: true, backup }
  } catch (error: any) {
    console.error('[Backup] Failed:', error.message)
    return { success: false, error: 'فشل إنشاء النسخة الاحتياطية: ' + error.message }
  }
}

/**
 * Restore a database from a backup
 */
export async function restoreBackup(filename: string, databaseUrl?: string): Promise<BackupResult> {
  try {
    const filepath = join(BACKUP_DIR, filename)
    if (!existsSync(filepath)) {
      return { success: false, error: 'النسخة الاحتياطية غير موجودة' }
    }

    const dbUrl = databaseUrl || process.env.DIRECT_URL || ''
    if (!dbUrl) {
      return { success: false, error: 'لا يوجد اتصال بقاعدة البيانات' }
    }

    const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
    if (!urlMatch) {
      return { success: false, error: 'صيغة اتصال قاعدة البيانات غير صالحة' }
    }

    const [, user, password, host, port, database] = urlMatch
    const env = { ...process.env, PGPASSWORD: password }

    // Restore from backup
    execSync(
      `gunzip -c "${filepath}" | psql -h ${host} -p ${port} -U ${user} -d ${database}`,
      { env, timeout: 300_000, stdio: 'pipe' }
    )

    return { success: true }
  } catch (error: any) {
    console.error('[Backup] Restore failed:', error.message)
    return { success: false, error: 'فشل استعادة النسخة الاحتياطية: ' + error.message }
  }
}

/**
 * List all available backups
 */
export function listBackups(): BackupInfo[] {
  if (!existsSync(BACKUP_DIR)) return []

  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql.gz'))
    .map(filename => {
      const filepath = join(BACKUP_DIR, filename)
      const stats = statSync(filepath)

      // Parse type from filename
      const typeMatch = filename.match(/_(manual|auto|pre-migration)_/)
      const type = typeMatch ? typeMatch[1] as BackupInfo['type'] : 'manual'

      // Parse tenant ID from filename
      const tenantMatch = filename.match(/tenant_([a-z0-9]+)/)
      const tenantId = tenantMatch ? tenantMatch[1] : undefined

      return {
        id: createHash('md5').update(filename).digest('hex').substring(0, 12),
        filename,
        size: stats.size,
        createdAt: stats.mtime,
        type,
        tenantId,
        checksum: '',
      } as BackupInfo
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return files
}

/**
 * Delete a backup file
 */
export function deleteBackup(filename: string): boolean {
  try {
    const filepath = join(BACKUP_DIR, filename)
    if (existsSync(filepath)) {
      unlinkSync(filepath)
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Get backup file path for download
 */
export function getBackupFilePath(filename: string): string | null {
  const filepath = join(BACKUP_DIR, filename)
  return existsSync(filepath) ? filepath : null
}

// Helper: Calculate file checksum
function calculateFileChecksum(filepath: string): string {
  try {
    const data = readFileSync(filepath)
    return createHash('sha256').update(data).digest('hex').substring(0, 16)
  } catch {
    return 'unknown'
  }
}

// Helper: Cleanup old backups keeping only N most recent
function cleanupOldBackups(type: string, keepCount: number): void {
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.includes(`_${type}_`) && f.endsWith('.sql.gz'))
      .map(filename => ({
        filename,
        filepath: join(BACKUP_DIR, filename),
        mtime: statSync(join(BACKUP_DIR, filename)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime)

    // Delete files beyond keepCount
    for (let i = keepCount; i < files.length; i++) {
      try {
        unlinkSync(files[i].filepath)
      } catch {}
    }
  } catch {}
}
