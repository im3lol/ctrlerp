import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gradient-to-bl from-[#050510] via-[#0a0a14] to-[#050510] p-4 relative overflow-hidden"
      style={{ fontFamily: "var(--font-thmanyah-sans)" }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#7C3AED]/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border-0",
              headerTitle: "text-xl font-bold",
              headerSubtitle: "text-slate-500",
              formButtonPrimary: "bg-[#7C3AED] hover:bg-[#8B5CF6]",
              formFieldInput: "rounded-xl border-slate-200",
              footerActionLink: "text-[#7C3AED] hover:text-[#8B5CF6]",
            },
          }}
          routing="path"
          path="/sign-in"
          afterSignInUrl="/app"
        />
      </div>
    </div>
  )
}
