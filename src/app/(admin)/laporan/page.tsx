"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/ui/modal";
import { fetchOnce } from "@/lib/fetchOnce";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import ExcelJS from "exceljs";
import Select2Field from "@/components/form/Select2Field";
import HorizontalBarChart from "@/components/charts/bar/HorizontalBarChart";
import DonutChart from "@/components/charts/DonutChart";
import StatCard from "@/components/ui/StatCard";

type Proyek = { id: number; kodeProyek: string; namaProyek: string };

type Pegawai = { id: number; namaLengkap: string };

type ModulNode = { id: number; nama: string; children?: ModulNode[]; isLeaf?: boolean; kode?: string | null };

// Flattened row representation for rendering the module tree
type FlatRow = { id: number; nama: string; depth: number; isLeaf: boolean; children?: ModulNode[] };

type TaskItem = {
  id: number;
  kode: string;
  projectId: number;
  moduleId: number;
  pegawaiId: number;
  scheduleAt: string;
  status: string;
  keterangan?: string | null;
  programmerDescription?: string | null;
  imagePath?: string | null;
  proyekNama?: string;
  moduleNama?: string;
  pegawaiNama?: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  // Format as YYYY-MM-DD (local date components)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateDMY(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatDateTimeFull(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const ii = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy} ${hh}:${ii}:${ss}`;
}

// Project report data type
type ProjectReportData = {
  namaProyek: string;
  projectManager: string;
  totalModul: number;
  totalTask: number;
  totalHari: number;
  totalManhour: number;
  progres: number;
  status: string;
};

export default function LaporanPage() {
  const [projects, setProjects] = useState<Proyek[]>([]);
  const [pegawaiOptions, setPegawaiOptions] = useState<Pegawai[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [selectedPegawaiId, setSelectedPegawaiId] = useState<number | "">("");

  // Report type selection
  const [reportType, setReportType] = useState<'task' | 'project'>('task');

  // current user
  const { user: me } = useAuth();
  // allowed user ids for filtering
  const [filterTeamMemberIds, setFilterTeamMemberIds] = useState<number[]>([]);

  const [modulesTree, setModulesTree] = useState<ModulNode[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  // detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<TaskItem | null>(null);
  // history logs state (mirror Tasklist)
  type TaskLog = { id: number; waktu: string; userId: number; userNama?: string; keterangan?: string | null; status?: string | null; action?: string; imagePath?: string | null };
  const [detailLogs, setDetailLogs] = useState<TaskLog[]>([]);
  const [detailLogsLoading, setDetailLogsLoading] = useState<boolean>(false);
  // date range filters
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");
  const rangeInputRef = useRef<HTMLInputElement | null>(null);

  // me is provided by AuthProvider

  // keep filterTeamMemberIds in sync with role and selected project(s)
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!me) { if (alive) setFilterTeamMemberIds([]); return; }
      if (me.role === 'PROGRAMMER' || me.role === 'ADMIN') {
        if (alive) setFilterTeamMemberIds([me.id]);
        return;
      }
      if (me.role === 'PM') {
        const collect = async (pid: number): Promise<number[]> => {
          try {
            const res = await fetch(`/api/proyek-team/${pid}`, { cache: 'no-store', credentials: 'include' });
            if (!res.ok) return [];
            const d = await res.json();
            return (Array.isArray(d?.items) ? d.items : []).map((r: { pegawaiId: number }) => r.pegawaiId);
          } catch { return []; }
        };
        if (typeof selectedProjectId === 'number' && selectedProjectId > 0) {
          const ids = await collect(selectedProjectId);
          if (alive) setFilterTeamMemberIds(ids);
        } else {
          const lists = await Promise.all(projects.map((p) => collect(p.id)));
          const s = new Set<number>();
          for (const arr of lists) for (const id of arr) s.add(id);
          if (alive) setFilterTeamMemberIds(Array.from(s));
        }
        return;
      }
      // SUPER_ADMIN -> no restriction
      if (alive) setFilterTeamMemberIds([]);
    };
    run();
    return () => { alive = false; };
  }, [me, projects, selectedProjectId]);

  // derive filtered pegawai options based on role/team
  const filteredPegawaiOptions = useMemo((): Pegawai[] => {
    if (!me) return pegawaiOptions;
    if (me.role === 'SUPER_ADMIN') return pegawaiOptions;
    if (me.role === 'PROGRAMMER' || me.role === 'ADMIN') return pegawaiOptions.filter((p) => p.id === me.id);
    // PM
    return pegawaiOptions.filter((p) => filterTeamMemberIds.includes(p.id));
  }, [pegawaiOptions, me, filterTeamMemberIds]);

  // ensure selectedPegawaiId remains valid with filtered options
  useEffect(() => {
    if (selectedPegawaiId && !filteredPegawaiOptions.some((p) => p.id === selectedPegawaiId)) {
      setSelectedPegawaiId("");
    }
  }, [filteredPegawaiOptions, selectedPegawaiId]);

  // Load projects
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchOnce("/api/proyek?activeOnly=true", { ttlMs: 3000, credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.items)) setProjects(data.items);
        }
      } catch (e) {
        console.error("Failed to load proyek", e);
      }
    };
    load();
  }, []);

  // Load history logs when detail opens
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!detailOpen || !detailItem?.id) { if (alive) setDetailLogs([]); return; }
      try {
        setDetailLogsLoading(true);
        const res = await fetch(`/api/tasklist/${detailItem.id}/logs`, { cache: 'no-store', credentials: 'include' });
        if (!alive) return;
        if (res.ok) {
          const d = await res.json();
          const items = Array.isArray(d?.items) ? d.items as TaskLog[] : [];
          setDetailLogs(items);
        } else {
          setDetailLogs([]);
        }
      } catch {
        if (alive) setDetailLogs([]);
      } finally {
        if (alive) setDetailLogsLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [detailOpen, detailItem?.id]);

  // Load pegawai options
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchOnce("/api/pegawai", { ttlMs: 3000 });
        if (res.ok) {
          const data = await res.json();
          const rows = Array.isArray(data?.items) ? data.items : [];
          setPegawaiOptions(rows.map((p: any) => ({ id: p.id, namaLengkap: p.namaLengkap })));
        }
      } catch (e) {
        console.error("Failed to load pegawai", e);
      }
    };
    load();
  }, []);

  // Load modules tree when project changes
  useEffect(() => {
    const loadTree = async () => {
      setModulesTree([]);
      setExpanded(new Set());
      if (!selectedProjectId) return;
      try {
        const res = await fetch(`/api/proyek-modules/${selectedProjectId}/tree`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const tree = Array.isArray(data?.tree) ? (data.tree as ModulNode[]) : [];
          setModulesTree(tree);
          // Default: don't expand any, so only top-level (induk) modules are shown
          setExpanded(new Set());
        }
      } catch (e) {
        console.error("Failed to load modules tree", e);
      }
    };
    loadTree();
  }, [selectedProjectId]);

  // Load tasks for project (+ optional user) when filters change
  useEffect(() => {
    const loadTasks = async () => {
      setTasks([]);
      if (!selectedProjectId) return;
      setLoadingTasks(true);
      try {
        const params = new URLSearchParams();
        params.set("projectId", String(selectedProjectId));
        if (selectedPegawaiId) params.set("pegawaiId", String(selectedPegawaiId));
        if (filterFrom) params.set("from", filterFrom);
        if (filterTo) params.set("to", filterTo);
        // Show all statuses (including Selesai): instruct API not to exclude completed past tasks
        params.set("showAll", "1");
        // Request a large page size as a fallback in case server-side unpaged mode doesn't trigger
        params.set("page", "1");
        params.set("size", "5000");
        const res = await fetch(`/api/tasklist?${params.toString()}`, { cache: "no-store", credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          setTasks(items);
          // Do not auto-open leaf details; keep only top-level shown by default
          setDetailsOpen(new Set());
        }
      } catch (e) {
        console.error("Failed to load tasks", e);
      } finally {
        setLoadingTasks(false);
      }
    };
    loadTasks();
  }, [selectedProjectId, selectedPegawaiId, filterFrom, filterTo]);

  // Initialize flatpickr range picker
  useEffect(() => {
    if (!rangeInputRef.current) return;
    const fp = flatpickr(rangeInputRef.current, {
      mode: "range",
      dateFormat: "Y-m-d",
      static: true,
      appendTo: rangeInputRef.current.parentElement || undefined,
      onChange: (selectedDates) => {
        const [from, to] = selectedDates;
        const fmt = (d?: Date) => {
          if (!d) return "";
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        };
        setFilterFrom(fmt(from));
        setFilterTo(fmt(to));
      },
    });
    return () => fp.destroy();
  }, []);

  // Export current tasks to XLSX using exceljs; add No urut; header & title center+bold; sort by module kode; Modul shows full path
  const exportToXLSX = () => {
    // Prepare rows and sort by module code (e.g., 01.02.03)
    const sorted = [...tasks].sort((a, b) => {
      const ka = moduleCodeMap.get(a.moduleId) || '';
      const kb = moduleCodeMap.get(b.moduleId) || '';
      return String(ka).localeCompare(String(kb), undefined, { numeric: true, sensitivity: 'base' });
    });
    const headers = ["No", "Proyek", "Modul", "User", "Tanggal", "Status", "Keterangan"];
    const statusLabel = (raw?: string) => {
      const s = String(raw || '').trim();
      if (s === 'MENUNGGU_PROSES_USER') return 'Menunggu Proses';
      if (s === 'SEDANG_DIPROSES_USER') return 'Sedang Diproses';
      if (s === 'MENUNGGU_REVIEW_PM') return 'Menunggu Review PM';
      if (s === 'SELESAI') return 'Selesai';
      return s || '-';
    };
    const data = sorted.map((t, idx) => [
      idx + 1,
      t.proyekNama || "",
      modulePathMap.get(t.moduleId) || (t.moduleNama || ""),
      t.pegawaiNama || "",
      formatDateTime(t.scheduleAt),
      statusLabel(t.status),
      (t.keterangan || "").replace(/\r?\n/g, " "),
    ]);
    // Build workbook with exceljs
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Laporan');
    // Title row: Laporan Proyek Nama Proyek (no quotes)
    const proj = projects.find(p => p.id === selectedProjectId);
    const projName = proj?.namaProyek || '-';
    const title = `Laporan Proyek ${projName}`;
    const titleRow = ws.addRow([title]);
    ws.mergeCells(1, 1, 1, headers.length);
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { horizontal: 'center' };
    // Optional date range on a new merged row below title
    let headerStartRow = 3;
    if (filterFrom || filterTo) {
      const rangeText = `${filterFrom || ''} s/d ${filterTo || ''}`;
      const rangeRow = ws.addRow([rangeText]);
      ws.mergeCells(2, 1, 2, headers.length);
      rangeRow.alignment = { horizontal: 'center' };
      headerStartRow = 4;
    }
    // Blank spacer row before header
    while (ws.rowCount < headerStartRow - 1) ws.addRow([]);
    // Header row
    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    // Data rows
    data.forEach((arr) => {
      const row = ws.addRow(arr);
      // Center the No column
      row.getCell(1).alignment = { horizontal: 'center' };
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
    });
    // Auto width columns
    // Set reasonable column widths (narrower)
    const widths = [6, 24, 42, 20, 12, 18, 40];
    widths.forEach((w, idx) => { ws.getColumn(idx + 1).width = w; });
    // Generate file and download
    wb.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      // Filename same as title only
      a.download = `${title}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    });
  };

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Flatten tree into rows with depth for rendering table-like hierarchy
  const flattenTree = (nodes: ModulNode[], depth = 0): FlatRow[] => {
    const rows: FlatRow[] = [];
    for (const n of nodes) {
      const kids = Array.isArray(n.children) ? n.children : [];
      const isLeaf = kids.length === 0 || !!n.isLeaf;
      rows.push({ id: n.id, nama: n.nama, depth, isLeaf, children: kids });
      if (!isLeaf && expanded.has(n.id)) {
        rows.push(...flattenTree(kids, depth + 1));
      }
    }
    return rows;
  };
  const flatRows = useMemo(() => flattenTree(modulesTree, 0), [modulesTree, expanded]);

  // Map tasks by moduleId for quick lookup
  const tasksByModule = useMemo(() => {
    const m = new Map<number, TaskItem[]>();
    for (const t of tasks) {
      const arr = m.get(t.moduleId) || [];
      arr.push(t);
      m.set(t.moduleId, arr);
    }
    return m;
  }, [tasks]);

  // Collect all module ids present in the current tree to detect orphan tasks
  const moduleIdsInTree = useMemo(() => {
    const ids = new Set<number>();
    const walk = (nodes: ModulNode[]) => {
      for (const n of nodes) {
        ids.add(n.id);
        if (Array.isArray(n.children) && n.children.length) walk(n.children);
      }
    };
    walk(modulesTree);
    return ids;
  }, [modulesTree]);

  // Orphan tasks: task.moduleId not in current tree
  const orphanTasks = useMemo(() => tasks.filter(t => !moduleIdsInTree.has(t.moduleId)), [tasks, moduleIdsInTree]);

  // Build full module path map (id -> "Parent / Child / Leaf") for exports/sorting
  const modulePathMap = useMemo(() => {
    const map = new Map<number, string>();
    const walk = (nodes: ModulNode[], prefix: string[]) => {
      for (const n of nodes) {
        const pathArr = [...prefix, n.nama];
        const pathStr = pathArr.join(' - ');
        map.set(n.id, pathStr);
        if (Array.isArray(n.children) && n.children.length) walk(n.children, pathArr);
      }
    };
    walk(modulesTree, []);
    return map;
  }, [modulesTree]);

  // Map moduleId -> kode (e.g., 01.02.03) for sorting
  const moduleCodeMap = useMemo(() => {
    const map = new Map<number, string>();
    const walk = (nodes: ModulNode[]) => {
      for (const n of nodes) {
        if (n.kode) map.set(n.id, String(n.kode));
        if (Array.isArray(n.children) && n.children.length) walk(n.children);
      }
    };
    walk(modulesTree);
    return map;
  }, [modulesTree]);

  

  // Aggregate task counts per module (including descendants)
  const tasksTotalCountMap = useMemo(() => {
    const direct = new Map<number, number>();
    for (const [mid, arr] of tasksByModule.entries()) direct.set(mid, arr.length);
    const countMap = new Map<number, number>();
    const walk = (node: ModulNode): number => {
      const kids = Array.isArray(node.children) ? node.children : [];
      let sum = direct.get(node.id) || 0;
      for (const c of kids) sum += walk(c);
      countMap.set(node.id, sum);
      return sum;
    };
    for (const root of modulesTree) walk(root);
    return countMap;
  }, [modulesTree, tasksByModule]);

  // Normalize and check done status
  const isTaskDone = (status?: string | null) => {
    const s = String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
    return s === 'selesai' || s === 'done' || s === 'completed' || s === 'complete' || s === 'finished';
  };

  // Render status as a badge for visual clarity (match Tasklist styles)
  const statusBadge = (s?: string) => {
    const raw = String(s || '').trim();
    // Match Tasklist label mapping
    const label = !raw ? '-' : (
      raw === 'MENUNGGU_PROSES_USER' ? 'Menunggu Proses' :
      raw === 'SEDANG_DIPROSES_USER' ? 'Sedang Diproses' :
      raw === 'MENUNGGU_REVIEW_PM' ? 'Menunggu Review PM' :
      'Selesai'
    );
    let cls = 'bg-gray-100 border border-gray-300 text-gray-800 dark:bg-gray-500/20 dark:border-transparent dark:text-white';
    if (raw === 'MENUNGGU_PROSES_USER') cls = 'bg-gray-100 border border-gray-300 text-gray-800 dark:bg-gray-500/20 dark:border-transparent dark:text-white';
    if (raw === 'SEDANG_DIPROSES_USER') cls = 'bg-blue-100 border border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-transparent dark:text-white';
    if (raw === 'MENUNGGU_REVIEW_PM') cls = 'bg-amber-100 border border-amber-300 text-amber-800 dark:bg-amber-500/20 dark:border-transparent dark:text-white';
    if (raw === 'SELESAI') cls = 'bg-emerald-100 border border-emerald-300 text-emerald-800 dark:bg-emerald-500/20 dark:border-transparent dark:text-white';
    return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
  };

  // Compute per-module percentage.
  // For any node: pct = round((doneTotal / totalTasks) * 100), or 100 if totalTasks = 0.
  // This includes both direct tasks attached to the node and all descendants (weighted by counts).
  const modulePct = useMemo(() => {
    // direct counts per moduleId from tasks
    const direct = new Map<number, { total: number; done: number }>();
    for (const t of tasks) {
      const cur = direct.get(t.moduleId) || { total: 0, done: 0 };
      cur.total += 1;
      if (isTaskDone(t.status)) cur.done += 1;
      direct.set(t.moduleId, cur);
    }
    const pctMap = new Map<number, number>();
    const walk = (node: ModulNode): { total: number; done: number } => {
      const kids = Array.isArray(node.children) ? node.children : [];
      let total = (direct.get(node.id)?.total || 0);
      let done = (direct.get(node.id)?.done || 0);
      for (const c of kids) {
        const child = walk(c);
        total += child.total;
        done += child.done;
      }
      const pct = total > 0 ? Math.round((done / total) * 100) : 100;
      pctMap.set(node.id, pct);
      return { total, done };
    };
    for (const root of modulesTree) walk(root);
    return pctMap;
  }, [tasks, modulesTree]);

  // Track which leaf rows show their tasklist details
  const [detailsOpen, setDetailsOpen] = useState<Set<number>>(new Set());
  const toggleDetails = (id: number) => {
    setDetailsOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Initial: do not auto-open leaf details to keep the view minimal
  useEffect(() => {
    setDetailsOpen(new Set());
  }, [selectedProjectId]);

  // Project report data calculation
  const [projectReportData, setProjectReportData] = useState<ProjectReportData[]>([]);
  const [loadingProjectReport, setLoadingProjectReport] = useState(false);

  // Fetch project report data
  const fetchProjectReportData = async () => {
    if (!me) return;
    
    try {
      setLoadingProjectReport(true);
      
      // Get all projects based on user role
      let projectsToProcess = projects;
      if (me.role === 'PM') {
        // PM only sees their projects
        const teamProjects = await Promise.all(
          projects.map(async (project) => {
            try {
              const res = await fetch(`/api/proyek-team/${project.id}`, { 
                cache: 'no-store', 
                credentials: 'include' 
              });
              if (res.ok) {
                const data = await res.json();
                const teamMembers = Array.isArray(data?.items) ? data.items : [];
                const isPMInTeam = teamMembers.some((member: any) => member.pegawaiId === me.id);
                return isPMInTeam ? project : null;
              }
              return null;
            } catch {
              return null;
            }
          })
        );
        projectsToProcess = teamProjects.filter(p => p !== null) as Proyek[];
      }

      const reportData: ProjectReportData[] = [];

      for (const project of projectsToProcess) {
        try {
          // Fetch project team to get PM
          const teamRes = await fetch(`/api/proyek-team/${project.id}`, { 
            cache: 'no-store', 
            credentials: 'include' 
          });
          let projectManager = '-';
          if (teamRes.ok) {
            const teamData = await teamRes.json();
            const teamMembers = Array.isArray(teamData?.items) ? teamData.items : [];
            const pm = teamMembers.find((member: any) => 
              member.jabatan?.toLowerCase().includes('pm') || 
              member.jabatan?.toLowerCase().includes('project manager')
            );
            if (pm) {
              projectManager = pm.pegawaiNama || pm.namaLengkap || '-';
            }
          }

          // Fetch project modules
          const modulesRes = await fetch(`/api/proyek-modules/${project.id}/tree`, { 
            cache: 'no-store', 
            credentials: 'include' 
          });
          let totalModul = 0;
          if (modulesRes.ok) {
            const modulesData = await modulesRes.json();
            const countModules = (nodes: any[]): number => {
              let count = 0;
              for (const node of nodes) {
                count += 1;
                if (node.children && Array.isArray(node.children)) {
                  count += countModules(node.children);
                }
              }
              return count;
            };
            totalModul = Array.isArray(modulesData) ? countModules(modulesData) : 0;
          }

          // Fetch project tasks
          const tasksRes = await fetch(`/api/tasklist?projectId=${project.id}&showAll=1`, { 
            cache: 'no-store', 
            credentials: 'include' 
          });
          let totalTask = 0;
          let completedTasks = 0;
          let totalManhour = 0;
          let totalHari = 0;
          
          if (tasksRes.ok) {
            const tasksData = await tasksRes.json();
            const projectTasks = Array.isArray(tasksData?.items) ? tasksData.items : [];
            totalTask = projectTasks.length;
            
            // Calculate completed tasks and manhours
            for (const task of projectTasks) {
              if (task.status === 'SELESAI') {
                completedTasks += 1;
              }
              
              // Add task duration (convert from minutes to hours)
              if (task.totalDurationMinutes && task.totalDurationMinutes > 0) {
                totalManhour += task.totalDurationMinutes / 60;
              }
            }

            // Calculate total days (from first task to last task)
            if (projectTasks.length > 0) {
              const dates = projectTasks
                .map((task: any) => new Date(task.scheduleAt))
                .filter((date: Date) => !isNaN(date.getTime()))
                .sort((a: Date, b: Date) => a.getTime() - b.getTime());
              
              if (dates.length > 1) {
                const firstDate = dates[0];
                const lastDate = dates[dates.length - 1];
                const timeDiff = lastDate.getTime() - firstDate.getTime();
                totalHari = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
              } else if (dates.length === 1) {
                totalHari = 1;
              }
            }
          }

          // Calculate progress percentage
          const progres = totalTask > 0 ? Math.round((completedTasks / totalTask) * 100) : 0;

          // Determine project status - only "On Progress" or "Selesai"
          let status = 'On Progress';
          if (progres === 100) {
            status = 'Selesai';
          }

          reportData.push({
            namaProyek: project.namaProyek,
            projectManager,
            totalModul,
            totalTask,
            totalHari,
            totalManhour: Math.round(totalManhour * 100) / 100, // Round to 2 decimal places
            progres,
            status
          });

        } catch (error) {
          console.error(`Error processing project ${project.id}:`, error);
        }
      }

      setProjectReportData(reportData);
    } catch (error) {
      console.error('Error fetching project report data:', error);
    } finally {
      setLoadingProjectReport(false);
    }
  };

  // Fetch project report data when report type changes to project
  useEffect(() => {
    if (reportType === 'project' && projects.length > 0) {
      fetchProjectReportData();
    }
  }, [reportType, projects, me]);

  // Export project report to Excel
  const exportProjectReportToXLSX = async () => {
    if (projectReportData.length === 0) return;

    const headers = [
      'No',
      'Nama Proyek',
      'Project Manager',
      'Total Modul',
      'Total Task',
      'Total Hari',
      'Total Manhour',
      'Progres (%)',
      'Status'
    ];

    const data = projectReportData.map((item, idx) => [
      idx + 1,
      item.namaProyek,
      item.projectManager,
      item.totalModul,
      item.totalTask,
      item.totalHari,
      item.totalManhour,
      item.progres,
      item.status
    ]);

    // Build workbook with exceljs
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Laporan Proyek');
    
    // Title row
    const title = 'Laporan Per Proyek';
    const titleRow = ws.addRow([title]);
    ws.mergeCells(1, 1, 1, headers.length);
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { horizontal: 'center' };
    
    // Date range if applicable
    let headerStartRow = 3;
    if (filterFrom || filterTo) {
      const rangeText = `${filterFrom || ''} s/d ${filterTo || ''}`;
      const rangeRow = ws.addRow([rangeText]);
      ws.mergeCells(2, 1, 2, headers.length);
      rangeRow.alignment = { horizontal: 'center' };
      headerStartRow = 4;
    }
    
    // Blank spacer row before header
    while (ws.rowCount < headerStartRow - 1) ws.addRow([]);
    
    // Header row
    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    
    // Data rows
    data.forEach((arr) => {
      const row = ws.addRow(arr);
      // Center the No column
      row.getCell(1).alignment = { horizontal: 'center' };
      // Center numeric columns
      row.getCell(4).alignment = { horizontal: 'center' }; // Total Modul
      row.getCell(5).alignment = { horizontal: 'center' }; // Total Task
      row.getCell(6).alignment = { horizontal: 'center' }; // Total Hari
      row.getCell(7).alignment = { horizontal: 'center' }; // Total Manhour
      row.getCell(8).alignment = { horizontal: 'center' }; // Progres
      row.getCell(9).alignment = { horizontal: 'center' }; // Status
      
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
    });
    
    // Auto width columns
    const widths = [6, 30, 20, 12, 12, 12, 15, 12, 15];
    widths.forEach((w, idx) => { ws.getColumn(idx + 1).width = w; });
    
    // Generate file and download
    wb.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${title}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    });
  };

  return (
    <div className="space-y-4">
      {/* Report Type Selector */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jenis Laporan:</label>
        <div className="flex gap-2">
          <button
            onClick={() => setReportType('task')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              reportType === 'task'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Laporan Task
          </button>
          <button
            onClick={() => setReportType('project')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              reportType === 'project'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Laporan Proyek
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 min-w-0">
        {reportType === 'task' && (
          <div className="flex flex-col gap-1 min-w-[240px] w-[260px]">
            <label className="text-sm text-gray-600 dark:text-gray-400">Proyek</label>
            <Select2Field
              value={selectedProjectId === "" ? "" : selectedProjectId}
              onChange={(v) => setSelectedProjectId(v === "" ? "" : Number(v))}
              options={[{ id: "", text: "" }, ...projects.map(p => ({ id: p.id, text: `${p.kodeProyek} - ${p.namaProyek}` }))]}
              placeholder="Pilih proyek"
              className="rounded-md"
            />
          </div>
        )}
        {reportType === 'task' && (
          <>
            <div className="flex flex-col gap-1 min-w-[240px] w-[260px]">
              <label className="text-sm text-gray-600 dark:text-gray-400">User</label>
              <Select2Field
                value={selectedPegawaiId === "" ? "" : selectedPegawaiId}
                onChange={(v) => setSelectedPegawaiId(v === "" ? "" : Number(v))}
                options={[{ id: "", text: "" }, ...filteredPegawaiOptions.map(pg => ({ id: pg.id, text: pg.namaLengkap }))]}
                placeholder="Semua User"
                className="rounded-md"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-sm text-gray-600 dark:text-gray-400">Rentang Tanggal</label>
              <input
                ref={rangeInputRef}
                type="text"
                placeholder="Pilih rentang tanggal"
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 w-[220px] sm:w-[260px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                readOnly
              />
            </div>
          </>
        )}
        <div className="ml-auto flex items-end">
          {reportType === 'task' ? (
            <button
              onClick={exportToXLSX}
              disabled={!selectedProjectId || loadingTasks}
              className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              title="Export ke Excel (XLSX)"
            >
              Export Excel
            </button>
          ) : (
            <button
              onClick={exportProjectReportToXLSX}
              disabled={projectReportData.length === 0 || loadingProjectReport}
              className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              title="Export ke Excel (XLSX)"
            >
              {loadingProjectReport ? 'Loading...' : 'Export Excel'}
            </button>
          )}
        </div>
      </div>
      {/* Debug info removed as requested */}

      {/* Conditional table rendering based on report type */}
      {reportType === 'project' ? (
        /* Project Report Table */
        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2 text-left text-gray-800 dark:text-gray-200">No</th>
                <th className="px-4 py-2 text-left text-gray-800 dark:text-gray-200">Nama Proyek</th>
                <th className="px-4 py-2 text-left text-gray-800 dark:text-gray-200">Project Manager</th>
                <th className="px-4 py-2 text-center text-gray-800 dark:text-gray-200">Total Modul</th>
                <th className="px-4 py-2 text-center text-gray-800 dark:text-gray-200">Total Task</th>
                <th className="px-4 py-2 text-center text-gray-800 dark:text-gray-200">Total Hari</th>
                <th className="px-4 py-2 text-center text-gray-800 dark:text-gray-200">Total Manhour</th>
                <th className="px-4 py-2 text-center text-gray-800 dark:text-gray-200">Progres (%)</th>
                <th className="px-4 py-2 text-center text-gray-800 dark:text-gray-200">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loadingProjectReport ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={9}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Loading project data...
                    </div>
                  </td>
                </tr>
              ) : projectReportData.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={9}>
                    Tidak ada data proyek.
                  </td>
                </tr>
              ) : (
                projectReportData.map((project, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-100">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{project.namaProyek}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{project.projectManager}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{project.totalModul}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{project.totalTask}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{project.totalHari}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{project.totalManhour}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              project.progres === 0 ? 'bg-gray-300 dark:bg-gray-600' :
                              project.progres < 50 ? 'bg-red-500' :
                              project.progres < 80 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${project.progres}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">
                          {project.progres}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                        project.status === 'Selesai' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Task Report Table */
        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2 text-left w-[60%] text-gray-800 dark:text-gray-200">Modul Proyek {selectedProject ? `- ${selectedProject.kodeProyek}` : ""}</th>
                <th className="px-4 py-2 text-left w-[10%] text-gray-800 dark:text-gray-200">Tasks</th>
                <th className="px-4 py-2 text-left text-gray-800 dark:text-gray-200">Progress</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {!selectedProjectId && (
              <tr>
                <td className="px-4 py-4 text-gray-500 dark:text-gray-400" colSpan={3}>Pilih proyek terlebih dahulu.</td>
              </tr>
            )}
            {selectedProjectId && modulesTree.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-gray-500 dark:text-gray-400" colSpan={3}>Tidak ada modul.</td>
              </tr>
            )}
            {selectedProjectId && modulesTree.length > 0 && (
              <>
              {flatRows.map((row) => {
                const isOpenParent = !!(row.children && row.children.length > 0);
                const list = tasksByModule.get(row.id) || [];
                const pct = modulePct.get(row.id) ?? 100;
                const leaf = row.isLeaf;
                const listLen = list.length;
                const canToggle = isOpenParent || (leaf && listLen > 0);
                const isOpen = isOpenParent ? expanded.has(row.id) : detailsOpen.has(row.id);
                const onClick = () => {
                  if (isOpenParent) return toggleExpand(row.id);
                  if (leaf && listLen > 0) return toggleDetails(row.id);
                };
                return (
                  <React.Fragment key={row.id}>
                    <tr>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            className={`w-5 text-center select-none text-gray-700 dark:text-gray-200 ${canToggle ? "" : "text-gray-400 dark:text-gray-500"}`}
                            onClick={canToggle ? onClick : undefined}
                            title={canToggle ? (isOpen ? "Tutup" : "Buka") : ""}
                          >
                            {canToggle ? (isOpen ? "▾" : "▸") : "•"}
                          </button>
                          <span style={{ paddingLeft: `${row.depth * 16}px` }} className="truncate text-gray-800 dark:text-gray-200">
                            {row.nama}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle text-gray-700 dark:text-gray-300">
                        {tasksTotalCountMap.get(row.id) ?? 0}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <div className="flex items-center gap-2 w-full max-w-[220px]">
                          <div className="h-2 flex-1 rounded bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
                            <div
                              className={`h-full rounded ${pct === 0 ? 'bg-gray-300 dark:bg-white/[0.18]' : pct < 50 ? 'bg-red-400 dark:bg-red-600/70' : pct < 80 ? 'bg-amber-400 dark:bg-amber-500/70' : 'bg-green-500 dark:bg-green-600/70'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  {row.isLeaf && detailsOpen.has(row.id) && (
                    <tr>
                      <td colSpan={3} className="px-8 py-2 bg-gray-50 dark:bg-white/[0.02]">
                        {list.length === 0 ? (
                          <div className="text-gray-500 dark:text-gray-400">Tidak ada task</div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {[...list]
                              .sort((a, b) => String(a.kode || '').localeCompare(String(b.kode || ''), undefined, { numeric: true, sensitivity: 'base' }))
                              .map((t) => (
                              <div key={t.id} className="flex items-center justify-between gap-3 rounded bg-white dark:bg-white/[0.04] px-2 py-1 border border-gray-100 dark:border-white/[0.06]">
                                <div className="flex items-center gap-3 text-gray-800 dark:text-gray-200">
                                  <span className="font-medium">{t.kode}</span>
                                  <span className="text-gray-600 dark:text-gray-400">{t.pegawaiNama}</span>
                                  <span className="text-gray-600 dark:text-gray-400">{formatDateTime(t.scheduleAt)}</span>
                                  <span className="flex items-center gap-2">
                                    {statusBadge(t.status)}
                                    {isTaskDone(t.status) && (
                                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">100%</span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => { setDetailItem(t); setDetailOpen(true); }}
                                    className="px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-xs hover:bg-gray-50 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200"
                                  >
                                    Detail
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  {/* Show tasks attached to a non-leaf only when the parent is expanded */}
                  {!row.isLeaf && isOpen && listLen > 0 && (
                    <tr>
                      <td colSpan={3} className="px-8 py-2 bg-gray-50 dark:bg-white/[0.02]">
                        <div className="flex flex-col gap-1">
                          {[...list]
                            .sort((a, b) => String(a.kode || '').localeCompare(String(b.kode || ''), undefined, { numeric: true, sensitivity: 'base' }))
                            .map((t) => (
                            <div key={t.id} className="flex items-center justify-between gap-3 rounded bg-white dark:bg-white/[0.04] px-2 py-1 border border-gray-100 dark:border-white/[0.06]">
                              <div className="flex items-center gap-3 text-gray-800 dark:text-gray-200">
                                <span className="font-medium">{t.kode}</span>
                                <span className="text-gray-600 dark:text-gray-400">{t.pegawaiNama}</span>
                                <span className="text-gray-600 dark:text-gray-400">{formatDateTime(t.scheduleAt)}</span>
                                <span className="flex items-center gap-2">
                                  {statusBadge(t.status)}
                                  {isTaskDone(t.status) && (
                                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">100%</span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => { setDetailItem(t); setDetailOpen(true); }}
                                  className="px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-xs hover:bg-gray-50 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200"
                                >
                                  Detail
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            </>
          )}
          </tbody>
        </table>
      </div>
      )}
    {reportType === 'task' && selectedProjectId && orphanTasks.length > 0 && (
      <div className="mt-4 overflow-hidden rounded-md border border-amber-200 dark:border-amber-500/30">
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold text-sm">Task tanpa modul pada tree</div>
        <div className="p-2">
          <div className="flex flex-col gap-1">
            {[...orphanTasks]
              .sort((a, b) => String(a.kode || '').localeCompare(String(b.kode || ''), undefined, { numeric: true, sensitivity: 'base' }))
              .map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded bg-white dark:bg-white/[0.04] px-2 py-1 border border-gray-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-3 text-gray-800 dark:text-gray-200">
                  <span className="font-medium">{t.kode}</span>
                  <span className="text-gray-600 dark:text-gray-400">{t.pegawaiNama}</span>
                  <span className="text-gray-600 dark:text-gray-400">{formatDateTime(t.scheduleAt)}</span>
                  <span className="flex items-center gap-2">
                    {statusBadge(t.status)}
                    {isTaskDone(t.status) && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">100%</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setDetailItem(t); setDetailOpen(true); }}
                    className="px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-xs hover:bg-gray-50 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200"
                  >
                    Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    {/* Detail Modal for single task */}
    <Modal isOpen={detailOpen} onClose={() => { setDetailOpen(false); setDetailItem(null); }} disableOutsideClose={true} className="w-[96vw] max-w-4xl">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Detail Task</h3>
        {/* Scrollable body to handle long keterangan/history */}
        <div className="mt-4 max-h-[70vh] overflow-y-auto pr-2">
        {detailItem ? (
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-800 dark:text-gray-200 md:grid-cols-2">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Kode:</span>
              <div className="font-medium">{detailItem.kode || '-'}</div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
              <div>{formatDateDMY(detailItem.scheduleAt)}</div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Proyek:</span>
              <div>{detailItem.proyekNama || '-'}</div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Modul:</span>
              <div>{modulePathMap.get(detailItem.moduleId) || detailItem.moduleNama || '-'}</div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">User:</span>
              <div>{detailItem.pegawaiNama || '-'}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Status:</span>
              {statusBadge(detailItem.status)}
            </div>
            <div className="md:col-span-2">
              <span className="text-gray-500 dark:text-gray-400">Keterangan:</span>
              <div className="mt-1 whitespace-pre-wrap">{detailItem.keterangan || '-'}</div>
            </div>
            {detailItem.imagePath && (
              <div className="md:col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Gambar:</span>
                <div className="mt-2">
                  <a href={detailItem.imagePath} target="_blank" rel="noopener noreferrer" className="inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detailItem.imagePath} alt="Task Image" className="max-h-64 rounded border" />
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Tidak ada data.</p>
        )}
        {/* History section (mirror Tasklist) */}
        {detailItem && (
          <>
            <hr className="my-6 border-gray-200 dark:border-white/[0.06]" />
            <div className="mt-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Riwayat Perubahan</h4>
              {detailLogsLoading ? (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Memuat riwayat...</p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-600 dark:text-gray-300">
                        <th className="px-2 py-1">Waktu</th>
                        <th className="px-2 py-1">User</th>
                        <th className="px-2 py-1">Keterangan</th>
                        <th className="px-2 py-1">Status</th>
                        <th className="px-2 py-1">Foto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                      {detailLogs.length === 0 ? (
                        <tr><td className="px-2 py-2 text-gray-500 dark:text-gray-400" colSpan={5}>Tidak ada riwayat.</td></tr>
                      ) : (
                        detailLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="px-2 py-1 whitespace-nowrap">{formatDateTimeFull(log.waktu)}</td>
                            <td className="px-2 py-1 whitespace-nowrap">{log.userNama || log.userId}</td>
                            <td className="px-2 py-1 text-gray-800 dark:text-gray-200">
                              {(() => {
                                const keterangan = log.keterangan || '-';
                                
                                // Check if this contains programmer's note and format it better
                                if (keterangan.includes('Keterangan dari programmer:')) {
                                  const parts = keterangan.split('\n\nKeterangan dari programmer:\n');
                                  if (parts.length === 2) {
                                    return (
                                      <div className="text-sm">
                                        <div>{parts[0]}</div>
                                        <div className="mt-1">Deskripsi: {parts[1]}</div>
                                      </div>
                                    );
                                  }
                                }
                                
                                return <div className="whitespace-pre-wrap">{keterangan}</div>;
                              })()}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap">{statusBadge(log.status || undefined)}</td>
                            <td className="px-2 py-1 whitespace-nowrap">
                              {log.imagePath ? (
                                <a href={log.imagePath} target="_blank" rel="noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={log.imagePath} alt="Log" className="h-10 w-10 object-cover rounded border" />
                                </a>
                              ) : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={() => { setDetailOpen(false); setDetailItem(null); }} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200">Tutup</button>
        </div>
      </div>
    </Modal>
  </div>
);
}
