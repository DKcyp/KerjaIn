"use client";
import { useAuth } from "@/context/AuthContext";
import { useCallback } from "react";

/**
 * Hook for validating SSO tokens before performing actions
 * Returns a function that validates the token and shows session expiry modal if invalid
 */
export function useTokenValidation() {
  const { user, reload, showSessionExpired } = useAuth();

  const validateToken = useCallback(async (): Promise<boolean> => {
    if (!user || showSessionExpired) {
      return false;
    }

    try {
      // Force reload to check token validity
      await reload();
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }, [user, reload, showSessionExpired]);

  const validateAndExecute = useCallback(async (action: () => void | Promise<void>): Promise<boolean> => {
    const isValid = await validateToken();
    if (isValid && !showSessionExpired) {
      try {
        await action();
        return true;
      } catch (error) {
        console.error('Action execution failed:', error);
        return false;
      }
    }
    return false;
  }, [validateToken, showSessionExpired]);

  return {
    validateToken,
    validateAndExecute,
    isTokenValid: user && !showSessionExpired
  };
}
