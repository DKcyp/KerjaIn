"use client";

import React, { useState, useEffect } from "react";
import TaskDetailModal from "@/components/tasklist/TaskDetailModal";

interface ProgrammerKPI {
  pegawaiId: number;
  pegawaiName: string;
  role: string;
  tim: string;
  totalTasks: number; // T
  selesai: number; // S
  reviewPM: number; // PM
  proses: number; // P
  belumDiproses: number; // B
  jamAbsen: number; // JA
  jamTotal: number; // JT
  jamSelesai: number; // JS
  jamBelum: number; // JB
  selisihJam: number; // SJ
  revisi: number; // R - count of rejected tasks
  jamProses: number; // JP
  jamAktifSelesai: number; // JAS
  completedTasks: number;
  inProgressTasks: number;
  onTimeTasks: number;
  overdueTasks: number;
  completionRate: number;
  onTimeRate: number;
  avgCompletionTime: number;
  productivity: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  projectCount: number;
  projects: string[];
  tasklists: Array<{
    id: number;
    kode: string;
    status: string;
    project: string;
    module: string;
    estimatedHours: number;
    actualHours: number;
    isRejected: boolean;
  }>;
}

interface OverallStats {
  totalProgrammers: number;
  totalTasks: number;
  totalCompleted: number;
  totalInProgress: number;
  totalOnTime: number;
  totalOverdue: number;
  avgCompletionRate: number;
  avgOnTimeRate: number;
  avgProductivity: number;
}

type SortField = 'name' | 'totalTasks' | 'completedTasks' | 'completionRate' | 'onTimeRate' | 'avgCompletionTime' | 'productivity' | 'projectCount';
type SortDirection = 'asc' | 'desc';

export default function KPIProgrammerPage() {
  const [data, setData] = useState<ProgrammerKPI[]>([]);
  const [overall, setOverall] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProgrammer, setSelectedProgrammer] = useState<ProgrammerKPI | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [sortField, setSortField] = useState<SortField>('completionRate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Filters
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedPegawaiFilter, setSelectedPegawaiFilter] = useState<string>("");

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/master-team');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTeams(result.items || []);
        }
      }
    } catch (e) {
      console.error("Error fetching teams:", e);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);
  
  // Date filters - will be loaded from /api/periode externally
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [periodeLoaded, setPeriodeLoaded] = useState(false);

  // Fetch periode (tanggal_mulai & tanggal_akhir) from external API
  useEffect(() => {
    const fetchPeriode = async () => {
      try {
        const res = await fetch('/api/periode');
        if (!res.ok) throw new Error('Failed to fetch periode');
        const json = await res.json();
        // Try common shapes: { data: { tanggal_mulai, tanggal_akhir } } or { data: [{ ... }] }
        const node = Array.isArray(json?.data) ? json.data[0] : json?.data;
        const mulai = node?.tanggal_mulai || node?.tanggalMulai || node?.startDate;
        const akhir = node?.tanggal_akhir || node?.tanggalAkhir || node?.endDate;
        if (mulai) setStartDate(String(mulai).slice(0, 10));
        if (akhir) setEndDate(String(akhir).slice(0, 10));
      } catch (err) {
        console.error('Failed to load periode, using current month fallback:', err);
        // Fallback: current month
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
      } finally {
        setPeriodeLoaded(true);
      }
    };
    fetchPeriode();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/kpi-monitoring?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch KPI data");
      }
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setOverall(result.overall);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Error fetching KPI data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!periodeLoaded) return;
    fetchData();
  }, [startDate, endDate, periodeLoaded]);

  const fetchTaskDetail = async (taskId: number) => {
    try {
      setLoadingTask(true);
      const response = await fetch(`/api/tasklist/${taskId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch task details");
      }
      const result = await response.json();
      if (result.item) {
        setSelectedTask(result.item);
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
    } finally {
      setLoadingTask(false);
    }
  };

  const handleTaskRowClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    fetchTaskDetail(taskId);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedProgrammer(null);
      }
    };
    
    if (selectedProgrammer) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [selectedProgrammer]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedData = () => {
    let filteredData = [...data];

    // Apply Filters
    if (selectedTeam) {
      filteredData = filteredData.filter((d) => d.tim === selectedTeam);
    }
    if (selectedPegawaiFilter) {
      filteredData = filteredData.filter((d) => d.pegawaiId.toString() === selectedPegawaiFilter);
    }

    const sorted = filteredData.sort((a, b) => {
      // 1. Group by Team first (Ascending)
      if (a.tim !== b.tim) {
        return (a.tim || '').localeCompare(b.tim || '');
      }

      // 2. Put PM at the top within the team
      if (a.role === 'PM' && b.role !== 'PM') return -1;
      if (a.role !== 'PM' && b.role === 'PM') return 1;

      // 3. Apply selected sort field for the rest
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.pegawaiName.toLowerCase();
          bValue = b.pegawaiName.toLowerCase();
          break;
        case 'totalTasks':
          aValue = a.totalTasks;
          bValue = b.totalTasks;
          break;
        case 'completedTasks':
          aValue = a.completedTasks;
          bValue = b.completedTasks;
          break;
        case 'completionRate':
          aValue = a.completionRate;
          bValue = b.completionRate;
          break;
        case 'onTimeRate':
          aValue = a.onTimeRate;
          bValue = b.onTimeRate;
          break;
        case 'avgCompletionTime':
          aValue = a.avgCompletionTime;
          bValue = b.avgCompletionTime;
          break;
        case 'productivity':
          aValue = a.productivity;
          bValue = b.productivity;
          break;
        case 'projectCount':
          aValue = a.projectCount;
          bValue = b.projectCount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const sortedData = getSortedData();

  return (
    <div className="px-2 py-3">
      {/* Title Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Monitoring KPI Programmer
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Rekap jumlah tasklist per pegawai
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-xs font-medium"
          >
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>
      </div>

        {/* Filter Section - Clean Modern */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tanggal Mulai
              </label>
              <div className="relative">
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg 
                  onClick={() => (document.getElementById('startDate') as HTMLInputElement)?.showPicker?.()}
                  className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tanggal Akhir
              </label>
              <div className="relative">
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg 
                  onClick={() => (document.getElementById('endDate') as HTMLInputElement)?.showPicker?.()}
                  className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pegawai
              </label>
              <select
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={selectedPegawaiFilter}
                onChange={(e) => setSelectedPegawaiFilter(e.target.value)}
              >
                <option value="">Semua Pegawai</option>
                {Array.from(new Map(data.map(item => [item.pegawaiId, item])).values())
                  .sort((a, b) => a.pegawaiName.localeCompare(b.pegawaiName))
                  .map(p => (
                    <option key={p.pegawaiId} value={p.pegawaiId.toString()}>{p.pegawaiName}</option>
                  ))
                }
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tim
              </label>
              <select
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={selectedTeam}
                onChange={(e) => {
                  setSelectedTeam(e.target.value);
                  setSelectedPegawaiFilter(""); // Reset pegawai filter when team changes
                }}
              >
                <option value="">Semua Tim</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.namaTeam}>
                    {team.namaTeam}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Legend Section - Compact */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2.5 mb-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Keterangan:</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-sm"></span>
              <span className="text-gray-600 dark:text-gray-400">T = Total Tasklist</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-sm"></span>
              <span className="text-gray-600 dark:text-gray-400">S = Selesai</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-sm"></span>
              <span className="text-gray-600 dark:text-gray-400">PM = Review PM</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-500 rounded-sm"></span>
              <span className="text-gray-600 dark:text-gray-400">P = Proses</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-sm"></span>
              <span className="text-gray-600 dark:text-gray-400">B = Belum Diproses</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-500 rounded-sm"></span>
              <span className="text-gray-600 dark:text-gray-400">JA = Jam Absen</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-indigo-500 rounded-sm"></span>
              <span className="text-gray-600 dark:text-gray-400">JT = Jam Total</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-teal-500 rounded-sm"></span>
              <span className="text-gray-600 dark:text-gray-400">JS = Jam Selesai</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-pink-500 rounded-sm"></span>
              <span className="text-gray-600 dark:text-gray-400">JB = Jam Belum</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-cyan-500 rounded-sm"></span>
              <span className="text-gray-600 dark:text-gray-400">SJ = Selisih Jam</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-rose-500 rounded-sm"></span>
              <span className="text-gray-600 dark:text-gray-400">R = Revisi</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-amber-500 rounded-sm"></span>
              <span className="text-gray-600 dark:text-gray-400">JP = Jam Proses</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-lime-500 rounded-sm"></span>
              <span className="text-gray-600 dark:text-gray-400">JAS = Jam Aktif Selesai</span>
            </div>
          </div>
        </div>

        {/* Table - Simple Clean Style */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Detail KPI Per Programmer
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Terakhir diperbarui: {formatTime(lastUpdate)}
              </p>
            </div>
            
            {/* Compact Stats removed per request */}
          </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-2 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase w-12">
                  NO
                </th>
                <th 
                  className={`px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer select-none transition-colors ${
                    sortField === 'name'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => handleSort('name')}
                >
                  PEGAWAI
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                  TIM
                </th>
                <th 
                  className={`px-4 py-3 text-center text-xs font-bold uppercase cursor-pointer select-none transition-colors ${
                    sortField === 'totalTasks'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => handleSort('totalTasks')}
                >
                  T
                </th>
                <th 
                  className={`px-4 py-3 text-center text-xs font-bold uppercase cursor-pointer select-none transition-colors ${
                    sortField === 'completedTasks'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => handleSort('completedTasks')}
                >
                  S
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                  PM
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                  P
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                  B
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                  JA
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                  JT
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                  JS
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                  JB
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                  SJ
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                  R
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                  JP
                </th>
                <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                  JAS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800">
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Tidak ada data untuk periode ini
                  </td>
                </tr>
              ) : (
                sortedData.map((programmer, index) => (
                  <tr
                    key={programmer.pegawaiId}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedProgrammer(programmer)}
                  >
                    <td className="px-2 py-3 text-center text-xs font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">
                      {index + 1}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium border-r border-gray-200 dark:border-gray-700 ${programmer.role === 'PM' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {programmer.pegawaiName}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">
                      {programmer.tim}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-200 dark:border-gray-700">
                      <span className="inline-block px-3 py-1 text-sm font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded">
                        {programmer.totalTasks}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-200 dark:border-gray-700">
                      <span className="inline-block px-3 py-1 text-sm font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded">
                        {programmer.selesai}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-200 dark:border-gray-700">
                      <span className="inline-block px-3 py-1 text-sm font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded">
                        {programmer.reviewPM}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-200 dark:border-gray-700">
                      <span className="inline-block px-3 py-1 text-sm font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 rounded">
                        {programmer.proses}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-200 dark:border-gray-700">
                      <span className="inline-block px-3 py-1 text-sm font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded">
                        {programmer.belumDiproses}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">
                      {programmer.jamAbsen}h
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">
                      {programmer.jamTotal.toFixed(1)}h
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">
                      {programmer.jamSelesai.toFixed(1)}h
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">
                      {programmer.jamBelum.toFixed(1)}h
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">
                      {programmer.selisihJam.toFixed(1)}h
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">
                      {programmer.revisi}
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">
                      {programmer.jamProses.toFixed(1)}h
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-gray-100">
                      {programmer.jamAktifSelesai.toFixed(1)}h
                    </td>
                  </tr>
                ))
              )}
              {/* Total Row */}
              {data.length > 0 && (
                <tr className="bg-gray-100 dark:bg-gray-700 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                  <td colSpan={2} className="px-4 py-3 text-sm text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                    TOTAL
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600"></td>
                  <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600">
                    <span className="inline-block px-3 py-1 text-sm font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded">
                      {data.reduce((sum, p) => sum + p.totalTasks, 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600">
                    <span className="inline-block px-3 py-1 text-sm font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded">
                      {data.reduce((sum, p) => sum + p.selesai, 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600">
                    <span className="inline-block px-3 py-1 text-sm font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded">
                      {data.reduce((sum, p) => sum + p.reviewPM, 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600">
                    <span className="inline-block px-3 py-1 text-sm font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 rounded">
                      {data.reduce((sum, p) => sum + p.proses, 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600">
                    <span className="inline-block px-3 py-1 text-sm font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded">
                      {data.reduce((sum, p) => sum + p.belumDiproses, 0)}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                    {data.length > 0 ? (data.reduce((sum, p) => sum + p.jamAbsen, 0) / data.length).toFixed(1) : 0}h
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                    {data.reduce((sum, p) => sum + p.jamTotal, 0).toFixed(1)}h
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                    {data.reduce((sum, p) => sum + p.jamSelesai, 0).toFixed(1)}h
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                    {data.reduce((sum, p) => sum + p.jamBelum, 0).toFixed(1)}h
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                    {data.reduce((sum, p) => sum + p.selisihJam, 0).toFixed(1)}h
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                    {data.reduce((sum, p) => sum + p.revisi, 0)}
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                    {data.reduce((sum, p) => sum + p.jamProses, 0).toFixed(1)}h
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-gray-900 dark:text-white">
                    {data.reduce((sum, p) => sum + p.jamAktifSelesai, 0).toFixed(1)}h
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Detail Modal - Render first so it's on top */}
      {selectedTaskId && (
        <TaskDetailModal
          isOpen={selectedTaskId !== null}
          task={selectedTask}
          onClose={() => {
            setSelectedTaskId(null);
            setSelectedTask(null);
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedProgrammer && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProgrammer(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Detail KPI - {selectedProgrammer.pegawaiName}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedProgrammer.totalTasks}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {selectedProgrammer.completedTasks}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedProgrammer.inProgressTasks}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {selectedProgrammer.overdueTasks}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Performance Metrics</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Completion Rate</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedProgrammer.completionRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${selectedProgrammer.completionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">On-Time Rate</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedProgrammer.onTimeRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${selectedProgrammer.onTimeRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Productivity</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedProgrammer.productivity}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          selectedProgrammer.productivity >= 100
                            ? "bg-green-600"
                            : selectedProgrammer.productivity >= 80
                            ? "bg-yellow-600"
                            : "bg-red-600"
                        }`}
                        style={{ width: `${Math.min(selectedProgrammer.productivity, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Time Analysis</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Avg Completion Time</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedProgrammer.avgCompletionTime} hours
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Total Estimated</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedProgrammer.totalEstimatedHours} hours
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Total Actual</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedProgrammer.totalActualHours} hours
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">On-Time Tasks</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedProgrammer.onTimeTasks} / {selectedProgrammer.completedTasks}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Daftar Tasklist ({selectedProgrammer.tasklists?.length || 0})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="px-2 py-2 text-left text-gray-700 dark:text-gray-300">Kode</th>
                        <th className="px-2 py-2 text-left text-gray-700 dark:text-gray-300">Project</th>
                        <th className="px-2 py-2 text-left text-gray-700 dark:text-gray-300">Module</th>
                        <th className="px-2 py-2 text-center text-gray-700 dark:text-gray-300">Status</th>
                        <th className="px-2 py-2 text-center text-gray-700 dark:text-gray-300">Est (h)</th>
                        <th className="px-2 py-2 text-center text-gray-700 dark:text-gray-300">Actual (h)</th>
                        <th className="px-2 py-2 text-center text-gray-700 dark:text-gray-300">Rejected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedProgrammer.tasklists?.map((task) => (
                        <tr 
                          key={task.id} 
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskRowClick(task.id);
                          }}
                        >
                          <td className="px-2 py-2 text-gray-900 dark:text-gray-100 font-medium">{task.kode}</td>
                          <td className="px-2 py-2 text-gray-900 dark:text-gray-100">{task.project}</td>
                          <td className="px-2 py-2 text-gray-900 dark:text-gray-100">{task.module}</td>
                          <td className="px-2 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              task.status === 'SELESAI' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              task.status === 'MENUNGGU_REVIEW_PM' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                              task.status === 'SEDANG_DIPROSES_USER' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {task.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center text-gray-900 dark:text-gray-100">{task.estimatedHours.toFixed(1)}</td>
                          <td className="px-2 py-2 text-center text-gray-900 dark:text-gray-100">{task.actualHours.toFixed(1)}</td>
                          <td className="px-2 py-2 text-center">
                            {task.isRejected ? (
                              <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium">Yes</span>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex flex-wrap gap-2">
                  {selectedProgrammer.projects.map((project, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                    >
                      {project}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedProgrammer(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
