import React from 'react';
import { usePermission, useAnyPermission, useAllPermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: string;
  anyPermissions?: string[];
  allPermissions?: string[];
  fallback?: React.ReactNode;
  role?: 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN';
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function PermissionGate({
  children,
  permission,
  anyPermissions,
  allPermissions,
  fallback = null,
  role
}: PermissionGateProps) {
  const hasPermission = usePermission(permission || '');
  const hasAnyPermission = useAnyPermission(anyPermissions || []);
  const hasAllPermissions = useAllPermissions(allPermissions || []);

  // Check role if specified
  if (role) {
    // This would need to be implemented with useAuth hook
    // For now, we'll focus on permissions
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission;
  } else if (anyPermissions && anyPermissions.length > 0) {
    hasAccess = hasAnyPermission;
  } else if (allPermissions && allPermissions.length > 0) {
    hasAccess = hasAllPermissions;
  } else {
    // If no permissions specified, allow access
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Higher-order component for permission-based access control
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: string,
  fallback?: React.ComponentType<P>
) {
  return function PermissionWrappedComponent(props: P) {
    const hasPermission = usePermission(permission);

    if (!hasPermission) {
      const Fallback = fallback;
      return Fallback ? <Fallback {...props} /> : null;
    }

    return <Component {...props} />;
  };
}

/**
 * Hook-based permission checker for conditional rendering
 */
export function usePermissionGate() {
  const hasPermission = usePermission;
  const hasAnyPermission = useAnyPermission;
  const hasAllPermissions = useAllPermissions;

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess: (config: {
      permission?: string;
      anyPermissions?: string[];
      allPermissions?: string[];
    }) => {
      if (config.permission) {
        return hasPermission(config.permission);
      }
      if (config.anyPermissions) {
        return hasAnyPermission(config.anyPermissions);
      }
      if (config.allPermissions) {
        return hasAllPermissions(config.allPermissions);
      }
      return true;
    }
  };
}
