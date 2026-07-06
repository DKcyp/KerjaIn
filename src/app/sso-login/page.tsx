"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SSOLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const returnUrl = searchParams.get('return_url') || '/project-dashboard';

    async function authenticateWithPortal() {
      try {
        console.log('[SSO Login] Checking Portal session...');
        
        // Call the portal SSO endpoint to verify Portal session and auto-login
        // This uses the Portal cookie that's already set in the browser
        const response = await fetch('/api/auth/portal-sso', {
          method: 'GET',
          credentials: 'include',
        });

        console.log('[SSO Login] API response status:', response.status);

        if (response.ok) {
          console.log('[SSO Login] Authentication successful, cookie should be set');
          setStatus('success');
          
          // Redirect immediately after successful authentication
          setTimeout(() => {
            console.log('[SSO Login] Redirecting to:', returnUrl);
            window.location.href = returnUrl;
          }, 300);
        } else {
          const data = await response.json();
          console.error('[SSO Login] Authentication failed:', data);
          setStatus('error');
          setError(data.error || 'Authentication failed');
        }
      } catch (err) {
        console.error('[SSO Login] Error:', err);
        setStatus('error');
        setError('Connection error: ' + (err instanceof Error ? err.message : 'Unknown'));
      }
    }

    // If token provided in URL, use token-based flow
    if (token) {
      console.log('[SSO Login] Token provided, using token-based authentication');
      authenticateWithToken();
    } else {
      // Otherwise use cookie-based flow (Portal session)
      console.log('[SSO Login] No token, using Portal session cookie');
      authenticateWithPortal();
    }

    async function authenticateWithToken() {
      try {
        console.log('[SSO Login] Authenticating with token...');
        
        const response = await fetch('/api/auth/portal-sso', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });

        console.log('[SSO Login] API response status:', response.status);

        if (response.ok) {
          console.log('[SSO Login] Authentication successful');
          setStatus('success');
          
          setTimeout(() => {
            console.log('[SSO Login] Redirecting to:', returnUrl);
            window.location.href = returnUrl;
          }, 300);
        } else {
          const data = await response.json();
          console.error('[SSO Login] Authentication failed:', data);
          setStatus('error');
          setError(data.error || 'Authentication failed');
        }
      } catch (err) {
        console.error('[SSO Login] Error:', err);
        setStatus('error');
        setError('Connection error: ' + (err instanceof Error ? err.message : 'Unknown'));
      }
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        {status === 'loading' && (
          <div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              Authenticating with Portal...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-600 dark:text-green-400 font-bold">
              Authentication successful! Redirecting...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-600 dark:text-red-400 font-bold mb-4">
              {error}
            </p>
            <a
              href="/signin"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
            >
              Back to Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SSOLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SSOLoginContent />
    </Suspense>
  );
}
