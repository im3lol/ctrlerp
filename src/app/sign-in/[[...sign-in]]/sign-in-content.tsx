'use client'

import { SignIn } from '@clerk/nextjs'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
const hasValidClerkKey = CLERK_KEY && CLERK_KEY.startsWith('pk_')

export default function SignInContent() {
  // Fallback when Clerk is not configured
  if (!hasValidClerkKey) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-gradient-to-bl from-[#050510] via-[#0a0a14] to-[#050510] p-4 relative overflow-hidden"
        style={{ fontFamily: "var(--font-thmanyah-sans)" }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#7C3AED]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#7C3AED]/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 bg-white/95 backdrop-blur-sm shadow-2xl shadow-black/20 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 bg-gradient-to-bl from-[#7C3AED] to-[#F59E0B] rounded-2xl flex items-center justify-center shadow-lg shadow-[#7C3AED]/30 mx-auto mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1
            className="text-2xl font-bold text-slate-900 mb-3"
            style={{ fontFamily: "var(--font-thmanyah-serif)" }}
          >
            كنترول
          </h1>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-amber-800 text-sm font-medium mb-1">خدمة المصادقة قيد الإعداد</p>
            <p className="text-amber-600 text-xs">
              يتم حالياً إعداد خدمة تسجيل الدخول. يرجى المحاولة لاحقاً أو التواصل مع المسؤول.
            </p>
          </div>
          <a href="/">
            <Button variant="outline" className="w-full rounded-xl">
              العودة إلى الصفحة الرئيسية
            </Button>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gradient-to-bl from-[#050510] via-[#0a0a14] to-[#050510] p-4 relative overflow-hidden"
      style={{ fontFamily: "var(--font-thmanyah-sans)" }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#7C3AED]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#7C3AED]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#F59E0B]/5 rounded-full blur-2xl" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-2">
          <div className="mx-auto mb-4">
            <div className="h-16 w-16 bg-gradient-to-bl from-[#7C3AED] to-[#F59E0B] rounded-2xl flex items-center justify-center shadow-lg shadow-[#7C3AED]/20 mx-auto rotate-3 hover:rotate-0 transition-transform duration-300">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1
            className="text-3xl font-bold text-white mb-2"
            style={{ fontFamily: "var(--font-thmanyah-serif)" }}
          >
            كنترول
          </h1>
          <p className="text-slate-400 text-sm">تسجيل الدخول إلى حسابك</p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="w-full">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-white/95 backdrop-blur-sm shadow-2xl shadow-black/20 border-0 rounded-2xl",
                headerTitle: "text-slate-900 font-bold",
                headerSubtitle: "text-slate-500",
                socialButtonsBlockButton: "border-slate-200 hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/5 rounded-xl h-11 text-sm font-medium",
                socialButtonsBlockButtonText: "text-slate-700",
                dividerLine: "bg-slate-200",
                dividerText: "text-slate-400 text-xs",
                formFieldLabel: "text-sm font-medium text-slate-700",
                formFieldInput: "h-11 rounded-xl border-slate-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 bg-slate-50/50 hover:bg-white transition-colors text-right",
                formFieldInputShowPasswordButton: "text-slate-400 hover:text-slate-600",
                formButtonPrimary: "bg-[#7C3AED] hover:bg-[#8B5CF6] text-white rounded-xl h-11 font-medium shadow-lg shadow-[#7C3AED]/20",
                formButtonPrimaryHover: "bg-[#8B5CF6]",
                footerActionLink: "text-[#7C3AED] hover:text-[#8B5CF6] font-medium",
                identityPreviewText: "text-slate-700",
                formResendCodeLink: "text-[#7C3AED] hover:text-[#8B5CF6]",
                alertText: "text-sm",
                badge: "bg-[#7C3AED]/10 text-[#7C3AED]",
              },
              variables: {
                colorPrimary: '#7C3AED',
                colorBackground: '#ffffff',
                colorInputBackground: '#f8fafc',
                colorInputText: '#0f172a',
                borderRadius: '0.75rem',
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            afterSignInUrl="/app"
            afterSignUpUrl="/app"
          />
        </div>

        {/* Back to landing */}
        <a
          href="/"
          className="text-slate-400 hover:text-white text-sm transition-colors mt-2"
        >
          العودة إلى الصفحة الرئيسية
        </a>
      </div>
    </div>
  )
}
