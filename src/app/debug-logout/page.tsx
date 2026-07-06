'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  data?: any;
}

export default function DebugLogoutPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const router = useRouter();

  const addLog = (level: LogEntry['level'], message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
    
    setLogs(prev => [...prev, { timestamp, level, message, data }]);
  };

  useEffect(() => {
    // Start capturing logs
    setCurrentUrl(window.location.href);
    addLog('info', '🚀 Debug Logout Page Loaded');
    addLog('info', `📍 Current URL: ${window.location.href}`);

    // Override console methods to capture logs
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      originalLog(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      addLog('log', message);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      addLog('warn', message);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      addLog('error', message);
    };

    // Cleanup
    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const handleLogout = async () => {
    addLog('info', '🔐 Starting logout process...');
    
    try {
      addLog('info', '📤 Calling /api/auth/sso-logout');
      const response = await fetch('/api/auth/sso-logout', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();
      addLog('info', '📥 Logout response received', data);

      if (response.ok) {
        addLog('info', '✅ Logout successful');
        addLog('info', '⏳ Waiting 2.5 seconds before redirect...');
        
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        addLog('info', '🔄 Redirecting to signin page');
        window.location.href = '/signin?reason=logged_out&skip_portal_check=true';
      } else {
        addLog('error', '❌ Logout failed', data);
      }
    } catch (error) {
      addLog('error', '❌ Logout error', error);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    addLog('info', '🗑️ Logs cleared');
  };

  const handleExportLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${log.data ? '\n  ' + JSON.stringify(log.data) : ''}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logout-debug-${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'warn': return 'text-yellow-600 dark:text-yellow-400';
      case 'info': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            🔍 Debug Logout Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Monitor logout flow and capture all console logs
          </p>

          {/* Controls */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              🔐 Test Logout
            </button>
            <button
              onClick={handleClearLogs}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              🗑️ Clear Logs
            </button>
            <button
              onClick={handleExportLogs}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              💾 Export Logs
            </button>
            <button
              onClick={() => router.push('/project-dashboard')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              ✅ Go to Dashboard
            </button>
          </div>

          {/* URL Info */}
          <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
              {currentUrl || 'Loading...'}
            </p>
          </div>

          {/* Logs */}
          <div className="bg-gray-900 dark:bg-black rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click "Test Logout" to start.</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className={`${getLogColor(log.level)} mb-1`}>
                  <span className="text-gray-500">[{log.timestamp}]</span>
                  {' '}
                  <span className="font-bold">[{log.level.toUpperCase()}]</span>
                  {' '}
                  {log.message}
                  {log.data && (
                    <div className="text-gray-400 ml-4 text-xs">
                      {JSON.stringify(log.data, null, 2)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Logs</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{logs.length}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Errors</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {logs.filter(l => l.level === 'error').length}
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {logs.filter(l => l.level === 'warn').length}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Info</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {logs.filter(l => l.level === 'info').length}
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">📋 Instructions:</h3>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Click "Test Logout" button</li>
              <li>Watch the logs as they appear in real-time</li>
              <li>Check if skip flag is being cleared from URL</li>
              <li>Check if Portal session check is being skipped</li>
              <li>Export logs if needed for analysis</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
