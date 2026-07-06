"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchOnce, fetchOnceJson } from "@/lib/fetchOnce";
import Select2Field from "@/components/form/Select2Field";
import ExcelJS from "exceljs";
import { useAuth } from "@/context/AuthContext";
import TaskViewModal from "@/components/tasklist/TaskViewModal";

// Types
type TabType = "task" | "support" | "project-summary" | "pm-report" | "programmer-admin";
type Proyek = { id: number; kodeProyek: string; namaProyek: string };
type Pegawai = { id: number; namaLengkap: string };
type ModulNode = { id: number; nama: string; children?: ModulNode[]; isLeaf?: boolean; kode?: string | null };
type FlatRow = { id: number; nama: string; depth: number; isLeaf: boolean; children?: ModulNode[] };

interface TaskItem {
  id: number;
  kode: string;
  projectId: number;
  moduleId: number;
  pegawaiId: number;
  scheduleAt: string;
  status: string;
  keterangan?: string | null;
  proyekNama?: string;
  moduleNama?: string;
  pegawaiNama?: string;
  updatedAt?: string; // For completion time approximation
  totalDurationMinutes?: number; // For manhour display
}

interface BugItem {
  id: number;
  deskripsi: string;
  projectId: number;
  moduleId: number;
  severity: "Critical" | "Major" | "Minor";
  status: string;
  dilaporkanOleh?: string;
  tanggalLapor?: string;
  proyekNama?: string;
  moduleNama?: string;
}

interface TicketItem {
  id: string;
  subjek: string;
  klien: string;
  tanggalMasuk: string;
  statusPenyelesaian: string;
  waktuResolusi: string;
  statusSLA: "Met" | "Missed";
  sumber?: string;
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
  tanggalSelesai: string | null;
};

// PM report data type
type PMReportData = {
  projectManager: string;
  jumlahProyek: number;
  totalModul: number;
  totalTask: number;
  totalHari: number;
  totalManhour: number;
  rataRataProgres: number;
  kinerja: string;
};

// Programmer/Admin report data type
type ProgrammerAdminReportData = {
  namaLengkap: string;
  role: string;
  totalTask: number;
  taskSelesai: number;
  progres: number;
  totalManhour: number;
  kinerja: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Calculate deadline status for completed tasks
function calculateDeadlineStatus(scheduleAt: string, completedAt?: string, status?: string) {
  // Only calculate for completed tasks
  if (status !== 'SELESAI' || !completedAt) return null;

  const targetDate = new Date(scheduleAt);
  const actualDate = new Date(completedAt);

  // Set both to start of day for fair comparison
  targetDate.setHours(0, 0, 0, 0);
  actualDate.setHours(0, 0, 0, 0);

  const diffMs = actualDate.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    isLate: diffDays > 0,
    isOnTime: diffDays === 0,
    isEarly: diffDays < 0,
    diffDays: Math.abs(diffDays)
  };
}

// Format manhour from minutes to readable format
function formatManhour(minutes?: number): string {
  if (!minutes || minutes === 0) return '-';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) {
      return `${days} hari`;
    }
    return `${days} hari ${remainingHours} jam`;
  }

  if (mins === 0) {
    return `${hours} jam`;
  }

  return `${hours} jam ${mins} menit`;
}

export default function ReportsPage() {
  const { user: me } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("project-summary");
  const [projects, setProjects] = useState<Proyek[]>([]);
  const [pegawaiOptions, setPegawaiOptions] = useState<Pegawai[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [selectedPegawaiId, setSelectedPegawaiId] = useState<number | "">("");

  const [modulesTree, setModulesTree] = useState<ModulNode[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Project report state
  const [projectReportData, setProjectReportData] = useState<ProjectReportData[]>([]);
  const [loadingProjectReport, setLoadingProjectReport] = useState(false);

  // PM report state
  const [pmReportData, setPMReportData] = useState<PMReportData[]>([]);
  const [loadingPMReport, setLoadingPMReport] = useState(false);

  // Programmer/Admin report state
  const [programmerAdminReportData, setProgrammerAdminReportData] = useState<ProgrammerAdminReportData[]>([]);
  const [loadingProgrammerAdminReport, setLoadingProgrammerAdminReport] = useState(false);

  // Task detail modal state
  const [detailItem, setDetailItem] = useState<TaskItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Project detail state for Project Summary tab
  const [projectDetailOpen, setProjectDetailOpen] = useState(false);
  const [projectDetailId, setProjectDetailId] = useState<number | null>(null);

  // Load projects
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchOnceJson<any>("/api/proyek?activeOnly=true", { ttlMs: 3000, credentials: 'include' });
        if (Array.isArray(data?.items)) setProjects(data.items);
      } catch (e) {
        console.error("Failed to load proyek", e);
      }
    };
    load();
  }, []);

  // Load pegawai options
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchOnceJson<any>("/api/pegawai", { ttlMs: 3000 });
        const rows = Array.isArray(data?.items) ? data.items : [];
        setPegawaiOptions(rows.map((p: any) => ({ id: p.id, namaLengkap: p.namaLengkap })));
      } catch (e) {
        console.error("Failed to load pegawai", e);
      }
    };
    load();
  }, []);

  // Load modules tree when selected project changes (for Task tab) or when inline project detail changes (Project Summary tab)
  useEffect(() => {
    const loadTree = async () => {
      setModulesTree([]);
      setExpanded(new Set());
      const effectiveProjectId = activeTab === 'project-summary' ? projectDetailId : selectedProjectId;
      if (!effectiveProjectId) return;
      try {
        const res = await fetch(`/api/proyek-modules/${effectiveProjectId}/tree`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const tree = Array.isArray(data?.tree) ? (data.tree as ModulNode[]) : [];
          setModulesTree(tree);
          setExpanded(new Set());
        }
      } catch (e) {
        console.error("Failed to load modules tree", e);
      }
    };
    loadTree();
  }, [activeTab, selectedProjectId, projectDetailId]);

  // Load tasks for project when filters change (Task tab) or when inline project detail changes (Project Summary tab)
  useEffect(() => {
    const loadTasks = async () => {
      setTasks([]);
      const effectiveProjectId = activeTab === 'project-summary' ? projectDetailId : selectedProjectId;
      if (!effectiveProjectId) return;
      setLoadingData(true);
      try {
        const params = new URLSearchParams();
        params.set("projectId", String(effectiveProjectId));
        if (selectedPegawaiId) params.set("pegawaiId", String(selectedPegawaiId));
        params.set("showAll", "1");
        params.set("page", "1");
        params.set("size", "5000");
        const res = await fetch(`/api/tasklist?${params.toString()}`, { cache: "no-store", credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          setTasks(items);
        }
      } catch (e) {
        console.error("Failed to load tasks", e);
      } finally {
        setLoadingData(false);
      }
    };
    loadTasks();
  }, [activeTab, projectDetailId, selectedProjectId, selectedPegawaiId]);

  // Load bugs (mock data for now - replace with actual API call)
  useEffect(() => {
    if (!selectedProjectId) {
      setBugs([]);
      return;
    }
    // Mock bug data
    const mockBugs: BugItem[] = [
      {
        id: 1,
        deskripsi: "Login form tidak responsif di mobile",
        projectId: selectedProjectId as number,
        moduleId: 1,
        severity: "Critical",
        status: "Open",
        dilaporkanOleh: "QA Team",
        tanggalLapor: "2024-09-20",
      },
      {
        id: 2,
        deskripsi: "Data tidak tersimpan setelah submit",
        projectId: selectedProjectId as number,
        moduleId: 2,
        severity: "Major",
        status: "In Progress",
        dilaporkanOleh: "User Testing",
        tanggalLapor: "2024-09-22",
      },
    ];
    setBugs(mockBugs);
  }, [selectedProjectId]);

  // Load support tickets (mock data for now - replace with actual API call)
  useEffect(() => {
    // Mock ticket data
    const mockTickets: TicketItem[] = [
      {
        id: "TKT-001",
        subjek: "Error saat login",
        klien: "PT Maju Jaya",
        tanggalMasuk: "2024-09-20",
        statusPenyelesaian: "Resolved",
        waktuResolusi: "2 jam",
        statusSLA: "Met",
        sumber: "Email",
      },
      {
        id: "TKT-002",
        subjek: "Permintaan fitur baru",
        klien: "Universitas Indonesia",
        tanggalMasuk: "2024-09-22",
        statusPenyelesaian: "In Progress",
        waktuResolusi: "-",
        statusSLA: "Met",
        sumber: "CRM",
      },
      {
        id: "TKT-003",
        subjek: "Bug pada modul laporan",
        klien: "Bank Sejahtera",
        tanggalMasuk: "2024-09-18",
        statusPenyelesaian: "Resolved",
        waktuResolusi: "5 jam",
        statusSLA: "Missed",
        sumber: "Telepon",
      },
      {
        id: "TKT-004",
        subjek: "Sistem lambat saat peak hour",
        klien: "PT Digital Solutions",
        tanggalMasuk: "2024-09-25",
        statusPenyelesaian: "Open",
        waktuResolusi: "-",
        statusSLA: "Met",
        sumber: "CRM",
      },
    ];
    setTickets(mockTickets);
  }, []);

  // Fetch project report data using consolidated API
  const fetchProjectReportData = async () => {
    if (!me) return;

    try {
      setLoadingProjectReport(true);

      const res = await fetch('/api/reports/consolidated?type=project-summary', {
        cache: 'no-store',
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setProjectReportData(data.data || []);
      } else {
        console.error('Failed to fetch project report data');
        setProjectReportData([]);
      }
    } catch (error) {
      console.error('Error fetching project report data:', error);
      setProjectReportData([]);
    } finally {
      setLoadingProjectReport(false);
    }
  };

  // Fetch project report data when tab is project-summary
  useEffect(() => {
    if (activeTab === 'project-summary') {
      fetchProjectReportData();
    }
  }, [activeTab, me]);

  // Fetch PM report data using consolidated API
  const fetchPMReportData = async () => {
    if (!me) return;

    try {
      setLoadingPMReport(true);

      const res = await fetch('/api/reports/consolidated?type=pm-report', {
        cache: 'no-store',
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setPMReportData(data.data || []);
      } else {
        console.error('Failed to fetch PM report data');
        setPMReportData([]);
      }
    } catch (error) {
      console.error('Error fetching PM report data:', error);
      setPMReportData([]);
    } finally {
      setLoadingPMReport(false);
    }
  };

  // Fetch PM report data when tab is pm-report
  useEffect(() => {
    if (activeTab === 'pm-report') {
      fetchPMReportData();
    }
  }, [activeTab, me]);

  // Fetch Programmer/Admin report data using consolidated API
  const fetchProgrammerAdminReportData = async () => {
    if (!me) return;

    try {
      setLoadingProgrammerAdminReport(true);

      const res = await fetch('/api/reports/consolidated?type=programmer-admin', {
        cache: 'no-store',
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setProgrammerAdminReportData(data.data || []);
      } else {
        console.error('Failed to fetch programmer/admin report data');
        setProgrammerAdminReportData([]);
      }
    } catch (error) {
      console.error('Error fetching programmer/admin report data:', error);
      setProgrammerAdminReportData([]);
    } finally {
      setLoadingProgrammerAdminReport(false);
    }
  };

  // Fetch Programmer/Admin report data when tab is programmer-admin
  useEffect(() => {
    if (activeTab === 'programmer-admin') {
      fetchProgrammerAdminReportData();
    }
  }, [activeTab, me]);



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
      'Status',
      'Tanggal Selesai'
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
      item.status,
      item.tanggalSelesai || '-'
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

    // Blank spacer row before header
    ws.addRow([]);

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
      row.getCell(10).alignment = { horizontal: 'center' }; // Tanggal Selesai

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
    });

    // Auto width columns
    const widths = [6, 30, 20, 12, 12, 12, 15, 12, 15, 18];
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

  // Export PM report to Excel
  const exportPMReportToXLSX = async () => {
    if (pmReportData.length === 0) return;

    const headers = [
      'No',
      'Project Manager',
      'Jumlah Proyek',
      'Total Modul',
      'Total Task',
      'Total Hari',
      'Total Manhour',
      'Progres (%)',
      'Kinerja'
    ];

    const data = pmReportData.map((item, idx) => [
      idx + 1,
      item.projectManager,
      item.jumlahProyek,
      item.totalModul,
      item.totalTask,
      item.totalHari,
      item.totalManhour,
      item.rataRataProgres,
      item.kinerja
    ]);

    // Build workbook with exceljs
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Laporan PM');

    // Title row
    const title = 'Laporan Per Project Manager';
    const titleRow = ws.addRow([title]);
    ws.mergeCells(1, 1, 1, headers.length);
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { horizontal: 'center' };

    // Blank spacer row before header
    ws.addRow([]);

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
      row.getCell(3).alignment = { horizontal: 'center' }; // Jumlah Proyek
      row.getCell(4).alignment = { horizontal: 'center' }; // Total Modul
      row.getCell(5).alignment = { horizontal: 'center' }; // Total Task
      row.getCell(6).alignment = { horizontal: 'center' }; // Total Hari
      row.getCell(7).alignment = { horizontal: 'center' }; // Total Manhour
      row.getCell(8).alignment = { horizontal: 'center' }; // Rata-rata Progres
      row.getCell(9).alignment = { horizontal: 'center' }; // Kinerja

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
    });

    // Auto width columns
    const widths = [6, 25, 15, 12, 12, 12, 15, 18, 15];
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

  // Export Programmer/Admin report to Excel
  const exportProgrammerAdminReportToXLSX = async () => {
    if (programmerAdminReportData.length === 0) return;

    const headers = [
      'No',
      'Nama Lengkap',
      'Role',
      'Total Task',
      'Task Selesai',
      'Progres (%)',
      'Total Manhour',
      'Kinerja'
    ];

    const data = programmerAdminReportData.map((item, idx) => [
      idx + 1,
      item.namaLengkap,
      item.role,
      item.totalTask,
      item.taskSelesai,
      item.progres,
      item.totalManhour,
      item.kinerja
    ]);

    // Build workbook with exceljs
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Laporan Programmer/Admin');

    // Title row
    const title = 'Laporan Per Programmer/Admin';
    const titleRow = ws.addRow([title]);
    ws.mergeCells(1, 1, 1, headers.length);
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { horizontal: 'center' };

    // Blank spacer row before header
    ws.addRow([]);

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
      row.getCell(4).alignment = { horizontal: 'center' }; // Total Task
      row.getCell(5).alignment = { horizontal: 'center' }; // Task Selesai
      row.getCell(6).alignment = { horizontal: 'center' }; // Progres
      row.getCell(7).alignment = { horizontal: 'center' }; // Total Manhour
      row.getCell(8).alignment = { horizontal: 'center' }; // Kinerja

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
    });

    // Auto width columns
    const widths = [6, 25, 15, 12, 12, 12, 15, 15];
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

  // Flatten tree into rows with depth for rendering
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

  // Map tasks by moduleId
  const tasksByModule = useMemo(() => {
    const m = new Map<number, TaskItem[]>();
    for (const t of tasks) {
      const arr = m.get(t.moduleId) || [];
      arr.push(t);
      m.set(t.moduleId, arr);
    }
    return m;
  }, [tasks]);

  // Map bugs by moduleId
  const bugsByModule = useMemo(() => {
    const m = new Map<number, BugItem[]>();
    for (const b of bugs) {
      const arr = m.get(b.moduleId) || [];
      arr.push(b);
      m.set(b.moduleId, arr);
    }
    return m;
  }, [bugs]);

  // Aggregate counts per module (including descendants)
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

  const bugsTotalCountMap = useMemo(() => {
    const direct = new Map<number, number>();
    for (const [mid, arr] of bugsByModule.entries()) direct.set(mid, arr.length);
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
  }, [modulesTree, bugsByModule]);

  // Check if task is done
  const isTaskDone = (status?: string | null) => {
    const s = String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
    return s === 'selesai' || s === 'done' || s === 'completed';
  };

  // Status badge
  const statusBadge = (s?: string) => {
    const raw = String(s || '').trim();
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

  const severityBadge = (severity: string) => {
    let cls = 'bg-gray-100 text-gray-800';
    if (severity === 'Critical') cls = 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300';
    if (severity === 'Major') cls = 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300';
    if (severity === 'Minor') cls = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300';
    return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{severity}</span>;
  };

  const slaBadge = (status: "Met" | "Missed") => {
    const cls = status === "Met"
      ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300';
    return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
  };

  // Deadline badge for task completion comparison
  const deadlineBadge = (scheduleAt: string, completedAt?: string, status?: string) => {
    const result = calculateDeadlineStatus(scheduleAt, completedAt, status);
    if (!result) return null;

    if (result.isLate) {
      const label = result.diffDays === 0
        ? `Lebih waktu: < 1 hari`
        : `Lebih waktu: ${result.diffDays} hari`;
      return (
        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300">
          {label}
        </span>
      );
    } else if (result.isOnTime) {
      return (
        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300">
          Tepat waktu
        </span>
      );
    } else {
      // Early completion
      const label = result.diffDays === 0
        ? `Sisa waktu: < 1 hari`
        : `Sisa waktu: ${result.diffDays} hari`;
      return (
        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300">
          {label}
        </span>
      );
    }
  };

  // Calculate support statistics
  const supportStats = useMemo(() => {
    const totalTiket = tickets.length;
    const tiketSelesai = tickets.filter(t => t.statusPenyelesaian === "Resolved").length;
    const slaTercapai = totalTiket > 0 ? Math.round((tickets.filter(t => t.statusSLA === "Met").length / totalTiket) * 100) : 0;

    // Count by source
    const sumberCounts = tickets.reduce((acc, t) => {
      const sumber = t.sumber || "Lainnya";
      acc[sumber] = (acc[sumber] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalTiket, tiketSelesai, slaTercapai, sumberCounts };
  }, [tickets]);

  // Compute per-module percentage
  const modulePct = useMemo(() => {
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

  // Track which leaf rows show details
  const [detailsOpen, setDetailsOpen] = useState<Set<number>>(new Set());
  const toggleDetails = (id: number) => {
    setDetailsOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Export to Excel
  const exportToXLSX = () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Laporan');
    const proj = projects.find(p => p.id === selectedProjectId);
    const projName = proj?.namaProyek || '-';
    const title = `Laporan ${activeTab === 'task' ? 'Task' : activeTab === 'programmer-admin' ? 'Programmer/Admin' : 'Support'} - ${projName}`;
    const titleRow = ws.addRow([title]);
    ws.mergeCells(1, 1, 1, 7);
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { horizontal: 'center' };

    ws.addRow([]);

    if (activeTab === 'task') {
      const headers = ["No", "Proyek", "Modul", "User", "Tanggal", "Status", "Keterangan"];
      const headerRow = ws.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
      });

      tasks.forEach((t, idx) => {
        ws.addRow([
          idx + 1,
          t.proyekNama || "",
          t.moduleNama || "",
          t.pegawaiNama || "",
          formatDateTime(t.scheduleAt),
          t.status || "",
          t.keterangan || "",
        ]);
      });
    } else if (activeTab === 'programmer-admin') {
      const headers = ["No", "Nama Lengkap", "Role", "Total Task", "Task Selesai", "Progres (%)", "Total Manhour", "Kinerja"];
      const headerRow = ws.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
      });

      programmerAdminReportData.forEach((programmer, idx) => {
        ws.addRow([
          idx + 1,
          programmer.namaLengkap,
          programmer.role,
          programmer.totalTask,
          programmer.taskSelesai,
          programmer.progres,
          programmer.totalManhour,
          programmer.kinerja
        ]);
      });
    }

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Laporan</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: "project-summary", label: "Laporan Proyek" },
            { id: "pm-report", label: "Laporan PM" },
            { id: "task", label: "Laporan Task" },
            { id: "programmer-admin", label: "Laporan Programmer/Admin" },
            { id: "support", label: "Laporan Tiket Support" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        {activeTab === 'project-summary' ? (
          <div className="flex items-center gap-4">
            <button
              onClick={exportProjectReportToXLSX}
              disabled={projectReportData.length === 0 || loadingProjectReport}
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export ke Excel (XLSX)"
            >
              {loadingProjectReport ? 'Loading...' : 'Export Excel'}
            </button>
          </div>
        ) : activeTab === 'pm-report' ? (
          <div className="flex items-center gap-4">
            <button
              onClick={exportPMReportToXLSX}
              disabled={pmReportData.length === 0 || loadingPMReport}
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export ke Excel (XLSX)"
            >
              {loadingPMReport ? 'Loading...' : 'Export Excel'}
            </button>
          </div>
        ) : activeTab === 'programmer-admin' ? (
          <div className="flex items-center gap-4">
            <button
              onClick={exportProgrammerAdminReportToXLSX}
              disabled={programmerAdminReportData.length === 0 || loadingProgrammerAdminReport}
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export ke Excel (XLSX)"
            >
              {loadingProgrammerAdminReport ? 'Loading...' : 'Export Excel'}
            </button>
          </div>
        ) : (
          <>
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
          </>
        )}
        {activeTab === 'task' && (
          <div className="flex flex-col gap-1 min-w-[240px] w-[260px]">
            <label className="text-sm text-gray-600 dark:text-gray-400">User</label>
            <Select2Field
              value={selectedPegawaiId === "" ? "" : selectedPegawaiId}
              onChange={(v) => setSelectedPegawaiId(v === "" ? "" : Number(v))}
              options={[{ id: "", text: "" }, ...pegawaiOptions.map(pg => ({ id: pg.id, text: pg.namaLengkap }))]}
              placeholder="Semua User"
              className="rounded-md"
            />
          </div>
        )}
        {activeTab !== 'project-summary' && activeTab !== 'pm-report' && activeTab !== 'programmer-admin' && (
          <div className="ml-auto flex items-end">
            <button
              onClick={exportToXLSX}
              disabled={!selectedProjectId || loadingData}
              className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              title="Export ke Excel (XLSX)"
            >
              Export Excel
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'project-summary' ? (
        <>
        {/* Project Summary Report */}
        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-3 text-left text-gray-800 dark:text-gray-200 font-medium">No</th>
                <th className="px-4 py-3 text-left text-gray-800 dark:text-gray-200 font-medium">Nama Proyek</th>
                <th className="px-4 py-3 text-left text-gray-800 dark:text-gray-200 font-medium">Project Manager</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Total Modul</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Total Task</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Total Hari Dikerjakan</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Total Manhour</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Progres (%)</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Tanggal Selesai</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Status</th>
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
                projectReportData.map((project, index) => {
                  const projRecord = projects.find((pp) => pp.namaProyek === project.namaProyek);
                  const isOpenInline = projectDetailOpen && projRecord && projectDetailId === projRecord.id;
                  return (
                    <React.Fragment key={index}>
                      <tr
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
                        onClick={() => {
                          if (!projRecord) return;
                          const isSame = projectDetailId === projRecord.id && projectDetailOpen;
                          setProjectDetailId(projRecord.id);
                          setExpanded(new Set());
                          setDetailsOpen(new Set());
                          setProjectDetailOpen(!isSame ? true : !projectDetailOpen);
                        }}
                      >
                        <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-100">{index + 1}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                          <span className="mr-2 text-gray-500">{isOpenInline ? '▾' : '▸'}</span>
                          {project.namaProyek}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{project.projectManager}</td>
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{project.totalModul}</td>
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{project.totalTask}</td>
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{project.totalHari}</td>
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{project.totalManhour}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${project.progres === 0 ? 'bg-gray-300 dark:bg-gray-600' :
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
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{project.tanggalSelesai || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${project.status === 'BLUEPRINT' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                            project.status === 'DEVELOPMENT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                              project.status === 'SUPPORT' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                            {project.status}
                          </span>
                        </td>
                      </tr>
                      {isOpenInline && (
                        <tr>
                          <td colSpan={10} className="px-4 pb-4">
                            <div className="mt-2 overflow-hidden rounded-md border border-gray-200 dark:border-white/[0.06]">
                              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-white/[0.02]">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  Detail Proyek: {projRecord?.namaProyek || '-'}
                                </h3>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setProjectDetailOpen(false); }}
                                  className="px-2 py-1 rounded-md bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-white/20 text-xs"
                                >
                                  Tutup
                                </button>
                              </div>
                              <div className="overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50 dark:bg-white/[0.02]">
                                    <tr>
                                      <th className="px-4 py-2 text-left w-[60%] text-gray-800 dark:text-gray-200">
                                        Modul Proyek {projRecord?.kodeProyek ? `- ${projRecord?.kodeProyek}` : ""}
                                      </th>
                                      <th className="px-4 py-2 text-left w-[10%] text-gray-800 dark:text-gray-200">Tasks</th>
                                      <th className="px-4 py-2 text-left text-gray-800 dark:text-gray-200">Progress</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                    {modulesTree.length === 0 && (
                                      <tr>
                                        <td className="px-4 py-4 text-gray-500 dark:text-gray-400" colSpan={3}>Tidak ada modul.</td>
                                      </tr>
                                    )}
                                    {modulesTree.length > 0 && (
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
                                          const totalCount = tasksTotalCountMap.get(row.id) ?? 0;

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
                                                <td className="px-4 py-2 align-middle text-gray-700 dark:text-gray-300">{totalCount}</td>
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
                                                      <div className="overflow-x-auto">
                                                        <table className="min-w-full text-xs border border-gray-200 dark:border-white/[0.06]">
                                                          <thead className="bg-gray-100 dark:bg-white/[0.06]">
                                                            <tr>
                                                              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Kode</th>
                                                              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Programmer</th>
                                                              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Scheduled</th>
                                                              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Due Date</th>
                                                              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Tanggal Realisasi</th>
                                                              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                                                              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Waktu Pengerjaan</th>
                                                              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Keterangan</th>
                                                            </tr>
                                                          </thead>
                                                          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                                            {(list as TaskItem[]).map((t) => (
                                                              <tr
                                                                key={t.id}
                                                                className="hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
                                                                onClick={() => { setDetailItem(t); setDetailOpen(true); }}
                                                              >
                                                                <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{t.kode}</td>
                                                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{t.pegawaiNama}</td>
                                                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatDateTime(t.scheduleAt)}</td>
                                                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatDateTime(t.scheduleAt)}</td>
                                                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{t.status === 'SELESAI' && t.updatedAt ? formatDateTime(t.updatedAt) : '-'}</td>
                                                                <td className="px-3 py-2">{statusBadge(t.status)}</td>
                                                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatManhour(t.totalDurationMinutes)}</td>
                                                                <td className="px-3 py-2">{deadlineBadge(t.scheduleAt, t.updatedAt, t.status) || <span className="text-gray-500 dark:text-gray-400">-</span>}</td>
                                                              </tr>
                                                            ))}
                                                          </tbody>
                                                        </table>
                                                      </div>
                                                    )}
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
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </>
      ) : activeTab === 'pm-report' ? (
        /* PM Report */
        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-3 text-left text-gray-800 dark:text-gray-200 font-medium">No</th>
                <th className="px-4 py-3 text-left text-gray-800 dark:text-gray-200 font-medium">Project Manager</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Jumlah Proyek</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Total Modul</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Total Task</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Total Hari</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Total Manhour</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium"> Progres (%)</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Kinerja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loadingPMReport ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={9}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Loading PM data...
                    </div>
                  </td>
                </tr>
              ) : pmReportData.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={9}>
                    Tidak ada data PM.
                  </td>
                </tr>
              ) : (
                pmReportData.map((pm, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-100">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{pm.projectManager}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{pm.jumlahProyek}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{pm.totalModul}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{pm.totalTask}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{pm.totalHari}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{pm.totalManhour}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pm.rataRataProgres === 0 ? 'bg-gray-300 dark:bg-gray-600' :
                              pm.rataRataProgres < 50 ? 'bg-red-500' :
                                pm.rataRataProgres < 80 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                            style={{ width: `${pm.rataRataProgres}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">
                          {pm.rataRataProgres}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${pm.kinerja === 'Sempurna' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        pm.kinerja === 'Sangat Baik' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                          pm.kinerja === 'Cukup Baik' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                        {pm.kinerja}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'programmer-admin' ? (
        /* Programmer/Admin Report */
        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-3 text-left text-gray-800 dark:text-gray-200 font-medium">No</th>
                <th className="px-4 py-3 text-left text-gray-800 dark:text-gray-200 font-medium">Nama Lengkap</th>
                <th className="px-4 py-3 text-left text-gray-800 dark:text-gray-200 font-medium">Role</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Total Task</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Task Selesai</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Progres (%)</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Total Manhour</th>
                <th className="px-4 py-3 text-center text-gray-800 dark:text-gray-200 font-medium">Kinerja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loadingProgrammerAdminReport ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={8}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Loading programmer/admin data...
                    </div>
                  </td>
                </tr>
              ) : programmerAdminReportData.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={8}>
                    Tidak ada data programmer/admin.
                  </td>
                </tr>
              ) : (
                programmerAdminReportData.map((programmer, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-100">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{programmer.namaLengkap}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{programmer.role}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{programmer.totalTask}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{programmer.taskSelesai}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${programmer.progres === 0 ? 'bg-gray-300 dark:bg-gray-600' :
                              programmer.progres < 50 ? 'bg-red-500' :
                                programmer.progres < 80 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                            style={{ width: `${programmer.progres}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">
                          {programmer.progres}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{programmer.totalManhour}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${programmer.kinerja === 'Sempurna' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        programmer.kinerja === 'Sangat Baik' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                          programmer.kinerja === 'Cukup Baik' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                        {programmer.kinerja}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'support' ? (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tiket Masuk</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{supportStats.totalTiket}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tiket Selesai</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{supportStats.tiketSelesai}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">SLA Tercapai</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{supportStats.slaTercapai}%</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Daftar Tiket Support</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">ID Tiket</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Subjek</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Klien</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Tanggal Masuk</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Waktu Resolusi</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Status SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-100 font-medium">{ticket.id}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{ticket.subjek}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{ticket.klien}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{ticket.tanggalMasuk}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{ticket.statusPenyelesaian}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{ticket.waktuResolusi}</td>
                      <td className="px-6 py-4">{slaBadge(ticket.statusSLA)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2 text-left w-[60%] text-gray-800 dark:text-gray-200">
                  Modul Proyek {selectedProject ? `- ${selectedProject.kodeProyek}` : ""}
                </th>
                <th className="px-4 py-2 text-left w-[10%] text-gray-800 dark:text-gray-200">
                  {activeTab === 'task' ? 'Tasks' : activeTab === 'programmer-admin' ? 'Programmer/Admin' : 'Items'}
                </th>
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
                    const list = activeTab === 'task' ? (tasksByModule.get(row.id) || []) : (bugsByModule.get(row.id) || []);
                    const pct = modulePct.get(row.id) ?? 100;
                    const leaf = row.isLeaf;
                    const listLen = list.length;
                    const canToggle = isOpenParent || (leaf && listLen > 0);
                    const isOpen = isOpenParent ? expanded.has(row.id) : detailsOpen.has(row.id);
                    const onClick = () => {
                      if (isOpenParent) return toggleExpand(row.id);
                      if (leaf && listLen > 0) return toggleDetails(row.id);
                    };
                    const totalCount = activeTab === 'task' ? (tasksTotalCountMap.get(row.id) ?? 0) : (bugsTotalCountMap.get(row.id) ?? 0);

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
                            {totalCount}
                          </td>
                          <td className="px-4 py-2 align-middle">
                            {activeTab === 'task' && (
                              <div className="flex items-center gap-2 w-full max-w-[220px]">
                                <div className="h-2 flex-1 rounded bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
                                  <div
                                    className={`h-full rounded ${pct === 0 ? 'bg-gray-300 dark:bg-white/[0.18]' : pct < 50 ? 'bg-red-400 dark:bg-red-600/70' : pct < 80 ? 'bg-amber-400 dark:bg-amber-500/70' : 'bg-green-500 dark:bg-green-600/70'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">{pct}%</span>
                              </div>
                            )}
                          </td>
                        </tr>
                        {/* Show task/bug details when expanded */}
                        {row.isLeaf && detailsOpen.has(row.id) && (
                          <tr>
                            <td colSpan={3} className="px-8 py-2 bg-gray-50 dark:bg-white/[0.02]">
                              {list.length === 0 ? (
                                <div className="text-gray-500 dark:text-gray-400">
                                  Tidak ada {activeTab === 'task' ? 'task' : 'bug'}
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  {activeTab === 'task' && (
                                    <table className="min-w-full text-xs border border-gray-200 dark:border-white/[0.06]">
                                      <thead className="bg-gray-100 dark:bg-white/[0.06]">
                                        <tr>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Kode</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Programmer</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Scheduled</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Due Date</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Tanggal Realisasi</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Waktu Pengerjaan</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Keterangan</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                        {(list as TaskItem[]).map((t) => (
                                          <tr
                                            key={t.id}
                                            className="hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
                                            onClick={() => {
                                              setDetailItem(t);
                                              setDetailOpen(true);
                                            }}
                                          >
                                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{t.kode}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{t.pegawaiNama}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatDateTime(t.scheduleAt)}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatDateTime(t.scheduleAt)}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                              {t.status === 'SELESAI' && t.updatedAt ? formatDateTime(t.updatedAt) : '-'}
                                            </td>
                                            <td className="px-3 py-2">{statusBadge(t.status)}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                              {formatManhour(t.totalDurationMinutes)}
                                            </td>
                                            <td className="px-3 py-2">
                                              {deadlineBadge(t.scheduleAt, t.updatedAt, t.status) || <span className="text-gray-500 dark:text-gray-400">-</span>}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                        {/* Show items for non-leaf when expanded */}
                        {!row.isLeaf && isOpen && listLen > 0 && (
                          <tr>
                            <td colSpan={3} className="px-8 py-2 bg-gray-50 dark:bg-white/[0.02]">
                              <div className="overflow-x-auto">
                                {activeTab === 'task' && (
                                  <table className="min-w-full text-xs border border-gray-200 dark:border-white/[0.06]">
                                    <thead className="bg-gray-100 dark:bg-white/[0.06]">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Kode</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Programmer</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Scheduled</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Due Date</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Tanggal Realisasi</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Waktu Pengerjaan</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Keterangan</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                      {(list as TaskItem[]).map((t) => (
                                        <tr
                                          key={t.id}
                                          className="hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
                                          onClick={() => {
                                            setDetailItem(t);
                                            setDetailOpen(true);
                                          }}
                                        >
                                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{t.kode}</td>
                                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{t.pegawaiNama}</td>
                                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatDateTime(t.scheduleAt)}</td>
                                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatDateTime(t.scheduleAt)}</td>
                                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                            {t.status === 'SELESAI' && t.updatedAt ? formatDateTime(t.updatedAt) : '-'}
                                          </td>
                                          <td className="px-3 py-2">{statusBadge(t.status)}</td>
                                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                            {formatManhour(t.totalDurationMinutes)}
                                          </td>
                                          <td className="px-3 py-2">
                                            {deadlineBadge(t.scheduleAt, t.updatedAt, t.status) || <span className="text-gray-500 dark:text-gray-400">-</span>}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
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

      {/* Task Detail Modal */}
      <TaskViewModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        task={detailItem}
      />
    </div>
  );
}
