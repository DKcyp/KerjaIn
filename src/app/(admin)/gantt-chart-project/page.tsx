"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Select2Field from "@/components/form/Select2Field";
import TaskViewModal from "@/components/tasklist/TaskViewModal";

// Types
interface ModulNode {
  id: number;
  parentId: number | null;
  nama: string;
  kode: string | null;
  version?: string | null;
  baVersion?: string | null;
  children?: ModulNode[];
}

interface FlatNode {
  id: number | string;
  parent: number | string;
  text?: string;
  data?: {
    depth: number;
    kode: string | null;
    version?: string | null;
    baVersion?: string | null;
  };
}

type TaskItem = {
  id: number;
  projectId: number;
  moduleId: number;
  pegawaiId: number;
  pegawaiNama: string;
  proyekNama: string;
  moduleNama: string;
  moduleVersion?: string | null;
  baVersion?: string | null;
  keterangan: string | null;
  scheduleAt: string;
  calculatedDueDate?: string | null;
  submittedForReviewAt?: string | null;
  approvedAt?: string | null;
  startedAt?: string | null;
  status: 'MENUNGGU_PROSES_USER' | 'SEDANG_DIPROSES_USER' | 'SEDANG_DIPROSES_USER_PAUSED' | 'MENUNGGU_REVIEW_PM' | 'SELESAI';
  taskComplexity?: 'EASY' | 'MEDIUM' | 'HARD';
  tasklistType?: 'BLUEPRINT' | 'DEVELOPMENT' | 'MAINTENANCE';
  kode?: string;
  imagePath?: string | null;
};

type Proyek = { id: number; namaProyek: string; modules?: ModulNode[] };

// Helper functions
const isCompletedLate = (task: TaskItem) => {
  if (task.status !== 'SELESAI') return false;
  if (!task.calculatedDueDate || !task.approvedAt) return false;
  const dueDate = new Date(task.calculatedDueDate);
  const approvedDate = new Date(task.approvedAt);
  return approvedDate > dueDate;
};

export default function GanttChartProjectPage() {
  const searchParams = useSearchParams();
  const [filterProjectId, setFilterProjectId] = useState<number | "">("");
  const [filterVersion, setFilterVersion] = useState<string>("");
  const [projects, setProjects] = useState<Proyek[]>([]);
  const [versions, setVersions] = useState<string[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [modulesFlat, setModulesFlat] = useState<FlatNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<TaskItem | null>(null);

  // Filter collapse state for mobile
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  // Set filter from URL query parameter
  useEffect(() => {
    const projectIdParam = searchParams.get('projectId');
    if (projectIdParam) {
      const projectId = parseInt(projectIdParam);
      if (!isNaN(projectId)) {
        setFilterProjectId(projectId);
      }
    }
  }, [searchParams]);

  // Helper functions for modal
  const openDetail = (task: TaskItem) => {
    setDetailItem(task);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailItem(null);
  };

  // Load projects
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/proyek?activeOnly=true", { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data?.items) setProjects(data.items);
        }
      } catch (e) {
        console.error("Failed loading projects", e);
      }
    };
    load();
  }, []);

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
          credentials: 'include',
          cache: 'no-store'
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

  // Load modules when project is selected
  useEffect(() => {
    const loadModules = async () => {
      if (!filterProjectId) {
        setModulesFlat([]);
        setExpandedIds(new Set());
        return;
      }

      try {
        const res = await fetch(`/api/proyek-modules/${filterProjectId}/tree`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const tree: ModulNode[] = data?.tree || [];

          // Flatten tree
          const flat = flattenTree(tree);
          setModulesFlat(flat);

          // Expand all roots by default
          const roots = flat.filter((n) => String(n.parent) === '0').map((n) => Number(n.id));
          setExpandedIds(new Set(roots));
        }
      } catch (e) {
        console.error("Failed loading modules", e);
      }
    };
    loadModules();
  }, [filterProjectId]);

  // Load tasks when project changes
  useEffect(() => {
    const load = async () => {
      if (!filterProjectId) {
        setTasks([]);
        return;
      }

      setLoading(true);
      try {
        const startDate = new Date('2020-01-01');
        const endDate = new Date('2030-12-31');

        const params = new URLSearchParams();
        params.set('projectId', String(filterProjectId));
        params.set('from', formatDateISO(startDate));
        params.set('to', formatDateISO(endDate));

        const res = await fetch(`/api/gantt-chart-project?${params.toString()}`, {
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
  }, [filterProjectId]);

  // Helper: flatten tree
  const flattenTree = (nodes: ModulNode[], parent: number | string = 0, depth: number = 0): FlatNode[] => {
    const result: FlatNode[] = [];
    nodes.forEach((node) => {
      result.push({
        id: node.id,
        parent,
        text: node.nama,
        data: {
          depth,
          kode: node.kode,
          version: node.version,
          baVersion: node.baVersion
        }
      });
      if (node.children && node.children.length > 0) {
        result.push(...flattenTree(node.children, node.id, depth + 1));
      }
    });
    return result;
  };

  // Helper: format date
  const formatDateISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Toggle expand/collapse
  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get visible modules (considering expand/collapse)
  const displayedModulesFlat = useMemo(() => {
    const parentMap = new Map<any, any>();
    modulesFlat.forEach((n) => parentMap.set(n.id, n.parent));

    // Determine which modules should be kept if filter is active
    let keptModuleIds: Set<number> | null = null;

    if (filterVersion) {
      keptModuleIds = new Set<number>();

      const keepNodeAndAncestors = (nodeId: number | string) => {
        let current: number | string | undefined = nodeId;
        while (current !== 0 && current != null) {
          keptModuleIds!.add(Number(current));
          current = parentMap.get(current);
        }
      };

      // Keep modules that match the version
      modulesFlat.forEach(node => {
        if (node.data?.baVersion === filterVersion) {
          keepNodeAndAncestors(node.id);
        }
      });

      // Keep modules that have a task matching the version
      tasks.forEach(task => {
        if (task.baVersion === filterVersion) {
          keepNodeAndAncestors(task.moduleId);
        }
      });
    }

    const isVisible = (node: FlatNode) => {
      let cur = node.parent;
      while (cur !== 0 && cur != null) {
        const idNum = Number(cur);
        if (!expandedIds.has(idNum)) return false;
        cur = parentMap.get(cur);
      }
      return true;
    };

    // Apply visibility filter
    let filtered = modulesFlat.filter(isVisible);

    // Apply version filter (retaining hierarchy)
    if (keptModuleIds) {
      filtered = filtered.filter(node => keptModuleIds!.has(Number(node.id)));
    }

    return filtered;
  }, [modulesFlat, expandedIds, filterVersion, tasks]);

  // Group tasks by module
  const tasksByModule = useMemo(() => {
    const grouped: Record<number, TaskItem[]> = {};

    // Initialize all displayed modules with empty array (so modules without tasks still show)
    displayedModulesFlat.forEach((mod) => {
      grouped[Number(mod.id)] = [];
    });

    // Add tasks to their respective modules
    tasks.forEach((task) => {
      const targetModuleId = task.moduleId;

      // Filter by version if selected
      if (filterVersion && task.baVersion !== filterVersion) {
        return;
      }

      // Only add task if the module is in the displayed list
      if (grouped[targetModuleId] !== undefined) {
        grouped[targetModuleId].push(task);
      }
    });

    return grouped;
  }, [tasks, displayedModulesFlat, filterVersion]);

  // Get summary for collapsed modules
  const getModuleSummary = (moduleId: number) => {
    const getAllChildModuleIds = (parentId: number): number[] => {
      const children = modulesFlat.filter(m => Number(m.parent) === parentId);
      let result = [parentId];
      children.forEach(child => {
        result = result.concat(getAllChildModuleIds(Number(child.id)));
      });
      return result;
    };

    const childModuleIds = getAllChildModuleIds(moduleId);
    const childTasks = tasks.filter(t => childModuleIds.includes(t.moduleId));

    if (childTasks.length === 0) return null;

    const completedTasks = childTasks.filter(t => t.status === 'SELESAI').length;
    const percentage = childTasks.length > 0 ? Math.round((completedTasks / childTasks.length) * 100) : 0;

    // Calculate earliest scheduled date
    const scheduledDates = childTasks
      .map(t => t.scheduleAt)
      .filter(d => d)
      .map(d => new Date(d).getTime());
    const earliestScheduled = scheduledDates.length > 0
      ? new Date(Math.min(...scheduledDates)).toISOString()
      : null;

    // Calculate latest due date
    const dueDates = childTasks
      .map(t => t.calculatedDueDate)
      .filter(d => d)
      .map(d => new Date(d!).getTime());
    const latestDueDate = dueDates.length > 0
      ? new Date(Math.max(...dueDates)).toISOString()
      : null;

    // Calculate latest realization date (approvedAt)
    const realizationDates = childTasks
      .map(t => t.approvedAt)
      .filter(d => d)
      .map(d => new Date(d!).getTime());
    const latestRealization = realizationDates.length > 0
      ? new Date(Math.max(...realizationDates)).toISOString()
      : null;

    return {
      taskCount: childTasks.length,
      completedCount: completedTasks,
      percentage,
      earliestScheduled,
      latestDueDate,
      latestRealization
    };
  };

  const formatDateShort = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const calculateWorkTime = (task: TaskItem) => {
    if (!task.startedAt) return '-';
    const endTime = task.approvedAt || new Date().toISOString();
    const start = new Date(task.startedAt);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) return `${diffDays} hari ${diffHours} jam`;
    if (diffHours > 0) return `${diffHours} jam ${diffMins} menit`;
    return `${diffMins} menit`;
  };

  const calculateLateness = (task: TaskItem) => {
    if (task.status !== 'SELESAI' || !task.calculatedDueDate || !task.approvedAt) return null;
    const dueDate = new Date(task.calculatedDueDate);
    const approvedDate = new Date(task.approvedAt);
    if (approvedDate <= dueDate) return null;

    const diffMs = approvedDate.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) return `Lebih waktu ${diffDays} hari`;
    if (diffHours > 0) return `Lebih waktu ${diffHours} jam`;
    return 'Tepat waktu';
  };

  const getStatusColor = (task: TaskItem) => {
    switch (task.status) {
      case 'SELESAI': return isCompletedLate(task) ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'SEDANG_DIPROSES_USER':
      case 'SEDANG_DIPROSES_USER_PAUSED': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'MENUNGGU_REVIEW_PM': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SELESAI': return 'Selesai';
      case 'SEDANG_DIPROSES_USER': return 'Sedang Diproses';
      case 'SEDANG_DIPROSES_USER_PAUSED': return 'Paused';
      case 'MENUNGGU_REVIEW_PM': return 'Menunggu Review';
      case 'MENUNGGU_PROSES_USER': return 'Menunggu';
      default: return '-';
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Gantt Chart Project - Module Timeline
          </h1>

          {/* Filters Card */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
            {/* Filter Header - Collapsible on Mobile */}
            <button
              type="button"
              onClick={() => setFilterCollapsed(!filterCollapsed)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors lg:cursor-default lg:hover:bg-gray-50 lg:dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="font-medium text-gray-900 dark:text-white">Filter</span>
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
            <div className={`${filterCollapsed ? 'hidden' : 'block'} lg:block p-4 pt-0 lg:pt-4`}>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col flex-1 min-w-0">
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Pilih Proyek: <span className="text-red-500">*</span>
                  </label>
                  <Select2Field
                    value={filterProjectId}
                    onChange={(v) => setFilterProjectId(v === "" ? "" : Number(v))}
                    options={[
                      { id: "", text: "-- Pilih Proyek --" },
                      ...projects.map(p => ({ id: p.id, text: p.namaProyek }))
                    ]}
                    placeholder="-- Pilih Proyek --"
                  />
                </div>

                <div className="flex flex-col flex-1 min-w-0 sm:max-w-xs">
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Filter Version:
                  </label>
                  <Select2Field
                    value={filterVersion}
                    onChange={(v) => setFilterVersion(String(v))}
                    options={[
                      { id: "", text: "-- Semua Version --" },
                      ...versions.map(v => ({ id: v, text: v }))
                    ]}
                    placeholder="-- Semua Version --"
                    disabled={!filterProjectId}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[70vh] relative">
          {loading && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          )}

          {!loading && displayedModulesFlat.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Pilih proyek untuk melihat data
            </div>
          )}

          {!loading && displayedModulesFlat.length > 0 && (
            <div className="px-3 sm:px-6 pb-6">
              {/* Desktop Table Header - Hidden on mobile */}
              <div className="hidden lg:grid sticky top-0 z-10 mb-2 grid-cols-13 gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm">
                <div className="col-span-3">Modul</div>
                <div className="col-span-1">Version</div>
                <div className="col-span-2">Keterangan</div>
                <div className="col-span-1">Scheduled</div>
                <div className="col-span-1">Due Date</div>
                <div className="col-span-1">Tanggal Realisasi</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-3">Waktu Pengerjaan</div>
              </div>

              {/* Module and Task Rows */}
              {displayedModulesFlat.map((node, nodeIndex) => {
                const depth = Number(node.data?.depth || 0);
                const moduleTasks = tasksByModule[Number(node.id)] || [];
                const hasChildren = modulesFlat.some((n) => String(n.parent) === String(node.id));
                const hasTasks = moduleTasks.length > 0;
                const expanded = expandedIds.has(Number(node.id));

                // Check if this is a main module (root level)
                const isMainModule = String(node.parent) === '0' || depth === 0;

                // Module can be collapsed if it has children OR has tasks
                const canCollapse = hasChildren || hasTasks;
                const isCollapsed = canCollapse && !expanded;

                // Get summary for collapsed modules (both with children and leaf modules with tasks)
                const summary = isCollapsed ? getModuleSummary(Number(node.id)) : null;

                // Check if this is the last child of its parent
                const siblings = displayedModulesFlat.filter(n => String(n.parent) === String(node.parent));
                const isLastSibling = siblings[siblings.length - 1]?.id === node.id;

                return (
                  <div key={String(node.id)} className="mb-2">
                    {/* Module Header Row */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      {/* Desktop Layout */}
                      <div className="hidden lg:grid grid-cols-13 gap-2 px-3 py-2 items-center">
                        <div className="col-span-3 flex items-center gap-2 relative" style={{ paddingLeft: depth * 20 }}>
                          {/* Tree view lines */}
                          {depth > 0 && (
                            <div className="absolute left-0 top-0 bottom-0 flex" style={{ width: depth * 20 }}>
                              {Array.from({ length: depth }).map((_, i) => {
                                const parentAtLevel = (() => {
                                  let current = node;
                                  for (let j = depth; j > i + 1; j--) {
                                    const parent = modulesFlat.find(n => n.id === current.parent);
                                    if (!parent) return null;
                                    current = parent;
                                  }
                                  return current.parent;
                                })();

                                const isLastAtLevel = i === depth - 1 ? isLastSibling : (() => {
                                  let current = node;
                                  for (let j = depth; j > i + 1; j--) {
                                    const parent = modulesFlat.find(n => n.id === current.parent);
                                    if (!parent) return false;
                                    const parentSiblings = displayedModulesFlat.filter(n => String(n.parent) === String(parent.parent));
                                    if (parentSiblings[parentSiblings.length - 1]?.id !== parent.id) return false;
                                    current = parent;
                                  }
                                  return true;
                                })();

                                return (
                                  <div key={i} className="relative" style={{ width: 20 }}>
                                    {/* Vertical line */}
                                    {!isLastAtLevel && (
                                      <div
                                        className="absolute left-2 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600"
                                        style={{ left: '10px' }}
                                      />
                                    )}
                                    {/* Horizontal line for last level */}
                                    {i === depth - 1 && (
                                      <>
                                        <div
                                          className="absolute top-1/2 w-px bg-gray-300 dark:bg-gray-600"
                                          style={{
                                            left: '10px',
                                            height: isLastSibling ? '50%' : '100%',
                                            top: isLastSibling ? '0' : '0'
                                          }}
                                        />
                                        <div
                                          className="absolute top-1/2 h-px bg-gray-300 dark:bg-gray-600"
                                          style={{ left: '10px', width: '10px' }}
                                        />
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <button
                            type="button"
                            className={`w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0 ${canCollapse ? '' : 'opacity-0 pointer-events-none'}`}
                            onClick={() => toggleExpand(Number(node.id))}
                          >
                            {expanded ? '▾' : '▸'}
                          </button>
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {node.text}
                          </span>
                          {hasTasks && !isCollapsed && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({moduleTasks.length} {moduleTasks.length === 1 ? 'task' : 'tasks'})
                            </span>
                          )}
                        </div>
                        <div className="col-span-1 text-xs text-gray-500 dark:text-gray-400">
                          {node.data?.baVersion || '-'}
                        </div>
                        <div className="col-span-2 text-xs text-gray-500 dark:text-gray-400">
                          {summary && (
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              {summary.percentage}% ({summary.completedCount}/{summary.taskCount})
                            </span>
                          )}
                          {/* Show task count for collapsed leaf modules */}
                          {isCollapsed && !hasChildren && hasTasks && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({moduleTasks.length} {moduleTasks.length === 1 ? 'task' : 'tasks'})
                            </span>
                          )}
                        </div>
                        {/* Show dates when collapsed */}
                        {isCollapsed && summary ? (
                          <>
                            <div className="col-span-1 text-xs text-gray-600 dark:text-gray-400">
                              {formatDateShort(summary.earliestScheduled)}
                            </div>
                            <div className="col-span-1 text-xs text-gray-600 dark:text-gray-400">
                              {formatDateShort(summary.latestDueDate)}
                            </div>
                            <div className="col-span-1 text-xs text-gray-600 dark:text-gray-400">
                              {formatDateShort(summary.latestRealization)}
                            </div>
                            <div className="col-span-4"></div>
                          </>
                        ) : (
                          <div className="col-span-7"></div>
                        )}
                      </div>

                      {/* Mobile Layout */}
                      <div className="lg:hidden px-3 py-3">
                        <div className="flex items-center gap-2 mb-2" style={{ paddingLeft: depth * 15 }}>
                          <button
                            type="button"
                            className={`w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0 ${canCollapse ? '' : 'opacity-0 pointer-events-none'}`}
                            onClick={() => toggleExpand(Number(node.id))}
                          >
                            {expanded ? '▾' : '▸'}
                          </button>
                          <span className="font-medium text-gray-900 dark:text-white text-base">
                            {node.text}
                          </span>
                          {hasTasks && !isCollapsed && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              ({moduleTasks.length})
                            </span>
                          )}
                        </div>

                        {/* Mobile Module Info */}
                        <div className="space-y-1 text-sm" style={{ paddingLeft: depth * 15 + 28 }}>
                          {node.data?.baVersion && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 dark:text-gray-400 text-xs">Version:</span>
                              <span className="text-gray-700 dark:text-gray-300">{node.data.baVersion}</span>
                            </div>
                          )}
                          {summary && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 dark:text-gray-400 text-xs">Progress:</span>
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                {summary.percentage}% ({summary.completedCount}/{summary.taskCount})
                              </span>
                            </div>
                          )}
                          {isCollapsed && summary && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Scheduled:</span>
                                <div className="text-gray-700 dark:text-gray-300">{formatDateShort(summary.earliestScheduled)}</div>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Due:</span>
                                <div className="text-gray-700 dark:text-gray-300">{formatDateShort(summary.latestDueDate)}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar for collapsed modules with children */}
                      {summary && isMainModule && (
                        <div className="px-3 pb-2">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${summary.percentage}%`,
                                background: summary.percentage === 100
                                  ? 'linear-gradient(to right, #10b981, #059669)'
                                  : summary.percentage >= 50
                                    ? 'linear-gradient(to right, #3b82f6, #2563eb)'
                                    : 'linear-gradient(to right, #f59e0b, #d97706)'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Task Rows - Show when expanded */}
                    {expanded && hasTasks && moduleTasks.map((task, idx) => (
                      <div key={task.id} className="mb-1">
                        {/* Desktop Task Row */}
                        <div
                          className={`hidden lg:grid grid-cols-13 gap-2 px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors items-center ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'
                            }`}
                          onClick={() => openDetail(task)}
                        >
                          <div className="col-span-3 text-gray-700 dark:text-gray-300 truncate">
                            {/* Empty - task belongs to module above */}
                          </div>
                          <div className="col-span-1 text-gray-600 dark:text-gray-400 truncate" title={task.baVersion || '-'}>
                            {task.baVersion || '-'}
                          </div>
                          <div className="col-span-2 text-gray-600 dark:text-gray-400 truncate" title={task.keterangan || '-'}>
                            {task.keterangan || '-'}
                          </div>
                          <div className="col-span-1 text-gray-600 dark:text-gray-400">
                            {formatDateShort(task.scheduleAt)}
                          </div>
                          <div className="col-span-1 text-gray-600 dark:text-gray-400">
                            {formatDateShort(task.calculatedDueDate)}
                          </div>
                          <div className="col-span-1 text-gray-600 dark:text-gray-400">
                            {formatDateShort(task.approvedAt)}
                          </div>
                          <div className="col-span-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getStatusColor(task)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                          </div>
                          <div className="col-span-3 text-gray-700 dark:text-gray-300">
                            <div>{calculateWorkTime(task)}</div>
                            {calculateLateness(task) && (
                              <div className="text-red-600 dark:text-red-400 font-medium text-[10px] mt-0.5">
                                {calculateLateness(task)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Mobile Task Card */}
                        <div
                          className={`lg:hidden mx-3 p-3 rounded-lg cursor-pointer transition-colors border-l-4 ${task.status === 'SELESAI'
                              ? isCompletedLate(task)
                                ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                                : 'border-green-400 bg-green-50 dark:bg-green-900/20'
                              : task.status === 'SEDANG_DIPROSES_USER' || task.status === 'SEDANG_DIPROSES_USER_PAUSED'
                                ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                                : task.status === 'MENUNGGU_REVIEW_PM'
                                  ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                                  : 'border-gray-400 bg-gray-50 dark:bg-gray-800/50'
                            } hover:shadow-md`}
                          onClick={() => openDetail(task)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                            {task.baVersion && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                v{task.baVersion}
                              </span>
                            )}
                          </div>

                          {task.keterangan && (
                            <div className="mb-2">
                              <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-2">
                                {task.keterangan}
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Scheduled:</span>
                              <div className="text-gray-700 dark:text-gray-300 font-medium">
                                {formatDateShort(task.scheduleAt)}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
                              <div className="text-gray-700 dark:text-gray-300 font-medium">
                                {formatDateShort(task.calculatedDueDate)}
                              </div>
                            </div>
                            {task.approvedAt && (
                              <>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Selesai:</span>
                                  <div className="text-gray-700 dark:text-gray-300 font-medium">
                                    {formatDateShort(task.approvedAt)}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Waktu:</span>
                                  <div className="text-gray-700 dark:text-gray-300 font-medium">
                                    {calculateWorkTime(task)}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {calculateLateness(task) && (
                            <div className="mt-2 text-red-600 dark:text-red-400 font-medium text-xs">
                              {calculateLateness(task)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal — view-only reusable component */}
      <TaskViewModal
        isOpen={detailOpen}
        onClose={closeDetail}
        task={detailItem}
      />
    </>
  );
}
