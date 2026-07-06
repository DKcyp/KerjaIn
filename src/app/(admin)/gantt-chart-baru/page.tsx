"use client";

import React, { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Select2Field from "@/components/form/Select2Field";
import TaskViewModal from "@/components/tasklist/TaskViewModal";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";

// Hierarchical Node structure for combined Tree + Gantt
interface HierarchicalNode {
  id: string;
  parentId: string | null;
  type: "module" | "submodule" | "task";
  name: string;             // For modules/submodules
  version: string;          // Version column
  keterangan: string;       // Task description
  scheduled: string;        // "YYYY-MM-DD"
  dueDate: string;          // "YYYY-MM-DD"
  realisasi: string;        // "YYYY-MM-DD" or empty
  status: string;           // "SELESAI", "SEDANG_DIPROSES_USER", "MENUNGGU_PROSES_USER"
  waktuPengerjaan: string;  // e.g. "225 hari 3 jam"
  lateness: string | null;  // e.g. "Lebih waktu 271 hari"
}
// Helper functions for default date range: 10th of this month to 10th of next month
const toDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const get10thOfThisMonth = (): Date => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 10);
};

const get10thOfNextMonth = (): Date => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 10);
};

const getToday = (): Date => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const get6DaysLater = (): Date => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6);
};

export default function GanttChartBaruPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <GanttChartBaruInner />
    </Suspense>
  );
}

function GanttChartBaruInner() {
  const [activeTab, setActiveTab] = useState<"project" | "pegawai">("project");
  const todayStr = useMemo(() => toDateStr(new Date()), []);

  // Shared Unified Filters
  const searchParams = useSearchParams();
  const [filterProjectId, setFilterProjectId] = useState<number | "">("");
  const [filterVersion, setFilterVersion] = useState<string>("");
  const [versions, setVersions] = useState<string[]>([]);
  const [filterStartDate, setFilterStartDate] = useState<Date>(getToday());
  const [filterEndDate, setFilterEndDate] = useState<Date>(get6DaysLater());
  const dateRangeRef = useRef<HTMLInputElement>(null);

  // Set project filter from URL query parameter
  useEffect(() => {
    const projectIdParam = searchParams.get("projectId");
    if (projectIdParam) {
      const projectId = parseInt(projectIdParam);
      if (!isNaN(projectId)) {
        setFilterProjectId(projectId);
      }
    }
  }, [searchParams]);

  // Load versions when project is selected
  useEffect(() => {
    const loadVersions = async () => {
      if (!filterProjectId) {
        setVersions([]);
        setFilterVersion("");
        return;
      }
      try {
        const res = await fetch(`/api/business-analyst?projectId=${filterProjectId}`, {
          credentials: "include",
          cache: "no-store"
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.items) {
            // Extract unique versions
            const uniqueVersions = [...new Set(data.items.map((ba: any) => ba.version))].filter(Boolean);
            setVersions(uniqueVersions as string[]);
          }
        }
      } catch (e) {
        console.error("Failed loading versions", e);
      }
    };
    loadVersions();
  }, [filterProjectId]);

  // Real Database States
  const [projects, setProjects] = useState<any[]>([]);
  const [pegawais, setPegawais] = useState<any[]>([]);
  const [dbModulesFlat, setDbModulesFlat] = useState<any[]>([]);
  const [dbTasks, setDbTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize flatpickr for date range input
  useEffect(() => {
    if (dateRangeRef.current) {
      flatpickr(dateRangeRef.current, {
        mode: "range",
        dateFormat: "d/m/Y",
        defaultDate: [filterStartDate, filterEndDate],
        locale: {
          rangeSeparator: " - "
        },
        onChange: (dates, dateStr, instance) => {
          if (dates.length === 2) {
            let start = dates[0];
            let end = dates[1];
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
            if (diffDays > 7) {
              end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
              instance.setDate([start, end], true);
            }
            setFilterStartDate(start);
            setFilterEndDate(end);
          }
        },
      });
    }
  }, [activeTab]);

  // Load Proyek and Pegawai list options once on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const resP = await fetch("/api/proyek?activeOnly=true", { cache: "no-store", credentials: "include" });
        if (resP.ok) {
          const d = await resP.json();
          const items = d?.items || [];
          setProjects(items);
        }
        const resE = await fetch("/api/pegawai-basic", { cache: "no-store", credentials: "include" });
        if (resE.ok) {
          const d = await resE.json();
          setPegawais(d?.items || []);
        }
      } catch (err) {
        console.error("Failed to load options", err);
      }
    };
    loadFilters();
  }, []);

  // Load data based on active tab
  useEffect(() => {
    const loadProjectData = async () => {
      setLoading(true);
      try {
        if (activeTab === "project") {
          if (!filterProjectId) {
            setDbModulesFlat([]);
            setDbTasks([]);
            setLoading(false);
            return;
          }
          // 1. Load Modules
          const resM = await fetch(`/api/proyek-modules/${filterProjectId}/tree`, { cache: "no-store", credentials: "include" });
          let flatMods: any[] = [];
          if (resM.ok) {
            const d = await resM.json();

            const flattenTree = (nodes: any[], parent: number | string = 0, depth: number = 0): any[] => {
              const result: any[] = [];
              nodes.forEach((node) => {
                result.push({
                  id: node.id,
                  parent,
                  text: node.nama,
                  depth,
                  kode: node.kode,
                  version: node.version,
                  baVersion: node.baVersion
                });
                if (node.children && node.children.length > 0) {
                  result.push(...flattenTree(node.children, node.id, depth + 1));
                }
              });
              return result;
            };

            flatMods = flattenTree(d?.tree || []);
            setDbModulesFlat(flatMods);

            // Collapse all by default (empty set to show summary progress bars)
            const expanded = new Set<string>();
            setExpandedModules(expanded);
          }

          // 2. Load Tasks (using the main API supporting date filtering) - wide range for projects
          const params = new URLSearchParams();
          params.set("projectId", String(filterProjectId));
          params.set("from", "2020-01-01");
          params.set("to", "2030-12-31");

          const resT = await fetch(`/api/gantt-chart?${params.toString()}`, { cache: "no-store", credentials: "include" });
          if (resT.ok) {
            const d = await resT.json();
            setDbTasks(d?.items || []);
          }
        } else {
          // activeTab === "pegawai"
          // Load Tasks for Pegawai workload (date-bounded, no project filter)
          setDbModulesFlat([]);
          const params = new URLSearchParams();
          params.set("from", toDateStr(filterStartDate));
          params.set("to", toDateStr(filterEndDate));

          const resT = await fetch(`/api/gantt-chart?${params.toString()}`, { cache: "no-store", credentials: "include" });
          if (resT.ok) {
            const d = await resT.json();
            setDbTasks(d?.items || []);
          }
        }
      } catch (err) {
        console.error("Failed to load project details", err);
      } finally {
        setLoading(false);
      }
    };
    loadProjectData();
  }, [activeTab, filterProjectId, filterStartDate, filterEndDate]);

  // Convert real database modules & tasks to 3-level tree nodes structure
  const hierarchicalNodes = useMemo<HierarchicalNode[]>(() => {
    const nodes: HierarchicalNode[] = [];

    // Group tasks by module
    const tasksByModule: Record<number, any[]> = {};
    dbTasks.forEach(task => {
      const mid = task.moduleId;
      if (!tasksByModule[mid]) tasksByModule[mid] = [];
      tasksByModule[mid].push(task);
    });

    dbModulesFlat.forEach(mod => {
      const isRoot = mod.depth === 0;
      const type = isRoot ? "module" : "submodule";
      const idPrefix = isRoot ? "mod-" : "sub-";

      const parentId = mod.parent && mod.parent !== 0
        ? (dbModulesFlat.find(p => p.id === mod.parent)?.depth === 0 ? `mod-${mod.parent}` : `sub-${mod.parent}`)
        : null;

      // Add Module/Submodule header node
      nodes.push({
        id: `${idPrefix}${mod.id}`,
        parentId,
        type,
        name: mod.text,
        version: mod.baVersion || mod.version || "",
        keterangan: "",
        scheduled: "",
        dueDate: "",
        realisasi: "",
        status: "",
        waktuPengerjaan: "",
        lateness: null
      });

      // Add tasks under this Module/Submodule
      const modTasks = tasksByModule[mod.id] || [];
      modTasks.forEach(task => {
        // Calculate late warning and duration
        let lateness: string | null = null;
        let waktuPengerjaan = "-";

        if (task.startedAt) {
          const end = task.approvedAt ? new Date(task.approvedAt) : new Date();
          const diffMs = end.getTime() - new Date(task.startedAt).getTime();
          if (diffMs > 0) {
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            waktuPengerjaan = diffDays > 0 ? `${diffDays} hari ${diffHours} jam` : `${diffHours} jam`;
          }
        }

        if (task.calculatedDueDate) {
          const checkDate = task.approvedAt ? new Date(task.approvedAt) : new Date();
          const due = new Date(task.calculatedDueDate);
          if (checkDate > due) {
            const diffMs = checkDate.getTime() - due.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            lateness = `Lebih waktu ${diffDays} hari`;
          }
        }

        nodes.push({
          id: `task-${task.id}`,
          parentId: `${idPrefix}${mod.id}`,
          type: "task",
          name: "",
          version: task.kode || "",
          keterangan: task.keterangan || "Tanpa deskripsi",
          scheduled: task.scheduleAt ? task.scheduleAt.substring(0, 10) : "",
          dueDate: task.calculatedDueDate ? task.calculatedDueDate.substring(0, 10) : "",
          realisasi: task.approvedAt ? task.approvedAt.substring(0, 10) : "",
          status: task.status,
          waktuPengerjaan,
          lateness
        });
      });
    });

    return nodes;
  }, [dbModulesFlat, dbTasks]);


  // Collapsible nodes state
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Detail Modal State
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const rightGridRef = useRef<HTMLDivElement>(null);
  const rightHeaderRef = useRef<HTMLDivElement>(null);
  const pegawaiTimelineRef = useRef<HTMLDivElement>(null);

  // Generate Date Range dynamically based on filters/active tab
  const dateColumns = useMemo(() => {
    const dates: Date[] = [];
    let start: Date;
    let end: Date;

    if (activeTab === "project") {
      // Show exactly 1 month range (15 days before today to 15 days after today)
      const today = new Date();
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15);
      end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15);
    } else {
      // activeTab === "pegawai"
      start = filterStartDate ? new Date(filterStartDate) : getToday();
      end = filterEndDate ? new Date(filterEndDate) : get6DaysLater();
    }

    const current = new Date(start);
    let limit = 0;
    // Limit to max 60 columns to prevent browser lag
    while (current <= end && limit < 60) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
      limit++;
    }
    return dates;
  }, [activeTab, filterStartDate, filterEndDate]);

  const [colWidth, setColWidth] = useState(80);

  // Recalculate column width dynamically
  useEffect(() => {
    const calculateColWidth = () => {
      if (activeTab === "project" && rightGridRef.current) {
        const containerWidth = rightGridRef.current.clientWidth;
        const calculatedWidth = Math.floor(containerWidth / 10);
        setColWidth(Math.max(60, Math.min(180, calculatedWidth)));
      } else if (activeTab === "pegawai" && pegawaiTimelineRef.current) {
        const containerWidth = Math.max(1200, pegawaiTimelineRef.current.clientWidth) - 180;
        const calculatedWidth = Math.floor(containerWidth / 7);
        setColWidth(Math.max(80, calculatedWidth));
      }
    };
    calculateColWidth();
    const timer = setTimeout(calculateColWidth, 100);
    window.addEventListener("resize", calculateColWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculateColWidth);
    };
  }, [activeTab, dateColumns.length]);

  // Auto-scroll to show today's timeline centered
  useEffect(() => {
    if (!loading && rightGridRef.current && dateColumns.length > 0 && colWidth > 0) {
      const todayStr = toDateStr(new Date());
      let todayIdx = -1;
      for (let i = 0; i < dateColumns.length; i++) {
        if (toDateStr(dateColumns[i]) === todayStr) {
          todayIdx = i;
          break;
        }
      }
      if (todayIdx >= 0) {
        const scrollToIdx = Math.max(0, todayIdx - 3);
        rightGridRef.current.scrollLeft = scrollToIdx * colWidth;
      }
    }
  }, [loading, dateColumns, colWidth]);

  const toggleModule = (id: string) => {
    const next = new Set(expandedModules);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedModules(next);
  };

  // Get summary for a collapsed module/submodule from its descendant tasks
  const getNodeSummary = (nodeId: string) => {
    const getAllDescendantTaskIds = (id: string): HierarchicalNode[] => {
      const directChildren = hierarchicalNodes.filter(n => n.parentId === id);
      let tasks: HierarchicalNode[] = [];
      directChildren.forEach(child => {
        if (child.type === "task") {
          tasks.push(child);
        } else {
          tasks = tasks.concat(getAllDescendantTaskIds(child.id));
        }
      });
      return tasks;
    };

    const childTasks = getAllDescendantTaskIds(nodeId);
    if (childTasks.length === 0) return null;

    const completedTasks = childTasks.filter(t => t.status === "SELESAI").length;
    const percentage = Math.round((completedTasks / childTasks.length) * 100);

    // Earliest scheduled date
    const scheduledDates = childTasks
      .map(t => t.scheduled)
      .filter(Boolean)
      .map(d => new Date(d).getTime());
    const earliestScheduled = scheduledDates.length > 0
      ? new Date(Math.min(...scheduledDates)).toISOString().substring(0, 10)
      : "";

    // Latest due date
    const dueDates = childTasks
      .map(t => t.dueDate)
      .filter(Boolean)
      .map(d => new Date(d).getTime());
    const latestDueDate = dueDates.length > 0
      ? new Date(Math.max(...dueDates)).toISOString().substring(0, 10)
      : "";

    // Latest realisasi
    const realizationDates = childTasks
      .map(t => t.realisasi)
      .filter(Boolean)
      .map(d => new Date(d).getTime());
    const latestRealisasi = realizationDates.length > 0
      ? new Date(Math.max(...realizationDates)).toISOString().substring(0, 10)
      : "";

    return {
      taskCount: childTasks.length,
      completedCount: completedTasks,
      percentage,
      earliestScheduled,
      latestDueDate,
      latestRealisasi,
    };
  };


  // Filter and compute tree list nodes visibility
  const visibleNodes = useMemo(() => {
    const isNodeVisible = (node: HierarchicalNode): boolean => {
      let cur = node;
      while (cur.parentId) {
        const parent = hierarchicalNodes.find(n => n.id === cur.parentId);
        if (!parent) return true;
        if (!expandedModules.has(parent.id)) return false;
        cur = parent;
      }
      return true;
    };

    return hierarchicalNodes.filter(isNodeVisible).filter(node => {
      if (filterVersion && node.version !== filterVersion) {
        if (node.type === "task") return false;
      }
      return true;
    });
  }, [hierarchicalNodes, expandedModules, filterVersion]);

  // Group Pegawai and pack tasks into rows
  const groupedPegawaiTasks = useMemo(() => {
    const groups: Record<number, { pegawaiNama: string; tasks: any[] }> = {};
    dbTasks.forEach((task) => {
      if (!groups[task.pegawaiId]) {
        groups[task.pegawaiId] = { pegawaiNama: task.pegawaiNama, tasks: [] };
      }
      groups[task.pegawaiId].tasks.push(task);
    });

    return Object.entries(groups).map(([pegawaiId, group]) => {
      const rows: any[][] = [];
      group.tasks.forEach((task) => {
        let placed = false;
        for (const row of rows) {
          const overlaps = row.some((et) => {
            const s1 = et.scheduleAt ? et.scheduleAt.substring(0, 10) : "";
            const e1 = et.calculatedDueDate ? et.calculatedDueDate.substring(0, 10) : s1;
            const s2 = task.scheduleAt ? task.scheduleAt.substring(0, 10) : "";
            const e2 = task.calculatedDueDate ? task.calculatedDueDate.substring(0, 10) : s2;
            return !(e1 < s2 || e2 < s1);
          });
          if (!overlaps) {
            row.push(task);
            placed = true;
            break;
          }
        }
        if (!placed) {
          rows.push([task]);
        }
      });
      return {
        pegawaiId: Number(pegawaiId),
        pegawaiNama: group.pegawaiNama,
        rows,
      };
    });
  }, [dbTasks]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (rightHeaderRef.current && rightGridRef.current) {
      rightHeaderRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const isoToDateStr = (iso: string) => {
    if (!iso) return "";
    return iso.substring(0, 10);
  };

  const getColumnIndex = (dateStr: string) => {
    if (dateColumns.length === 0) return 0;
    const firstColDate = toDateStr(dateColumns[0]);
    const lastColDate = toDateStr(dateColumns[dateColumns.length - 1]);

    if (dateStr < firstColDate) return 0;
    if (dateStr > lastColDate) return dateColumns.length - 1;

    for (let i = 0; i < dateColumns.length; i++) {
      if (toDateStr(dateColumns[i]) === dateStr) {
        return i;
      }
    }
    return 0;
  };

  const DAY_GAP = 4;

  const getTaskStyle = (task: any) => {
    const taskStartStr = isoToDateStr(task.scheduleAt);
    const taskEndStr = task.calculatedDueDate ? isoToDateStr(task.calculatedDueDate) : taskStartStr;

    if (dateColumns.length > 0) {
      const firstColDate = toDateStr(dateColumns[0]);
      const lastColDate = toDateStr(dateColumns[dateColumns.length - 1]);
      
      const actualStartStr = task.startedAt ? isoToDateStr(task.startedAt) : taskStartStr;
      const actualEndStr = task.approvedAt ? isoToDateStr(task.approvedAt) : (task.submittedForReviewAt ? isoToDateStr(task.submittedForReviewAt) : actualStartStr);

      const minDateStr = taskStartStr < actualStartStr ? taskStartStr : actualStartStr;
      const maxDateStr = taskEndStr > actualEndStr ? taskEndStr : actualEndStr;

      if (maxDateStr < firstColDate || minDateStr > lastColDate) {
        return {
          left: "0px",
          width: "0px",
          startColIdx: -1,
          taskStartStr,
          outOfRange: true,
        };
      }
    }

    const startColIdx = Math.max(0, getColumnIndex(taskStartStr));
    const endColIdx = Math.min(dateColumns.length - 1, getColumnIndex(taskEndStr));

    const widthCols = Math.max(1, endColIdx - startColIdx + 1);
    const totalWidth = widthCols * colWidth - (DAY_GAP * 2);
    const finalWidth = Math.max(colWidth - (DAY_GAP * 2), totalWidth);

    return {
      left: `${startColIdx * colWidth + DAY_GAP}px`,
      width: `${finalWidth}px`,
      startColIdx,
      taskStartStr,
    };
  };

  const getActualBarStyle = (task: any) => {
    if (task.status === 'MENUNGGU_PROSES_USER') {
      return { left: '0px', width: '0px', workWidth: '0px', reviewWidth: '0px' };
    }

    const actualStartStr = task.startedAt ? isoToDateStr(task.startedAt) : isoToDateStr(task.scheduleAt);
    const actualStartColIdx = getColumnIndex(actualStartStr);

    let actualEndColIdx: number;
    let submittedColIdx: number | null = null;

    if (task.status === 'SELESAI' && task.approvedAt) {
      const approvedStr = isoToDateStr(task.approvedAt);
      actualEndColIdx = getColumnIndex(approvedStr);

      if (task.submittedForReviewAt) {
        const submittedStr = isoToDateStr(task.submittedForReviewAt);
        submittedColIdx = getColumnIndex(submittedStr);
      }
    }
    else if (task.status === 'MENUNGGU_REVIEW_PM') {
      const todayStr = toDateStr(new Date());
      actualEndColIdx = getColumnIndex(todayStr);

      if (task.submittedForReviewAt) {
        const submittedStr = isoToDateStr(task.submittedForReviewAt);
        submittedColIdx = getColumnIndex(submittedStr);
      }
    }
    else if (task.status === 'SEDANG_DIPROSES_USER' || task.status === 'SEDANG_DIPROSES_USER_PAUSED') {
      const todayStr = toDateStr(new Date());
      actualEndColIdx = getColumnIndex(todayStr);
    }
    else {
      return { left: '0px', width: '0px', workWidth: '0px', reviewWidth: '0px' };
    }

    const widthCols = Math.max(1, actualEndColIdx - actualStartColIdx + 1);
    const totalWidth = widthCols * colWidth - (DAY_GAP * 2);
    const leftPos = actualStartColIdx * colWidth + DAY_GAP;

    let workWidth = totalWidth;
    let reviewWidth = 0;

    if (submittedColIdx !== null && submittedColIdx >= actualStartColIdx) {
      const workCols = Math.max(0, submittedColIdx - actualStartColIdx + 1);
      workWidth = workCols * colWidth - (DAY_GAP * 2);

      const reviewCols = Math.max(0, actualEndColIdx - submittedColIdx);
      reviewWidth = reviewCols * colWidth;

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

  return (
    <div className="space-y-6 p-1">
      {/* Premium Minimal Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Gantt Chart - Combined View
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Visualisasi timeline progress modul dan alokasi workload pegawai.</p>
        </div>

        {/* Prominent Tab Selectors */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full md:w-auto">
          <button
            onClick={() => setActiveTab("project")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 ${
              activeTab === "project"
                ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Gantt Chart Project
          </button>
          <button
            onClick={() => setActiveTab("pegawai")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 ${
              activeTab === "pegawai"
                ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Gantt Chart Pegawai
          </button>
        </div>
      </div>

      {/* Shared Filters Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-250 dark:border-gray-800 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-extrabold text-gray-800 dark:text-white">Filter</span>
        </div>
        {activeTab === "project" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Filter Proyek */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-650 dark:text-gray-400 block">
                Proyek:
              </label>
              <Select2Field
                value={filterProjectId}
                onChange={(v) => setFilterProjectId(v === "" ? "" : Number(v))}
                options={[
                  { id: "", text: "-- Pilih Proyek --" },
                  ...projects.map(p => ({ id: p.id, text: p.namaProyek }))
                ]}
                placeholder="Pilih Proyek"
              />
            </div>

            {/* Filter Version */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-650 dark:text-gray-400 block">
                Version:
              </label>
              <Select2Field
                value={filterVersion}
                onChange={(v) => setFilterVersion(String(v))}
                options={[
                  { id: "", text: "-- Semua Version --" },
                  ...versions.map(v => ({ id: v, text: v }))
                ]}
                placeholder="Pilih Versi"
                disabled={!filterProjectId}
              />
            </div>
          </div>
        ) : (
          <div className="max-w-md space-y-1.5">
            {/* Filter Rentang Tanggal */}
            <label className="text-xs font-bold text-gray-650 dark:text-gray-400 block">
              Rentang Tanggal (Maksimal 7 Hari):
            </label>
            <div className="relative">
              <input
                ref={dateRangeRef}
                type="text"
                className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 pr-10 text-sm text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Pilih rentang tanggal"
                readOnly
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs font-semibold px-1">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-blue-400 gantt-stripes block border border-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">Target</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-yellow-500 block" />
          <span className="text-gray-600 dark:text-gray-400">Dikerjakan</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-purple-500 block" />
          <span className="text-gray-600 dark:text-gray-400">Review</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-green-500 block" />
          <span className="text-gray-600 dark:text-gray-400">Tepat</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-red-500 block" />
          <span className="text-gray-600 dark:text-gray-400">Terlambat</span>
        </div>
      </div>

      {/* Loading overlay / spinner */}
      {loading && (
        <div className="flex items-center justify-center py-10 gap-3 bg-blue-50/10 dark:bg-blue-900/5 rounded-2xl border border-blue-100/10 shadow-sm animate-pulse">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Memuat data modul & task list...</span>
        </div>
      )}

      {/* Empty State warning */}
      {!loading && activeTab === "project" && hierarchicalNodes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-50 dark:bg-gray-850 rounded-2xl border border-gray-150 dark:border-gray-800 text-center">
          <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-sm font-extrabold text-gray-800 dark:text-white">Tidak ada data untuk proyek ini</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            Proyek yang Anda pilih belum memiliki modul ataupun daftar tugas yang terjadwal dalam rentang tanggal filter saat ini.
          </p>
        </div>
      )}

      {/* Tab 1 Content: Project Timeline (Combined Left Tree & Right Timeline) */}
      {!loading && hierarchicalNodes.length > 0 && activeTab === "project" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
          {/* Main Grid Wrapper */}
          <div className="flex w-full overflow-hidden">
            
            {/* LEFT SIDE: Collapsible Tree Table Info (35% width, horizontally scrollable) */}
            <div className="w-[35%] min-w-0 flex-shrink-0 overflow-x-auto border-r border-gray-200 dark:border-gray-850">
              <div className="w-full">
                {/* Header Columns */}
                <div className="flex gap-1 px-3 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase h-[48px] items-center">
                  <div className="flex-1 min-w-[180px] flex-shrink-0">Modul / Pekerjaan</div>
                  <div className="w-[75px] min-w-[75px] flex-shrink-0 text-center">Version</div>
                  <div className="w-[110px] min-w-[110px] flex-shrink-0 text-center">Kode Tasklist</div>
                </div>

                {/* Body Rows */}
                <div className="divide-y divide-gray-150 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {visibleNodes.map((node) => {
                    const isExpanded = expandedModules.has(node.id);
                    const isModule = node.type === "module";
                    const isSubmodule = node.type === "submodule";
                    const canCollapse = isModule || isSubmodule;
                    // When collapsed, compute summary from descendant tasks
                    const summary = canCollapse && !isExpanded ? getNodeSummary(node.id) : null;

                    return (
                      <div
                        key={node.id}
                        className={`flex gap-1 px-3 py-3 items-center min-h-[52px] text-xs ${
                          isModule ? "bg-blue-50/20 dark:bg-blue-900/5" : isSubmodule ? "bg-gray-50/40 dark:bg-gray-800/10" : ""
                        }`}
                      >
                        {/* Modul tree name column */}
                        <div className="flex-1 min-w-[180px] flex-shrink-0 flex items-center gap-1 min-w-0">
                          {isModule && (
                            <button
                              onClick={() => toggleModule(node.id)}
                              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 text-[9px] mr-1 w-3 flex-shrink-0 font-bold"
                            >
                              {isExpanded ? "▼" : "▶"}
                            </button>
                          )}
                          {isSubmodule && (
                            <div className="flex items-center min-w-0" style={{ paddingLeft: "10px" }}>
                              <span className="text-gray-300 dark:text-gray-600 font-mono mr-1">└─</span>
                              <button
                                onClick={() => toggleModule(node.id)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-[9px] mr-1 w-3 flex-shrink-0"
                              >
                                {isExpanded ? "▼" : "▶"}
                              </button>
                            </div>
                          )}
                          {!isModule && !isSubmodule && (
                            <div className="w-[30px] flex-shrink-0" />
                          )}

                          <div className="flex flex-col min-w-0">
                            <span className={`truncate font-bold ${
                              isModule ? "text-blue-700 dark:text-blue-300" : isSubmodule ? "text-gray-900 dark:text-white" : "text-gray-500"
                            }`} title={isModule || isSubmodule ? node.name : node.keterangan}>
                              {isModule || isSubmodule ? node.name : node.keterangan}
                            </span>
                            {/* Show percentage badge when collapsed and has tasks */}
                            {summary && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" style={{ width: '60px' }}>
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${summary.percentage}%`,
                                      backgroundColor: summary.percentage === 100 ? '#22c55e' : summary.percentage > 50 ? '#3b82f6' : '#f59e0b'
                                    }}
                                  />
                                </div>
                                <span className="text-[9px] font-bold" style={{
                                  color: summary.percentage === 100 ? '#16a34a' : summary.percentage > 50 ? '#2563eb' : '#d97706'
                                }}>
                                  {summary.percentage}%
                                </span>
                                <span className="text-[9px] text-gray-400">({summary.completedCount}/{summary.taskCount})</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Version - show from node or hint from summary */}
                        <div className="w-[75px] min-w-[75px] flex-shrink-0 text-center font-mono text-[11px] text-gray-600 dark:text-gray-400">
                          {isModule || isSubmodule ? (node.version || (summary ? "—" : "")) : "—"}
                        </div>

                        {/* Kode Tasklist */}
                        <div className="w-[110px] min-w-[110px] flex-shrink-0 text-center font-mono text-[11px] text-gray-655 dark:text-gray-400 font-bold">
                          {!isModule && !isSubmodule ? (node.version || "—") : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Horizontally Scrollable Timeline Grid (65% width) */}
            <div className="w-[65%] min-w-0 flex-shrink-0 overflow-hidden flex flex-col bg-white dark:bg-gray-900">
              
              {/* Header Days Scroll synchronized */}
              <div
                ref={rightHeaderRef}
                className="overflow-x-hidden border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex" style={{ width: `${dateColumns.length * colWidth}px` }}>
                  {dateColumns.map((date, idx) => {
                    const isToday = toDateStr(date) === todayStr;
                    return (
                      <div
                        key={idx}
                        style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                        className={`text-center py-3 text-[10px] font-bold border-r border-gray-200 dark:border-gray-700 flex flex-col justify-center h-[48px] ${
                          isToday
                            ? "bg-blue-600 text-white font-extrabold"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        <span>{String(date.getDate()).padStart(2, "0")}/{String(date.getMonth() + 1).padStart(2, "0")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable Timeline body grid */}
              <div
                ref={rightGridRef}
                onScroll={handleScroll}
                className="overflow-x-auto overflow-y-hidden divide-y divide-gray-150 dark:divide-gray-800"
              >
                <div style={{ width: `${dateColumns.length * colWidth}px` }} className="relative">
                  
                  {/* Grid background lines */}
                  {/* Grid background lines */}
                  {visibleNodes.map((node) => {
                    const isExpanded = expandedModules.has(node.id);
                    const isModule = node.type === "module";
                    const isSubmodule = node.type === "submodule";
                    const canCollapse = isModule || isSubmodule;
                    const summary = canCollapse && !isExpanded ? getNodeSummary(node.id) : null;

                    return (
                      <div
                        key={node.id}
                        className="flex relative h-[52px] w-full"
                      >
                        {/* Day Cell Borders */}
                        {dateColumns.map((date, idx) => {
                          const isToday = toDateStr(date) === todayStr;
                          return (
                            <div
                              key={idx}
                              style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                              className={`border-r border-gray-100 dark:border-gray-800/40 h-full flex-shrink-0 ${
                                isToday ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                              }`}
                            />
                          );
                        })}

                        {/* Gantt Bar inside row */}
                        {(() => {
                          let taskForBar: any = null;

                          if (node.type === "task") {
                            const taskId = node.id.replace("task-", "");
                            const rawTask = dbTasks.find((t) => String(t.id) === taskId);
                            if (rawTask) {
                              taskForBar = rawTask;
                            }
                          } else if (summary) {
                            // Synthesize task for collapsed module/submodule
                            const isLate = summary.latestRealisasi && summary.latestDueDate && new Date(summary.latestRealisasi) > new Date(summary.latestDueDate);
                            taskForBar = {
                              id: node.id,
                              projectId: filterProjectId,
                              scheduleAt: summary.earliestScheduled,
                              calculatedDueDate: summary.latestDueDate,
                              startedAt: summary.earliestScheduled,
                              approvedAt: summary.latestRealisasi,
                              status: summary.percentage === 100 ? "SELESAI" : summary.percentage > 0 ? "SEDANG_DIPROSES_USER" : "MENUNGGU_PROSES_USER",
                              kode: node.name,
                              keterangan: `${node.name} Summary`,
                              isSummary: true,
                              lateness: isLate ? "Late" : null
                            };
                          }

                          if (!taskForBar || !taskForBar.scheduleAt) return null;

                          const targetStyle = getTaskStyle(taskForBar);
                          if (targetStyle.outOfRange) return null;
                          const actualBarStyle = getActualBarStyle(taskForBar);

                          const isLate = taskForBar.approvedAt && taskForBar.calculatedDueDate && new Date(taskForBar.approvedAt) > new Date(taskForBar.calculatedDueDate);
                          const statusLabel = taskForBar.status === "SELESAI"
                            ? (isLate ? "Terlambat" : "Selesai")
                            : taskForBar.status === "SEDANG_DIPROSES_USER" || taskForBar.status === "SEDANG_DIPROSES_USER_PAUSED"
                              ? (taskForBar.isSummary ? `${summary?.percentage}%` : "Diproses")
                              : taskForBar.status === "MENUNGGU_REVIEW_PM"
                                ? "Review"
                                : "Menunggu";

                          const topOffset = 10; // fixed centering offset within 52px row height

                          // Border color follows actual bar status
                          const borderColor = taskForBar.status === "SELESAI"
                            ? (isLate ? "#ef4444" : "#16a34a")
                            : taskForBar.status === "SEDANG_DIPROSES_USER" || taskForBar.status === "SEDANG_DIPROSES_USER_PAUSED"
                              ? "#ca8a04"
                              : taskForBar.status === "MENUNGGU_REVIEW_PM"
                                ? "#c026d3"
                                : "#6b7280";

                          // Task Color class
                          const taskColor = taskForBar.status === "SELESAI"
                            ? (isLate ? "bg-red-500" : "bg-green-500")
                            : taskForBar.status === "SEDANG_DIPROSES_USER" || taskForBar.status === "SEDANG_DIPROSES_USER_PAUSED"
                              ? "bg-yellow-500 text-yellow-950 font-bold"
                              : taskForBar.status === "MENUNGGU_REVIEW_PM"
                                ? "bg-purple-500"
                                : "bg-gray-400";

                          // Calculate wrapper dimensions
                          const targetLeft = parseInt(targetStyle.left);
                          const targetRight = targetLeft + parseInt(targetStyle.width);
                          const actualLeft = actualBarStyle.width !== "0px" ? parseInt(actualBarStyle.left) : targetLeft;
                          const actualRight = actualBarStyle.width !== "0px" ? actualLeft + parseInt(actualBarStyle.width) : targetRight;
                          const wrapperLeft = Math.min(targetLeft, actualLeft);
                          const wrapperRight = Math.max(targetRight, actualRight);
                          const wrapperWidth = wrapperRight - wrapperLeft;

                          const formattedTargetText = `Target: ${formatDateShort(taskForBar.scheduleAt)} - ${taskForBar.calculatedDueDate ? formatDateShort(taskForBar.calculatedDueDate) : "N/A"}`;

                          const handleBarClick = () => {
                            if (taskForBar.isSummary) {
                              const next = new Set(expandedModules);
                              next.add(node.id);
                              setExpandedModules(next);
                            } else {
                              setSelectedTask(taskForBar);
                              setDetailOpen(true);
                            }
                          };

                          return (
                            <React.Fragment key={node.id}>
                              {/* Wrapper container with unified border */}
                              <div
                                className="absolute pointer-events-none rounded border border-dashed border-gray-300 dark:border-gray-700"
                                style={{
                                  left: `${wrapperLeft}px`,
                                  width: `${wrapperWidth}px`,
                                  top: `${topOffset}px`,
                                  height: "32px",
                                  boxShadow: `0 0 1px 1.5px white, 0 0 1px 2px ${borderColor}`,
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
                                  height: "16px",
                                  zIndex: 2
                                }}
                                onClick={handleBarClick}
                                title={`[Target] ${taskForBar.kode} - ${taskForBar.keterangan}\n${formattedTargetText}`}
                              >
                                <div className="w-full h-full bg-blue-400/90 gantt-stripes flex items-center px-1.5 text-[9px] text-blue-900 font-bold hover:shadow-md transition-shadow rounded-t">
                                  <span className="truncate block w-full">{formattedTargetText}</span>
                                </div>
                              </div>

                              {/* Actual progress bar - bottom half */}
                              {actualBarStyle.width !== "0px" && (
                                <div
                                  className="absolute cursor-pointer rounded"
                                  style={{
                                    left: actualBarStyle.left,
                                    width: actualBarStyle.width,
                                    top: `${topOffset + 16}px`,
                                    height: "16px",
                                    zIndex: 1
                                  }}
                                  onClick={handleBarClick}
                                  title={`[Actual] ${taskForBar.kode} - ${taskForBar.keterangan}\nStatus: ${statusLabel}`}
                                >
                                  <div className="relative w-full h-full hover:shadow-md transition-shadow overflow-hidden rounded-b">
                                    {/* Work part (solid) */}
                                    {actualBarStyle.workWidth !== "0px" && (
                                      <div
                                        className={`absolute left-0 top-0 h-full ${taskColor} flex items-center px-1.5 text-[9px] text-white font-bold`}
                                        style={{ width: actualBarStyle.workWidth }}
                                      >
                                        <span className="truncate block w-full">{taskForBar.kode} - {statusLabel}</span>
                                      </div>
                                    )}

                                    {/* Review part (striped) */}
                                    {actualBarStyle.reviewWidth !== "0px" && (
                                      <div
                                        className="absolute top-0 h-full gantt-stripes flex items-center px-1.5 text-[9px] text-white font-bold bg-purple-500"
                                        style={{
                                          left: actualBarStyle.workWidth,
                                          width: actualBarStyle.reviewWidth
                                        }}
                                      >
                                        <span className="truncate block w-full">Review PM</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab 2 Content: Pegawai Timeline (Gantt Chart View) */}
      {!loading && activeTab === "pegawai" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-850 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-150 dark:border-gray-850 bg-gray-50/50 dark:bg-gray-900/30">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
              Tim Member Workload Timeline
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Beban kerja per pegawai dan timeline visualisasinya dalam satu baris kerja.</p>
          </div>

          <div className="overflow-auto max-h-[500px]" ref={pegawaiTimelineRef}>
            <div className="min-w-[1200px] flex flex-col">
              {/* Sticky Header Row */}
              <div className="flex bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
                <div className="w-[180px] min-w-[180px] p-3 text-center border-r border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:border-gray-750 text-gray-700 dark:text-gray-300 uppercase tracking-wider h-[48px] flex items-center justify-center bg-gray-100 dark:bg-gray-750">
                  Tim Member
                </div>
                <div className="flex flex-1">
                  {dateColumns.map((date, idx) => {
                    const isToday = toDateStr(date) === todayStr;
                    return (
                      <div
                        key={idx}
                        style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                        className={`text-center py-2.5 text-xs font-bold border-r border-gray-200 dark:border-gray-750 flex flex-col justify-center h-[48px] ${
                          isToday
                            ? "bg-blue-600 text-white font-extrabold"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        <span className="text-[9px] uppercase font-medium opacity-80">
                          {date.toLocaleDateString("id-ID", { weekday: "short" })}
                        </span>
                        <span>
                          {String(date.getDate()).padStart(2, "0")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {groupedPegawaiTasks.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    Tidak ada data task pegawai yang cocok dengan filter.
                  </div>
                ) : (
                  groupedPegawaiTasks.map((group) => {
                    const rowHeight = Math.max(70, group.rows.length * 50 + 20);

                    return (
                      <div key={group.pegawaiId} className="flex min-h-[80px]">
                        {/* Pegawai Name Column */}
                        <div
                          className="w-[180px] min-w-[180px] p-4 border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center font-bold text-gray-800 dark:text-gray-200 text-sm break-words"
                          style={{ height: `${rowHeight}px` }}
                        >
                          {group.pegawaiNama}
                        </div>

                        {/* Timeline Days & Bars */}
                        <div className="flex-1 relative" style={{ height: `${rowHeight}px` }}>
                          {/* Background Grid Lines */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {dateColumns.map((date, idx) => {
                              const isToday = toDateStr(date) === todayStr;
                              return (
                                <div
                                  key={idx}
                                  style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                                  className={`border-r border-gray-100 dark:border-gray-800/40 h-full ${
                                    isToday ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                                  }`}
                                />
                              );
                            })}
                          </div>

                          {/* Task Bars container */}
                          <div className="absolute inset-0">
                            {group.rows.map((row, rowIdx) =>
                              row.map((task) => {
                                 const targetStyle = getTaskStyle(task);
                                 if (targetStyle.outOfRange) return null;
                                 const actualBarStyle = getActualBarStyle(task);

                                const isLate = task.approvedAt && task.calculatedDueDate && new Date(task.approvedAt) > new Date(task.calculatedDueDate);
                                const statusLabel = task.status === 'SELESAI'
                                  ? (isLate ? 'Terlambat' : 'Selesai')
                                  : task.status === 'SEDANG_DIPROSES_USER'
                                    ? 'Diproses'
                                    : task.status === 'MENUNGGU_REVIEW_PM'
                                      ? 'Review'
                                      : 'Menunggu';

                                const topOffset = rowIdx * 50 + 10;

                                // Border color follows actual bar status
                                const borderColor = task.status === 'SELESAI'
                                  ? (isLate ? '#ef4444' : '#16a34a')
                                  : task.status === 'SEDANG_DIPROSES_USER' || task.status === 'SEDANG_DIPROSES_USER_PAUSED'
                                    ? '#ca8a04'
                                    : task.status === 'MENUNGGU_REVIEW_PM'
                                      ? '#c026d3'
                                      : '#6b7280';

                                // Task Color class
                                const taskColor = task.status === 'SELESAI'
                                  ? (isLate ? 'bg-red-500' : 'bg-green-500')
                                  : task.status === 'SEDANG_DIPROSES_USER' || task.status === 'SEDANG_DIPROSES_USER_PAUSED'
                                    ? 'bg-yellow-500 text-yellow-950 font-bold'
                                    : task.status === 'MENUNGGU_REVIEW_PM'
                                      ? 'bg-purple-500'
                                      : 'bg-gray-400';

                                // Calculate wrapper dimensions
                                const targetLeft = parseInt(targetStyle.left);
                                const targetRight = targetLeft + parseInt(targetStyle.width);
                                const actualLeft = actualBarStyle.width !== '0px' ? parseInt(actualBarStyle.left) : targetLeft;
                                const actualRight = actualBarStyle.width !== '0px' ? actualLeft + parseInt(actualBarStyle.width) : targetRight;
                                const wrapperLeft = Math.min(targetLeft, actualLeft);
                                const wrapperRight = Math.max(targetRight, actualRight);
                                const wrapperWidth = wrapperRight - wrapperLeft;

                                const formattedTargetText = `Target: ${formatDateShort(task.scheduleAt)} - ${task.calculatedDueDate ? formatDateShort(task.calculatedDueDate) : 'N/A'}`;

                                return (
                                  <React.Fragment key={task.id}>
                                    {/* Wrapper container with unified border */}
                                    <div
                                      className="absolute pointer-events-none rounded border border-dashed border-gray-300 dark:border-gray-700"
                                      style={{
                                        left: `${wrapperLeft}px`,
                                        width: `${wrapperWidth}px`,
                                        top: `${topOffset}px`,
                                        height: '32px',
                                        boxShadow: `0 0 1px 1.5px white, 0 0 1px 2px ${borderColor}`,
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
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setDetailOpen(true);
                                      }}
                                      title={`[Target] ${task.kode} - ${task.keterangan}\n${formattedTargetText}`}
                                    >
                                      <div className="w-full h-full bg-blue-400/90 gantt-stripes flex items-center px-1.5 text-[9px] text-blue-900 font-bold hover:shadow-md transition-shadow rounded-t">
                                        <span className="truncate block w-full">{formattedTargetText}</span>
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
                                        onClick={() => {
                                          setSelectedTask(task);
                                          setDetailOpen(true);
                                        }}
                                        title={`[Actual] ${task.kode} - ${task.keterangan}\nStatus: ${statusLabel}`}
                                      >
                                        <div className="relative w-full h-full hover:shadow-md transition-shadow overflow-hidden rounded-b">
                                          {/* Work part (solid) */}
                                          {actualBarStyle.workWidth !== '0px' && (
                                            <div
                                              className={`absolute left-0 top-0 h-full ${taskColor} flex items-center px-1.5 text-[9px] text-white font-bold`}
                                              style={{ width: actualBarStyle.workWidth }}
                                            >
                                              <span className="truncate block w-full">{task.kode} - {statusLabel}</span>
                                            </div>
                                          )}

                                          {/* Review part (striped) */}
                                          {actualBarStyle.reviewWidth !== '0px' && (
                                            <div
                                              className="absolute top-0 h-full gantt-stripes flex items-center px-1.5 text-[9px] text-white font-bold bg-purple-500"
                                              style={{
                                                left: actualBarStyle.workWidth,
                                                width: actualBarStyle.reviewWidth
                                              }}
                                            >
                                              <span className="truncate block w-full">Review PM</span>
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
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <TaskViewModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        task={selectedTask}
      />
    </div>
  );
}
