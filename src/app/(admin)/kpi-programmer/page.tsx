"use client";

import React, { useState, useEffect } from "react";

interface ProgrammerKPI {
  pegawaiId: number;
  pegawaiName: string;
  totalTasks: number;
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
  const [period, setPeriod] = useState("month");
  const [selectedProgrammer, setSelectedProgrammer] = useState<ProgrammerKPI | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [sortField, setSortField] = useState<SortField>('completionRate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/kpi-programmer?period=${period}`);

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
    fetchData();
  }, [period]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 90) return { label: "Excellent", color: "green" };
    if (rate >= 80) return { label: "Good", color: "blue" };
    if (rate >= 60) return { label: "Average", color: "yellow" };
    return { label: "Need Improvement", color: "red" };
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
    const sorted = [...data].sort((a, b) => {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Blue Header Bar */}
      <div className="bg-blue-600 dark:bg-blue-700 px-8 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            <span className="font-bold text-lg">KPI Programmer</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="p-8 max-w-[1800px] mx-auto">
        {/* Title Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Rekap KPI Programmer
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Rekap performa programmer per periode
          </p>
        </div>

        {/* Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Periode
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="day">Hari Ini</option>
                <option value="week">7 Hari Terakhir</option>
                <option value="month">30 Hari Terakhir</option>
                <option value="year">1 Tahun Terakhir</option>
              </select>
            </div>
          </div>
        </div>

        {/* Legend Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Keterangan:</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded"></span>
              <span className="text-gray-600 dark:text-gray-400">= Total Tasklist</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded"></span>
              <span className="text-gray-600 dark:text-gray-400">= Selesai</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-500 rounded"></span>
              <span className="text-gray-600 dark:text-gray-400">= Review PM</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-orange-500 rounded"></span>
              <span className="text-gray-600 dark:text-gray-400">= Proses</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded"></span>
              <span className="text-gray-600 dark:text-gray-400">= Belum Diproses</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded"></span>
              <span className="text-gray-600 dark:text-gray-400">= Jam Absen</span>
            </div>
          </div>
        </div>

        {/* Summary Cards - Simple Style */}
        {overall && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Tasks</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{overall.totalTasks}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Selesai</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{overall.totalCompleted}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">In Progress</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{overall.totalInProgress}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overdue</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{overall.totalOverdue}</div>
            </div>
          </div>
        )}

        {/* Table - Simple Clean Style */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Detail KPI Per Programmer
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Terakhir diperbarui: {formatTime(lastUpdate)}
            </p>
          </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
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
                <th 
                  className={`px-4 py-3 text-center text-xs font-bold uppercase cursor-pointer select-none transition-colors ${
                    sortField === 'completionRate'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => handleSort('completionRate')}
                >
                  COMP%
                </th>
                <th 
                  className={`px-4 py-3 text-center text-xs font-bold uppercase cursor-pointer select-none transition-colors ${
                    sortField === 'onTimeRate'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => handleSort('onTimeRate')}
                >
                  ONTIME%
                </th>
                <th 
                  className={`px-4 py-3 text-center text-xs font-bold uppercase cursor-pointer select-none transition-colors ${
                    sortField === 'productivity'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => handleSort('productivity')}
                >
                  PROD%
                </th>
                <th 
                  className={`px-4 py-3 text-center text-xs font-bold uppercase cursor-pointer select-none transition-colors ${
                    sortField === 'projectCount'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => handleSort('projectCount')}
                >
                  PROJ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800">
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
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
                    <td className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {programmer.pegawaiName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-3 py-1 text-sm font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded">
                        {programmer.totalTasks}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-3 py-1 text-sm font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded">
                        {programmer.completedTasks}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-3 py-1 text-sm font-bold rounded ${
                        programmer.completionRate >= 80
                          ? "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30"
                          : programmer.completionRate >= 60
                          ? "text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30"
                          : "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30"
                      }`}>
                        {programmer.completionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-3 py-1 text-sm font-bold rounded ${
                        programmer.onTimeRate >= 80
                          ? "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30"
                          : programmer.onTimeRate >= 60
                          ? "text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30"
                          : "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30"
                      }`}>
                        {programmer.onTimeRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-3 py-1 text-sm font-bold rounded ${
                        programmer.productivity >= 100
                          ? "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30"
                          : programmer.productivity >= 80
                          ? "text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30"
                          : "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30"
                      }`}>
                        {programmer.productivity}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-3 py-1 text-sm font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded">
                        {programmer.projectCount}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Projects ({selectedProgrammer.projectCount})
                </h4>
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
    </div>
  );
}
