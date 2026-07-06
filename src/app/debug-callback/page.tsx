"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function DebugCallbackContent() {
  const searchParams = useSearchParams();
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const allParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      allParams[key] = value;
    });
    setParams(allParams);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            SSO Callback Debug
          </h1>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Current URL:
              </h2>
              <code className="block p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-800 dark:text-gray-200 break-all">
                {typeof window !== 'undefined' ? window.location.href : 'Loading...'}
              </code>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                URL Parameters ({Object.keys(params).length}):
              </h2>
              {Object.keys(params).length > 0 ? (
                <div className="bg-gray-100 dark:bg-gray-700 rounded p-4">
                  <pre className="text-sm text-gray-800 dark:text-gray-200">
                    {JSON.stringify(params, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  No parameters found in URL
                </p>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Expected Parameters:
              </h2>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                <li><code>token</code> or <code>access_token</code> - Authentication token</li>
                <li><code>username</code> or <code>user</code> - Username</li>
                <li><code>error</code> - Error message (if any)</li>
                <li><code>code</code> - OAuth authorization code (alternative flow)</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Test Links:
              </h2>
              <div className="space-y-2">
                <a 
                  href="/api/auth/sso-callback/debug"
                  className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Test API Debug Endpoint
                </a>
                <br />
                <a 
                  href="/auth/signin"
                  className="inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Back to Sign In
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            SSO Callback Debug
          </h1>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DebugCallback() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DebugCallbackContent />
    </Suspense>
  );
}
