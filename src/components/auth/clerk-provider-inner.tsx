'use client'

import { ClerkProvider } from "@clerk/nextjs"
import ClerkAuthBridge from "@/components/auth/clerk-auth-bridge"

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
const hasValidClerkKey = CLERK_KEY && CLERK_KEY.startsWith('pk_')

/**
 * Inner ClerkProvider wrapper - only imported client-side via dynamic().
 * Checks if a valid Clerk key exists before wrapping with ClerkProvider.
 */
export default function ClerkProviderInner({ children }: { children: React.ReactNode }) {
  if (!hasValidClerkKey) {
    return <>{children}</>
  }

  return (
    <ClerkProvider>
      <ClerkAuthBridge />
      {children}
    </ClerkProvider>
  )
}
