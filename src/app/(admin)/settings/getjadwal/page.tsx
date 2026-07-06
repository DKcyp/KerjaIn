/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";

export default function GetJadwalSettingPage() {
  const { success, error } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [description, setDescription] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch current setting
  useEffect(() => {
    fetchSetting();
  }, []);

  const fetchSetting = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/getjadwal');
      const data = await response.json();

      if (data.success && data.data) {
        setIsEnabled(data.data.isEnabled);
        setDescription(data.data.description || "");
        setLastUpdated(data.data.updatedAt);
      }
    } catch (err) {
      console.error('Failed to fetch setting:', err);
      error('Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/settings/getjadwal', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isEnabled,
          description: description || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        success(data.message || 'Pengaturan berhasil disimpan');
        setLastUpdated(data.data.updatedAt);
      } else {
        error(data.error || 'Gagal menyimpan pengaturan');
      }
    } catch (err) {
      console.error('Failed to save setting:', err);
      error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            ⚙️ Pengaturan Get Jadwal dari JWT
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Kelola fitur pengambilan jadwal kerja dari RichzSpot API menggunakan JWT authentication
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {/* Status Banner */}
          <div className={`p-4 ${isEnabled ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500' : 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500'}`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{isEnabled ? '✅' : '❌'}</span>
              <div>
                <h3 className={`font-semibold ${isEnabled ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  Fitur saat ini: {isEnabled ? 'AKTIF' : 'NONAKTIF'}
                </h3>
                <p className={`text-sm ${isEnabled ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
                  {isEnabled 
                    ? 'Sistem akan mengambil jadwal kerja dari RichzSpot API' 
                    : 'Sistem menggunakan jam kerja default (08:00 - 16:00)'}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-6">
            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <label className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 block">
                  Status Fitur
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Aktifkan atau nonaktifkan pengambilan jadwal dari JWT
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEnabled(!isEnabled)}
                className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isEnabled 
                    ? 'bg-green-500 focus:ring-green-500' 
                    : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400'
                }`}
              >
                <span
                  className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform ${
                    isEnabled ? 'translate-x-12' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Catatan / Deskripsi (Opsional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tambahkan catatan tentang perubahan ini..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    Informasi Penting
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                    <li>Ketika <strong>AKTIF</strong>: Sistem akan mengambil jadwal kerja real-time dari RichzSpot API berdasarkan JWT user</li>
                    <li>Ketika <strong>NONAKTIF</strong>: Sistem akan menggunakan jam kerja default (08:00 - 16:00) untuk semua user</li>
                    <li>Perubahan akan berlaku segera setelah disimpan</li>
                    <li>Fitur ini mempengaruhi perhitungan waktu selesai task dan validasi jadwal</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Last Updated Info */}
            {lastUpdated && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Terakhir diperbarui: {new Date(lastUpdated).toLocaleString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Menyimpan...
                  </span>
                ) : (
                  '💾 Simpan Pengaturan'
                )}
              </button>
              <button
                onClick={fetchSetting}
                disabled={saving}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                🔄 Reset
              </button>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <details className="cursor-pointer">
            <summary className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
              🔧 Detail Teknis
            </summary>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-3">
              <p><strong>Tabel Database:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">global_onof_getjadwal</code></p>
              <p><strong>API Endpoint:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">GET/PUT /api/settings/getjadwal</code></p>
              <p><strong>Service Function:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">isGetJadwalEnabled()</code> di <code>richzspotService.ts</code></p>
              <p><strong>Affected Functions:</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li><code>getUserWorkingHours()</code> - Pengambilan jam kerja user</li>
                <li><code>calculateTaskSchedule()</code> - Perhitungan jadwal task</li>
                <li>Modal Tambah Task - Preview waktu selesai</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
