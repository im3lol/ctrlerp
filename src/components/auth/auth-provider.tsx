'use client'

import dynamic from 'next/dynamic'

// Dynamically import the ClerkProvider wrapper with SSR disabled
// This prevents Clerk from initializing on the server where it would fail
// without valid API keys
const ClerkProviderWrapper = dynamic(
  () => import('./clerk-provider-inner'),
  { ssr: false, loading: () => null }
)

/**
 * AuthProvider - Conditionally wraps the app with ClerkProvider.
 * Uses dynamic import with ssr: false to avoid Clerk initialization
 * errors on the server when API keys haven't been configured yet.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <ClerkProviderWrapper>{children}</ClerkProviderWrapper>
}
