import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface SSOStatus {
  isEnabled: boolean;
  isValid: boolean;
  expiresAt?: Date;
  expiresIn?: number;
  needsRefresh: boolean;
}

export function useSSO() {
  const { user, checkSSOStatus, refreshSSO } = useAuth();
  const [ssoStatus, setSSOStatus] = useState<SSOStatus>({
    isEnabled: false,
    isValid: false,
    needsRefresh: false
  });

  // Update SSO status from user data
  useEffect(() => {
    if (user) {
      setSSOStatus({
        isEnabled: user.ssoEnabled || false,
        isValid: user.ssoTokenValid || false,
        expiresAt: user.ssoExpiresAt,
        expiresIn: user.ssoExpiresIn,
        needsRefresh: user.ssoExpiresIn ? user.ssoExpiresIn < 300 : false // Refresh if expires in < 5 minutes
      });
    }
  }, [user]);

  // Auto-refresh SSO token when needed
  const autoRefresh = useCallback(async () => {
    if (ssoStatus.needsRefresh && ssoStatus.isEnabled) {
      console.log('Auto-refreshing SSO token...');
      const success = await refreshSSO();
      if (success) {
        console.log('SSO token refreshed successfully');
      } else {
        console.warn('Failed to refresh SSO token');
      }
    }
  }, [ssoStatus.needsRefresh, ssoStatus.isEnabled, refreshSSO]);

  // Check SSO status periodically
  useEffect(() => {
    if (!user || !ssoStatus.isEnabled) return;

    const interval = setInterval(async () => {
      await checkSSOStatus();
      await autoRefresh();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user, ssoStatus.isEnabled, checkSSOStatus, autoRefresh]);

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    if (!ssoStatus.isEnabled) return false;
    
    const success = await refreshSSO();
    if (success) {
      await checkSSOStatus();
    }
    return success;
  }, [ssoStatus.isEnabled, refreshSSO, checkSSOStatus]);

  // Get time until expiry in human-readable format
  const getTimeUntilExpiry = useCallback(() => {
    if (!ssoStatus.expiresIn) return null;
    
    const minutes = Math.floor(ssoStatus.expiresIn / 60);
    const seconds = ssoStatus.expiresIn % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [ssoStatus.expiresIn]);

  return {
    ssoStatus,
    manualRefresh,
    getTimeUntilExpiry,
    // Helper functions
    isExpiringSoon: ssoStatus.expiresIn ? ssoStatus.expiresIn < 300 : false, // < 5 minutes
    isExpired: !ssoStatus.isValid && ssoStatus.isEnabled,
    shouldShowWarning: ssoStatus.isEnabled && ssoStatus.expiresIn ? ssoStatus.expiresIn < 600 : false // < 10 minutes
  };
}

// Hook for components that need to ensure valid SSO session
export function useRequireValidSSO() {
  const { ssoStatus, manualRefresh } = useSSO();
  const [isEnsuring, setIsEnsuring] = useState(false);

  const ensureValidSession = useCallback(async (): Promise<boolean> => {
    if (!ssoStatus.isEnabled) return true; // SSO not enabled, allow access
    if (ssoStatus.isValid && !ssoStatus.needsRefresh) return true; // Already valid

    setIsEnsuring(true);
    try {
      if (ssoStatus.needsRefresh) {
        const success = await manualRefresh();
        return success;
      }
      return ssoStatus.isValid;
    } finally {
      setIsEnsuring(false);
    }
  }, [ssoStatus, manualRefresh]);

  return {
    ensureValidSession,
    isEnsuring,
    isValid: ssoStatus.isValid,
    isEnabled: ssoStatus.isEnabled
  };
}
