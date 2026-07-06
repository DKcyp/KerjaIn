"use client";
import React, { useState, useEffect } from "react";
import { User, Shield, Calendar, Key, RefreshCw, CheckCircle, XCircle } from "lucide-react";

type SessionInfo = {
  hasSession: boolean;
  session: {
    id: number;
    role: string;
    namaLengkap?: string;
    username?: string;
    departemenId?: number;
    permissions?: string[];
    ssoEnabled?: boolean;
    iat?: number;
    exp?: number;
  } | null;
  cookieHeader: string | null;
  isExpired: boolean;
  expiresIn?: string;
};

export default function CheckSessionPage() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/check-session');
      const data = await response.json();
      setSessionInfo(data);
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      'SUPER_ADMIN': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'PM': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'ADMIN': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'PROGRAMMER': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Session Checker
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cek informasi session dan cookie authentication
              </p>
            </div>
            <button
              onClick={checkSession}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {loading && !sessionInfo ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw size={32} className="animate-spin mx-auto mb-4" />
              <p>Checking session...</p>
            </div>
          ) : sessionInfo ? (
            <div className="space-y-6">
              {/* Status Card */}
              <div className={`border-l-4 p-4 rounded ${
                sessionInfo.hasSession && !sessionInfo.isExpired
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-500 bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center gap-3">
                  {sessionInfo.hasSession && !sessionInfo.isExpired ? (
                    <>
                      <CheckCircle className="text-green-600" size={24} />
                      <div>
                        <h3 className="font-semibold text-green-900 dark:text-green-100">
                          Session Active
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {sessionInfo.expiresIn}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="text-red-600" size={24} />
                      <div>
                        <h3 className="font-semibold text-red-900 dark:text-red-100">
                          {sessionInfo.isExpired ? 'Session Expired' : 'No Session'}
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {sessionInfo.isExpired ? 'Session sudah kadaluarsa' : 'Tidak ada session aktif'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Session Details */}
              {sessionInfo.session && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Session Details
                  </h3>

                  {/* User Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={16} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          User ID
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {sessionInfo.session.id}
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={16} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Role
                        </span>
                      </div>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getRoleBadgeColor(sessionInfo.session.role)}`}>
                        {sessionInfo.session.role}
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={16} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Nama Lengkap
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {sessionInfo.session.namaLengkap || '-'}
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Key size={16} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Username
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {sessionInfo.session.username || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar size={16} className="text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Session Timestamps
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Issued At</p>
                        <p className="text-sm font-mono text-gray-900 dark:text-white">
                          {formatTimestamp(sessionInfo.session.iat)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expires At</p>
                        <p className="text-sm font-mono text-gray-900 dark:text-white">
                          {formatTimestamp(sessionInfo.session.exp)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Permissions */}
                  {sessionInfo.session.permissions && sessionInfo.session.permissions.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield size={16} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Permissions ({sessionInfo.session.permissions.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sessionInfo.session.permissions.map((perm, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Departemen */}
                  {sessionInfo.session.departemenId && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={16} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Departemen ID
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {sessionInfo.session.departemenId}
                      </p>
                    </div>
                  )}

                  {/* SSO Status */}
                  {sessionInfo.session.ssoEnabled !== undefined && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Key size={16} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          SSO Status
                        </span>
                      </div>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        sessionInfo.session.ssoEnabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {sessionInfo.session.ssoEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Cookie Info */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Cookie Header
                </h3>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                  <code className="text-xs text-gray-900 dark:text-white break-all">
                    {sessionInfo.cookieHeader || 'No cookie header'}
                  </code>
                </div>
              </div>

              {/* Raw JSON */}
              <details className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Raw JSON Data
                </summary>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600 mt-2">
                  <pre className="text-xs text-gray-900 dark:text-white overflow-x-auto">
                    {JSON.stringify(sessionInfo, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
