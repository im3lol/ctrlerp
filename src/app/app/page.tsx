'use client'

import dynamic from 'next/dynamic'

// Dynamic import with ssr: false to avoid Clerk SSR errors when keys aren't configured
const AppContent = dynamic(
  () => import('./app-content'),
  {
    ssr: false,
    loading: () => (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">جاري التحميل...</p>
        </div>
      </div>
    ),
  }
)

// AuthProvider wrapper removed - ClerkProvider is now global in layout.tsx
export default function AppPage() {
  return <AppContent />
}
