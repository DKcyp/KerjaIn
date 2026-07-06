"use client";

import React, { useState, useEffect } from "react";

interface MonitoringData {
  no: number;
  pegawai: string;
  project: string;
  tasklist: number;
  belum: number;
  selesai: number;
}

export default function MonitoringDirekturPage() {
  const [data, setData] = useState<MonitoringData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  useEffect(() => {
    fetchData();
    
    // Auto refresh setiap 30 detik
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/monitoring-direktur");
      
      if (!response.ok) {
        throw new Error("Failed to fetch monitoring data");
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
    } finally {
      setLoading(false);
    }
  };



  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="px-2 py-3">
      {/* Title Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Monitoring Direksi
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Monitoring real-time tasklist per pegawai hari ini
            </p>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">{formatDate(lastUpdate)}</span>
              <span className="mx-2">•</span>
              <span>Terakhir diperbarui: {formatTime(lastUpdate)}</span>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-xs font-medium flex items-center gap-2"
          >
            {loading ? "Memuat..." : "Refresh Data"}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pegawai
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tasklist
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Belum
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Selesai
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Tidak ada data untuk hari ini
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr
                    key={row.no}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {row.no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {row.pegawai}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {row.project}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 dark:text-gray-100">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-medium">
                        {row.tasklist}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 dark:text-gray-100">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 font-medium">
                        {row.belum}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 dark:text-gray-100">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium">
                        {row.selesai}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-right">
          Total: {data.length} pegawai
        </div>
      )}
    </div>
  );
}
