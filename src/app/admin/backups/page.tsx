import { BackupsList } from '@/components/admin/backups-list'

export default function BackupsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">النسخ الاحتياطية</h1>
        <p className="text-slate-400">إدارة النسخ الاحتياطية لقاعدة البيانات</p>
      </div>
      <BackupsList />
    </div>
  )
}
