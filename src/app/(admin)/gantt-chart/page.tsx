"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import Select2Field from "@/components/form/Select2Field";
import TaskViewModal from "@/components/tasklist/TaskViewModal";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { useSearchParams } from "next/navigation";

// Types
type TaskItem = {
  id: number;
  projectId: number;
  moduleId: number;
  pegawaiId: number;
  pegawaiNama: string;
  proyekNama: string;
  moduleNama: string;
  keterangan: string | null;
  scheduleAt: string;
  calculatedDueDate?: string | null;
  submittedForReviewAt?: string | null; // When programmer submitted for PM review
  approvedAt?: string | null; // When PM approved the task
  startedAt?: string | null; // When task actually started
  status: 'MENUNGGU_PROSES_USER' | 'SEDANG_DIPROSES_USER' | 'SEDANG_DIPROSES_USER_PAUSED' | 'MENUNGGU_REVIEW_PM' | 'SELESAI';
  taskComplexity?: 'EASY' | 'MEDIUM' | 'HARD';
  tasklistType?: 'BLUEPRINT' | 'DEVELOPMENT' | 'MAINTENANCE';
  kode?: string;
  imagePath?: string | null;
};

type Proyek = { id: number; namaProyek: string };
type Pegawai = { id: number; namaLengkap: string };

// Check if task was completed late (for SELESAI status)
// Compare actual approved date vs target due date
const isCompletedLate = (task: TaskItem) => {
  if (task.status !== 'SELESAI') return false;
  // If no due date, assume on time
  if (!task.calculatedDueDate) return false;
  // If no approved date recorded, assume on time
  if (!task.approvedAt) return false;

  // Compare actual approved date with due date
  const dueDate = new Date(task.calculatedDueDate);
  const approvedDate = new Date(task.approvedAt);

  // Task is late if it was approved after the due date
  return approvedDate > dueDate;
};

// Get actual task color based on status
// Red = SELESAI but late (overflowing target)
// Green = SELESAI on time
// Yellow = SEDANG_DIPROSES_USER (in progress)
// Pink/Magenta = MENUNGGU_REVIEW_PM
// Gray = MENUNGGU_PROSES_USER (not started, no bar shown)
const getActualTaskColor = (task: TaskItem) => {
  switch (task.status) {
    case 'SELESAI':
      // Check if completed late
      return isCompletedLate(task) ? 'bg-red-500' : 'bg-green-500';
    case 'SEDANG_DIPROSES_USER':
    case 'SEDANG_DIPROSES_USER_PAUSED':
      return 'bg-yellow-500';
    case 'MENUNGGU_REVIEW_PM':
      return 'bg-[#f465ff]';
    case 'MENUNGGU_PROSES_USER':
    default:
      return 'bg-gray-400';
  }
};

export default function GanttChartPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Memuat Gantt Chart...</div>}>
      <GanttChartContent />
    </Suspense>
  );
}

function GanttChartContent() {
  const searchParams = useSearchParams();
  const initialProjectId = useMemo(() => {
    const pId = searchParams?.get("projectId");
    if (pId) {
      const parsed = parseInt(pId);
      if (!isNaN(parsed)) return parsed;
    }
    return "";
  }, [searchParams]);

  // Date range state - filter 15 days before and 15 days after today (31 days total for data)
  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - 15);
  const defaultEnd = new Date(today);
  defaultEnd.setDate(today.getDate() + 15);

  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(defaultEnd);
  const dateRangeRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [filterProjectId, setFilterProjectId] = useState<number | "">(initialProjectId);
  const [filterPegawaiId, setFilterPegawaiId] = useState<number | "">("");

  // Sync projectId from URL search params if it changes
  useEffect(() => {
    if (initialProjectId !== "") {
      setFilterProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  // Data state
  const [projects, setProjects] = useState<Proyek[]>([]);
  const [pegawais, setPegawais] = useState<Pegawai[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<TaskItem | null>(null);

  // Filter collapse state for mobile
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  // Open detail modal
  const openDetail = (task: TaskItem) => {
    setDetailItem(task);
    setDetailOpen(true);
  };

  // Close detail modal
  const closeDetail = () => {
    setDetailOpen(false);
    setDetailItem(null);
  };

  // Initialize flatpickr for date range input
  useEffect(() => {
    if (dateRangeRef.current) {
      flatpickr(dateRangeRef.current, {
        mode: "range",
        dateFormat: "d/m/Y",
        defaultDate: [startDate, endDate],
        locale: {
          rangeSeparator: " - "
        },
        onChange: (dates) => {
          if (dates.length === 2) {
            setStartDate(dates[0]);
            setEndDate(dates[1]);
          }
        },
      });
    }
  }, []);

  // Load master data
  useEffect(() => {
    const load = async () => {
      try {
        const [pr, pe] = await Promise.all([
          fetch("/api/proyek?activeOnly=true", { credentials: 'include' }),
          fetch("/api/pegawai-basic", { credentials: 'include' })
        ]);

        if (pr.ok) {
          const data = await pr.json();
          if (data?.items) setProjects(data.items);
        }
        if (pe.ok) {
          const data = await pe.json();
          if (data?.items) setPegawais(data.items);
        }
      } catch (e) {
        console.error("Failed loading master data", e);
      }
    };
    load();
  }, []);

  // Load tasks based on filters using dedicated Gantt Chart API
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterProjectId) params.set('projectId', String(filterProjectId));
        if (filterPegawaiId) params.set('pegawaiId', String(filterPegawaiId));
        params.set('from', formatDateISO(startDate));
        params.set('to', formatDateISO(endDate));

        const res = await fetch(`/api/gantt-chart?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store'
        });

        if (res.ok) {
          const data = await res.json();
          setTasks(data?.items || []);
        }
      } catch (e) {
        console.error("Failed loading tasks", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filterProjectId, filterPegawaiId, startDate, endDate]);

  // Helper functions
  const formatDateISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Generate date columns
  const dateColumns = useMemo(() => {
    const cols: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      cols.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return cols;
  }, [startDate, endDate]);

  // Column width - calculated to show exactly 10 days in visible area
  const VISIBLE_DAYS = 10;
  const [colWidth, setColWidth] = useState(80); // Default width, will be recalculated

  // Calculate column width based on container size to show exactly 10 days
  useEffect(() => {
    const calculateColWidth = () => {
      if (timelineRef.current) {
        const containerWidth = timelineRef.current.clientWidth;
        // Each column should be containerWidth / 10 to show exactly 10 days
        const calculatedWidth = Math.floor(containerWidth / VISIBLE_DAYS);
        // Minimum 60px, maximum 120px per column
        setColWidth(Math.max(60, Math.min(120, calculatedWidth)));
      }
    };

    calculateColWidth();
    window.addEventListener('resize', calculateColWidth);
    return () => window.removeEventListener('resize', calculateColWidth);
  }, []);

  // Scroll to show today with 3 days before it (default view: 3 days before to 6 days after today)
  useEffect(() => {
    if (!loading && timelineRef.current && dateColumns.length > 0 && colWidth > 0) {
      // Find today's index in the date columns
      const todayStr = formatDateISO(new Date());
      let todayIdx = -1;
      for (let i = 0; i < dateColumns.length; i++) {
        if (formatDateISO(dateColumns[i]) === todayStr) {
          todayIdx = i;
          break;
        }
      }

      if (todayIdx >= 0) {
        // Scroll so that 3 days before today is at the left edge
        const scrollToIdx = Math.max(0, todayIdx - 3);
        timelineRef.current.scrollLeft = scrollToIdx * colWidth;
      }
    }
  }, [loading, dateColumns, colWidth]);

  // Helper to get the effective start date for a task (considering early start)
  const getTaskEffectiveStart = (task: TaskItem): string => {
    const scheduleStart = task.scheduleAt.substring(0, 10);
    const actualStart = task.startedAt?.substring(0, 10);

    // Use the earlier date between startedAt and scheduleAt
    if (actualStart && actualStart < scheduleStart) {
      return actualStart;
    }
    return scheduleStart;
  };

  // Helper to get the effective end date for a task (for overlap checking)
  const getTaskEffectiveEnd = (task: TaskItem): string => {
    const scheduleStart = task.scheduleAt.substring(0, 10);
    const targetEnd = task.calculatedDueDate?.substring(0, 10) || scheduleStart;

    // For completed tasks, use approvedAt
    if (task.status === 'SELESAI' && task.approvedAt) {
      const actualEnd = task.approvedAt.substring(0, 10);
      return targetEnd > actualEnd ? targetEnd : actualEnd;
    }

    // For in-progress tasks, use today's date
    if (task.status === 'SEDANG_DIPROSES_USER' || task.status === 'SEDANG_DIPROSES_USER_PAUSED') {
      const todayStr = new Date().toISOString().substring(0, 10);
      return targetEnd > todayStr ? targetEnd : todayStr;
    }

    // For waiting review, use today (still waiting)
    if (task.status === 'MENUNGGU_REVIEW_PM') {
      const todayStr = new Date().toISOString().substring(0, 10);
      return targetEnd > todayStr ? targetEnd : todayStr;
    }

    // For not started, use target end
    return targetEnd;
  };

  // Helper to check if two tasks overlap in time (considering both target and actual dates, including early starts)
  const tasksOverlap = (task1: TaskItem, task2: TaskItem) => {
    // Use effective start (can be earlier than schedule if startedAt exists)
    const start1 = getTaskEffectiveStart(task1);
    const end1 = getTaskEffectiveEnd(task1);

    const start2 = getTaskEffectiveStart(task2);
    const end2 = getTaskEffectiveEnd(task2);

    // Tasks overlap if one starts before the other ends
    return !(end1 < start2 || end2 < start1);
  };

  // Pack tasks into rows - tasks that don't overlap can share a row
  const packTasksIntoRows = (taskList: TaskItem[]): TaskItem[][] => {
    if (taskList.length === 0) return [];

    // Sort tasks by start date
    const sorted = [...taskList].sort((a, b) =>
      a.scheduleAt.localeCompare(b.scheduleAt)
    );

    const rows: TaskItem[][] = [];

    for (const task of sorted) {
      // Try to find an existing row where this task fits (no overlap)
      let placed = false;
      for (const row of rows) {
        const hasOverlap = row.some(existingTask => tasksOverlap(existingTask, task));
        if (!hasOverlap) {
          row.push(task);
          placed = true;
          break;
        }
      }

      // If no existing row works, create a new row
      if (!placed) {
        rows.push([task]);
      }
    }

    return rows;
  };

  // Group tasks by pegawai and pack into rows
  const tasksByPegawai = useMemo(() => {
    const grouped: Record<number, { pegawai: Pegawai; tasks: TaskItem[]; rows: TaskItem[][] }> = {};

    // Show all tasks including MENUNGGU_PROSES_USER
    const filteredTasks = tasks;

    filteredTasks.forEach(task => {
      if (!grouped[task.pegawaiId]) {
        grouped[task.pegawaiId] = {
          pegawai: { id: task.pegawaiId, namaLengkap: task.pegawaiNama || 'Unknown' },
          tasks: [],
          rows: []
        };
      }
      grouped[task.pegawaiId].tasks.push(task);
    });

    // Pack tasks into rows for each pegawai
    Object.values(grouped).forEach(group => {
      group.rows = packTasksIntoRows(group.tasks);
    });

    return Object.values(grouped);
  }, [tasks]);

  // Helper to get date string YYYY-MM-DD from Date object (local timezone)
  const toDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Helper to get date string from ISO string (extract date part)
  const isoToDateStr = (iso: string) => {
    return iso.substring(0, 10); // "2024-12-06T..." -> "2024-12-06"
  };

  // Find column index for a given date string
  const getColumnIndex = (dateStr: string) => {
    // First check if dateColumns is populated
    if (dateColumns.length === 0) return 0;

    const firstColDate = toDateStr(dateColumns[0]);
    const lastColDate = toDateStr(dateColumns[dateColumns.length - 1]);

    // If date is before range, return 0 (will be clamped)
    if (dateStr < firstColDate) return 0;
    // If date is after range, return last index
    if (dateStr > lastColDate) return dateColumns.length - 1;

    // Find exact match
    for (let i = 0; i < dateColumns.length; i++) {
      if (toDateStr(dateColumns[i]) === dateStr) {
        return i;
      }
    }

    // Fallback - shouldn't happen
    return 0;
  };

  // Gap between day columns (padding on each side of the bar)
  const DAY_GAP = 4; // 4px gap on each side = 8px total gap between adjacent bars

  // Calculate task position and width in PIXELS for TARGET bar (scheduleAt to calculatedDueDate)
  const getTaskStyle = (task: TaskItem) => {
    const taskStartStr = isoToDateStr(task.scheduleAt);
    const taskEndStr = task.calculatedDueDate ? isoToDateStr(task.calculatedDueDate) : taskStartStr;

    // Find column indices
    const startColIdx = Math.max(0, getColumnIndex(taskStartStr));
    const endColIdx = Math.min(dateColumns.length - 1, getColumnIndex(taskEndStr));

    // Width spans from start column to end column (inclusive), minus gaps
    const widthCols = Math.max(1, endColIdx - startColIdx + 1);
    const totalWidth = widthCols * colWidth - (DAY_GAP * 2); // Subtract gap from both sides

    // Ensure minimum width of at least 1 column
    const finalWidth = Math.max(colWidth - (DAY_GAP * 2), totalWidth);

    // Debug log to check date parsing
    if (task.kode && (task.kode.includes('01.01') || task.kode.includes('02.01') || task.kode.includes('03'))) {
      console.log('Task date debug:', {
        kode: task.kode,
        scheduleAt_raw: task.scheduleAt,
        scheduleAt_parsed: taskStartStr,
        calculatedDueDate_raw: task.calculatedDueDate,
        calculatedDueDate_parsed: taskEndStr,
        startColIdx,
        endColIdx,
        firstColDate: dateColumns.length > 0 ? toDateStr(dateColumns[0]) : 'N/A',
        colAtStartIdx: dateColumns[startColIdx] ? toDateStr(dateColumns[startColIdx]) : 'N/A'
      });
    }

    return {
      left: `${startColIdx * colWidth + DAY_GAP}px`, // Add gap offset from left
      width: `${finalWidth}px`,
      startColIdx,
      taskStartStr,
    };
  };

  // Calculate ACTUAL bar position and width in PIXELS based on real progress/completion
  // Returns { left, width, workWidth, reviewWidth } - can start before schedule and extend beyond due date
  // workWidth = solid part (programmer working), reviewWidth = striped part (PM review)
  const getActualBarStyle = (task: TaskItem, targetStyle: ReturnType<typeof getTaskStyle>) => {
    // For MENUNGGU_PROSES_USER, show nothing (only target bar visible)
    if (task.status === 'MENUNGGU_PROSES_USER') {
      return { left: '0px', width: '0px', workWidth: '0px', reviewWidth: '0px' };
    }

    // Determine actual start date - use startedAt if available, otherwise scheduleAt
    const actualStartStr = task.startedAt ? isoToDateStr(task.startedAt) : isoToDateStr(task.scheduleAt);
    const actualStartColIdx = getColumnIndex(actualStartStr);

    let actualEndColIdx: number;
    let submittedColIdx: number | null = null;

    // For completed tasks - show bar to approvedAt, split at submittedForReviewAt
    if (task.status === 'SELESAI' && task.approvedAt) {
      const approvedStr = isoToDateStr(task.approvedAt);
      actualEndColIdx = getColumnIndex(approvedStr);

      // Get submitted date to split the bar
      if (task.submittedForReviewAt) {
        const submittedStr = isoToDateStr(task.submittedForReviewAt);
        submittedColIdx = getColumnIndex(submittedStr);
      }
    }
    // For MENUNGGU_REVIEW_PM - show bar to today, split at submittedForReviewAt
    else if (task.status === 'MENUNGGU_REVIEW_PM') {
      const todayStr = toDateStr(new Date());
      actualEndColIdx = getColumnIndex(todayStr);

      // Get submitted date to split the bar
      if (task.submittedForReviewAt) {
        const submittedStr = isoToDateStr(task.submittedForReviewAt);
        submittedColIdx = getColumnIndex(submittedStr);
      }
    }
    // For in-progress tasks, show progress up to current date (all solid, no review part)
    else if (task.status === 'SEDANG_DIPROSES_USER' || task.status === 'SEDANG_DIPROSES_USER_PAUSED') {
      const todayStr = toDateStr(new Date());
      actualEndColIdx = getColumnIndex(todayStr);
    }
    // Default: no bar
    else {
      return { left: '0px', width: '0px', workWidth: '0px', reviewWidth: '0px' };
    }

    // Calculate total width and position
    const widthCols = Math.max(1, actualEndColIdx - actualStartColIdx + 1);
    const totalWidth = widthCols * colWidth - (DAY_GAP * 2);
    const leftPos = actualStartColIdx * colWidth + DAY_GAP;

    // Calculate work and review widths based on time proportion
    let workWidth = totalWidth;
    let reviewWidth = 0;

    if (submittedColIdx !== null && submittedColIdx >= actualStartColIdx) {
      // Calculate work duration (start to submitted)
      const workCols = Math.max(0, submittedColIdx - actualStartColIdx + 1);
      workWidth = workCols * colWidth - (DAY_GAP * 2);

      // Calculate review duration (submitted to end)
      const reviewCols = Math.max(0, actualEndColIdx - submittedColIdx);
      reviewWidth = reviewCols * colWidth;

      // Ensure total matches
      if (workWidth + reviewWidth > totalWidth) {
        reviewWidth = totalWidth - workWidth;
      }
    }

    return {
      left: `${leftPos}px`,
      width: `${totalWidth}px`,
      workWidth: `${Math.max(0, workWidth)}px`,
      reviewWidth: `${Math.max(0, reviewWidth)}px`,
    };
  };

  // Check if date is today
  const isToday = (d: Date) => {
    const t = new Date();
    return d.getDate() === t.getDate() &&
      d.getMonth() === t.getMonth() &&
      d.getFullYear() === t.getFullYear();
  };

  return (
    <div
      className="gantt-container-landscape bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-w-full flex flex-col"
      style={{ height: 'calc(100vh - 120px)' }}
    >
      {/* Fixed top section */}
      <div className="p-3 md:p-6 pb-0 flex-shrink-0">
        {/* Header */}
        <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-6">
          Gantt Chart - Task Management
        </h1>

        {/* Filters Card */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4 md:mb-6">
          {/* Filter Header - Collapsible on Mobile */}
          <button
            type="button"
            onClick={() => setFilterCollapsed(!filterCollapsed)}
            className="w-full flex items-center justify-between p-3 md:p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors lg:cursor-default lg:hover:bg-gray-50 lg:dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm md:text-base font-medium text-gray-900 dark:text-white">Filter</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform lg:hidden ${filterCollapsed ? '' : 'rotate-180'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Filter Content */}
          <div className={`${filterCollapsed ? 'hidden' : 'block'} lg:block p-3 md:p-4 pt-0 md:pt-4`}>
            <div className="flex flex-col md:flex-row md:flex-wrap gap-3 md:gap-4">
              {/* Range Tanggal */}
              <div className="flex flex-col w-full md:w-[260px]">
                <label className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">Rentang Tanggal:</label>
                <div className="relative">
                  <input
                    ref={dateRangeRef}
                    type="text"
                    className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 text-sm text-gray-900 dark:text-white"
                    placeholder="Pilih rentang tanggal"
                    readOnly
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Filter Proyek */}
              <div className="flex flex-col w-full md:w-[260px]">
                <label className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">Filter Proyek:</label>
                <Select2Field
                  value={filterProjectId}
                  onChange={(v) => setFilterProjectId(v === "" ? "" : Number(v))}
                  options={[
                    { id: "", text: "Semua Proyek" },
                    ...projects.map(p => ({ id: p.id, text: p.namaProyek }))
                  ]}
                  placeholder="Semua Proyek"
                />
              </div>

              {/* Filter Orang */}
              <div className="flex flex-col w-full md:w-[260px]">
                <label className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">Filter Orang:</label>
                <Select2Field
                  value={filterPegawaiId}
                  onChange={(v) => setFilterPegawaiId(v === "" ? "" : Number(v))}
                  options={[
                    { id: "", text: "Semua Orang" },
                    ...pegawais.map(p => ({ id: p.id, text: p.namaLengkap }))
                  ]}
                  placeholder="Semua Orang"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 md:gap-6 mb-4 md:mb-6 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 md:w-6 md:h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Sedang Dikerjakan</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 md:w-6 md:h-4 rounded" style={{ backgroundColor: '#f465ff' }}></div>
            <span className="text-gray-600 dark:text-gray-400">Menunggu Review</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 md:w-6 md:h-4 bg-green-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Selesai Tepat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 md:w-6 md:h-4 bg-red-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Terlambat</span>
          </div>
        </div>
      </div>

      {/* Gantt Chart - Takes remaining height */}
      <div
        className="gantt-content-landscape flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col mx-3 md:mx-6 mb-3 md:mb-6"
      >
        {/* Sticky Header Row */}
        <div className="flex w-full flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          {/* Tim Member Header */}
          <div className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 p-2 md:p-3 font-medium text-gray-700 dark:text-gray-300 h-[50px] w-[100px] min-w-[100px] md:w-[160px] md:min-w-[160px] flex items-center justify-center text-[13px] md:text-sm leading-tight">
            Tim Member
          </div>
          {/* Date Headers - scrolls with timeline */}
          <div
            className="overflow-hidden w-[calc(100%-100px)] md:w-[calc(100%-160px)]"
          >
            <div
              className="flex"
              style={{
                width: `${dateColumns.length * colWidth}px`,
                transform: `translateX(-${timelineRef.current?.scrollLeft || 0}px)`
              }}
              id="date-headers"
            >
              {dateColumns.map((date, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${colWidth}px`,
                    minWidth: `${colWidth}px`,
                  }}
                  className={`p-1 md:p-2 text-center text-[10px] md:text-sm border-r border-gray-200 dark:border-gray-700 last:border-r-0 h-[44px] flex items-center justify-center ${isToday(date)
                    ? 'bg-blue-500 text-white font-semibold'
                    : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
                    }`}
                >
                  {String(date.getDate()).padStart(2, '0')}/{String(date.getMonth() + 1).padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Content Area - vertical scroll here */}
        <div className="gantt-scrollable-landscape flex-1 overflow-y-auto overflow-x-hidden">
          <div className="flex w-full">
            {/* Fixed Left Column - Tim Member Names */}
            <div className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 w-[100px] min-w-[100px] md:w-[160px] md:min-w-[160px]">
              {/* Loading/Empty placeholder */}
              {loading && <div className="p-3 h-[100px]" />}
              {!loading && tasksByPegawai.length === 0 && <div className="p-3 h-[100px]" />}

              {/* Pegawai Names */}
              {!loading && tasksByPegawai.map(({ pegawai, rows }) => (
                <div
                  key={pegawai.id}
                  className="p-2 md:p-3 text-xs md:text-sm font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 last:border-b-0 break-words"
                  style={{ minHeight: `${Math.max(60, rows.length * 50 + 20)}px` }}
                >
                  {pegawai.namaLengkap}
                </div>
              ))}
            </div>

            {/* Scrollable Timeline Section - horizontal scroll */}
            <div
              ref={timelineRef}
              className="overflow-x-auto overflow-y-hidden scroll-smooth w-[calc(100%-100px)] md:w-[calc(100%-160px)]"
              style={{
                scrollSnapType: 'x mandatory'
              }}
              onScroll={(e) => {
                // Sync header scroll with timeline scroll
                const headers = document.getElementById('date-headers');
                if (headers) {
                  headers.style.transform = `translateX(-${e.currentTarget.scrollLeft}px)`;
                }
              }}
            >
              <div style={{ width: `${dateColumns.length * colWidth}px`, minWidth: `${dateColumns.length * colWidth}px` }}>
                {/* Loading State */}
                {loading && (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </div>
                )}

                {/* Empty State */}
                {!loading && tasksByPegawai.length === 0 && (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    Tidak ada task dalam rentang tanggal ini
                  </div>
                )}

                {/* Task Rows */}
                {!loading && tasksByPegawai.map(({ pegawai, rows }) => (
                  <div
                    key={pegawai.id}
                    className="relative bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                    style={{ minHeight: `${Math.max(60, rows.length * 50 + 20)}px` }}
                  >
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {dateColumns.map((date, idx) => (
                        <div
                          key={idx}
                          style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                          className={`border-r border-gray-100 dark:border-gray-800 last:border-r-0 h-full ${isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                        />
                      ))}
                    </div>

                    {/* Task Bars - packed into rows, Target bar stays at schedule, Actual bar can extend */}
                    <div className="absolute inset-0 py-1">
                      {rows.map((rowTasks, rowIdx) =>
                        rowTasks.map((task) => {
                          const targetStyle = getTaskStyle(task);
                          const actualBarStyle = getActualBarStyle(task, targetStyle);
                          const taskColor = getActualTaskColor(task);
                          const taskCode = task.kode || `#${task.id}`;
                          const taskName = task.keterangan || task.moduleNama || `Task #${task.id}`;
                          const formatDate = (dateStr: string) => {
                            const d = new Date(dateStr);
                            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                          };

                          const isLate = isCompletedLate(task);
                          const statusLabel = task.status === 'SELESAI'
                            ? (isLate ? 'Selesai (Terlambat)' : 'Selesai')
                            : task.status === 'SEDANG_DIPROSES_USER'
                              ? 'Sedang Dikerjakan'
                              : task.status === 'MENUNGGU_REVIEW_PM'
                                ? 'Menunggu Review'
                                : 'Menunggu Proses';

                          // Each ROW gets 50px: 32px for bar + 18px gap between rows
                          const topOffset = rowIdx * 50 + 10;

                          // Border color follows actual bar status
                          const borderColor = task.status === 'SELESAI'
                            ? (isLate ? '#ef4444' : '#16a34a') // Red if late, green if on-time
                            : task.status === 'SEDANG_DIPROSES_USER' || task.status === 'SEDANG_DIPROSES_USER_PAUSED'
                              ? '#ca8a04'
                              : task.status === 'MENUNGGU_REVIEW_PM'
                                ? '#c026d3'
                                : '#6b7280';

                          // Calculate wrapper dimensions
                          const targetLeft = parseInt(targetStyle.left);
                          const targetRight = targetLeft + parseInt(targetStyle.width);
                          const actualLeft = actualBarStyle.width !== '0px' ? parseInt(actualBarStyle.left) : targetLeft;
                          const actualRight = actualBarStyle.width !== '0px' ? actualLeft + parseInt(actualBarStyle.width) : targetRight;
                          const wrapperLeft = Math.min(targetLeft, actualLeft);
                          const wrapperRight = Math.max(targetRight, actualRight);
                          const wrapperWidth = wrapperRight - wrapperLeft;

                          return (
                            <React.Fragment key={task.id}>
                              {/* Wrapper container with unified border */}
                              <div
                                className="absolute pointer-events-none rounded"
                                style={{
                                  left: `${wrapperLeft}px`,
                                  width: `${wrapperWidth}px`,
                                  top: `${topOffset}px`,
                                  height: '32px',
                                  boxShadow: `0 0 1px 1.5px white, 0 0 1px 2.5px ${borderColor}`,
                                  zIndex: 3
                                }}
                              />

                              {/* Target bar (Rencana) - top half - striped blue */}
                              <div
                                className="absolute cursor-pointer rounded"
                                style={{
                                  left: targetStyle.left,
                                  width: targetStyle.width,
                                  top: `${topOffset}px`,
                                  height: '16px',
                                  zIndex: 2
                                }}
                                onClick={() => openDetail(task)}
                                title={`[${taskCode}] ${taskName}\nTarget: ${formatDate(task.scheduleAt)} - ${task.calculatedDueDate ? formatDate(task.calculatedDueDate) : 'N/A'}`}
                              >
                                <div className="w-full h-full bg-blue-400 gantt-stripes flex items-center px-1 text-xs text-blue-900 font-medium hover:shadow-md transition-shadow rounded">
                                  <span className="truncate block w-full opacity-80 text-[10px]">Target: {formatDate(task.scheduleAt)} - {task.calculatedDueDate ? formatDate(task.calculatedDueDate) : 'N/A'}</span>
                                </div>
                              </div>

                              {/* Actual progress bar - bottom half */}
                              {actualBarStyle.width !== '0px' && (
                                <div
                                  className="absolute cursor-pointer rounded"
                                  style={{
                                    left: actualBarStyle.left,
                                    width: actualBarStyle.width,
                                    top: `${topOffset + 16}px`,
                                    height: '16px',
                                    zIndex: 1
                                  }}
                                  onClick={() => openDetail(task)}
                                  title={`[${taskCode}] ${taskName}\nStatus: ${statusLabel}${task.startedAt ? `\nMulai: ${formatDate(task.startedAt)}` : ''}${task.submittedForReviewAt ? `\nSubmit Review: ${formatDate(task.submittedForReviewAt)}` : ''}${task.approvedAt ? `\nApproved: ${formatDate(task.approvedAt)}` : ''}${isLate ? '\n⚠️ Terlambat' : ''}`}
                                >
                                  <div className="relative w-full h-full hover:shadow-md transition-shadow overflow-hidden rounded">
                                    {/* Work part (solid) - programmer working time */}
                                    {actualBarStyle.workWidth !== '0px' && (
                                      <div
                                        className={`absolute left-0 top-0 h-full ${taskColor} flex items-center px-1 text-xs text-white font-medium`}
                                        style={{ width: actualBarStyle.workWidth }}
                                      >
                                        <span className="truncate block w-full text-[10px]">{taskCode} - {statusLabel}{isLate ? ' ⚠️' : ''}</span>
                                      </div>
                                    )}

                                    {/* Review part (striped) - PM review time */}
                                    {actualBarStyle.reviewWidth !== '0px' && (
                                      <div
                                        className={`absolute top-0 h-full gantt-stripes flex items-center px-1 text-xs text-white font-medium`}
                                        style={{
                                          left: actualBarStyle.workWidth,
                                          width: actualBarStyle.reviewWidth,
                                          backgroundColor: isLate ? '#ef4444' : '#22c55e'
                                        }}
                                      >
                                        <span className="truncate block w-full text-[10px]">Review</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal — view-only, reusable component */}
      <TaskViewModal
        isOpen={detailOpen}
        onClose={closeDetail}
        task={detailItem}
      />
    </div>
  );
}
