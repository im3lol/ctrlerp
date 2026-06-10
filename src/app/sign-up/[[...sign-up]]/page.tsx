'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/sign-in')
  }, [router])

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">جاري التحويل...</p>
      </div>
    </div>
  )
}
