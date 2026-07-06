"use client";
import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

interface SSORealTimeValidationOptions {
  checkOnNavigation?: boolean;
  checkOnFocus?: boolean;
  checkOnClick?: boolean;
  checkOnRefresh?: boolean;
  intervalMinutes?: number;
}

export function useSSORealTimeValidation(options: SSORealTimeValidationOptions = {}) {
  const {
    checkOnNavigation = true,
    checkOnFocus = true,
    checkOnClick = true,
    checkOnRefresh = true,
    intervalMinutes = 5 // Check every 5 minutes
  } = options;

  const { user, reload } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const lastCheckRef = useRef<number>(0);
  const isValidatingRef = useRef<boolean>(false);
  const redirectCountRef = useRef<number>(0);
  const lastRedirectRef = useRef<number>(0);

  const validateSSO = useCallback(async (reason: string, bypassRateLimit = false) => {
    // Prevent multiple simultaneous validations
    if (isValidatingRef.current) {
      return;
    }

    // Rate limiting - don't check more than once per 10 seconds (reduced for testing)
    const now = Date.now();
    const rateLimitMs = process.env.NODE_ENV === 'development' ? 10000 : 30000; // 10s dev, 30s prod
    if (!bypassRateLimit && now - lastCheckRef.current < rateLimitMs) {
      return;
    }
    
    if (bypassRateLimit) {
    }

    // Only validate if user is logged in (check for all users, not just SSO)
    if (!user) {
      return;
    }
    
    // Check if redirect loop was detected recently
    const loopDetected = localStorage.getItem('sso_redirect_loop_detected');
    if (loopDetected) {
      const loopTime = parseInt(loopDetected);
      const now = Date.now();
      if (now - loopTime < 5 * 60 * 1000) { // 5 minutes
        return;
      } else {
        // Clear old loop detection
        localStorage.removeItem('sso_redirect_loop_detected');
      }
    }

    isValidatingRef.current = true;
    lastCheckRef.current = now;

    try {
      
      // Check auth status via /api/auth/me which includes SSO validation
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store'
      });

      const result = await response.json();
      
      // If user is null or session expired, handle logout
      if (!response.ok || !result.user || result.sessionExpired) {
        
        // Check for redirect loop prevention
        const now = Date.now();
        if (now - lastRedirectRef.current < 30000) { // 30 seconds
          redirectCountRef.current += 1;
          if (redirectCountRef.current >= 3) {
            console.error('[SSO Real-time] Too many redirects detected, stopping to prevent infinite loop');
            // Store in localStorage to prevent further attempts
            localStorage.setItem('sso_redirect_loop_detected', now.toString());
            return;
          }
        } else {
          redirectCountRef.current = 1;
        }
        lastRedirectRef.current = now;
        
        // Clear user and let AuthContext handle session expiry gracefully
        await reload(); // This will trigger the auth context to check /api/auth/me
        
        // Don't force redirect - let AuthContext show session expiry modal
        // The AuthContext will handle this gracefully with sessionExpired modal
      } else {
      }
    } catch (error) {
      console.error('[SSO Real-time] Validation error:', error);
      // Don't force logout on network errors, let the normal flow handle it
    } finally {
      isValidatingRef.current = false;
    }
  }, [user, reload]);

  // Check on page navigation - always check for all logged-in users
  useEffect(() => {
    if (checkOnNavigation && user) {
      // Always bypass rate limit for navigation to ensure fresh auth check
      validateSSO('page navigation', true);
    }
  }, [pathname, checkOnNavigation, validateSSO, user]);

  // Check on window focus (when user returns to tab)
  useEffect(() => {
    if (!checkOnFocus) return;

    const handleFocus = () => {
      if (user) {
        validateSSO('window focus');
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkOnFocus, validateSSO, user]);

  // Check on page visibility change (tab switching)
  useEffect(() => {
    if (!checkOnFocus) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        validateSSO('visibility change');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkOnFocus, validateSSO, user]);

  // Check on user interactions (clicks)
  useEffect(() => {
    if (!checkOnClick) return;

    let clickCount = 0;
    const handleClick = () => {
      clickCount++;
      // Only validate every 10 clicks to avoid excessive API calls
      if (clickCount >= 10 && user?.ssoEnabled) {
        clickCount = 0;
        validateSSO('user interaction');
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [checkOnClick, validateSSO, user?.ssoEnabled]);

  // Periodic validation
  useEffect(() => {
    if (!user || intervalMinutes <= 0) return;

    const interval = setInterval(() => {
      validateSSO('periodic check');
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [validateSSO, user, intervalMinutes]);

  // Check on page refresh/reload
  useEffect(() => {
    if (!checkOnRefresh) return;

    const handleBeforeUnload = () => {
      // Store timestamp for next page load
      sessionStorage.setItem('sso_check_on_load', Date.now().toString());
    };

    const handleLoad = () => {
      const checkOnLoad = sessionStorage.getItem('sso_check_on_load');
      if (checkOnLoad && user) {
        sessionStorage.removeItem('sso_check_on_load');
        // Small delay to ensure auth context is ready
        setTimeout(() => validateSSO('page reload', true), 2000); // Bypass rate limit for refresh
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('load', handleLoad);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('load', handleLoad);
    };
  }, [checkOnRefresh, validateSSO, user]);

  const resetLoopDetection = useCallback(() => {
    localStorage.removeItem('sso_redirect_loop_detected');
    redirectCountRef.current = 0;
    lastRedirectRef.current = 0;
  }, []);

  const stableValidateSSO = useCallback((reason?: string, bypassRateLimit?: boolean) => {
    return validateSSO(reason || 'manual', bypassRateLimit || false);
  }, [validateSSO]);

  return {
    validateSSO: stableValidateSSO,
    isValidating: isValidatingRef.current,
    resetLoopDetection
  };
}
