"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Select2Field, { Select2Option } from "@/components/form/Select2Field";
import DatePickerField from "@/components/form/DatePickerField";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import TaskViewModal from "@/components/tasklist/TaskViewModal";
import { useToast } from "@/context/ToastContext";
import ExcelJS from 'exceljs';

type TaskReportItem = {
  id: number;
  kode: string;
  projectCode: string;
  projectName: string;
  moduleCode: string;
  moduleName: string;
  assigneeName: string;
  assigneeRole: string;
  assigneeJabatan: string;
  creatorName: string;
  scheduleAt: string;
  calculatedDueDate: string | null;
  status: string;
  statusCode: number;
  statusText: string;
  tasklistType: string;
  taskComplexity: string;
  customDurationHours: number | null;
  keterangan: string;
  programmerDescription: string;
  idCrm: string;
  ticketId: string;
  ticketUrl: string;
  isPaused: boolean;
  totalDurationMinutes: number;
  createdAt: string;
  updatedAt: string;
  sentForReviewAt: string | null;
};

type Proyek = { id: number; namaProyek: string; kodeProyek: string };
type LeafModule = { id: number; nama: string; kode?: string };
type Pegawai = { id: number; namaLengkap: string };

export default function TasklistReportPage() {
  const { user: me, loading: meLoading } = useAuth();
  const { success, error } = useToast();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<TaskReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Modal state
  const [selectedTask, setSelectedTask] = useState<TaskReportItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  // Filter states - initialize from URL search params
  const [filterProjectId, setFilterProjectId] = useState<number | "">(searchParams.get('projectId') ? Number(searchParams.get('projectId')) : "");
  const [filterModuleId, setFilterModuleId] = useState<number | "">(searchParams.get('moduleId') ? Number(searchParams.get('moduleId')) : "");
  const [filterPegawaiId, setFilterPegawaiId] = useState<number | "">(searchParams.get('pegawaiId') ? Number(searchParams.get('pegawaiId')) : "");
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || "");
  const [filterTasklistType, setFilterTasklistType] = useState<string>(searchParams.get('tasklistType') || "");
  const [filterFrom, setFilterFrom] = useState<string>(searchParams.get('from') || "");
  const [filterTo, setFilterTo] = useState<string>(searchParams.get('to') || "");
  const [filterIsLate, setFilterIsLate] = useState<string>(searchParams.get('isLate') || "");
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || "");

  // Track if we should auto-fetch on mount (when URL has params)
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // Dropdown options
  const [projects, setProjects] = useState<Proyek[]>([]);
  const [modules, setModules] = useState<LeafModule[]>([]);
  const [pegawais, setPegawais] = useState<Pegawai[]>([]);

  // Load dropdown options
  useEffect(() => {
    if (!me) return;

    const loadOptions = async () => {
      try {
        const projectsRes = await fetch('/api/proyek?activeOnly=true', { credentials: 'include' });
        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setProjects(data.items || []);
        }

        const pegawaiRes = await fetch('/api/pegawai-basic', { credentials: 'include' });
        if (pegawaiRes.ok) {
          const data = await pegawaiRes.json();
          setPegawais(data.items || []);
        }
      } catch (e) {
        console.error('Failed to load options:', e);
      }
    };

    loadOptions();
  }, [me]);

  // Auto-fetch on mount if URL has filter params
  useEffect(() => {
    if (!me || initialFetchDone) return;
    const hasParams = searchParams.get('status') || searchParams.get('isLate') || searchParams.get('from') || searchParams.get('to') || searchParams.get('projectId') || searchParams.get('pegawaiId');
    if (hasParams) {
      setInitialFetchDone(true);
      fetchReport();
    }
  }, [me]);

  // Load modules when project changes
  useEffect(() => {
    if (!filterProjectId) {
      setModules([]);
      setFilterModuleId("");
      return;
    }

    const loadModules = async () => {
      try {
        const res = await fetch(`/api/proyek-modules/${filterProjectId}/tree`, { 
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (res.ok) {
          const data = await res.json();
          
          // Extract leaf modules from tree
          const extractLeafModules = (nodes: any[]): any[] => {
            let leaves: any[] = [];
            for (const node of nodes) {
              if (node.isLeaf) {
                leaves.push({
                  id: node.id,
                  nama: node.nama,
                  kode: node.kode
                });
              }
              if (node.children && node.children.length > 0) {
                leaves = leaves.concat(extractLeafModules(node.children));
              }
            }
            return leaves;
          };
          
          // The response has a 'tree' property
          const leafModules = extractLeafModules(data.tree || []);
          setModules(leafModules);
        } else {
          setModules([]);
        }
      } catch (e) {
        console.error('Failed to load modules:', e);
        setModules([]);
      }
    };

    loadModules();
  }, [filterProjectId]);



  // Fetch report data with pagination
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filterProjectId) params.set('projectId', String(filterProjectId));
      if (filterModuleId) params.set('moduleId', String(filterModuleId));
      if (filterPegawaiId) params.set('pegawaiId', String(filterPegawaiId));
      if (filterStatus) params.set('status', filterStatus);
      if (filterTasklistType) params.set('tasklistType', filterTasklistType);
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      if (filterIsLate) params.set('isLate', filterIsLate);
      
      // Add pagination params
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/reports/tasklist?${params.toString()}`, {
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to fetch report');

      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      error('Failed to load report data');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when page or pageSize changes (but only if data has been loaded before)
  useEffect(() => {
    if (total > 0) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);



  // Export to Excel - fetches ALL data
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      
      if (filterProjectId) params.set('projectId', String(filterProjectId));
      if (filterModuleId) params.set('moduleId', String(filterModuleId));
      if (filterPegawaiId) params.set('pegawaiId', String(filterPegawaiId));
      if (filterStatus) params.set('status', filterStatus);
      if (filterTasklistType) params.set('tasklistType', filterTasklistType);
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      if (filterIsLate) params.set('isLate', filterIsLate);
      
      // Fetch ALL data for export (no pagination)
      params.set('export', 'true');

      const res = await fetch(`/api/reports/tasklist?${params.toString()}`, {
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to fetch export data');

      const data = await res.json();
      const exportItems = data.items || [];

      if (exportItems.length === 0) {
        error('No data to export');
        return;
      }

      // Create workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Tasklist Report');

      // Add title row with merge
      const reportDate = new Date().toISOString().split('T')[0];
      worksheet.mergeCells('A1:M1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Tasklist Report - ${reportDate}`;
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      worksheet.getRow(1).height = 30;

      // Add header row
      const headers = [
        'Task Code',
        'Project Name',
        'Module Name',
        'Assignee',
        'Jabatan',
        'Schedule',
        'Due Date',
        'Sent For Review',
        'Status',
        'Status Keterlambatan',
        'Type',
        'Complexity',
        'Description'
      ];
      
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 20;

      // Apply borders to header
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Add data rows
      exportItems.forEach((item: TaskReportItem) => {
        const formatDateTime = (dateStr: string) => {
          const date = new Date(dateStr);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${day}-${month}-${year} ${hours}:${minutes}`;
        };

        // Format sentForReviewAt with -7 hours adjustment
        const formatSentForReview = (dateStr: string) => {
          const date = new Date(dateStr);
          date.setHours(date.getHours() - 7); // Subtract 7 hours
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${day}-${month}-${year} ${hours}:${minutes}`;
        };

        // Determine if task is late based on when programmer sent for review vs calculatedDueDate
        let statusKeterlambatan = '-';
        if (item.sentForReviewAt && item.calculatedDueDate) {
          const reviewDate = new Date(item.sentForReviewAt);
          // Subtract 7 hours from reviewDate to adjust timezone
          reviewDate.setHours(reviewDate.getHours() - 7);
          const workDeadline = new Date(item.calculatedDueDate);
          statusKeterlambatan = reviewDate > workDeadline ? 'Terlambat' : 'Tidak Terlambat';
        }

        const row = worksheet.addRow([
          item.kode,
          item.projectName,
          item.moduleName,
          item.assigneeName,
          item.assigneeJabatan,
          formatDateTime(item.scheduleAt),
          item.calculatedDueDate ? formatDateTime(item.calculatedDueDate) : '-',
          item.sentForReviewAt ? formatSentForReview(item.sentForReviewAt) : '-',
          item.statusText,
          statusKeterlambatan,
          item.tasklistType,
          item.taskComplexity,
          item.keterangan || ''
        ]);

        // Apply borders and alignment to all cells
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { 
            vertical: 'middle',
            horizontal: 'left'
          };

          // Wrap text for Description column (column 13)
          if (colNumber === 13) {
            cell.alignment = { 
              vertical: 'middle',
              horizontal: 'left',
              wrapText: true
            };
          }
        });
      });

      // Set column widths
      worksheet.columns = [
        { width: 15 },  // Task Code
        { width: 30 },  // Project Name
        { width: 30 },  // Module Name
        { width: 25 },  // Assignee
        { width: 20 },  // Jabatan
        { width: 18 },  // Schedule
        { width: 18 },  // Due Date
        { width: 18 },  // Sent For Review
        { width: 20 },  // Status
        { width: 18 },  // Status Keterlambatan
        { width: 15 },  // Type
        { width: 12 },  // Complexity
        { width: 50 }   // Description
      ];

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Tasklist_Report_${timestamp}.xlsx`;

      // Save file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      
      success(`Exported ${exportItems.length} tasks to ${filename}`);
    } catch (e) {
      error('Failed to export to Excel');
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  if (meLoading) {
    return <LoadingOverlay show={true} label="Loading..." />;
  }

  if (!me) {
    return <div className="p-4">Please log in to view this page.</div>;
  }

  return (
    <div className="-m-4 md:-m-6 pt-4 px-2 pb-2">
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tasklist Report</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          View and export all tasklists with detailed information
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-3">
        <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Filters</h2>
        </div>
        
        <div className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-2">
            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project
              </label>
              <Select2Field
                value={filterProjectId}
                onChange={(val) => setFilterProjectId(val as number | "")}
                options={[
                  { id: "", text: "All Projects" },
                  ...projects.map(p => ({ id: p.id, text: `${p.kodeProyek} - ${p.namaProyek}` }))
                ]}
              />
            </div>

            {/* Module Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Module
              </label>
              <Select2Field
                value={filterModuleId}
                onChange={(val) => setFilterModuleId(val as number | "")}
                options={[
                  { id: "", text: "All Modules" },
                  ...modules.map(m => ({ 
                    id: m.id, 
                    text: m.kode ? `${m.kode} - ${m.nama}` : m.nama 
                  }))
                ]}
                disabled={!filterProjectId}
                placeholder={!filterProjectId ? "Select project first" : "Select module"}
              />
            </div>

            {/* Pegawai Filter */}
            {(me.role === 'SUPER_ADMIN' || me.role === 'PM' || me.role === 'ADMIN') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pegawai
                </label>
                <Select2Field
                  value={filterPegawaiId}
                  onChange={(val) => setFilterPegawaiId(val as number | "")}
                  options={[
                    { id: "", text: "Semua Pegawai" },
                    ...pegawais.map(p => ({ id: p.id, text: p.namaLengkap }))
                  ]}
                  placeholder="Pilih pegawai"
                />
              </div>
            )}

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <Select2Field
                value={filterStatus}
                onChange={(val) => setFilterStatus(val as string)}
                options={[
                  { id: "", text: "All Statuses" },
                  { id: "MENUNGGU_PROSES_USER", text: "Menunggu Proses" },
                  { id: "SEDANG_DIPROSES_USER", text: "Sedang Diproses" },
                  { id: "SEDANG_DIPROSES_USER_PAUSED", text: "Sedang Diproses (Paused)" },
                  { id: "MENUNGGU_REVIEW_PM", text: "Menunggu Review PM" },
                  { id: "SELESAI", text: "Selesai" }
                ]}
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <Select2Field
                value={filterTasklistType}
                onChange={(val) => setFilterTasklistType(val as string)}
                options={[
                  { id: "", text: "All Types" },
                  { id: "BLUEPRINT", text: "Blueprint" },
                  { id: "DEVELOPMENT", text: "Development" },
                  { id: "MAINTENANCE", text: "Maintenance" }
                ]}
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <DatePickerField
                value={filterFrom}
                onChange={setFilterFrom}
                placeholder="Select start date"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <DatePickerField
                value={filterTo}
                onChange={setFilterTo}
                placeholder="Select end date"
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Is Late Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status Terlambat
              </label>
              <Select2Field
                value={filterIsLate}
                onChange={(val) => setFilterIsLate(val as string)}
                options={[
                  { id: "", text: "Semua" },
                  { id: "true", text: "Terlambat" },
                  { id: "false", text: "Tepat Waktu / Belum Jatuh Tempo" }
                ]}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setPage(1); // Reset to page 1 when loading new data
                fetchReport();
              }}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Load Report
                </>
              )}
            </button>
            
            <button
              onClick={exportToExcel}
              disabled={exporting || total === 0}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export to Excel ({total} total tasks)
                </>
              )}
            </button>

            {(filterProjectId || filterModuleId || filterPegawaiId || filterStatus || filterTasklistType || filterFrom || filterTo || searchQuery) && (
              <button
                onClick={() => {
                  setFilterProjectId("");
                  setFilterModuleId("");
                  setFilterPegawaiId("");
                  setFilterStatus("");
                  setFilterTasklistType("");
                  setFilterFrom("");
                  setFilterTo("");
                  setFilterIsLate("");
                  setSearchQuery("");
                }}
                className="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-4 focus:ring-gray-300 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && <LoadingOverlay show={true} label="Loading report..." />}

      {!loading && items.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} tasks
            </p>
            
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {Math.ceil(total / pageSize)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
              
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="ml-2 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Task Code
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[180px]">
                    Project
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[160px]">
                    Module
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[140px]">
                    Assignee
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Schedule
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Due Date
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Type
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Complexity
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[280px]">
                    Description
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => { setSelectedTask(item); setShowModal(true); }}>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                        {item.kode}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">{item.projectCode}</div>
                        <div className="text-gray-500 dark:text-gray-400 mt-0.5">{item.projectName}</div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">{item.moduleCode}</div>
                        <div className="text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{item.moduleName}</div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">{item.assigneeName}</div>
                        <div className="text-gray-500 dark:text-gray-400 mt-0.5">{item.assigneeJabatan}</div>
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {(() => {
                        const date = new Date(item.scheduleAt);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        return `${day}-${month}-${year} ${hours}:${minutes}`;
                      })()}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.calculatedDueDate 
                        ? (() => {
                            const date = new Date(item.calculatedDueDate);
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = date.getFullYear();
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            return `${day}-${month}-${year} ${hours}:${minutes}`;
                          })()
                        : '-'
                      }
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.statusCode === 4 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        item.statusCode === 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        item.statusCode === 2 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        item.statusCode === 5 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {item.statusText}
                      </span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        {item.tasklistType}
                      </span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        item.taskComplexity === 'HARD' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                        item.taskComplexity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {item.taskComplexity}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-sm text-gray-900 dark:text-white max-w-md">
                        <div className="line-clamp-2" title={item.keterangan}>
                          {item.keterangan || <span className="text-gray-400 italic">No description</span>}
                        </div>
                        {item.programmerDescription && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-700 line-clamp-2" title={item.programmerDescription}>
                            <span className="font-medium">Programmer:</span> {item.programmerDescription}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedTask(item);
                          setShowModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Bottom Pagination Controls */}
          <div className="px-2 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} tasks
            </p>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {Math.ceil(total / pageSize)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
              
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="ml-2 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No data loaded. Click "Load Report" to fetch tasklist data.
          </p>
        </div>
      )}

      {/* Detail Modal */}
      <TaskViewModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        task={selectedTask ? {
          id: selectedTask.id,
          kode: selectedTask.kode,
          proyekNama: selectedTask.projectName,
          moduleNama: selectedTask.moduleName,
          pegawaiNama: selectedTask.assigneeName,
          pegawaiRole: selectedTask.assigneeRole,
          scheduleAt: selectedTask.scheduleAt,
          calculatedDueDate: selectedTask.calculatedDueDate,
          totalDurationMinutes: selectedTask.totalDurationMinutes,
          keterangan: selectedTask.keterangan,
          programmerDescription: selectedTask.programmerDescription,
          status: selectedTask.status,
          tasklistType: selectedTask.tasklistType,
          taskComplexity: selectedTask.taskComplexity,
        } : null}
      />
    </div>
  );
}
