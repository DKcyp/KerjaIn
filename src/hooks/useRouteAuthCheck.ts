"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook that triggers authentication check only when the user navigates to different routes
 * This replaces the previous polling behavior that checked on every user interaction
 */
export function useRouteAuthCheck() {
  const pathname = usePathname();
  const { user, reload } = useAuth();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    // Skip on initial mount (AuthContext already loads on mount)
    if (previousPathname.current === null) {
      previousPathname.current = pathname;
      return;
    }

    // Skip authentication check for monitoring pages
    if (pathname?.startsWith('/monitoring')) {
      previousPathname.current = pathname;
      return;
    }

    // Only check auth when route actually changes and user exists
    if (previousPathname.current !== pathname && user) {
      console.log('🔄 Route changed, checking authentication:', previousPathname.current, '→', pathname);
      reload();
    }

    previousPathname.current = pathname;
  }, [pathname, user, reload]);
}
