'use client'

import { ClerkProvider } from "@clerk/nextjs"
import ClerkAuthBridge from "@/components/auth/clerk-auth-bridge"

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
const hasValidClerkKey = CLERK_KEY && CLERK_KEY.startsWith('pk_')

/**
 * Wraps children with ClerkProvider if a valid Clerk publishable key is available.
 * Falls back to no-provider wrapping if Clerk is not configured yet.
 * This prevents the app from crashing when Clerk keys haven't been set up.
 */
export default function ClerkProviderWrapper({ children }: { children: React.ReactNode }) {
  if (!hasValidClerkKey) {
    console.warn('[Clerk] No valid publishable key found. Clerk auth is disabled. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable it.')
    return <>{children}</>
  }

  return (
    <ClerkProvider>
      <ClerkAuthBridge />
      {children}
    </ClerkProvider>
  )
}
