"use client";
import React, { useState, useEffect } from "react";
import { Database, Server, Activity, Table2, RefreshCw, CheckCircle, XCircle, Clock, Users, HardDrive, Info } from "lucide-react";

type DbInfo = {
  status: 'connected' | 'disconnected';
  latency: number;
  connection: {
    fullUrl: string;
    host: string;
    port: string;
    database: string;
    user: string;
    ssl: string;
    connectionLimit: string;
    poolTimeout: string;
  } | null;
  server?: {
    version: string;
    startTime: string;
    currentTime: string;
    uptime: number | null;
  };
  database?: {
    name: string;
    user: string;
    address: string | null;
    sizeBytes: number | null;
    sizeFormatted: string | null;
  };
  connections?: {
    active: number;
    total: number;
    max: number;
  };
  tables?: {
    total: number;
    totalRows: number;
    list: { name: string; rowCount: number; sizeFormatted: string }[];
  };
  error?: string;
};

function formatUptime(seconds: number | null) {
  if (!seconds) return '-';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function DatabaseStatusPage() {
  const [data, setData] = useState<DbInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/database-status');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Database Status
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Informasi koneksi dan status database PostgreSQL
              </p>
            </div>
            <button
              onClick={checkStatus}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {loading && !data ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw size={32} className="animate-spin mx-auto mb-4" />
              <p>Checking database connection...</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className={`border-l-4 p-4 rounded ${
                data.status === 'connected'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-500 bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center gap-3">
                  {data.status === 'connected' ? (
                    <>
                      <CheckCircle className="text-green-600" size={24} />
                      <div>
                        <h3 className="font-semibold text-green-900 dark:text-green-100">
                          Database Connected
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Latency: {data.latency}ms
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="text-red-600" size={24} />
                      <div>
                        <h3 className="font-semibold text-red-900 dark:text-red-100">
                          Database Disconnected
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {data.error}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {data.status === 'connected' && data.connection && (
                <>
                  {/* Connection Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Database size={18} /> Connection
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <InfoCard label="Host" value={data.connection.host} />
                      <InfoCard label="Port" value={data.connection.port} />
                      <InfoCard label="Database" value={data.connection.database} />
                      <InfoCard label="User" value={data.connection.user} />
                      <InfoCard label="SSL Mode" value={data.connection.ssl} />
                      <InfoCard label="Pool Timeout" value={`${data.connection.poolTimeout}s`} />
                    </div>
                  </div>

                  {/* Server Info */}
                  {data.server && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Server size={18} /> Server
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <InfoCard label="Version" value={data.server.version} />
                        <InfoCard label="Uptime" value={formatUptime(data.server.uptime)} />
                        <InfoCard label="Server Time" value={data.server.currentTime ? new Date(data.server.currentTime).toLocaleString('id-ID') : '-'} />
                        <InfoCard label="Started At" value={data.server.startTime ? new Date(data.server.startTime).toLocaleString('id-ID') : '-'} />
                      </div>
                    </div>
                  )}

                  {/* Database Stats */}
                  {data.database && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <HardDrive size={18} /> Database
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <InfoCard label="Database Name" value={data.database.name} />
                        <InfoCard label="Owner" value={data.database.user} />
                        <InfoCard label="Size" value={data.database.sizeFormatted || '-'} />
                        <InfoCard label="Server Address" value={data.database.address || '-'} />
                      </div>
                    </div>
                  )}

                  {/* Connections */}
                  {data.connections && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Users size={18} /> Connections
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active</div>
                          <div className="text-2xl font-bold text-green-600">{data.connections.active}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total</div>
                          <div className="text-2xl font-bold text-blue-600">{data.connections.total}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Max Allowed</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.connections.max}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tables */}
                  {data.tables && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Table2 size={18} /> Tables
                        <span className="text-sm font-normal text-gray-500">({data.tables.total} tables, {data.tables.totalRows.toLocaleString()} total rows)</span>
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b dark:border-gray-600">
                              <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">#</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Table Name</th>
                              <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Row Count</th>
                              <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Size</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.tables.list.map((t, i) => (
                              <tr key={t.name} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                                <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{t.name}</td>
                                <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{t.rowCount.toLocaleString()}</td>
                                <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{t.sizeFormatted}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Raw URL (masked) */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Info size={14} className="text-gray-500" />
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">DATABASE_URL</span>
                    </div>
                    <code className="text-xs text-gray-700 dark:text-gray-300 break-all">{data.connection.fullUrl}</code>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <XCircle size={32} className="mx-auto mb-4" />
              <p>Could not load database status</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-sm font-semibold text-gray-900 dark:text-white break-all">{value}</div>
    </div>
  );
}
