"use client";
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSSORealTimeValidation } from '@/hooks/useSSORealTimeValidation';

export default function TestSSOPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user, reload } = useAuth();
  const { validateSSO, isValidating, resetLoopDetection } = useSSORealTimeValidation();

  const testSSO = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/validate-sso', {
        credentials: 'include'
      });
      const data = await response.json();
      setResult({ status: response.status, data });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testMe = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      const data = await response.json();
      setResult({ status: response.status, data });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">SSO Authentication Test</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Current User Status</h2>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Actions</h2>
        <div className="space-x-4">
          <button
            onClick={testSSO}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test SSO Validation'}
          </button>
          
          <button
            onClick={testMe}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test /api/auth/me'}
          </button>
          
          <button
            onClick={reload}
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Reload Auth Context
          </button>
          
          <button
            onClick={() => validateSSO('manual test', true)}
            disabled={loading || isValidating}
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
          >
            {isValidating ? 'Validating...' : 'Manual Real-time Check (Bypass Rate Limit)'}
          </button>
          
          <button
            onClick={resetLoopDetection}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            Reset Loop Detection
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Test Result</h2>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
