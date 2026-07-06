"use client";
import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

interface WithTokenValidationOptions {
  validateOnMount?: boolean;
  validateOnFocus?: boolean;
  validateInterval?: number; // in milliseconds
}

/**
 * Higher-order component that adds automatic token validation to a component
 */
export function withTokenValidation<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithTokenValidationOptions = {}
) {
  const {
    validateOnMount = true,
    validateOnFocus = true,
    validateInterval = 5 * 60 * 1000, // 5 minutes default
  } = options;

  return function TokenValidatedComponent(props: P) {
    const { user, reload, showSessionExpired } = useAuth();

    useEffect(() => {
      if (!user || showSessionExpired) return;

      // Validate on mount
      if (validateOnMount) {
        reload();
      }

      // Set up periodic validation
      let intervalId: NodeJS.Timeout | null = null;
      if (validateInterval > 0) {
        intervalId = setInterval(() => {
          if (user && !showSessionExpired) {
            reload();
          }
        }, validateInterval);
      }

      // Validate on window focus
      const handleFocus = () => {
        if (validateOnFocus && user && !showSessionExpired) {
          reload();
        }
      };

      if (validateOnFocus) {
        window.addEventListener('focus', handleFocus);
      }

      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        if (validateOnFocus) {
          window.removeEventListener('focus', handleFocus);
        }
      };
    }, [user, showSessionExpired, reload]);

    return <WrappedComponent {...props} />;
  };
}
