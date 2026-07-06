import { useAuth } from '@/context/AuthContext';
import { useMemo } from 'react';

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission);
  }, [user?.permissions, permission]);
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useAnyPermission(permissions: string[]): boolean {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user?.permissions || permissions.length === 0) return false;
    return permissions.some(permission => user.permissions!.includes(permission));
  }, [user?.permissions, permissions]);
}

/**
 * Hook to check if user has all of the specified permissions
 */
export function useAllPermissions(permissions: string[]): boolean {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user?.permissions || permissions.length === 0) return false;
    return permissions.every(permission => user.permissions!.includes(permission));
  }, [user?.permissions, permissions]);
}

/**
 * Hook to get all user permissions
 */
export function useUserPermissions(): string[] {
  const { user } = useAuth();
  
  return useMemo(() => {
    return user?.permissions || [];
  }, [user?.permissions]);
}

/**
 * Hook to check permissions by module
 */
export function useModulePermissions(module: string) {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user?.permissions) {
      return {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canApprove: false,
        canManage: false
      };
    }

    const permissions = user.permissions;
    
    return {
      canCreate: permissions.includes(`${module}.create`),
      canRead: permissions.includes(`${module}.read`),
      canUpdate: permissions.includes(`${module}.update`),
      canDelete: permissions.includes(`${module}.delete`),
      canApprove: permissions.includes(`${module}.approve`),
      canManage: permissions.includes(`${module}.manage`)
    };
  }, [user?.permissions, module]);
}

/**
 * Hook for common permission patterns
 */
export function useCommonPermissions() {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user?.permissions) {
      return {
        isSuperAdmin: false,
        canManageUsers: false,
        canManageProjects: false,
        canManageRBAC: false,
        canViewReports: false,
        canManageSystem: false
      };
    }

    const permissions = user.permissions;
    
    return {
      isSuperAdmin: user.role === 'SUPER_ADMIN',
      canManageUsers: permissions.includes('user.create') || permissions.includes('user.update') || permissions.includes('user.delete'),
      canManageProjects: permissions.includes('project.create') || permissions.includes('project.update') || permissions.includes('project.delete'),
      canManageRBAC: permissions.includes('rbac.manage'),
      canViewReports: permissions.includes('report.view'),
      canManageSystem: permissions.includes('system.settings') || permissions.includes('system.logs')
    };
  }, [user?.permissions, user?.role]);
}
