"use client";
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { SessionExpiryModal } from "@/components/auth/SessionExpiryModal";
import { safeJsonParse } from "@/lib/safeJsonParse";

export type AuthUser = {
  id: number;
  role: 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN';
  namaLengkap?: string | null;
  username?: string | null;
  email?: string | null;
  permissions?: string[];
  ssoEnabled?: boolean;
  ssoTokenValid?: boolean;
  ssoExpiresAt?: Date;
  ssoExpiresIn?: number;
  departemenId?: number | null;
  departemenNama?: string | null;
  departemenIdDep?: string | null;
  departemenLogoUrl?: string | null;
  portalTenantId?: string | null;
} | null;

type AuthContextType = {
  user: AuthUser;
  loading: boolean;
  reload: () => Promise<void>;
  ssoLogout: () => Promise<void>;
  checkSSOStatus: () => Promise<void>;
  refreshSSO: () => Promise<boolean>;
  showSessionExpired: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple in-module fetch memoization to dedupe concurrent/rapid calls
let lastFetchAt = 0;
let inFlight: Promise<any> | null = null;
let lastLogoutAt = 0; // Track last logout to prevent rapid logouts
async function fetchMeOnce(force = false): Promise<any> {
  const now = Date.now();
  if (!force) {
    if (inFlight) return inFlight;
    if (now - lastFetchAt < 5000) return Promise.resolve(null);
  }
  // Build URL with cache-busting param to avoid any intermediate caching
  const url = `/api/auth/me?ts=${Date.now()}`;
  inFlight = (async () => {
    try {
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      const d = await safeJsonParse(res);
      
      // If parsing failed, treat as no user
      if (d.error) {
        return { user: null };
      }
      
      // Handle session expiry from server
      if (d.forceLogout || d.sessionExpired) {
        console.log('Server requested session expiry:', d.reason || 'Unknown reason');
        return { user: null, sessionExpired: true };
      }
      
      // Handle SSO login requirement
      if (d.requiresSSOLogin) {
        console.log('Server requires SSO login:', d.reason || 'SSO authentication required');
        return { user: null, requiresSSOLogin: true };
      }
      
      return d;
    } finally {
      lastFetchAt = Date.now();
      const hold = inFlight;
      setTimeout(() => { if (inFlight === hold) inFlight = null; }, 0);
    }
  })();
  return inFlight;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSessionExpired, setShowSessionExpired] = useState<boolean>(false);

  const load = async (force = false) => {
    try {
      // Check if we're in logout state - don't load user if just logged out
      const searchParams = new URLSearchParams(window.location.search);
      const logoutReason = searchParams.get('reason');
      
      if (logoutReason === 'logged_out' && !force) {
        console.log('🚫 [LOAD] Logout state detected (reason=logged_out), preventing user load');
        setUser(null);
        return;
      }
      
      setLoading(true);
      const data = await fetchMeOnce(force);
      if (data) {
        const d = data;
        let userData = d?.user ?? null;
        
        // If user is authenticated and we have logout reason in URL, clear it
        // This allows auto-login to work after user logs back in from Hub
        if (userData && logoutReason === 'logged_out') {
          console.log('✅ [LOAD] User authenticated after logout, clearing logout reason from URL');
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('reason');
          window.history.replaceState({}, '', newUrl.toString());
        }
        
        // Handle session expiry from server
        if (d.sessionExpired) {
          const now = Date.now();
          // Prevent rapid successive logouts (circuit breaker pattern)
          if (now - lastLogoutAt < 30000) { // 30 seconds
            console.log('🚫 Preventing rapid session expiry - last expiry was', (now - lastLogoutAt) / 1000, 'seconds ago');
            return;
          }
          lastLogoutAt = now;
          
          console.log('🔓 Session expired:', d.reason || 'Unknown reason');
          
          // Clear session cookie immediately to prevent middleware redirects
          document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
          
          setUser(null);
          // Show session expiry modal instead of redirecting
          setShowSessionExpired(true);
          return;
        }
        
        // Handle SSO login requirement
        if (d.requiresSSOLogin) {
          console.log('🔐 SSO login required:', d.reason || 'SSO authentication required');
          
          // Clear session cookie
          document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
          
          setUser(null);
          
          // Redirect to SSO login
          const currentUrl = window.location.href;
          const ssoLoginUrl = `/api/auth/sso-login?return_url=${encodeURIComponent(currentUrl)}`;
          window.location.href = ssoLoginUrl;
          return;
        }
        
        // If user exists, fetch their permissions
        if (userData) {
          try {
            const permissionsRes = await fetch('/api/auth/permissions', { 
              credentials: 'include', 
              cache: 'no-store' 
            });
            if (permissionsRes.ok) {
              const permissionsData = await permissionsRes.json();
              userData = {
                ...userData,
                permissions: permissionsData.permissions || []
              };
            }
          } catch (error) {
            console.error('Failed to fetch permissions:', error);
            // Continue without permissions rather than failing completely
            userData = {
              ...userData,
              permissions: []
            };
          }
        }
        
        setUser(userData);
      } else {
        // when dedup returns null within window, keep existing user
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const ssoLogout = async () => {
    try {
      setLoading(true);
      console.log('🔐 Starting logout process...');
      
      const response = await fetch('/api/auth/sso-logout', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();
      console.log('📋 Logout response:', { ok: response.ok, data });

      if (response.ok) {
        // Clear local state
        setUser(null);
        
        // Clear session cookie
        document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        console.log('✅ Local session cleared');
        
        // Portal logout is handled on server-side to avoid CORS issues
        if (data.portalLogoutSuccess) {
          console.log('✅ Portal logout successful (server-side)');
        } else {
          console.log('ℹ️ Portal logout handled on server side');
        }
        
        // Wait to ensure Portal logout is fully processed
        // This prevents the race condition where signin page checks Portal session
        // before Portal has finished clearing cookies
        console.log('⏳ Waiting for Portal logout to complete...');
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Check if user is SSO user
        const isSSOUser = user?.ssoEnabled;
        
        if (isSSOUser) {
          // For SSO users, try to logout from Hub
          const hubUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000';
          const hubLogoutUrl = `${hubUrl}/api/auth/logout`;
          
          console.log('🔄 Attempting Hub logout for SSO user...');
          console.log('� RHub logout URL:', hubLogoutUrl);
          
          try {
            // Call Hub logout endpoint (CORS error is expected but request still works)
            await fetch(hubLogoutUrl, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            }).catch(error => {
              // CORS error is expected, but the request still clears Hub cookies
              console.log('ℹ️ Hub logout request sent (CORS error expected)');
            });
            
            console.log('✅ Hub logout request completed');
          } catch (error) {
            console.error('⚠️ Hub logout error:', error instanceof Error ? error.message : error);
          }
        }
        
        // Redirect to signin page with skip flag to prevent auto-login race condition
        console.log('🔄 Redirecting to signin page');
        window.location.href = '/signin?reason=logged_out&skip_portal_check=true';
        return;
      } else {
        console.error('❌ SSO logout failed:', data.error);
      }
    } catch (error) {
      console.error('❌ SSO logout error:', error instanceof Error ? error.message : error);
    } finally {
      setLoading(false);
    }
  };

  const checkSSOStatus = async () => {
    try {
      const response = await fetch('/api/auth/sso-status', {
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.sso && user) {
          setUser({
            ...user,
            ssoEnabled: data.ssoEnabled,
            ssoTokenValid: data.sso.isValid,
            ssoExpiresAt: data.sso.expiresAt ? new Date(data.sso.expiresAt) : undefined,
            ssoExpiresIn: data.sso.expiresIn
          });
        }
      }
    } catch (error) {
      console.error('Error checking SSO status:', error);
    }
  };

  const refreshSSO = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/sso-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await checkSSOStatus(); // Update SSO status
          return true;
        }
      }
      
      if (response.status === 401) {
        // Show session expiry modal instead of clearing user
        console.log('🔓 SSO refresh failed with 401, showing session expiry modal');
        setShowSessionExpired(true);
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing SSO:', error);
      return false;
    }
  };

  const handleRelogin = () => {
    setShowSessionExpired(false);
    setUser(null);
    // Clear session cookie
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    // Clear any cached data
    lastFetchAt = 0;
    inFlight = null;
    // Redirect to signin page
    window.location.href = '/signin';
  };

  useEffect(() => {
    // load once on mount, then run portal check based on user state result
    load().then(() => {
      setTimeout(() => {
        setRunPortalCheck(true);
      }, 150); // wait for React state to settle after load()
    });
  }, []); // Only run on mount

  const [runPortalCheck, setRunPortalCheck] = React.useState(false);

  useEffect(() => {
    if (!runPortalCheck) return;
    setRunPortalCheck(false);
    // portal check runs — it has its own guards (skip_portal_check, reason=logged_out)
    checkPortalSessionOnMount();
  }, [runPortalCheck]);

  const checkPortalSessionOnMount = async () => {
    try {
      // Check if we should skip Portal session check (e.g., after logout)
      const searchParams = new URLSearchParams(window.location.search);
      const skipPortalCheck = searchParams.get('skip_portal_check') === 'true';
      const logoutReason = searchParams.get('reason');
      
      console.log('🔍 checkPortalSessionOnMount called');
      console.log('   skipPortalCheck:', skipPortalCheck);
      console.log('   logoutReason:', logoutReason);
      
      if (skipPortalCheck) {
        console.log('⏭️ Skipping Portal session check (skip_portal_check=true)');
        console.log('📍 Current URL:', window.location.href);
        
        // Clear skip flag from URL to allow auto-login on next page load
        // This prevents the flag from persisting if user refreshes or navigates
        try {
          const newUrl = new URL(window.location.href);
          const beforeUrl = newUrl.toString();
          newUrl.searchParams.delete('skip_portal_check');
          const afterUrl = newUrl.toString();
          
          console.log('🔄 Clearing skip flag from URL');
          console.log('   Before:', beforeUrl);
          console.log('   After:', afterUrl);
          
          window.history.replaceState({}, '', afterUrl);
          
          console.log('✅ Skip flag cleared from URL');
          console.log('📍 New URL:', window.location.href);
        } catch (error) {
          console.error('❌ Failed to clear skip flag:', error);
        }
        
        return;
      }
      
      // Don't auto-login if user just logged out
      if (logoutReason === 'logged_out') {
        console.log('⏭️ User just logged out (reason=logged_out), skipping auto-login');
        console.log('🔒 Preventing Portal session check to avoid looping');
        return;
      }
      
      const response = await fetch('/api/auth/check-portal-session', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          console.log('✅ Portal session found on mount, reloading user...');
          // Reload user data
          await load(true);
        }
      }
    } catch (err) {
      console.log('Error checking Portal session on mount:', err);
    }
  };

  // Add token validation only on page visibility changes (not on user interactions)
  useEffect(() => {
    if (!user || showSessionExpired) return;

    const handleVisibilityChange = () => {
      // Only check when page becomes visible (not when hiding)
      if (document.hidden) return;
      
      // Check token when page becomes visible again
      // BUT only if it's been more than 2 minutes since last check
      if (user) {
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchAt;
        const TWO_MINUTES = 2 * 60 * 1000;
        
        // Only reload if it's been more than 2 minutes AND page was actually hidden
        if (timeSinceLastFetch > TWO_MINUTES) {
          console.log('⏰ Page visible after', Math.round(timeSinceLastFetch / 1000), 'seconds - checking auth');
          load(true);
        } else {
          console.log('⏭️ Skipping auth check - last check was', Math.round(timeSinceLastFetch / 1000), 'seconds ago');
        }
      }
    };

    // Listen for page visibility changes only
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, showSessionExpired]);

  // Disabled SSO monitoring to prevent infinite loops with same-tab authentication
  // SSO token management is now handled by the server-side validation in /api/auth/me

  const reload = useCallback(() => load(true), []);

  const value = useMemo(() => ({ 
    user, 
    loading, 
    reload,
    ssoLogout,
    checkSSOStatus,
    refreshSSO,
    showSessionExpired
  }), [user, loading, showSessionExpired, reload]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionExpiryModal
        isOpen={showSessionExpired}
        onRelogin={handleRelogin}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
