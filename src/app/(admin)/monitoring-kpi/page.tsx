"use client";

import React, { useState, useEffect } from "react";
import DatePickerField from "@/components/form/DatePickerField";

interface MonitoringKPI {
  pegawaiId: number;
  nama: string;
  role: string;
  totalTasklistSelesai: number;
  totalTasklist: number;
  persenSelesai: number;
  kpiSelesai: number;
  totalTepatWaktu: number;
  totalSelesaiUntukTW: number;
  persenTepatWaktu: number;
  kpiTepatWaktu: number;
  totalJamTasklist: number;
  totalJamAbsen: number;
  persenWaktu: number;
  kpiWaktu: number;
  totalAksiRevisi: number;
  totalSelesaiUntukRevisi: number;
  persenRevisi: number;
  kpiRevisi: number;
  grandTotal: number;
}

function formatJam(minutes: number): string {
  return minutes.toLocaleString("id-ID");
}

function formatPersen(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatKPI(value: number): string {
  return `${value.toFixed(2)}%`;
}

function getDefaultDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // endDate: 24 bulan ini
  const end = new Date(year, month, 24);
  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

  // startDate: 25 bulan lalu
  const start = new Date(year, month - 1, 25);
  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;

  return { start: startStr, end: endStr };
}

export default function MonitoringKPIPage() {
  const { start: defaultStart, end: defaultEnd } = getDefaultDates();
  const [kpiData, setKpiData] = useState<MonitoringKPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  useEffect(() => {
    const fetchKPI = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        const qs = params.toString();
        const res = await fetch(`/api/monitoring-kpi${qs ? "?" + qs : ""}`);
        if (!res.ok) throw new Error("Gagal mengambil data monitoring KPI");
        const result = await res.json();

        if (!result.success) {
          throw new Error(result.error || "Gagal mengambil data");
        }

        // Map data dari API ke format MonitoringKPI, tambahkan field default 0 untuk kolom lain
        const mapped: MonitoringKPI[] = result.data.map((item: any) => ({
          pegawaiId: item.pegawaiId,
          nama: item.nama,
          role: item.role,
          totalTasklistSelesai: item.totalTasklistSelesai,
          totalTasklist: item.totalTasklist,
          persenSelesai: item.persenSelesai,
          kpiSelesai: item.kpiSelesai,
          totalTepatWaktu: item.totalTepatWaktu,
          totalSelesaiUntukTW: item.totalSelesaiUntukTW,
          persenTepatWaktu: item.persenTepatWaktu,
          kpiTepatWaktu: item.kpiTepatWaktu,
          totalJamTasklist: item.totalJamTasklist,
          totalJamAbsen: item.totalJamAbsen,
          persenWaktu: item.persenWaktu,
          kpiWaktu: item.kpiWaktu,
          totalAksiRevisi: item.totalAksiRevisi,
          totalSelesaiUntukRevisi: item.totalSelesaiUntukRevisi,
          persenRevisi: item.persenRevisi,
          kpiRevisi: item.kpiRevisi,
          grandTotal: item.grandTotal,
        }));

        setKpiData(mapped);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };

    fetchKPI();
  }, [startDate, endDate]);

  // Tampilkan semua data pegawai
  const programmerData = kpiData;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Monitoring KPI
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Rekapitulasi KPI: Task Selesai (30%) + Task Tepat Waktu (40%) + Waktu Pengerjaan (20%) + Total Revisi (10%)
        </p>
      </div>

      {/* Filter Tanggal */}
      <div className="mb-3 flex items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            From Date
          </label>
          <DatePickerField
            value={startDate}
            onChange={setStartDate}
            placeholder="Select start date"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            To Date
          </label>
          <DatePickerField
            value={endDate}
            onChange={setEndDate}
            placeholder="Select end date"
          />
        </div>
      </div>

      {/* Info */}
      <div className="mb-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span>Total Pegawai: <strong>{programmerData.length}</strong></span>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {/* Row 1: Group Headers */}
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th
                  rowSpan={2}
                  className="px-3 py-2 text-center text-xs font-bold whitespace-nowrap text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 w-10 sticky left-0 z-10 bg-gray-100 dark:bg-gray-700"
                >
                  No
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-2 text-center text-xs font-bold whitespace-nowrap text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 sticky left-10 z-10 bg-gray-100 dark:bg-gray-700"
                >
                  Nama
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-2 text-center text-xs font-bold whitespace-nowrap text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 bg-red-50 dark:bg-red-900/20 sticky left-[184px] z-10"
                >
                  Grand Total KPI
                </th>
                <th
                  colSpan={4}
                  className="px-4 py-2 text-center text-xs font-bold whitespace-nowrap text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20"
                >
                  Task Selesai (30%)
                </th>
                <th
                  colSpan={4}
                  className="px-4 py-2 text-center text-xs font-bold whitespace-nowrap text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20"
                >
                  Task Tepat Waktu (40%)
                </th>
                <th
                  colSpan={4}
                  className="px-4 py-2 text-center text-xs font-bold whitespace-nowrap text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 bg-orange-50 dark:bg-orange-900/20"
                >
                  Waktu Pengerjaan (20%)
                </th>
                <th
                  colSpan={4}
                  className="px-4 py-2 text-center text-xs font-bold whitespace-nowrap text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 bg-purple-50 dark:bg-purple-900/20"
                >
                  Total Revisi (10%)
                </th>
              </tr>
              {/* Row 2: Sub Headers */}
              <tr className="bg-gray-50 dark:bg-gray-750">
                {/* Task Selesai */}
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-blue-50/50 dark:bg-blue-900/10">
                  Total Tasklist Selesai
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-blue-50/50 dark:bg-blue-900/10">
                  Total Tasklist
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-blue-50/50 dark:bg-blue-900/10">
                  Total
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-blue-50/50 dark:bg-blue-900/10">
                  KPI
                </th>
                {/* Task Tepat Waktu */}
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-green-50/50 dark:bg-green-900/10">
                  Total Tasklist Tepat Waktu
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-green-50/50 dark:bg-green-900/10">
                  Total Tasklist Selesai
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-green-50/50 dark:bg-green-900/10">
                  Total
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-green-50/50 dark:bg-green-900/10">
                  KPI
                </th>
                {/* Waktu Pengerjaan */}
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-orange-50/50 dark:bg-orange-900/10">
                  Total Jam Jadwal Tasklist
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-orange-50/50 dark:bg-orange-900/10">
                  Total Jam Absen
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-orange-50/50 dark:bg-orange-900/10">
                  Total
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-orange-50/50 dark:bg-orange-900/10">
                  KPI
                </th>
                {/* Total Revisi */}
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-purple-50/50 dark:bg-purple-900/10">
                  Total Aksi Revisi Per Tasklist
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-purple-50/50 dark:bg-purple-900/10">
                  Total Tasklist Selesai
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-purple-50/50 dark:bg-purple-900/10">
                  Total
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold whitespace-nowrap text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-purple-50/50 dark:bg-purple-900/10">
                  KPI
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={18}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Memuat data...
                  </td>
                </tr>
              ) : programmerData.length === 0 ? (
                <tr>
                  <td
                    colSpan={18}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Tidak ada data programmer
                  </td>
                </tr>
              ) : (
                programmerData.map((row, index) => (
                  <tr
                    key={row.pegawaiId}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    {/* No */}
                    <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 sticky left-0 z-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      {index + 1}
                    </td>
                    {/* Nama */}
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 sticky left-10 z-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 whitespace-nowrap min-w-[144px]">
                      {row.nama}
                    </td>
                    {/* Grand Total KPI */}
                    <td className="px-4 py-2.5 text-center text-sm font-bold text-red-700 dark:text-red-400 border border-gray-300 dark:border-gray-600 sticky left-[184px] z-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      {row.grandTotal}%
                    </td>
                    {/* Task Selesai */}
                    <td className="px-3 py-2.5 text-center text-xs text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                      {row.totalTasklistSelesai}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                      {row.totalTasklist}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-medium text-blue-700 dark:text-blue-300 border border-gray-300 dark:border-gray-600">
                      {formatPersen(row.persenSelesai)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-blue-700 dark:text-blue-300 border border-gray-300 dark:border-gray-600">
                      {formatKPI(row.kpiSelesai)}
                    </td>
                    {/* Task Tepat Waktu */}
                    <td className="px-3 py-2.5 text-center text-xs text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                      {row.totalTepatWaktu}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                      {row.totalSelesaiUntukTW}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-medium text-green-700 dark:text-green-300 border border-gray-300 dark:border-gray-600">
                      {formatPersen(row.persenTepatWaktu)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-green-700 dark:text-green-300 border border-gray-300 dark:border-gray-600">
                      {formatKPI(row.kpiTepatWaktu)}
                    </td>
                    {/* Waktu Pengerjaan */}
                    <td className="px-3 py-2.5 text-center text-xs text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                      {formatJam(row.totalJamTasklist)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                      {formatJam(row.totalJamAbsen)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-medium text-orange-700 dark:text-orange-300 border border-gray-300 dark:border-gray-600">
                      {formatPersen(row.persenWaktu)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-orange-700 dark:text-orange-300 border border-gray-300 dark:border-gray-600">
                      {formatKPI(row.kpiWaktu)}
                    </td>
                    {/* Total Revisi */}
                    <td className="px-3 py-2.5 text-center text-xs text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                      {row.totalAksiRevisi}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
                      {row.totalSelesaiUntukRevisi}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-medium text-purple-700 dark:text-purple-300 border border-gray-300 dark:border-gray-600">
                      {formatPersen(row.persenRevisi)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-purple-700 dark:text-purple-300 border border-gray-300 dark:border-gray-600">
                      {formatKPI(row.kpiRevisi)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
