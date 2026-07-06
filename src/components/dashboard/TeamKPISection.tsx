"use client";

import React, { useState, useEffect, useMemo } from 'react';

interface KPIData {
  programmer: {
    id: number;
    name: string;
    username: string;
  };
  kpi: {
    taskSelesai: { percentage: number; contribution: number; weight: number };
    taskTepatWaktu: { percentage: number; contribution: number; weight: number };
    waktuPengerjaan: { percentage: number; contribution: number; weight: number };
    taskRevisi: { percentage: number; contribution: number; weight: number };
    totalPercentage: number;
  };
  metrics: {
    totalTasklist: number;
    totalTasklistSelesai: number;
    totalTasklistTepatWaktu: number;
    totalTasklistRevisi: number;
    totalJamJadwalTasklist: number;
    totalJamAbsen: number;
  };
}

interface TeamMember {
  id: number;
  name: string;
  kpiData?: KPIData;
}

interface TeamKPISectionProps {
  startDate: string;
  endDate: string;
  teamMembers: Array<{ id: number; name: string }>;
}

function generateDummyKPI(name: string, id: number): KPIData {
  const seed = id * 7 + name.length;
  const taskSelesaiPct = 70 + (seed % 25);
  const tepatWaktuPct = 60 + ((seed * 3) % 35);
  const waktuPengerjaanPct = 55 + ((seed * 5) % 30);
  const revisiPct = 65 + ((seed * 7) % 30);
  const total = taskSelesaiPct * 0.30 + tepatWaktuPct * 0.40 + waktuPengerjaanPct * 0.20 + revisiPct * 0.10;

  const totalTasklist = 8 + (seed % 10);
  const totalTasklistSelesai = Math.max(2, totalTasklist - (seed % 5));
  const totalTasklistTepatWaktu = Math.max(0, totalTasklistSelesai - (seed % 4));
  const totalTasklistRevisi = Math.min(totalTasklistSelesai, seed % 4);

  return {
    programmer: { id, name, username: name.toLowerCase().replace(/\s/g, '.') },
    kpi: {
      taskSelesai: { percentage: taskSelesaiPct, contribution: +(taskSelesaiPct * 0.30).toFixed(1), weight: 30 },
      taskTepatWaktu: { percentage: tepatWaktuPct, contribution: +(tepatWaktuPct * 0.40).toFixed(1), weight: 40 },
      waktuPengerjaan: { percentage: waktuPengerjaanPct, contribution: +(waktuPengerjaanPct * 0.20).toFixed(1), weight: 20 },
      taskRevisi: { percentage: revisiPct, contribution: +(revisiPct * 0.10).toFixed(1), weight: 10 },
      totalPercentage: +total.toFixed(1),
    },
    metrics: {
      totalTasklist,
      totalTasklistSelesai,
      totalTasklistTepatWaktu,
      totalTasklistRevisi,
      totalJamJadwalTasklist: 100 + (seed % 60),
      totalJamAbsen: 160 + (seed % 40),
    },
  };
}

export default function TeamKPISection({ teamMembers }: TeamKPISectionProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    setMembers(teamMembers.map(m => ({
      ...m,
      kpiData: generateDummyKPI(m.name, m.id),
    })));
  }, [teamMembers]);

  const sortedMembers = useMemo(() => {
    return [...members]
      .filter(m => m.kpiData)
      .sort((a, b) => {
        const calc = (d: KPIData) => {
          const m = d.metrics;
          const selesaiPct = m.totalTasklist > 0 ? (m.totalTasklistSelesai / m.totalTasklist) : 0;
          const tepatWaktuPct = m.totalTasklistSelesai > 0 ? (m.totalTasklistTepatWaktu / m.totalTasklistSelesai) : 0;
          const waktuPct = m.totalJamAbsen > 0 ? (m.totalJamJadwalTasklist / m.totalJamAbsen) : 0;
          const revisiPct = m.totalTasklistSelesai > 0 ? (1 - m.totalTasklistRevisi / m.totalTasklistSelesai) : 1;
          return selesaiPct * 30 + tepatWaktuPct * 40 + waktuPct * 20 + revisiPct * 10;
        };
        return calc(b.kpiData!) - calc(a.kpiData!);
      });
  }, [members]);

  const getKPIColor = (percentage: number) => {
    if (percentage >= 80) return 'text-success-600 dark:text-success-400';
    if (percentage >= 60) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 40) return 'text-warning-600 dark:text-warning-400';
    return 'text-error-600 dark:text-error-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-sm border border-gray-200 dark:border-gray-700 flex flex-col max-h-[300px]">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 rounded-t-lg flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-between w-full">
          KPI Tim
          <span>({members.length})</span>
        </h3>
      </div>
      <div className="overflow-y-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
              <th rowSpan={2} className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 text-center">No</th>
              <th rowSpan={2} className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 text-center">Nama</th>
              <th rowSpan={2} className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 text-center">KPI</th>
              <th colSpan={4} className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Task Selesai</th>
              <th colSpan={4} className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Task Tepat Waktu</th>
              <th colSpan={4} className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Waktu Pengerjaan</th>
              <th colSpan={4} className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Revisi</th>
            </tr>
            <tr className="bg-gray-50 dark:bg-gray-700/50 sticky top-[32px] z-10">
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Total Tasklist Selesai</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Total Tasklist</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Total</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">KPI</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Total Tasklist Tepat Waktu</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Total Tasklist Selesai</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Total</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">KPI</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Total Jam Jadwal Tasklist</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Total Jam Absen</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Total</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">KPI</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Total Revisi</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Total Tasklist Selesai</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">Total</th>
              <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-center border border-gray-300 dark:border-gray-600">KPI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedMembers.map((member, idx) => {
              const m = member.kpiData!.metrics;
              const selesaiPct = m.totalTasklist > 0 ? (m.totalTasklistSelesai / m.totalTasklist) : 0;
              const tepatWaktuPct = m.totalTasklistSelesai > 0 ? (m.totalTasklistTepatWaktu / m.totalTasklistSelesai) : 0;
              const waktuPct = m.totalJamAbsen > 0 ? (m.totalJamJadwalTasklist / m.totalJamAbsen) : 0;
              const revisiPct = m.totalTasklistSelesai > 0 ? (1 - m.totalTasklistRevisi / m.totalTasklistSelesai) : 1;
              const totalKpi = selesaiPct * 30 + tepatWaktuPct * 40 + waktuPct * 20 + revisiPct * 10;
              return (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 text-center">{idx + 1}</td>
                  <td className="px-2 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">{member.name}</td>
                  <td className={`px-2 py-2 text-sm font-bold border border-gray-300 dark:border-gray-600 text-center ${getKPIColor(totalKpi)}`}>{totalKpi.toFixed(1)}</td>
                  <td className="px-2 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 text-center">{m.totalTasklistSelesai}</td>
                  <td className="px-2 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 text-center">{m.totalTasklist}</td>
                  <td className={`px-2 py-2 text-sm font-semibold border border-gray-300 dark:border-gray-600 text-center ${getKPIColor(m.totalTasklist > 0 ? (m.totalTasklistSelesai / m.totalTasklist) * 100 : 0)}`}>{m.totalTasklist > 0 ? ((m.totalTasklistSelesai / m.totalTasklist) * 100).toFixed(1) : '0.0'}%</td>
                  <td className={`px-2 py-2 text-sm font-bold border border-gray-300 dark:border-gray-600 text-center ${getKPIColor(m.totalTasklist > 0 ? ((m.totalTasklistSelesai / m.totalTasklist) * 100) : 0)}`}>{m.totalTasklist > 0 ? (((m.totalTasklistSelesai / m.totalTasklist) * 100 * 30) / 100).toFixed(1) : '0.0'}</td>
                  <td className="px-2 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 text-center">{m.totalTasklistTepatWaktu}</td>
                  <td className="px-2 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 text-center">{m.totalTasklistSelesai}</td>
                  <td className={`px-2 py-2 text-sm font-semibold border border-gray-300 dark:border-gray-600 text-center ${getKPIColor(m.totalTasklistSelesai > 0 ? (m.totalTasklistTepatWaktu / m.totalTasklistSelesai) * 100 : 0)}`}>{m.totalTasklistSelesai > 0 ? ((m.totalTasklistTepatWaktu / m.totalTasklistSelesai) * 100).toFixed(1) : '0.0'}%</td>
                  <td className={`px-2 py-2 text-sm font-bold border border-gray-300 dark:border-gray-600 text-center ${getKPIColor(m.totalTasklistSelesai > 0 ? ((m.totalTasklistTepatWaktu / m.totalTasklistSelesai) * 100) : 0)}`}>{m.totalTasklistSelesai > 0 ? (((m.totalTasklistTepatWaktu / m.totalTasklistSelesai) * 100 * 40) / 100).toFixed(1) : '0.0'}</td>
                  <td className="px-2 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 text-center">{m.totalJamJadwalTasklist}</td>
                  <td className="px-2 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 text-center">{m.totalJamAbsen}</td>
                  <td className={`px-2 py-2 text-sm font-semibold border border-gray-300 dark:border-gray-600 text-center ${getKPIColor(m.totalJamAbsen > 0 ? (m.totalJamJadwalTasklist / m.totalJamAbsen) * 100 : 0)}`}>{m.totalJamAbsen > 0 ? ((m.totalJamJadwalTasklist / m.totalJamAbsen) * 100).toFixed(1) : '0.0'}%</td>
                  <td className={`px-2 py-2 text-sm font-bold border border-gray-300 dark:border-gray-600 text-center ${getKPIColor(m.totalJamAbsen > 0 ? (m.totalJamJadwalTasklist / m.totalJamAbsen) * 100 : 0)}`}>{m.totalJamAbsen > 0 ? (((m.totalJamJadwalTasklist / m.totalJamAbsen) * 100 * 20) / 100).toFixed(1) : '0.0'}</td>
                  <td className="px-2 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 text-center">{m.totalTasklistRevisi}</td>
                  <td className="px-2 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 text-center">{m.totalTasklistSelesai}</td>
                  <td className={`px-2 py-2 text-sm font-semibold border border-gray-300 dark:border-gray-600 text-center ${getKPIColor(m.totalTasklistSelesai > 0 ? ((1 - m.totalTasklistRevisi / m.totalTasklistSelesai) * 100) : 100)}`}>{m.totalTasklistSelesai > 0 ? ((1 - m.totalTasklistRevisi / m.totalTasklistSelesai) * 100).toFixed(1) : '100.0'}%</td>
                  <td className={`px-2 py-2 text-sm font-bold border border-gray-300 dark:border-gray-600 text-center ${getKPIColor(m.totalTasklistSelesai > 0 ? ((1 - m.totalTasklistRevisi / m.totalTasklistSelesai) * 100) : 100)}`}>{m.totalTasklistSelesai > 0 ? ((((1 - m.totalTasklistRevisi / m.totalTasklistSelesai) * 100) * 10) / 100).toFixed(1) : '10.0'}</td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={19} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Tidak ada anggota tim</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}