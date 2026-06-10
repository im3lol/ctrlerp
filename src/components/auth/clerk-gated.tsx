'use client'

import { Show, UserButton, SignInButton, SignUpButton } from '@clerk/nextjs'

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
const hasValidClerkKey = CLERK_KEY && CLERK_KEY.startsWith('pk_')

/**
 * ClerkGated - Conditionally renders Clerk components only when Clerk is configured.
 * Falls back to regular HTML links/buttons when Clerk is not available.
 */

export function ClerkSignInButton({ children, className }: { children: React.ReactNode; className?: string }) {
  if (!hasValidClerkKey) {
    return <a href="/sign-in" className={className}>{children}</a>
  }
  return <SignInButton mode="redirect" redirectUrl="/app">{children}</SignInButton>
}

export function ClerkSignUpButton({ children, className }: { children: React.ReactNode; className?: string }) {
  if (!hasValidClerkKey) {
    return <a href="/sign-up" className={className}>{children}</a>
  }
  return <SignUpButton mode="redirect" redirectUrl="/app">{children}</SignUpButton>
}

export function ClerkShow({ when, children, fallback }: { when: 'signed-in' | 'signed-out'; children: React.ReactNode; fallback?: React.ReactNode }) {
  if (!hasValidClerkKey) {
    // When Clerk is not configured, show fallback (signed-out state by default)
    return when === 'signed-out' ? <>{children}</> : <>{fallback}</>
  }
  return <Show when={when}>{children}</Show>
}

export function ClerkUserButton() {
  if (!hasValidClerkKey) {
    return null
  }
  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: "h-9 w-9",
        },
      }}
    />
  )
}
