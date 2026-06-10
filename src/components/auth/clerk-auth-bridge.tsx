'use client'

import { useEffect, useRef } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useAppStore } from '@/lib/store'

/**
 * ClerkAuthBridge - Bridges Clerk authentication with the ERP's local auth state.
 *
 * When a user is authenticated via Clerk, this component:
 * 1. Calls /api/clerk/sync to create/update the local user record
 * 2. Stores the ERP access token in the Zustand store
 * 3. Sets the user info and companies in the store
 *
 * This allows the existing ERP components to work seamlessly with Clerk auth.
 */
export default function ClerkAuthBridge() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user: clerkUser } = useUser()
  const { setUser, setCompanies, setCurrentCompany, setAccessToken, isAuthenticated } = useAppStore()
  const syncAttempted = useRef(false)

  useEffect(() => {
    // Only sync when Clerk auth is loaded and user is signed in
    if (!isLoaded || !isSignedIn || !clerkUser) return

    // Skip if already authenticated locally and sync was attempted
    if (isAuthenticated && syncAttempted.current) return

    // Prevent multiple sync attempts
    if (syncAttempted.current) return
    syncAttempted.current = true

    const syncUser = async () => {
      try {
        const res = await fetch('/api/clerk/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            fullName: clerkUser.fullName || '',
            firstName: clerkUser.firstName || '',
            lastName: clerkUser.lastName || '',
          }),
        })

        if (!res.ok) {
          console.error('[ClerkAuthBridge] Sync failed:', res.status)
          syncAttempted.current = false
          return
        }

        const data = await res.json()

        if (data.token) {
          setAccessToken(data.token)
        }

        if (data.user) {
          setUser({
            id: data.user.id || '',
            name: data.user.name || '',
            username: data.user.username || '',
            role: data.user.role || 'viewer',
            email: data.user.email || undefined,
          })
        }

        if (data.companies && data.companies.length > 0) {
          setCompanies(data.companies)
          if (data.companies.length === 1) {
            setCurrentCompany(data.companies[0].id)
          }
        }
      } catch (err) {
        console.error('[ClerkAuthBridge] Error:', err)
        syncAttempted.current = false
      }
    }

    syncUser()
  }, [isLoaded, isSignedIn, clerkUser, setUser, setCompanies, setCurrentCompany, setAccessToken, isAuthenticated])

  // When user signs out of Clerk, clear local auth state
  useEffect(() => {
    if (isLoaded && !isSignedIn && isAuthenticated) {
      useAppStore.getState().logout()
    }
  }, [isLoaded, isSignedIn, isAuthenticated])

  return null // This component doesn't render anything
}
