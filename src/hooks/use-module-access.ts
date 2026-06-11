import { useAppStore } from '@/lib/store'
import { hasModuleAccess, getAccessibleModules } from '@/lib/permissions'

/**
 * Hook to check module access based on current user role
 */
export function useModuleAccess() {
  const user = useAppStore((state) => state.user)
  const role = user?.role || 'viewer'

  return {
    canAccess: (module: string) => hasModuleAccess(role, module),
    accessibleModules: getAccessibleModules(role),
    role,
    isAdmin: role === 'super_admin' || role === 'admin',
    isSuperAdmin: role === 'super_admin',
  }
}
