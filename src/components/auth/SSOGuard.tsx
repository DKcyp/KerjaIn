"use client";
import { useEffect, useState } from 'react';
import { useSSORealTimeValidation } from '@/hooks/useSSORealTimeValidation';
import { useAuth } from '@/context/AuthContext';

interface SSOGuardProps {
  children: React.ReactNode;
}

export default function SSOGuard({ children }: SSOGuardProps) {
  const { user, loading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  
  // Initialize real-time SSO validation with more frequent checks
  const { validateSSO } = useSSORealTimeValidation({
    checkOnNavigation: true,
    checkOnFocus: true,
    checkOnClick: false, // Disable click checking to reduce API calls
    checkOnRefresh: true,
    intervalMinutes: 2 // Check every 2 minutes
  });

  useEffect(() => {
    // Wait for auth to be ready, then mark as ready
    if (!loading) {
      setIsReady(true);
      
      // Always perform authentication check on component mount
      // This ensures auth is validated on every page visit and refresh
      setTimeout(() => {
        validateSSO('page load - auth verification', true); // Bypass rate limit for page loads
      }, 500);
    }
  }, [loading, validateSSO]);

  // Additional effect to check auth on user changes
  useEffect(() => {
    if (!loading && isReady && user) {
      // Validate auth whenever user object changes
      validateSSO('user state change');
    }
  }, [user, loading, isReady, validateSSO]);

  // Show loading state while auth is initializing
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
