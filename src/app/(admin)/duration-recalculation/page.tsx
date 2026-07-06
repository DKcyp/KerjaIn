'use client';

import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import TaskDetailModal from '@/components/tasklist/TaskDetailModal';

interface DurationCalculation {
  taskId: number;
  taskCode: string;
  oldDuration: number;
  newDuration: number;
  difference: number;
  status: 'SAME' | 'INCREASED' | 'DECREASED';
  breakdown: {
    startToKirimDuration: number;   // START → KIRIM (work duration)
    kirimToApproveDuration: number; // KIRIM → APPROVE (review duration)
    rejectCount: number;            // Berapa kali di-reject
    isApproved: boolean;            // Apakah final state APPROVED
  };
}

interface Stats {
  totalTasks: number;
  tasksWithDifference: number;
  totalOldDuration: number;
  totalNewDuration: number;
  totalDifference: number;
  averageOldDuration: number;
  averageNewDuration: number;
}

export default function DurationRecalculationPage() {
  const { success, error } = useToast();
  const [monthsBack, setMonthsBack] = useState(1);
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [calculations, setCalculations] = useState<DurationCalculation[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'difference' | 'taskCode' | 'oldDuration'>('difference');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SAME' | 'INCREASED' | 'DECREASED'>('ALL');
  
  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);

  // Fetch calculations
  const fetchCalculations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/recalculate-duration-v2?monthsBack=${monthsBack}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch calculations');
      }

      const data = await response.json();
      setStats(data.stats);
      setCalculations(data.calculations);
      setSelectedTasks(new Set());
      success(`Loaded ${data.calculations.length} tasks for comparison`);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to fetch calculations');
    } finally {
      setLoading(false);
    }
  };

  // Populate totalStartStopMinutes
  const handlePopulate = async () => {
    try {
      setPopulating(true);
      const response = await fetch('/api/admin/populate-duration-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to populate duration');
      }

      const data = await response.json();
      success(`Populated ${data.totalUpdated} log entries`);

      // Refresh calculations
      await fetchCalculations();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to populate duration');
    } finally {
      setPopulating(false);
    }
  };

  // Convert selected tasks
  const handleConvert = async () => {
    if (selectedTasks.size === 0) {
      error('Please select at least one task to convert');
      return;
    }

    try {
      setConverting(true);
      const response = await fetch('/api/admin/recalculate-duration-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: Array.from(selectedTasks) })
      });

      if (!response.ok) {
        throw new Error('Failed to convert durations');
      }

      const data = await response.json();
      success(`Updated ${data.updated.length} tasks`);

      // Refresh calculations
      await fetchCalculations();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to convert durations');
    } finally {
      setConverting(false);
    }
  };

  // Toggle task selection
  const toggleTask = (taskId: number) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  // Select all visible tasks
  const selectAll = () => {
    const filtered = getFilteredAndSortedCalculations();
    setSelectedTasks(new Set(filtered.map(c => c.taskId)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedTasks(new Set());
  };

  // Filter and sort calculations
  const getFilteredAndSortedCalculations = () => {
    let filtered = calculations;

    // Filter by status
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'difference') {
        return Math.abs(b.difference) - Math.abs(a.difference);
      } else if (sortBy === 'taskCode') {
        return a.taskCode.localeCompare(b.taskCode);
      } else {
        return b.oldDuration - a.oldDuration;
      }
    });
  };

  const filteredCalculations = getFilteredAndSortedCalculations();

  // Format minutes to readable time
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Open detail modal
  const openDetail = (taskId: number) => {
    setDetailTaskId(taskId);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Duration Recalculation
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Compare and update task duration calculations based on tasklist_log entries
        </p>
      </div>

      {/* Controls */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Months Back
            </label>
            <select
              value={monthsBack}
              onChange={(e) => setMonthsBack(parseInt(e.target.value))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
            >
              <option value={1}>Last 1 Month</option>
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={12}>Last 12 Months</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Limit
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              min={10}
              max={1000}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchCalculations}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md font-medium transition-colors"
            >
              {loading ? 'Loading...' : 'Load Data'}
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={handlePopulate}
              disabled={populating}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-md font-medium transition-colors"
            >
              {populating ? 'Populating...' : 'Populate Duration'}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalTasks}</p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Tasks with Difference</p>
            <p className="text-2xl font-bold text-orange-600">{stats.tasksWithDifference}</p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Old Duration</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatMinutes(stats.totalOldDuration)}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total New Duration</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatMinutes(stats.totalNewDuration)}
            </p>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      {calculations.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="SAME">Same</option>
                <option value="INCREASED">Increased</option>
                <option value="DECREASED">Decreased</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="difference">Sort by Difference</option>
                <option value="taskCode">Sort by Task Code</option>
                <option value="oldDuration">Sort by Old Duration</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                Deselect All
              </button>
              <button
                onClick={handleConvert}
                disabled={selectedTasks.size === 0 || converting}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-md font-medium transition-colors"
              >
                {converting ? 'Converting...' : `Convert (${selectedTasks.size})`}
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredCalculations.length} of {calculations.length} tasks
          </p>
        </div>
      )}

      {/* Table */}
      {calculations.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <input
                      type="checkbox"
                      checked={selectedTasks.size === filteredCalculations.length && filteredCalculations.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAll();
                        } else {
                          deselectAll();
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Task Code
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Old Duration
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                    New Duration
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <div className="text-xs">Work Duration</div>
                    <div className="text-xs font-normal">(START → KIRIM)</div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <div className="text-xs">Review Duration</div>
                    <div className="text-xs font-normal">(KIRIM → APPROVE)</div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Difference
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredCalculations.map((calc) => (
                  <tr
                    key={calc.taskId}
                    onClick={() => openDetail(calc.taskId)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(calc.taskId)}
                        onChange={() => toggleTask(calc.taskId)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {calc.taskCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                      {formatMinutes(calc.oldDuration)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100 font-bold">
                      {formatMinutes(calc.newDuration)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-blue-600 dark:text-blue-400">
                      {formatMinutes(calc.breakdown?.startToKirimDuration || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-purple-600 dark:text-purple-400">
                      {formatMinutes(calc.breakdown?.kirimToApproveDuration || 0)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-bold ${
                      calc.difference > 0
                        ? 'text-green-600'
                        : calc.difference < 0
                        ? 'text-red-600'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {calc.difference > 0 ? '+' : ''}{formatMinutes(Math.abs(calc.difference))}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        calc.status === 'SAME'
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                          : calc.status === 'INCREASED'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      }`}>
                        {calc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {calculations.length === 0 && !loading && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Click "Load Data" to fetch tasks and compare durations
          </p>
        </div>
      )}

      {/* Detail Modal */}
      <TaskDetailModal
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailTaskId(null);
        }}
        task={detailTaskId ? { id: detailTaskId } as any : null}
      />
    </div>
  );
}
