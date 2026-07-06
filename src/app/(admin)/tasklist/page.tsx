"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import { useSocket } from "@/context/SocketContext";
import { useTasklistBadge } from "@/context/TasklistBadgeContext";
import Select2Field from "@/components/form/Select2Field";
import { fetchOnce } from "@/lib/fetchOnce";
import { usePermission } from "@/hooks/usePermissions";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { useToast } from "@/context/ToastContext";
import DateTimeInput from "@/components/form/DateTimeInput";
import TaskTimeTracker from "@/components/tasklist/TaskTimeTracker";
import { CRMNotificationModal } from "@/components/tasklist/CRMNotificationModal";
import TaskChatPanel from "@/components/tasklist/TaskChatPanel";
import TaskDetailModal from "@/components/tasklist/TaskDetailModal";
import BranchMergeSelector from "@/components/tasklist/BranchMergeSelector";
import TaskFormModal, { TaskFormData } from "@/components/tasklist/TaskFormModal";
import TaskEditModal, { TaskEditFormData } from "@/components/tasklist/TaskEditModal";
import { addWorkingHours, calculateWorkingHoursBetween, DEFAULT_CONFIG } from "@/lib/workingHoursCalculator";
// Removed server-side imports - using API endpoints instead
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";

// Types
type TaskItem = {
  id: number;
  projectId: number;
  moduleId: number;
  pegawaiId: number;
  createdBy?: number | null; // Track who created the task
  scheduleAt: string; // ISO string from API
  calculatedDueDate?: string | null; // Calculated due date from scheduled + complexity hours
  startedAt?: string | null; // When task was last started/resumed
  pausedAt?: string | null; // When task was paused
  totalDurationMinutes?: number; // Total time spent in minutes
  isPaused?: boolean; // Whether task is currently paused
  keterangan: string | null;
  programmerDescription?: string | null;
  proyekNama?: string;
  moduleNama?: string;
  pegawaiNama?: string;
  pegawaiRole?: string; // User role (PM, PROGRAMMER, ADMIN, SUPER_ADMIN)
  pegawaiJabatan?: string | null; // User jabatan in project (PM, Programmer, PIC Region, etc)
  status?: 'MENUNGGU_PROSES_USER' | 'SEDANG_DIPROSES_USER' | 'SEDANG_DIPROSES_USER_PAUSED' | 'MENUNGGU_REVIEW_PM' | 'SELESAI';
  imagePath?: string | null;
  kode?: string;
  tasklistType?: 'BLUEPRINT' | 'DEVELOPMENT' | 'MAINTENANCE';
  taskComplexity?: 'EASY' | 'MEDIUM' | 'HARD';
  customDurationHours?: number | null; // Custom duration in hours
  version?: string; // Version number for task
  baVersion?: string; // BA version number
  idCrm?: string | null; // Legacy CRM field
  ticketId?: string | null; // New CRM ticket ID field
  ticket_id?: string | null; // Alternative naming
};


type Proyek = { id: number; namaProyek: string; type?: 'BLUEPRINT' | 'DEVELOPMENT' | 'SUPPORT' | 'CLOSED' };

type LeafModule = { id: number; nama: string; path?: string };
type TreeNode = { id: number; nama: string; kode?: string; isLeaf?: boolean; children?: TreeNode[] };

type Pegawai = { id: number; namaLengkap: string; role?: string; noHp?: string };

type SortKey = "scheduleAt" | "proyekNama" | "moduleNama" | "pegawaiNama" | "taskComplexity" | "baVersion" | "aksi";

// Batch request cache to prevent duplicate API calls
const batchRequestCache = new Map<string, Promise<any>>();

export default function TasklistPage() {
  const { user: me, loading: meLoading } = useAuth();
  const { success, error } = useToast();
  const canReadUsers = usePermission('user.read');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { socket } = useSocket();
  const { refresh: refreshBadge } = useTasklistBadge();
  const [items, setItems] = useState<TaskItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [dataReady, setDataReady] = useState<boolean>(false);
  const lastReqIdRef = useRef(0);
  // cache: does a project have any programmer role in its team?
  const [projectHasProgrammer, setProjectHasProgrammer] = useState<Record<number, boolean>>({});
  const [userInProject, setUserInProject] = useState<Record<number, boolean>>({});
  // cache: projectId -> (moduleId -> formatted label 'parent - child' if parent exists)
  const [projectModuleLabel, setProjectModuleLabel] = useState<Record<number, Record<number, string>>>({});
  // cache: projectId -> (moduleId -> module code like '01.02')
  const [projectModuleCode, setProjectModuleCode] = useState<Record<number, Record<number, string>>>({});
  // cache: userId -> projectId -> isPIC (to show PIC badge)
  const [userPICStatus, setUserPICStatus] = useState<Record<number, Record<number, boolean>>>({});

  // Helper function to fetch batch data with deduplication
  const fetchBatchTeamData = async (projectIds: number[]) => {
    if (projectIds.length === 0) return {};

    const cacheKey = projectIds.sort((a, b) => a - b).join(',');

    // Return cached promise if already in flight
    if (batchRequestCache.has(cacheKey)) {
      return batchRequestCache.get(cacheKey);
    }

    // Create new request
    const promise = fetch(`/api/proyek-team/batch?projectIds=${cacheKey}`, {
      cache: 'no-store',
      credentials: 'include'
    })
      .then(res => res.ok ? res.json() : { items: {} })
      .then(data => data.items || {})
      .catch(() => ({}));

    // Cache the promise
    batchRequestCache.set(cacheKey, promise);

    // Clear cache after 5 seconds to allow fresh data
    setTimeout(() => batchRequestCache.delete(cacheKey), 5000);

    return promise;
  };

  // datatable state
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("aksi");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Restore pagination from localStorage on first mount
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem('tasklist:paging');
      if (!raw) return;
      const saved = JSON.parse(raw) as { page?: number; size?: number };
      if (saved && Number.isFinite(saved.page) && (saved.page as number) > 0) {
        setPage(saved.page as number);
      }
      if (saved && Number.isFinite(saved.size) && [5, 10, 20, 50].includes(saved.size as number)) {
        setPageSize(saved.size as number);
      }
    } catch { }
  }, [canReadUsers]);

  // Save pagination to localStorage when changed
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem('tasklist:paging', JSON.stringify({ page, size: pageSize }));
    } catch { }
  }, [page, pageSize]);

  // Handle taskId from URL (from notification click)
  useEffect(() => {
    const taskIdParam = searchParams.get('taskId');
    const tabParam = searchParams.get('tab'); // Get tab parameter
    if (!taskIdParam) return;

    const taskId = parseInt(taskIdParam);
    if (isNaN(taskId)) return;

    // Always try to find in current items first (if loaded)
    const task = items.find(t => t.id === taskId);
    if (task) {
      // Task found in current page, open modal immediately
      setDetailItem(task);
      setDetailOpen(true);

      // Set active tab if specified (e.g., 'chat')
      if (tabParam === 'chat') {
        setDetailActiveTab('chat');
      }

      // Remove taskId from URL after opening
      setTimeout(() => router.replace('/tasklist'), 100);
      return;
    }

    // If not found in current items OR items not loaded yet, fetch directly
    console.log(`🔍 Fetching task ${taskId} from notification...`);
    setLoading(true);

    fetch(`/api/tasklist/${taskId}`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('✅ Task fetched successfully:', data);
        if (data?.item) {
          // API returns { item: TaskItem }
          const taskItem = data.item;

          // Ensure we have all required fields for TaskItem
          const completeTask = {
            ...taskItem,
            proyekNama: taskItem.proyekNama || 'Unknown Project',
            moduleNama: taskItem.moduleNama || 'Unknown Module',
            pegawaiNama: taskItem.pegawaiNama || 'Unknown User'
          };

          setDetailItem(completeTask);
          setDetailOpen(true);

          // Set active tab if specified
          if (tabParam === 'chat') {
            setDetailActiveTab('chat');
          }

          // Refresh the main list to include this task if needed
          setTimeout(() => {
            reloadWithCurrentParams();
          }, 500);

          // Remove taskId from URL after opening
          setTimeout(() => router.replace('/tasklist'), 100);
        } else {
          console.error('❌ Invalid task data received:', data);
          error('Task tidak ditemukan');
        }
      })
      .catch(err => {
        console.error('❌ Failed to fetch task:', err);
        error('Gagal memuat detail task');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchParams, items, router, error]);

  // Apply filters from URL params (from dashboard links)
  useEffect(() => {
    if (urlParamsAppliedRef.current) return;
    const s = searchParams.get('status');
    const f = searchParams.get('from');
    const t = searchParams.get('to');
    const p = searchParams.get('projectId');
    let changed = false;
    if (s) { setFilterStatus(s); changed = true; }
    if (f) { setFilterFrom(f); changed = true; }
    if (t) { setFilterTo(t); changed = true; }
    if (p) { setFilterProjectId(Number(p)); changed = true; }
    if (changed) urlParamsAppliedRef.current = true;
  }, [searchParams]);

  // modal state
  const { isOpen: isAddOpen, openModal: openAddModal, closeModal: closeAddModal } = useModal(false);
  const { isOpen: isEditOpen, openModal: openEditModal, closeModal: closeEditModal } = useModal(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<TaskItem | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'detail' | 'chat'>('detail');
  const [chatUnreadCount, setChatUnreadCount] = useState<number>(0);

  // Fetch unread chat count when detail modal opens
  useEffect(() => {
    if (!detailOpen || !detailItem) {
      setChatUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`/api/tasklist/${detailItem.id}/chat/unread`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setChatUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch unread chat count:', err);
      }
    };

    fetchUnreadCount();
  }, [detailOpen, detailItem]);

  // Listen for real-time chat messages to update badge
  useEffect(() => {
    if (!socket || !detailItem || !detailOpen) return;

    // Join tasklist room to receive chat notifications
    socket.emit('join-tasklist', detailItem.id);
    console.log(`📝 [TasklistPage] Joined tasklist room: ${detailItem.id}`);

    // Listen for new messages
    const handleNewMessage = (message: { id: number; senderId: number; tasklistId: number }) => {
      console.log('💬 [TasklistPage] New message received:', message);

      // Only increment badge if NOT on chat tab (if on chat tab, it's already marked as read)
      if (detailActiveTab !== 'chat' && message.senderId !== me?.id) {
        setChatUnreadCount(prev => prev + 1);
      }
    };

    socket.on('message-received', handleNewMessage);

    // Cleanup
    return () => {
      socket.off('message-received', handleNewMessage);
      socket.emit('leave-tasklist', detailItem.id);
      console.log(`📤 [TasklistPage] Left tasklist room: ${detailItem.id}`);
    };
  }, [socket, detailItem, detailOpen, detailActiveTab, me?.id]);
  // detail logs state
  type TaskLog = { id: number; waktu: string; userId: number; userNama?: string; keterangan?: string | null; status?: TaskItem['status'] | null; action: string; imagePath?: string | null };
  const [detailLogs, setDetailLogs] = useState<TaskLog[]>([]);
  const [detailLogsLoading, setDetailLogsLoading] = useState(false);
  const [logImagesMap, setLogImagesMap] = useState<Record<number, TaskImage[]>>({});
  // detail images state
  type TaskImage = { id: number; taskId: number; fileName: string; originalName: string; filePath: string; fileType: string; fileSize: number; uploadedBy: number | null; uploadedAt: string };
  const [detailImages, setDetailImages] = useState<TaskImage[]>([]);
  const [detailImagesLoading, setDetailImagesLoading] = useState<boolean>(false);
  // lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string>('');
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // PIC permission check - allow PIC to create tasks even if role is PROGRAMMER/ADMIN
  const [isPIC, setIsPIC] = useState(false);
  const [isPICLoading, setIsPICLoading] = useState(true);
  const [picProjects, setPicProjects] = useState<number[]>([]); // Projects where user is PIC


  // Smart scheduling - conflict detection
  const [complexityHours, setComplexityHours] = useState<Record<string, number>>({ 'EASY': 2, 'MEDIUM': 4, 'HARD': 8 });
  const [showConflictModal, setShowConflictModal] = useState(false);

  // options
  const [projects, setProjects] = useState<Proyek[]>([]);
  const [pegawais, setPegawais] = useState<Pegawai[]>([]);
  const [teamPegawais, setTeamPegawais] = useState<Array<{ id: number; namaLengkap: string }>>([]);
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [masterTeams, setMasterTeams] = useState<Array<{ id: number; nama: string }>>([]);
  // Check if current user is PM in any project (based on ProyekTeam.jabatan)
  const [userIsPMInAnyProject, setUserIsPMInAnyProject] = useState(false);
  // Store project IDs where user is PM (based on ProyekTeam.jabatan)
  const [userPMProjects, setUserPMProjects] = useState<number[]>([]);
  // filter context team ids (for PM user filter)
  const [filterTeamMemberIds, setFilterTeamMemberIds] = useState<number[]>([]);
  // filters
  const [filterProjectId, setFilterProjectId] = useState<number | "">("");
  const [filterPegawaiId, setFilterPegawaiId] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterTeamId, setFilterTeamId] = useState<number | "">("");
  const [filterTasklistType, setFilterTasklistType] = useState<string>("");
  const [filterVersion, setFilterVersion] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");
  // view mode
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const rangeInputRef = useRef<HTMLInputElement | null>(null);
  const flatpickrRef = useRef<ReturnType<typeof flatpickr> | null>(null);
  const filterFromRef = useRef<string>("");
  const filterToRef = useRef<string>("");
  const urlParamsAppliedRef = useRef(false);

  // PR creation tracking to prevent duplicates
  const prCreationInProgressRef = useRef<boolean>(false);

  // CRM notification modal state
  const [crmModalOpen, setCrmModalOpen] = useState(false);
  const [crmModalTask, setCrmModalTask] = useState<TaskItem | null>(null);

  useEffect(() => {
    filterFromRef.current = filterFrom;
    filterToRef.current = filterTo;
  }, [filterFrom, filterTo]);



  // load logs when opening detail
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!detailOpen || !detailItem?.id) { setDetailLogs([]); return; }
      try {
        setDetailLogsLoading(true);
        const res = await fetch(`/api/tasklist/${detailItem.id}/logs`, { cache: 'no-store', credentials: 'include' });
        if (!alive) return;
        if (res.ok) {
          try {
            const d = await res.json();
            const items = Array.isArray(d?.items) ? d.items : [];
            setDetailLogs(items as TaskLog[]);
          } catch (e) {
            console.error('Failed to parse logs JSON:', e);
            setDetailLogs([]);
          }
        } else {
          console.error('Failed to fetch logs:', res.status, res.statusText);
          setDetailLogs([]);
        }
      } catch {
        if (alive) setDetailLogs([]);
      } finally {
        if (alive) setDetailLogsLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [detailOpen, detailItem?.id]);

  // load images when opening detail
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!detailOpen || !detailItem?.id) { setDetailImages([]); setLogImagesMap({}); return; }
      try {
        setDetailImagesLoading(true);
        const res = await fetch(`/api/tasklist/${detailItem.id}/images`, { cache: 'no-store', credentials: 'include' });
        if (!alive) return;
        if (res.ok) {
          try {
            const d = await res.json();
            const images = Array.isArray(d?.images) ? d.images : [];
            setDetailImages(images as TaskImage[]);

            // Group images by upload time proximity to log entries
            // Only match images to log entries that actually involve image uploads
            // Each image should only be assigned to ONE log entry (the closest one)
            const imageMap: Record<number, TaskImage[]> = {};

            if (detailLogs.length > 0 && images.length > 0) {
              // Sort images by upload time
              const sortedImages = [...images].sort((a, b) =>
                new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
              );

              // Filter logs that should have images (exclude START, PAUSE, RESUME actions)
              const logsWithImageUploads = detailLogs.filter((log) => {
                const keterangan = log.keterangan || '';
                const action = log.action || '';

                // Exclude logs that are just status changes without image uploads
                // START actions (Task dimulai) should NOT have images
                if (keterangan.includes('Task dimulai') || action === 'START') return false;
                if (keterangan.includes('Task dilanjutkan') || action === 'RESUME') return false;
                if (keterangan.includes('Task dijeda') || action === 'PAUSE') return false;
                if (keterangan.includes('Task dihentikan') || action === 'STOP') return false;

                // Include logs that typically have images:
                // - Task creation (CREATE)
                // - Task sent for review (MENUNGGU_REVIEW_PM)
                // - Task rejected (back to MENUNGGU_PROSES_USER)
                return true;
              }) as TaskLog[];

              // Track which images have been assigned to prevent duplicates
              const assignedImageIds = new Set<number>();

              // For each image, find the closest log entry (within 60 seconds)
              sortedImages.forEach((img: TaskImage) => {
                if (assignedImageIds.has(img.id)) return; // Skip already assigned images

                const imgTime = new Date(img.uploadedAt).getTime();
                let closestLog: TaskLog | null = null;
                let closestTimeDiff = Infinity;

                // Find the closest log entry that can have images
                logsWithImageUploads.forEach((log) => {
                  const logTime = new Date(log.waktu).getTime();
                  const timeDiff = Math.abs(imgTime - logTime);

                  // Only consider logs within 60 seconds
                  if (timeDiff < 60000 && timeDiff < closestTimeDiff) {
                    closestTimeDiff = timeDiff;
                    closestLog = log;
                  }
                });

                // Assign image to the closest log
                if (closestLog) {
                  const log: TaskLog = closestLog;
                  if (!imageMap[log.id]) {
                    imageMap[log.id] = [];
                  }
                  imageMap[log.id].push(img);
                  assignedImageIds.add(img.id);
                }
              });

              // Fallback: If any images remain unassigned, assign them to the most recent log with imagePath
              const unassignedImages = sortedImages.filter(img => !assignedImageIds.has(img.id));

              if (unassignedImages.length > 0) {
                // Find the most recent log entry that has imagePath
                const logsWithImages = logsWithImageUploads.filter(log => log.imagePath);
                if (logsWithImages.length > 0) {
                  const mostRecentLog = logsWithImages[logsWithImages.length - 1];
                  if (!imageMap[mostRecentLog.id]) {
                    imageMap[mostRecentLog.id] = [];
                  }
                  imageMap[mostRecentLog.id].push(...unassignedImages);
                }
              }
            }

            setLogImagesMap(imageMap);
          } catch (e) {
            console.error('Failed to parse images JSON:', e);
            setDetailImages([]);
            setLogImagesMap({});
          }
        } else {
          console.error('Failed to fetch images:', res.status, res.statusText);
          setDetailImages([]);
          setLogImagesMap({});
        }
      } catch (e) {
        console.error('Error fetching images:', e);
        if (alive) {
          setDetailImages([]);
          setLogImagesMap({});
        }
      } finally {
        if (alive) setDetailImagesLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [detailOpen, detailItem?.id, detailLogs]);



  // keep filterTeamMemberIds in sync with role and selected project
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!me) { if (alive) setFilterTeamMemberIds([]); return; }

      console.log('🔄 [Filter] Running filter logic:', {
        role: me.role,
        isPIC,
        isPICLoading,
        picProjectsCount: picProjects.length,
        picProjects,
        filterProjectId
      });

      // PIC -> can see all tasks in their managed projects (like PM)
      // Check isPIC first (even if loading), but only if we have picProjects
      if (!isPICLoading && isPIC && picProjects.length > 0) {
        console.log('🔍 [Filter] User is PIC, loading team members for projects:', picProjects);

        if (typeof filterProjectId === 'number' && filterProjectId > 0) {
          // If specific project selected, show only that project's team
          if (picProjects.includes(filterProjectId)) {
            const batchRes = await fetch(`/api/proyek-team/batch?projectIds=${filterProjectId}`, {
              cache: 'no-store',
              credentials: 'include'
            });
            if (batchRes.ok) {
              const batchData = await batchRes.json();
              const teamMembers = batchData.items?.[filterProjectId] || [];
              const ids = teamMembers.map((r: { pegawaiId: number }) => r.pegawaiId);
              console.log(`✅ [Filter] PIC viewing project ${filterProjectId}, team members:`, ids);
              if (alive) setFilterTeamMemberIds(ids);
            }
          } else {
            // Selected project is not managed by this PIC, show only their own tasks
            console.log(`⚠️ [Filter] Project ${filterProjectId} not managed by PIC, showing only own tasks`);
            if (alive) setFilterTeamMemberIds([me.id]);
          }
        } else {
          // No project filter, show all team members from all PIC projects
          const projectIds = picProjects.join(',');
          const batchRes = await fetch(`/api/proyek-team/batch?projectIds=${projectIds}`, {
            cache: 'no-store',
            credentials: 'include'
          });
          if (batchRes.ok) {
            const batchData = await batchRes.json();
            const teamsByProject = batchData.items || {};
            const s = new Set<number>();
            for (const projectId of picProjects) {
              const teamMembers = teamsByProject[projectId] || [];
              for (const member of teamMembers) {
                s.add(member.pegawaiId);
              }
            }
            console.log('✅ [Filter] PIC viewing all projects, total team members:', s.size, 'IDs:', Array.from(s));
            if (alive) setFilterTeamMemberIds(Array.from(s));
          }
        }
        return;
      }

      // Programmer/Admin (non-PIC) -> only themselves
      // Also applies if PIC loading is still in progress (temporary state)
      if (me.role === 'PROGRAMMER' || me.role === 'ADMIN') {
        if (isPICLoading) {
          console.log('⏳ [Filter] PROGRAMMER/ADMIN, PIC status still loading, showing own tasks temporarily');
        } else {
          console.log('👤 [Filter] Regular PROGRAMMER/ADMIN (not PIC), showing only own tasks');
        }
        if (alive) setFilterTeamMemberIds([me.id]);
        return;
      }

      // PM -> members of selected project, or union of members across all visible projects if none selected
      if (me.role === 'PM') {
        if (typeof filterProjectId === 'number' && filterProjectId > 0) {
          const batchRes = await fetch(`/api/proyek-team/batch?projectIds=${filterProjectId}`, {
            cache: 'no-store',
            credentials: 'include'
          });
          if (batchRes.ok) {
            const batchData = await batchRes.json();
            const teamMembers = batchData.items?.[filterProjectId] || [];
            const ids = teamMembers.map((r: { pegawaiId: number }) => r.pegawaiId);
            if (alive) setFilterTeamMemberIds(ids);
          }
        } else {
          const projectIds = projects.map(p => p.id).join(',');
          if (projectIds) {
            const batchRes = await fetch(`/api/proyek-team/batch?projectIds=${projectIds}`, {
              cache: 'no-store',
              credentials: 'include'
            });
            if (batchRes.ok) {
              const batchData = await batchRes.json();
              const teamsByProject = batchData.items || {};
              const s = new Set<number>();
              for (const project of projects) {
                const teamMembers = teamsByProject[project.id] || [];
                for (const member of teamMembers) {
                  s.add(member.pegawaiId);
                }
              }
              if (alive) setFilterTeamMemberIds(Array.from(s));
            }
          }
        }
        return;
      }
      // SUPER_ADMIN -> no restriction
      if (alive) setFilterTeamMemberIds([]);
    };
    run();
    return () => { alive = false; };
  }, [me, projects, filterProjectId, isPIC, picProjects, isPICLoading]);

  // helpers
  const fmt = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Reset semua filter ke nilai default
  const resetAllFilters = () => {
    setFilterProjectId("");
    setFilterPegawaiId("");
    setFilterStatus("");
    setFilterTeamId("");
    setFilterTasklistType("");
    setFilterVersion("");
    setFilterFrom("");
    setFilterTo("");
    setPage(1);
    // Clear flatpickr UI juga
    if (flatpickrRef.current) {
      (flatpickrRef.current as any).clear();
    }
  };

  /**
   * Kirim catatan aksi sebagai pesan chat ke task.
   * Teks + semua gambar dikirim dalam 1 request sehingga tampil sebagai 1 bubble.
   * actionType: label aksi yang akan ditampilkan di badge chat.
   * Tidak throw error agar tidak mengganggu alur utama.
   */
  const sendActionChat = async (taskId: number, note: string, images: File[] = [], actionType: string = 'action_note') => {
    if (!note?.trim() && images.length === 0) return;
    try {
      const fd = new FormData();
      fd.append('message', note?.trim() || '📎 Lampiran gambar');
      fd.append('source', actionType);
      // Kirim semua gambar sekaligus via files[] — 1 request = 1 bubble
      images.forEach(img => fd.append('files[]', img));
      await fetch(`/api/tasklist/${taskId}/chat`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
    } catch (e) {
      console.error('[sendActionChat] Failed to send chat message:', e);
    }
  };
  const isPastDate = (isoDateStr?: string | null) => {
    if (!isoDateStr) return false;
    const dayTs = new Date(isoDateStr).setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dayTs < today.getTime();
  };
  const fmtDateTime = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const ii = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${ii}:${ss}`;
  };
  const fmtDateTimeShort = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const ii = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${ii}`;
  };
  const fmtDateDMY = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // load master data
  useEffect(() => {
    const load = async () => {
      try {
        // Use regular fetch to avoid response body sharing issues
        const pegawaiEndpoint = canReadUsers ? "/api/pegawai" : "/api/pegawai-basic";

        const [pr, pe, tm] = await Promise.all([
          fetch("/api/proyek?activeOnly=true", { credentials: 'include' }),
          fetch(pegawaiEndpoint, { credentials: 'include' }),
          fetch("/api/master-team", { credentials: 'include' })
        ]);

        if (pr.ok) {
          try {
            const projectsData = await pr.json();
            console.log('[Load Projects] Response:', projectsData);
              if (projectsData && Array.isArray(projectsData.items)) {
              console.log('[Load Projects] Setting projects:', projectsData.items.length);
              const sorted = [...projectsData.items].sort((a: Proyek, b: Proyek) => a.namaProyek.localeCompare(b.namaProyek));
              setProjects(sorted);
            } else {
              console.warn('[Load Projects] Invalid data structure:', projectsData);
            }
          } catch (e) {
            console.error("Failed parsing projects JSON", e);
          }
        } else {
          console.error('[Load Projects] API failed:', pr.status, pr.statusText);
        }

        if (pe.ok) {
          try {
            const pegawaiData = await pe.json();
            if (pegawaiData && Array.isArray(pegawaiData.items)) {
              const sorted = [...pegawaiData.items].sort((a: Pegawai, b: Pegawai) => a.namaLengkap.localeCompare(b.namaLengkap));
              setPegawais(sorted);
            }
          } catch (e) {
            console.error("Failed parsing pegawai JSON", e);
          }
        }

        if (tm.ok) {
          try {
            const teamData = await tm.json();
            if (teamData && Array.isArray(teamData.items)) {
              const teams = teamData.items.map((t: any) => ({
                id: t.id,
                nama: t.namaTeam
              }));
              teams.sort((a: { nama: string }, b: { nama: string }) => a.nama.localeCompare(b.nama));
              setMasterTeams(teams);
            }
          } catch (e) {
            console.error("Failed parsing master teams JSON", e);
          }
        }
      } catch (e) {
        console.error("Failed loading proyek/pegawai/teams", e);
      }
    };
    load();
  }, [canReadUsers]);

  // Load available versions when project is selected
  useEffect(() => {
    const loadVersions = async () => {
      if (!filterProjectId) {
        setAvailableVersions([]);
        return;
      }

      try {
        // Load versions from tasklist data for the selected project
        const res = await fetch(`/api/tasklist?projectId=${filterProjectId}&showAll=1`, {
          credentials: 'include',
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.items) {
            // Extract unique baVersions and sort them
            const uniqueVersions = (Array.from(new Set(
              data.items
                .map((task: any) => task.baVersion)
                .filter(Boolean)
            )) as string[]).sort((a, b) => {
              // Natural sort for versions (1.0, 1.1, 1.10, 2.0, etc)
              return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
            });
            setAvailableVersions(uniqueVersions);
          }
        }
      } catch (e) {
        console.error("Failed loading versions", e);
        setAvailableVersions([]);
      }
    };
    loadVersions();
  }, [filterProjectId]);

  // Check if current user is PM in any project (based on ProyekTeam.jabatan)
  // Accumulate across all pages seen so buttons always appear correctly
  useEffect(() => {
    const checkIfUserIsPM = async () => {
      if (!me?.id || items.length === 0) return;

      try {
        const projectIdsInView = Array.from(new Set(items.map(i => i.projectId)));

        if (projectIdsInView.length === 0) return;

        // Only fetch projects we haven't checked yet (avoid redundant API calls)
        const alreadyChecked = new Set(userPMProjects); // projects we know user is PM in
        // We need to check ALL projects in view, not just unknown ones, because we also
        // need to confirm "not PM" for projects not in userPMProjects
        const projectIds = projectIdsInView.join(',');
        const batchRes = await fetch(`/api/proyek-team/batch?projectIds=${projectIds}`, {
          cache: 'no-store',
          credentials: 'include'
        });

        if (!batchRes.ok) return;

        const batchData = await batchRes.json();
        const teamsByProject = batchData.items || {};

        const newPmProjectIds: number[] = [];

        for (const projectId of projectIdsInView) {
          const teamMembers = teamsByProject[projectId] || [];
          const userTeamMember = teamMembers.find((m: any) => m.pegawaiId === me.id);

          if (userTeamMember && userTeamMember.jabatan) {
            const jabatanUpper = userTeamMember.jabatan.toUpperCase();
            if (jabatanUpper.includes('PM')) {
              newPmProjectIds.push(projectId);
            }
          }
        }

        // Merge with existing known PM projects (accumulate, never shrink)
        setUserPMProjects(prev => {
          const merged = Array.from(new Set([...prev, ...newPmProjectIds]));
          return merged;
        });
        setUserIsPMInAnyProject(prev => prev || newPmProjectIds.length > 0);
      } catch (error) {
        console.error('Error checking if user is PM:', error);
      }
    };

    checkIfUserIsPM();
  }, [me?.id, items]);

  // me comes from AuthProvider; derive loaded flag
  const meLoaded = !meLoading;

  // load tasklist (server-side pagination + filters + sorting)
  useEffect(() => {
    // ensure user role is known to apply correct server-side sort for PROGRAMMER
    if (!meLoaded) return;
    const controller = new AbortController();
    const reqId = ++lastReqIdRef.current;
    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        // filters
        if (filterProjectId) params.set('projectId', String(filterProjectId));
        if (filterPegawaiId) params.set('pegawaiId', String(filterPegawaiId));
        if (filterStatus && filterStatus !== 'TERLAMBAT') params.set('status', String(filterStatus));
        if (filterTeamId) params.set('teamId', String(filterTeamId));
        if (filterTasklistType) params.set('tasklistType', String(filterTasklistType));
        if (filterVersion) params.set('baVersion', String(filterVersion));
        if (filterFrom) params.set('from', filterFrom);
        if (filterTo) params.set('to', filterTo);
        // pagination
        params.set('page', String(page));
        params.set('size', String(pageSize));
        // sorting: enforce custom status order for PROGRAMMER/ADMIN and PM/SUPER_ADMIN on server
        // 'aksi' is a frontend-only sort, send scheduleAt to server in that case
        const serverSortKey = (me?.role === 'PROGRAMMER' || me?.role === 'ADMIN')
          ? 'statusCustom'
          : ((me?.role === 'PM' || me?.role === 'SUPER_ADMIN') ? 'statusCustomPM' : (sortKey === 'aksi' ? 'scheduleAt' : sortKey));
        params.set('sortKey', serverSortKey);
        params.set('sortDir', sortDir);
        const res = await fetch(`/api/tasklist?${params.toString()}`, { cache: 'no-store', credentials: 'include', signal: controller.signal });
        if (res.ok) {
          try {
            const data = await res.json();
            let arr = Array.isArray(data?.items) ? data.items : [];
            if (filterStatus === 'TERLAMBAT') {
              const now = new Date();
              arr = arr.filter((t: any) => t.calculatedDueDate && new Date(t.calculatedDueDate) < now && t.status !== 'SELESAI');
            }
            if (lastReqIdRef.current === reqId) {
              setItems(arr);
              setTotal(filterStatus === 'TERLAMBAT' ? arr.length : Number(data?.total || arr.length));
              // Sync page with server-reported page to avoid numbering mismatch
              if (Number.isFinite(data?.page) && data.page !== page) {
                setPage(Number(data.page));
              }
              setDataReady(true);
            }
          } catch (e) {
            console.error('Failed to parse tasklist JSON:', e, 'Response status:', res.status);
            if (lastReqIdRef.current === reqId) {
              setItems([]);
              setTotal(0);
              setDataReady(true);
            }
          }
        } else {
          if (lastReqIdRef.current === reqId) {
            setItems([]); setTotal(0);
            setDataReady(true);
          }
        }
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') {
          console.error("Failed to load tasklist", e);
        }
      } finally {
        if (lastReqIdRef.current === reqId) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [filterProjectId, filterPegawaiId, filterStatus, filterTeamId, filterTasklistType, filterVersion, filterFrom, filterTo, page, pageSize, sortKey, sortDir, me, meLoading, meLoaded]);

  // Helper to reload using current filters/sort/pagination (same as effect above)
  const reloadWithCurrentParams = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterProjectId) params.set('projectId', String(filterProjectId));
      if (filterPegawaiId) params.set('pegawaiId', String(filterPegawaiId));
      if (filterStatus) params.set('status', String(filterStatus));
      if (filterTeamId) params.set('teamId', String(filterTeamId));
      if (filterTasklistType) params.set('tasklistType', String(filterTasklistType));
      if (filterVersion) params.set('baVersion', String(filterVersion));
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      params.set('page', String(page));
      params.set('size', String(pageSize));
      const serverSortKey = (me?.role === 'PROGRAMMER' || me?.role === 'ADMIN')
        ? 'statusCustom'
        : ((me?.role === 'PM' || me?.role === 'SUPER_ADMIN') ? 'statusCustomPM' : (sortKey === 'aksi' ? 'scheduleAt' : sortKey));
      params.set('sortKey', serverSortKey);
      params.set('sortDir', sortDir);
      const res = await fetch(`/api/tasklist?${params.toString()}`, { cache: 'no-store', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data?.items) ? data.items : [];
        setItems(arr);
        setTotal(Number(data?.total || arr.length));
        if (Number.isFinite(data?.page) && data.page !== page) {
          setPage(Number(data.page));
        }
        setDataReady(true);
        // Refresh sidebar badge after data reload
        refreshBadge();
      }
    } catch (e) {
      console.error('reloadWithCurrentParams failed', e);
    }
  }, [filterProjectId, filterPegawaiId, filterStatus, filterTeamId, filterTasklistType, filterVersion, filterFrom, filterTo, page, pageSize, sortKey, sortDir, me, refreshBadge]);

  // Listen for task updates from other components (e.g. NotificationDropdown modal)
  // NotificationDropdown owns the Pusher subscription on `private-user-${me.id}` and
  // re-dispatches every incoming task-notification as a `task_updated` window event,
  // so we react to that instead of binding a second Pusher handler here (which would
  // get wiped by NotificationDropdown's `channel.unbind('task-notification')` on re-render).
  useEffect(() => {
    const handleTaskUpdate = () => {
      console.log('🔄 [TasklistPage] Received task_updated event, reloading data...');
      reloadWithCurrentParams();
      router.refresh();
    };

    window.addEventListener('task_updated', handleTaskUpdate);
    return () => {
      window.removeEventListener('task_updated', handleTaskUpdate);
    };
  }, [reloadWithCurrentParams, router]);

  // when items change, populate programmer presence per project (lazy, cached)
  useEffect(() => {
    const uniqueProjectIds = Array.from(new Set(items.map((i) => i.projectId)));
    const missing = uniqueProjectIds.filter((pid) => projectHasProgrammer[pid] === undefined);
    if (missing.length === 0) return;
    let alive = true;
    (async () => {
      try {
        // Use batch endpoint instead of individual calls
        const projectIds = missing.join(',');
        const res = await fetch(`/api/proyek-team/batch?projectIds=${projectIds}`, { cache: 'no-store', credentials: 'include' });
        if (!res.ok) return;

        const batchData = await res.json();
        const teamsByProject = batchData.items || {};

        const entries: Array<[number, boolean]> = [];
        for (const pid of missing) {
          const teamMembers = teamsByProject[pid] || [];
          const hasProg = teamMembers.some((r: any) => typeof r.jabatan === 'string' && r.jabatan.toLowerCase().includes('programmer'));
          entries.push([pid, hasProg]);
        }

        if (!alive || entries.length === 0) return;
        setProjectHasProgrammer((prev) => {
          const next = { ...prev };
          for (const [pid, val] of entries) next[pid] = val;
          return next;
        });
      } catch { }
    })();
    return () => { alive = false; };
  }, [items, projectHasProgrammer]);

  // when items change, check if SUPER_ADMIN user is in project team (for PM actions)
  useEffect(() => {
    if (!me || me.role !== 'SUPER_ADMIN') return;
    const uniqueProjectIds = Array.from(new Set(items.map((i) => i.projectId)));
    const missing = uniqueProjectIds.filter((pid) => userInProject[pid] === undefined);
    if (missing.length === 0) return;
    let alive = true;
    (async () => {
      try {
        // Use batch endpoint instead of individual calls
        const projectIds = missing.join(',');
        const res = await fetch(`/api/proyek-team/batch?projectIds=${projectIds}`, { cache: 'no-store', credentials: 'include' });
        if (!res.ok) return;

        const batchData = await res.json();
        const teamsByProject = batchData.items || {};

        const entries: Array<[number, boolean]> = [];
        for (const pid of missing) {
          const teamMembers = teamsByProject[pid] || [];
          const isInTeam = teamMembers.some((member: any) => member.pegawaiId === me.id);
          entries.push([pid, isInTeam]);
        }

        if (!alive || entries.length === 0) return;
        setUserInProject((prev) => {
          const next = { ...prev };
          for (const [pid, val] of entries) next[pid] = val;
          return next;
        });
      } catch { }
    })();
    return () => { alive = false; };
  }, [items, userInProject, me]);

  // Load PIC status and their region's projects
  useEffect(() => {
    if (!me?.id) {
      setIsPIC(false);
      setIsPICLoading(false);
      setPicProjects([]);
      return;
    }

    const loadPICStatus = async () => {
      try {
        setIsPICLoading(true);
        console.log('🔍 [PIC Check] Starting PIC status check for user:', me.id, me.namaLengkap);

        // Only check projects that are in the current tasklist view
        const projectIdsInView = Array.from(new Set(items.map(i => i.projectId)));
        console.log('📋 [PIC Check] Found projects in view:', projectIdsInView.length);

        if (projectIdsInView.length === 0) {
          setIsPIC(false);
          setPicProjects([]);
          return;
        }

        // Use batch endpoint to fetch team data only for projects in current view
        const projectIds = projectIdsInView.join(',');
        const batchRes = await fetch(`/api/proyek-team/batch?projectIds=${projectIds}`, {
          cache: 'no-store',
          credentials: 'include'
        });

        if (!batchRes.ok) {
          console.log('❌ [PIC Check] Failed to fetch batch team data');
          setIsPIC(false);
          setPicProjects([]);
          return;
        }

        const batchData = await batchRes.json();
        const teamsByProject = batchData.items || {};

        // Check each project to see if user is PIC Region
        const myProjectIds: number[] = [];
        for (const projectId of projectIdsInView) {
          const teamMembers = teamsByProject[projectId] || [];

          // Check if I'm PIC Region in this project (includes dual role "PM & PIC Region")
          const isPICInProject = teamMembers.some((m: any) => {
            const match = m.pegawaiId === me.id && m.jabatan && m.jabatan.includes('PIC');
            if (m.pegawaiId === me.id) {
              console.log(`👤 [PIC Check] Found user in project ${projectId}:`, {
                jabatan: m.jabatan,
                teamSource: m.teamSource,
                isPIC: match
              });
            }
            return match;
          });

          if (isPICInProject) {
            console.log(`✅ [PIC Check] User IS PIC in project: ${projectId}`);
            myProjectIds.push(projectId);
          }
        }

        console.log('📊 [PIC Check] Final results:', {
          isPIC: myProjectIds.length > 0,
          projectCount: myProjectIds.length,
          projectIds: myProjectIds
        });

        setIsPIC(myProjectIds.length > 0);
        setPicProjects(myProjectIds);
      } catch (e) {
        console.error('❌ [PIC Check] Failed to load PIC status:', e);
        setIsPIC(false);
        setPicProjects([]);
      } finally {
        setIsPICLoading(false);
      }
    };

    loadPICStatus();
  }, [me, items]);

  // Load PIC status for all users in tasklist (for badge display)
  useEffect(() => {
    const uniqueUsers = Array.from(new Set(items.map(i => i.pegawaiId)));
    const uniqueProjects = Array.from(new Set(items.map(i => i.projectId)));

    if (uniqueUsers.length === 0 || uniqueProjects.length === 0) return;

    let alive = true;
    (async () => {
      try {
        // Use batch endpoint instead of individual calls
        const projectIds = uniqueProjects.join(',');
        const teamRes = await fetch(`/api/proyek-team/batch?projectIds=${projectIds}`, { cache: 'no-store', credentials: 'include' });
        if (!teamRes.ok) return;

        const batchData = await teamRes.json();
        const teamsByProject = batchData.items || {};

        const updates: Record<number, Record<number, boolean>> = {};

        for (const projectId of uniqueProjects) {
          const teamMembers = teamsByProject[projectId] || [];

          // Find all PICs in this project (includes dual role "PM & PIC Region")
          teamMembers.forEach((member: any) => {
            if (member.jabatan && member.jabatan.includes('PIC')) {
              if (!updates[member.pegawaiId]) {
                updates[member.pegawaiId] = {};
              }
              updates[member.pegawaiId][projectId] = true;
            }
          });
        }

        if (!alive) return;
        setUserPICStatus(prev => ({ ...prev, ...updates }));
      } catch (e) {
        console.error(`Failed to load PIC status:`, e);
      }
    })();

    return () => { alive = false; };
  }, [items]);

  // when items change, populate module label/code cache per project (lazy)
  useEffect(() => {
    const uniqueProjectIds = Array.from(new Set(items.map((i) => i.projectId)));
    const missing = uniqueProjectIds.filter((pid) => !projectModuleLabel[pid] || !projectModuleCode[pid]);
    if (missing.length === 0) return;
    let alive = true;
    (async () => {
      const updates: Array<[number, Record<number, string>]> = [];
      const updatesCode: Array<[number, Record<number, string>]> = [];
      for (const pid of missing) {
        try {
          const res = await fetch(`/api/proyek-modules/${pid}/tree`, { cache: 'no-store', credentials: 'include' });
          if (!res.ok) continue;
          const data = await res.json();
          const tree: TreeNode[] = Array.isArray(data?.tree) ? data.tree : [];
          // build full ancestry label map id -> full path label and collect codes
          const nameMap = new Map<number, string>();
          const codeMap = new Map<number, string>();
          const walk = (nodes: TreeNode[], parentPath: string | null) => {
            for (const n of nodes) {
              const formatted = parentPath ? `${parentPath} - ${n.nama}` : n.nama;
              nameMap.set(n.id, formatted);
              if (typeof (n as any).kode === 'string' && (n as any).kode) {
                codeMap.set(n.id, (n as any).kode as string);
              }
              if (n.children && n.children.length) walk(n.children, formatted);
            }
          };
          walk(tree, null);
          const obj: Record<number, string> = {};
          for (const [id, label] of nameMap.entries()) obj[id] = label;
          updates.push([pid, obj]);
          const objCode: Record<number, string> = {};
          for (const [id, code] of codeMap.entries()) objCode[id] = code;
          updatesCode.push([pid, objCode]);
        } catch { }
      }
      if (!alive || updates.length === 0) return;
      setProjectModuleLabel((prev) => {
        const next = { ...prev };
        for (const [pid, map] of updates) next[pid] = map;
        return next;
      });
      if (!alive) return;
      setProjectModuleCode((prev) => {
        const next = { ...prev } as Record<number, Record<number, string>>;
        for (const [pid, map] of updatesCode) next[pid] = map;
        return next;
      });
    })();
    return () => { alive = false; };
  }, [items, projectModuleLabel, projectModuleCode]);



  // Check if a task overlaps with other tasks (for visual indicator)
  const checkTaskOverlap = (task: TaskItem, allTasks: TaskItem[]) => {
    // Skip completed tasks - they should never show conflict warning
    if (task.status === 'SELESAI') return false;

    if (!task.scheduleAt) return false;

    const taskStart = new Date(task.scheduleAt);
    // Use custom duration if available, otherwise fallback to complexity hours
    const customDuration = task.customDurationHours ? parseFloat(String(task.customDurationHours)) : null;
    const duration = customDuration || complexityHours[task.taskComplexity || 'MEDIUM'] || 4;
    // Use addWorkingHours to calculate end time (includes lunch break)
    const taskEnd = addWorkingHours(taskStart, duration, DEFAULT_CONFIG);

    // Check overlap with OTHER ACTIVE tasks by same programmer
    const overlaps = allTasks.filter(t => {
      if (t.id === task.id) return false; // Skip self
      if (t.pegawaiId !== task.pegawaiId) return false; // Different programmer
      if (t.status === 'SELESAI') return false; // Skip completed tasks
      if (!t.scheduleAt) return false;

      const otherStart = new Date(t.scheduleAt);
      // Use custom duration if available
      const otherCustomDuration = t.customDurationHours ? parseFloat(String(t.customDurationHours)) : null;
      const otherDuration = otherCustomDuration || complexityHours[t.taskComplexity || 'MEDIUM'] || 4;
      // Use addWorkingHours to calculate end time (includes lunch break)
      const otherEnd = addWorkingHours(otherStart, otherDuration, DEFAULT_CONFIG);

      // Check if ranges overlap using working hours
      // Calculate actual working hours overlap
      if (taskStart < otherEnd && taskEnd > otherStart) {
        const overlapStart = taskStart > otherStart ? taskStart : otherStart;
        const overlapEnd = taskEnd < otherEnd ? taskEnd : otherEnd;
        const effectiveOverlap = calculateWorkingHoursBetween(overlapStart, overlapEnd, DEFAULT_CONFIG);
        return effectiveOverlap > 0;
      }
      return false;
    });

    return overlaps.length > 0;
  };


  // options for native select are rendered directly from `modules`

  // init date range picker for filters
  useEffect(() => {
    if (!rangeInputRef.current) return;
    const fp = flatpickr(rangeInputRef.current, {
      mode: "range",
      dateFormat: "Y-m-d",
      defaultDate: [filterFrom || undefined, filterTo || undefined].filter(Boolean) as string[],
      onChange: (selectedDates) => {
        const [from, to] = selectedDates;
        const newFrom = from ? fmt(from) : "";
        const newTo = to ? fmt(to) : "";
        const prevFrom = filterFromRef.current;
        const prevTo = filterToRef.current;
        const changed = newFrom !== prevFrom || newTo !== prevTo;
        if (changed) {
          setFilterFrom(newFrom);
          setFilterTo(newTo);
          setPage(1);
        }
      },
    });
    flatpickrRef.current = fp;
    return () => { fp.destroy(); flatpickrRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeInputRef]);

  // derived rows
  // Client-side quick search on current page items only
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      (i.kode || '').toLowerCase().includes(q) ||
      (i.proyekNama || '').toLowerCase().includes(q) ||
      (i.moduleNama || '').toLowerCase().includes(q) ||
      (i.pegawaiNama || '').toLowerCase().includes(q) ||
      fmtDateTimeShort(new Date(i.scheduleAt)).includes(q)
    );
  }, [items, query]);

  // For PROGRAMMER/ADMIN and PM/SUPER_ADMIN, enforce custom status order within current page items
  const sorted = useMemo(() => {
    const rows = [...filtered];

    // Helper function to calculate action rank for sorting
    // Mirrors the exact same conditions used to render action buttons in the table
    const actionRank = (t: TaskItem): number => {
      const isAssignee = me?.id === t.pegawaiId;

      // Check if PM Approve/Reject buttons would appear — exact same condition as render
      const canPMApprove =
        me &&
        t.status === 'MENUNGGU_REVIEW_PM' &&
        ((me.role === 'PM') || (me.role === 'SUPER_ADMIN' && userInProject[t.projectId] === true) || userPMProjects.includes(t.projectId)) &&
        (() => {
          // Same PIC check as render
          if (t.createdBy && t.createdBy !== me.id) {
            const creatorJabatan = (t as any).creatorJabatan;
            if (creatorJabatan && creatorJabatan.toUpperCase().includes('PIC')) return false;
          }
          return true;
        })();

      if (canPMApprove) return 0; // Approve/Reject visible → highest priority

      if (isAssignee) {
        // Kirim Review button: SEDANG_DIPROSES_USER + startedAt
        if (t.status === 'SEDANG_DIPROSES_USER' && t.startedAt) return 1;
        // Mulai button: MENUNGGU_PROSES_USER
        if (t.status === 'MENUNGGU_PROSES_USER') return 2;
        if (t.status === 'SEDANG_DIPROSES_USER') return 3;
        if (t.status === 'SEDANG_DIPROSES_USER_PAUSED') return 4;
        if (t.status === 'MENUNGGU_REVIEW_PM') return 5;
        if (t.status === 'SELESAI') return 99;
        return 98;
      }

      // Non-assignee fallback order
      if (t.status === 'MENUNGGU_REVIEW_PM') return 10;
      if (t.status === 'SEDANG_DIPROSES_USER') return 11;
      if (t.status === 'SEDANG_DIPROSES_USER_PAUSED') return 12;
      if (t.status === 'MENUNGGU_PROSES_USER') return 13;
      if (t.status === 'SELESAI') return 99;
      return 98;
    };

    // If user clicked on "Aksi" column OR no sortKey specified, use action-based sorting
    if (!sortKey || sortKey === 'aksi') {
      rows.sort((a, b) => {
        const ra = actionRank(a);
        const rb = actionRank(b);
        if (ra !== rb) {
          // Respect sortDir when explicitly sorting by 'aksi'
          return sortDir === 'asc' ? (ra - rb) : (rb - ra);
        }
        // Within same action group, sort by scheduleAt ascending
        const ta = new Date(a.scheduleAt).getTime();
        const tb = new Date(b.scheduleAt).getTime();
        return ta - tb;
      });
    } else if (sortKey && ['scheduleAt', 'proyekNama', 'moduleNama', 'pegawaiNama', 'taskComplexity', 'baVersion'].includes(sortKey)) {
      // User clicked on a specific sortable column, use that sorting
      rows.sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'scheduleAt') {
          const ta = new Date(a.scheduleAt).getTime();
          const tb = new Date(b.scheduleAt).getTime();
          cmp = ta - tb;
        } else if (sortKey === 'proyekNama') {
          cmp = (a.proyekNama || '').localeCompare(b.proyekNama || '');
        } else if (sortKey === 'moduleNama') {
          cmp = (a.moduleNama || '').localeCompare(b.moduleNama || '');
        } else if (sortKey === 'pegawaiNama') {
          cmp = (a.pegawaiNama || '').localeCompare(b.pegawaiNama || '');
        } else if (sortKey === 'taskComplexity') {
          const complexityOrder = { 'EASY': 1, 'MEDIUM': 2, 'HARD': 3 };
          const aOrder = complexityOrder[a.taskComplexity as keyof typeof complexityOrder] || 2;
          const bOrder = complexityOrder[b.taskComplexity as keyof typeof complexityOrder] || 2;
          cmp = aOrder - bOrder;
        } else if (sortKey === 'baVersion') {
          cmp = (a.baVersion || '').localeCompare(b.baVersion || '', undefined, { numeric: true, sensitivity: 'base' });
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [filtered, me, sortKey, sortDir, userPMProjects, userInProject]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const effectivePage = dataReady ? Math.min(Math.max(1, page), totalPages) : page;
  const paged = sorted; // already server-paginated

  // Do not modify URL; keep pagination purely in memory

  // Ensure page state stays within bounds when total/pagesize change
  useEffect(() => {
    if (!dataReady) return;
    const tp = Math.max(1, Math.ceil(total / pageSize));
    if (page > tp) setPage(tp);
    if (page < 1) setPage(1);
  }, [total, pageSize, dataReady]);

  const openAdd = () => {
    openAddModal();
  };

  const openEdit = (t: TaskItem) => {
    setEditingTask(t);
    openEditModal();
  };

  // Format datetime string - keep as local format without timezone conversion
  const formatScheduleAt = (dateTimeStr: string): string => {
    if (!dateTimeStr) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    // Already in correct format "YYYY-MM-DD HH:mm" - just return it
    return dateTimeStr;
  };

  const handleAddTask = async (formData: TaskFormData) => {
    if (!formData.projectId || !formData.moduleId || !formData.pegawaiId || !formData.scheduleAt) return;

    const fd = new FormData();
    fd.append('projectId', String(formData.projectId));
    fd.append('moduleId', String(formData.moduleId));
    fd.append('pegawaiId', String(formData.pegawaiId));
    fd.append('scheduleAt', formatScheduleAt(formData.scheduleAt));
    if (formData.keterangan) fd.append('keterangan', formData.keterangan);
    fd.append('tasklistType', formData.tasklistType);
    fd.append('taskComplexity', formData.taskComplexity);
    fd.append('customDurationHours', formData.customDuration);
    // Append multiple files
    formData.files.forEach(file => {
      fd.append('files', file);
    });

    setLoading(true);
    try {
      const res = await fetch('/api/tasklist', { method: 'POST', body: fd, credentials: 'include' });
      if (!res.ok) {
        let msg = 'Gagal menyimpan task.';
        try { const err = await res.json(); if (err?.error) msg = err.error; } catch { }
        error(msg);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data?.item) {
        // Reload list with current filters/paging/sort
        await reloadWithCurrentParams();
        success('Berhasil menyimpan task');
        closeAddModal();
      }
    } catch (e) {
      console.error('POST /api/tasklist failed', e);
      error('Terjadi kesalahan saat menyimpan.');
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  const handleEditTask = async (formData: TaskEditFormData) => {
    if (!editingTask || !formData.projectId || !formData.moduleId || !formData.pegawaiId || !formData.scheduleAt) return;

    const fd = new FormData();
    fd.append('projectId', String(formData.projectId));
    fd.append('moduleId', String(formData.moduleId));
    fd.append('pegawaiId', String(formData.pegawaiId));
    fd.append('scheduleAt', formatScheduleAt(formData.scheduleAt));
    if (formData.keterangan) fd.append('keterangan', formData.keterangan);
    fd.append('tasklistType', formData.tasklistType);
    fd.append('taskComplexity', formData.taskComplexity);
    fd.append('customDurationHours', formData.customDuration);
    if (formData.editReason) fd.append('editReason', formData.editReason);
    // Append multiple files
    formData.files.forEach(file => {
      fd.append('files', file);
    });

    setLoading(true);
    try {
      const res = await fetch(`/api/tasklist/${editingTask.id}`, { method: 'PUT', body: fd, credentials: 'include' });
      if (!res.ok) {
        let msg = 'Gagal mengubah task.';
        try { const err = await res.json(); if (err?.error) msg = err.error; } catch { }
        error(msg);
        setLoading(false);
        return;
      }
      await reloadWithCurrentParams();
      success('Berhasil mengubah task');
      closeEditModal();
      setEditingTask(null);
    } catch (e) {
      console.error('PUT /api/tasklist/[id] failed', e);
      error('Terjadi kesalahan saat mengubah.');
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TaskItem | null>(null);
  const askDelete = (t: TaskItem) => { setToDelete(t); setConfirmOpen(true); };
  const cancelDelete = () => { setConfirmOpen(false); setToDelete(null); };
  const confirmDelete = async () => {
    if (toDelete) {
      try {
        setLoading(true);
        const res = await fetch(`/api/tasklist/${toDelete.id}`, { method: 'DELETE' });
        if (!res.ok) {
          error('Gagal menghapus task');
        } else {
          setItems(prev => prev.filter(i => i.id !== toDelete.id));
          success('Berhasil menghapus task');
        }
      } catch (e) { console.error('DELETE /api/tasklist/[id] failed', e); error('Terjadi kesalahan saat menghapus.'); }
      finally { setLoading(false); }
    }
    setConfirmOpen(false); setToDelete(null);
  };

  // Status change confirmation (top-level)
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<TaskItem | null>(null);
  const [statusNext, setStatusNext] = useState<TaskItem['status'] | null>(null);
  const [statusNote, setStatusNote] = useState<string>('');
  const [statusImages, setStatusImages] = useState<File[]>([]);

  // Merge selection state for submit confirmation
  const [mergeSourceBranch, setMergeSourceBranch] = useState<string>('');
  const [mergeTargetBranch, setMergeTargetBranch] = useState<string>('');
  const [mergeRepoFullName, setMergeRepoFullName] = useState<string>('');
  const [mergeRepoState, setMergeRepoState] = useState<'checking' | 'found' | 'not_found'>('checking');

  // Handle paste event for images (Ctrl+V)
  useEffect(() => {
    if (!statusConfirmOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Check if item is an image
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
              error(`Gambar terlalu besar. Maksimal 5MB.`);
              continue;
            }

            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
              error(`Format gambar tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.`);
              continue;
            }

            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        setStatusImages(prev => [...prev, ...imageFiles]);
        success(`${imageFiles.length} gambar ditambahkan dari clipboard`);
      }
    };

    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [statusConfirmOpen, error, success]);

  const askStatusChange = (t: TaskItem, next: TaskItem['status']) => {
    // Clear any old merge data from previous submissions
    const pendingMergeStr = sessionStorage.getItem('pendingMerge');
    if (pendingMergeStr) {
      const pendingMerge = JSON.parse(pendingMergeStr);
      // Only clear if it's from a different task
      if (pendingMerge.taskId !== t.id) {
        sessionStorage.removeItem('pendingMerge');
      }
    }

    setStatusTarget(t);
    setStatusNext(next);
    setMergeRepoState('checking'); // Reset state
    setStatusConfirmOpen(true);
  };
  const cancelStatusChange = () => {
    if (loading) return;
    setStatusConfirmOpen(false);
    setStatusTarget(null);
    setStatusNext(null);
    setStatusNote('');
    setStatusImages([]);

    // Reset merge state
    setMergeSourceBranch('');
    setMergeTargetBranch('');
    setMergeRepoFullName('');
    setMergeRepoState('checking');

    // Clear pending merge when canceling
    sessionStorage.removeItem('pendingMerge');

    // Don't close detail modal - let user continue viewing/editing
  };
  const confirmStatusChange = async () => {
    if (!statusTarget || !statusNext) return;

    // Prevent double submission
    if (loading) return;

    setLoading(true);

    try {
      // 1. Check for "Kirim Review" (merge branch -> staging)
      if (statusNext === 'MENUNGGU_REVIEW_PM') {
        if (mergeRepoState === 'found') {
          const pendingMergeStr = sessionStorage.getItem('pendingMerge');
          if (!pendingMergeStr) {
            error("Wajib memilih Source Branch pengerjaan sebelum Submit Kirim Review.");
            setLoading(false);
            return; // HALT STATUS CHANGE
          }

          const pendingMerge = JSON.parse(pendingMergeStr);
          if (pendingMerge.taskId === statusTarget.id) {
            const response = await fetch("/api/github/merge-branch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                repo: pendingMerge.repoFullName,
                head: pendingMerge.sourceBranch,
                base: pendingMerge.targetBranch,
                commit_message: `Merge ${pendingMerge.sourceBranch} to ${pendingMerge.targetBranch} for Task ${statusTarget.kode || statusTarget.id}\n\nTask Description:\n${statusTarget.keterangan || 'Tidak ada deskripsi'}`
              })
            });

            const data = await response.json();

            if (!response.ok) {
              if (data.isConflict) {
                error(data.error || "Terdapat code conflict. Silakan selesaikan conflict secara manual di branch Anda.");
              } else {
                error(data.error || `Gagal melakukan auto-merge ke staging: ${data.message || 'Unknown error'}`);
              }
              setLoading(false);
              return; // HALT STATUS CHANGE
            }

            success(`Berhasil auto-merge branch ${pendingMerge.sourceBranch} ke ${pendingMerge.targetBranch}!`);
            sessionStorage.removeItem('pendingMerge');
          }
        }
      }

      // 2. Check for "Approve" (merge staging -> trial)
      if (statusTarget.status === 'MENUNGGU_REVIEW_PM' && statusNext === 'SELESAI') {
        try {
          const repoRes = await fetch(`/api/github/repo-by-project/${statusTarget.projectId}`);
          
          if (!repoRes.ok) {
            console.log('[Auto-merge] No GitHub repository configured for this project, skipping auto-merge');
            // Continue with approval without merge
          } else {
            const repoData = await repoRes.json();
            
            if (!repoData.repository || !repoData.repository.repositoryFullName) {
              console.log('[Auto-merge] Project has no GitHub repository configured, skipping auto-merge');
              // Continue with approval without merge
            } else {
              const repoFullName = repoData.repository.repositoryFullName;
              
              // Check if GitHub credentials are valid before attempting merge
              const owner = repoFullName.split('/')[0];
              const credentialCheckRes = await fetch(`/api/github/active-username`);
              
              if (!credentialCheckRes.ok) {
                console.warn('[Auto-merge] GitHub credentials not configured, skipping auto-merge');
                // Continue with approval without merge, show info message after
              } else {
                const response = await fetch("/api/github/merge-branch", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    repo: repoFullName,
                    head: 'staging',
                    base: 'trial',
                    commit_message: `Auto-merge staging to trial upon Approve Task ${statusTarget.kode || statusTarget.id}\n\nTask Description:\n${statusTarget.keterangan || 'Tidak ada deskripsi'}`
                  })
                });

                const data = await response.json();

                if (!response.ok) {
                  console.warn('[Auto-merge] Failed to auto-merge:', data.error || data.message);
                  if (data.isConflict) {
                    // Continue with approval but show conflict message
                  } else {
                    // Continue with approval but show error message
                  }
                  // Continue with approval despite merge failure
                } else {
                  success(`Berhasil auto-merge staging ke trial!`);
                }
              }
            }
          }
        } catch (err) {
          console.error('[Auto-merge] Error during auto-merge check:', err);
          // Continue with approval despite errors
        }
      }

      // 3. Status Transition Logic
      if (statusTarget.status === 'MENUNGGU_PROSES_USER' && statusNext === 'SEDANG_DIPROSES_USER') {
        await startTaskWithStatusChange(statusTarget);
      }
      else if (statusTarget.status === 'SEDANG_DIPROSES_USER' && statusNext === 'MENUNGGU_REVIEW_PM') {
        await completeTaskWithStatusChange(statusTarget);
      }
      else {
        await transitionStatus(statusTarget, statusNext);
      }

      // Show notification and close modals after notification appears
      setTimeout(() => {
        setStatusConfirmOpen(false);
        setStatusTarget(null);
        setStatusNext(null);
        setStatusNote('');
        setStatusImages([]);

        // Close detail modal after successful confirmation
        setDetailOpen(false);
        setDetailItem(null);
        setDetailActiveTab('detail');
      }, 300);

    } catch (err) {
      console.error('[confirmStatusChange] Error:', err);
      error("Terjadi kesalahan sistem saat memproses.");
    } finally {
      setLoading(false);
    }

    // Close detail modal after successful confirmation
    setDetailOpen(false);
    setDetailItem(null);
    setDetailActiveTab('detail');
  };

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const statusBadge = (s?: string, isOverdue?: boolean) => {
    // Match Dashboard labels
    const label = !s ? '-' : (
      s === 'MENUNGGU_PROSES_USER' ? 'Menunggu Proses' :
        s === 'SEDANG_DIPROSES_USER' ? 'Sedang Diproses' :
          s === 'SEDANG_DIPROSES_USER_PAUSED' ? 'Dihentikan' :
            s === 'MENUNGGU_REVIEW_PM' ? 'Menunggu Review PM' :
              'Selesai'
    );
    let cls = 'bg-gray-100 border border-gray-300 text-gray-800 dark:bg-gray-500/20 dark:border-transparent dark:text-white';
    if (s === 'MENUNGGU_PROSES_USER') cls = 'bg-gray-100 border border-gray-300 text-gray-800 dark:bg-gray-500/20 dark:border-transparent dark:text-white';
    if (s === 'SEDANG_DIPROSES_USER') cls = 'bg-blue-100 border border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-transparent dark:text-white';
    if (s === 'SEDANG_DIPROSES_USER_PAUSED') cls = 'bg-orange-100 border border-orange-300 text-orange-800 dark:bg-orange-500/20 dark:border-transparent dark:text-white';
    if (s === 'MENUNGGU_REVIEW_PM') cls = 'bg-amber-100 border border-amber-300 text-amber-800 dark:bg-amber-500/20 dark:border-transparent dark:text-white';
    if (s === 'SELESAI') cls = 'bg-emerald-100 border border-emerald-300 text-emerald-800 dark:bg-emerald-500/20 dark:border-transparent dark:text-white';
    if (isOverdue && s !== 'SELESAI') {
      cls = 'bg-red-100 border border-red-300 text-red-800 dark:bg-red-500/20 dark:border-transparent dark:text-white';
      return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>Terlambat ({label})</span>;
    }
    return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
  };

  const tasklistTypeBadge = (type?: string) => {
    const label = !type ? '-' : (
      type === 'BLUEPRINT' ? 'Blueprint' :
        type === 'DEVELOPMENT' ? 'Development' :
          type === 'MAINTENANCE' ? 'Maintenance' : type
    );
    let cls = 'bg-gray-100 border border-gray-300 text-gray-800 dark:bg-gray-500/20 dark:border-transparent dark:text-white';
    if (type === 'BLUEPRINT') cls = 'bg-purple-100 border border-purple-300 text-purple-800 dark:bg-purple-500/20 dark:border-transparent dark:text-white';
    if (type === 'DEVELOPMENT') cls = 'bg-blue-100 border border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-transparent dark:text-white';
    if (type === 'MAINTENANCE') cls = 'bg-orange-100 border border-orange-300 text-orange-800 dark:bg-orange-500/20 dark:border-transparent dark:text-white';
    return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
  };

  const taskComplexityBadge = (complexity?: string) => {
    const label = !complexity ? '-' : (
      complexity === 'EASY' ? 'Easy' :
        complexity === 'MEDIUM' ? 'Medium' :
          complexity === 'HARD' ? 'Hard' : complexity
    );
    let cls = 'bg-gray-100 border border-gray-300 text-gray-800 dark:bg-gray-500/20 dark:border-transparent dark:text-white';
    if (complexity === 'EASY') cls = 'bg-green-100 border border-green-300 text-green-800 dark:bg-green-500/20 dark:border-transparent dark:text-white';
    if (complexity === 'MEDIUM') cls = 'bg-yellow-100 border border-yellow-300 text-yellow-800 dark:bg-yellow-500/20 dark:border-transparent dark:text-white';
    if (complexity === 'HARD') cls = 'bg-red-100 border border-red-300 text-red-800 dark:bg-red-500/20 dark:border-transparent dark:text-white';
    return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
  };

  const userRoleBadge = (role?: string, userId?: number, projectId?: number, jabatan?: string | null) => {
    // Prioritize jabatan from ProyekTeam over role from Pegawai
    let label = '';
    let cls = '';

    // Check if user is PIC in this project
    const isPICInProject = userId && projectId && userPICStatus[userId]?.[projectId];

    // Use jabatan if available (from ProyekTeam)
    if (jabatan) {
      const jabatanUpper = jabatan.toUpperCase();

      if (jabatanUpper.includes('PM') && jabatanUpper.includes('PIC')) {
        // Dual role: PM & PIC
        label = 'PM & PIC';
        cls = 'bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-300 text-purple-800 dark:from-purple-500/20 dark:to-blue-500/20 dark:border-transparent dark:text-purple-300';
      } else if (jabatanUpper.includes('PM')) {
        label = 'PM';
        cls = 'bg-purple-100 border border-purple-300 text-purple-800 dark:bg-purple-500/20 dark:border-transparent dark:text-purple-300';
      } else if (jabatanUpper.includes('PIC')) {
        label = 'PIC';
        cls = 'bg-blue-100 border border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-transparent dark:text-blue-300';
      } else if (jabatanUpper.includes('PROGRAMMER')) {
        label = 'Programmer';
        cls = 'bg-gray-100 border border-gray-300 text-gray-700 dark:bg-gray-500/20 dark:border-transparent dark:text-gray-300';
      } else {
        // Custom jabatan
        label = jabatan;
        cls = 'bg-gray-100 border border-gray-300 text-gray-700 dark:bg-gray-500/20 dark:border-transparent dark:text-gray-300';
      }
    } else if (role) {
      // Fallback to role from Pegawai table
      if (role === 'SUPER_ADMIN') {
        label = 'Super Admin';
        cls = 'bg-red-100 border border-red-300 text-red-800 dark:bg-red-500/20 dark:border-transparent dark:text-red-300';
      } else if (role === 'PM') {
        label = 'PM';
        cls = 'bg-purple-100 border border-purple-300 text-purple-800 dark:bg-purple-500/20 dark:border-transparent dark:text-purple-300';
      } else if (isPICInProject) {
        label = 'PIC';
        cls = 'bg-blue-100 border border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-transparent dark:text-blue-300';
      } else if (role === 'ADMIN') {
        label = 'Admin';
        cls = 'bg-orange-100 border border-orange-300 text-orange-800 dark:bg-orange-500/20 dark:border-transparent dark:text-orange-300';
      } else if (role === 'PROGRAMMER') {
        label = 'Programmer';
        cls = 'bg-gray-100 border border-gray-300 text-gray-700 dark:bg-gray-500/20 dark:border-transparent dark:text-gray-300';
      } else {
        return null;
      }
    } else {
      return null;
    }

    return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${cls} ml-1`}>{label}</span>;
  };

  const labelStatus = (s?: TaskItem['status']) => (
    s === 'MENUNGGU_PROSES_USER' ? 'Menunggu Proses' :
      s === 'SEDANG_DIPROSES_USER' ? 'Sedang Diproses' :
        s === 'SEDANG_DIPROSES_USER_PAUSED' ? 'Dihentikan' :
          s === 'MENUNGGU_REVIEW_PM' ? 'Menunggu Review PM' :
            s === 'SELESAI' ? 'Selesai' : '-'
  );

  const statusActionMeta = (prev?: TaskItem['status'], next?: TaskItem['status']) => {
    // Reject (from review back to in progress)
    if (prev === 'MENUNGGU_REVIEW_PM' && next === 'MENUNGGU_PROSES_USER') {
      return {
        label: 'Reject',
        cls: 'bg-red-600 hover:bg-red-700',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        )
      };
    }
    if (next === 'SELESAI') {
      return {
        label: 'Approve',
        cls: 'bg-emerald-600 hover:bg-emerald-700',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        )
      };
    }
    if (next === 'MENUNGGU_REVIEW_PM') {
      return {
        label: 'Kirim Review',
        cls: 'bg-amber-600 hover:bg-amber-700',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 5 17 10" /><line x1="12" y1="5" x2="12" y2="20" /></svg>
        )
      };
    }
    if (next === 'SEDANG_DIPROSES_USER') {
      return {
        label: 'Mulai',
        cls: 'bg-brand-600 hover:bg-brand-700',
        icon: (
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6 4l10 6-10 6V4z" /></svg>
        )
      };
    }
    return { label: 'Ubah Status', cls: 'bg-brand-600 hover:bg-brand-700', icon: null };
  };

  // WhatsApp helpers
  const normNumber = (raw?: string | null) => {
    if (!raw) return null;
    let n = String(raw).replace(/[^0-9+]/g, '');
    if (n.startsWith('+')) n = n.slice(1);
    if (n.startsWith('0')) n = '62' + n.slice(1);
    return n.match(/^\d{7,18}$/) ? n : null;
  };
  const getPegawaiById = (id?: number | null) => (id ? pegawais.find((p: any) => p.id === id) : undefined);
  const getPegawaiNumber = (id?: number | null): string | null => {
    const p: any = getPegawaiById(id);
    const cand = p?.phoneNumber ?? p?.nohp ?? p?.noHp ?? p?.telepon ?? p?.telp ?? p?.whatsapp ?? p?.wa ?? p?.hp ?? null;
    return normNumber(cand);
  };
  const getPegawaiName = (id?: number | null): string | null => {
    const p: any = getPegawaiById(id);
    const name = p?.namaLengkap ?? p?.nama ?? p?.fullName ?? p?.displayName ?? null;
    return name || null;
  };
  const greetByTime = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 19) return 'Selamat sore';
    return 'Selamat malam';
  };
  const resolveModuleName = (projectId?: number, moduleId?: number, fallback?: string | null) => {
    if (!moduleId || !projectId) return fallback || '-';
    // Prefer full ancestry label from cache
    const cached = projectModuleLabel[projectId]?.[moduleId];
    if (cached) return cached;
    if (fallback) return fallback;
    // try from current table rows
    const found = items.find(it => it.projectId === projectId && it.moduleId === moduleId)?.moduleNama;
    if (found) return found;
    // try from current modules option list (if available in scope)
    try {
      // Module name resolution from cache
    } catch { }
    return '-';
  };
  const resolveModuleCode = (projectId?: number, moduleId?: number): string => {
    if (!moduleId || !projectId) return '-';
    const code = projectModuleCode[projectId]?.[moduleId];
    return code || '-';
  };
  const findProjectPMNumber = async (projectId: number): Promise<string | null> => {
    try {
      const res = await fetch(`/api/proyek-team/${projectId}`, { cache: 'no-store', credentials: 'include' });
      if (!res.ok) return null;
      const d = await res.json();
      const items = Array.isArray(d?.items) ? d.items : [];
      // Try to find member with PM role if role field exists
      const pm = items.find((m: any) => {
        const r = (m?.role || m?.jabatan || '').toString().toUpperCase();
        return r.includes('PM') || r.includes('PROJECT_MANAGER');
      }) || items.find((m: any) => (m?.isPm === true));
      const pegawaiId = pm?.pegawaiId ?? null;
      return getPegawaiNumber(pegawaiId);
    } catch {
      return null;
    }
  };
  // WhatsApp helpers
  const sendWA = async (number: string | null | undefined, message: string) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[WA Frontend] 📱 sendWA called');
    console.log('[WA Frontend] Number:', number || 'NO NUMBER');
    console.log('[WA Frontend] Message length:', message?.length || 0);

    if (!number) {
      console.warn('[WA Frontend] ❌ Skipped: no number provided');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    console.log('[WA Frontend] Message preview:', message.substring(0, 100) + '...');

    try {
      console.log('[WA Frontend] 📤 Importing whatsappService...');
      const { sendSimpleWhatsApp } = await import('@/lib/whatsappService');

      console.log('[WA Frontend] 📤 Calling sendSimpleWhatsApp...');
      const result = await sendSimpleWhatsApp(number, message, 'task_review');

      console.log('[WA Frontend] Result:', result ? '✅ SUCCESS' : '❌ FAILED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (e) {
      console.error('[WA Frontend] ❌ Exception caught!');
      console.error('[WA Frontend] Error:', e);
      console.error('[WA Frontend] Stack:', e instanceof Error ? e.stack : 'No stack');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  };
  const buildStatusMessage = (prev?: TaskItem['status'], next?: TaskItem['status'], t?: TaskItem) => {
    const code = t?.kode ? ` (${t.kode})` : '';
    if (prev === 'MENUNGGU_PROSES_USER' && next === 'SEDANG_DIPROSES_USER') return `Task${code} telah dimulai.`;
    if (prev === 'SEDANG_DIPROSES_USER' && next === 'MENUNGGU_REVIEW_PM') return `Task${code} telah dikirim untuk review.`;
    if (prev === 'MENUNGGU_REVIEW_PM' && next === 'SELESAI') return `Task${code} telah di-approve.`;
    if (prev === 'MENUNGGU_REVIEW_PM' && next === 'MENUNGGU_PROSES_USER') return `Task${code} direject. Status kembali ke Menunggu Proses.`;
    return `Status task${code} diubah: ${labelStatus(prev)} → ${labelStatus(next)}.`;
  };
  const buildDetailedStatusMessage = (recipientName: string | null, prev?: TaskItem['status'], next?: TaskItem['status'], t?: TaskItem) => {
    const greet = `${greetByTime()} ${recipientName || 'Bapak/Ibu'},`;
    const kode = `Kode: ${t?.kode || '-'}`;
    const modulName = resolveModuleName(t?.projectId, t?.moduleId, t?.moduleNama);
    const modulCode = resolveModuleCode(t?.projectId, t?.moduleId);
    const modul = `Modul: ${modulCode} - ${modulName}`;
    const ket = `Keterangan: ${t?.keterangan || '-'}`;
    const msg = buildStatusMessage(prev, next, t);
    return [greet, kode, modul, ket, '', `*${msg}*`, '', `(Pesan otomatis dari Richz-Log)`].join('\n');
  };
  const buildCreateMessage = (recipientName: string | null, item: TaskItem, scheduleDisplay: string) => {
    const greet = `${greetByTime()} ${recipientName || 'Bapak/Ibu'},`;
    const kode = `Kode: ${item?.kode || '-'}`;
    const modulName = resolveModuleName(item?.projectId, item?.moduleId, item?.moduleNama);
    const modulCode = resolveModuleCode(item?.projectId, item?.moduleId);
    const modul = `Modul: ${modulCode} - ${modulName}`;
    const ket = `Keterangan: ${item?.keterangan || '-'}`;
    const pesan = `Task dijadwalkan pada ${scheduleDisplay}. Anda ditugaskan untuk task ini.`;
    return [greet, kode, modul, ket, '', `*${pesan}*`, '', `(Pesan otomatis dari Richz-Log)`].join('\n');
  };

  const transitionStatus = async (t: TaskItem, next: TaskItem['status']) => {
    try {
      setLoading(true);
      let res: Response;

      // If Reject or Kirim Review, allow optional note/images and send as multipart when provided
      const isRejectOrSubmit = (t.status === 'MENUNGGU_REVIEW_PM' && next === 'MENUNGGU_PROSES_USER') || (next === 'MENUNGGU_REVIEW_PM');
      const hasNoteOrImages = statusNote || statusImages.length > 0;

      // Debug logging
      console.log('🔄 [Status Transition]:', {
        taskId: t.id,
        from: t.status,
        to: next,
        isRejectOrSubmit,
        hasNote: !!statusNote,
        noteLength: statusNote?.length || 0,
        hasImages: statusImages.length > 0,
        imageCount: statusImages.length
      });

      if (isRejectOrSubmit && hasNoteOrImages) {
        // Send as multipart form data (for note and/or images)
        const fd = new FormData();
        fd.set('status', String(next));

        // If no note but has images, use default message
        const finalNote = statusNote || (statusImages.length > 0 ? 'dengan lampiran' : '');
        if (finalNote) {
          fd.set('keterangan', finalNote);
          console.log('📝 Adding keterangan to request:', finalNote);
        }

        // Append multiple images
        statusImages.forEach(file => {
          fd.append('images', file);
        });
        res = await fetch(`/api/tasklist/${t.id}`, {
          method: 'PUT',
          body: fd,
          credentials: 'include',
        });
      } else {
        // Send as JSON (simple status change)
        res = await fetch(`/api/tasklist/${t.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
          credentials: 'include',
        });
      }
      if (!res.ok) {
        let msg = 'Gagal mengubah status.';
        try { const e = await res.json(); if (e?.error) msg = e.error; } catch { }
        error(msg);
        return;
      }
      // Check if we need to show CRM notification modal BEFORE reloading
      const prev = t.status;

      // If approving, fetch fresh task data to ensure we have ticket_id
      if (prev === 'MENUNGGU_REVIEW_PM' && next === 'SELESAI') {
        try {
          const taskRes = await fetch(`/api/tasklist/${t.id}`, { credentials: 'include' });
          if (taskRes.ok) {
            const taskData = await taskRes.json();
            const freshTask = taskData.item;

            // Check for CRM ticket ID (supports both new and legacy fields)
            const hasCrmTicket = !!(freshTask.ticketId || freshTask.ticket_id || freshTask.idCrm);

            console.log('[CRM Modal Check] Fresh task data:', freshTask);
            console.log('[CRM Modal Check] Details:', {
              prev,
              next,
              ticketId: freshTask.ticketId,
              ticket_id: freshTask.ticket_id,
              idCrm: freshTask.idCrm,
              hasCrmTicket,
              taskId: freshTask.id,
              taskCode: freshTask.kode
            });

            if (hasCrmTicket) {
              console.log('[CRM Modal] Opening modal for task:', freshTask.kode);
              // Task approved with CRM ticket ID - show modal for CRM notification
              setCrmModalTask({ ...freshTask, status: next });
              setCrmModalOpen(true);
            } else {
              console.log('[CRM Modal] Task approved but no CRM ticket ID');
            }
          }
        } catch (err) {
          console.error('[CRM Modal] Failed to fetch fresh task data:', err);
        }
      }

      await reloadWithCurrentParams();

      // Kirim catatan sebagai pesan chat jika diisi
      if (statusNote?.trim() || statusImages.length > 0) {
        // Derive action type dari status transition
        const actionType = (() => {
          if (t.status === 'MENUNGGU_REVIEW_PM' && next === 'MENUNGGU_PROSES_USER') return 'reject';
          if (t.status === 'MENUNGGU_REVIEW_PM' && next === 'SELESAI') return 'approve';
          if (next === 'MENUNGGU_REVIEW_PM') return 'kirim_review';
          if (next === 'SEDANG_DIPROSES_USER') return 'mulai';
          if (next === 'SEDANG_DIPROSES_USER_PAUSED') return 'pause';
          if (next === 'MENUNGGU_PROSES_USER') return 'kembalikan';
          return 'action_note';
        })();
        await sendActionChat(t.id, statusNote?.trim() || '', statusImages, actionType);
      }

      // Show specific success message based on status change
      if (next === 'SELESAI') {
        success('Task berhasil diselesaikan! 🎉');
      } else if (next === 'MENUNGGU_REVIEW_PM') {
        success('Task berhasil dikirim untuk review');
      } else if (next === 'SEDANG_DIPROSES_USER') {
        success('Task berhasil dimulai');
      } else if (next === 'MENUNGGU_PROSES_USER') {
        success('Task dikembalikan untuk diperbaiki');
      } else {
        success('Status berhasil diubah');
      }

      // After successful status change, send WA according to rules
      try {
        let target: string | null = null;
        let recipientName: string | null = null;
        // If PM is reviewing (prev === MENUNGGU_REVIEW_PM), notify assignee
        if (prev === 'MENUNGGU_REVIEW_PM' && (next === 'SELESAI' || next === 'MENUNGGU_PROSES_USER')) {
          target = getPegawaiNumber(t.pegawaiId);
          recipientName = getPegawaiName(t.pegawaiId);
        } else {
          target = getPegawaiNumber(t.createdBy);
          recipientName = getPegawaiName(t.createdBy);
        }
        const tWithModule = { ...t, moduleNama: resolveModuleName(t.projectId, t.moduleId, t.moduleNama) };
        const detailMsg = buildDetailedStatusMessage(recipientName, prev, next, tWithModule);
        await sendWA(target, detailMsg);
      } catch { }
    } catch (e) { console.error('PUT status failed', e); alert('Terjadi kesalahan.'); }
    finally { setLoading(false); }
  };

  // Function to ask for confirmation before starting task
  const askStartTask = (t: TaskItem) => {
    setStatusTarget(t);
    setStatusNext('SEDANG_DIPROSES_USER');
    setStatusConfirmOpen(true);
  };

  // Combined function for "Mulai" button - handles both status change and time tracking
  const startTaskWithStatusChange = async (t: TaskItem) => {
    if (!me?.id) return;

    // Check if user is assignee
    const isAssignee = me.id === t.pegawaiId;

    try {
      setLoading(true);

      // Use API endpoint for starting task (Prisma can't run in browser)
      const startRes = await fetch(`/api/tasklist/${t.id}/time-tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
        credentials: 'include',
      });

      if (!startRes.ok) {
        const errorData = await startRes.json().catch(() => ({}));
        // Check message field first (where the real error is), then error field
        let errorMsg = errorData.message || errorData.error || 'Failed to start task';

        // Clean up the ACTIVE_TASK_EXISTS prefix if present
        if (errorMsg.includes('ACTIVE_TASK_EXISTS:')) {
          errorMsg = errorMsg.replace('ACTIVE_TASK_EXISTS:', '');
        }

        throw new Error(errorMsg);
      }

      // Reload the data
      await reloadWithCurrentParams();
      success('Task berhasil dimulai');

      // Send WA notification (same logic as transitionStatus)
      try {
        const pmNumber = getPegawaiNumber(t.createdBy);
        const pmName = getPegawaiName(t.createdBy);
        const tWithModule = { ...t, moduleNama: resolveModuleName(t.projectId, t.moduleId, t.moduleNama) };
        const detailMsg = buildDetailedStatusMessage(pmName, 'MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER', tWithModule);
        await sendWA(pmNumber, detailMsg);
      } catch { }

    } catch (e) {
      console.error('Start task with status change failed', e);

      // Handle specific error cases
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.log('[DEBUG] Full error message:', errorMessage); // Add debug logging

      // Provide user-friendly Indonesian translations for common errors
      if (errorMessage.includes('You already have an active task running:')) {
        // Translate the active task message to Indonesian
        const taskMatch = errorMessage.match(/You already have an active task running: "([^"]+)"/);
        const taskName = taskMatch ? taskMatch[1] : 'task lain';
        error(`Anda sudah memiliki task aktif yang sedang berjalan: "${taskName}". Silakan hentikan atau selesaikan task tersebut terlebih dahulu sebelum memulai task baru.`);
      } else if (errorMessage.includes('Only the assigned user can start this task')) {
        error('Hanya user yang ditugaskan yang dapat memulai task ini.');
      } else if (errorMessage.includes('Task cannot be started in current status')) {
        error('Task tidak dapat dimulai dalam status saat ini.');
      } else if (errorMessage.includes('Task not found')) {
        error('Task tidak ditemukan.');
      } else if (errorMessage.includes('Unauthorized')) {
        error('Anda tidak memiliki akses untuk melakukan aksi ini.');
      } else {
        // Show the actual error message (already processed above)
        error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to ask for confirmation before completing task (with modal)
  const askCompleteTask = (t: TaskItem) => {
    // Clear any old PR data from previous submissions
    const pendingPRStr = sessionStorage.getItem('pendingPR');
    if (pendingPRStr) {
      const pendingPR = JSON.parse(pendingPRStr);
      // Only clear if it's from a different task
      if (pendingPR.taskId !== t.id) {
        sessionStorage.removeItem('pendingPR');
      }
    }

    setStatusTarget(t);
    setStatusNext('MENUNGGU_REVIEW_PM');
    setStatusConfirmOpen(true);
  };

  // Combined function for "Kirim Review" button - handles both time tracking completion and status change
  const completeTaskWithStatusChange = async (t: TaskItem) => {
    if (!me?.id) return;

    console.log(`Attempting to send task ${t.id} for review:`, {
      currentStatus: t.status,
      taskId: t.id,
      assigneeId: t.pegawaiId,
      userId: me.id
    });

    // Check if task is already in review status
    if (t.status === 'MENUNGGU_REVIEW_PM') {
      console.warn('Task already in review status:', t.status);
      error('Task sudah dikirim untuk review sebelumnya');
      return;
    }

    // Check if task is in correct status for review
    if (t.status !== 'SEDANG_DIPROSES_USER') {
      console.warn('Task not in correct status for review:', t.status);
      error('Task harus dalam status "Sedang Diproses" untuk bisa dikirim review');
      return;
    }

    try {
      setLoading(true);

      // First complete the task via time tracking API
      const completeRes = await fetch(`/api/tasklist/${t.id}/time-tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          note: statusNote || undefined,
          hasImage: statusImages.length > 0
        }),
        credentials: 'include',
      });

      if (!completeRes.ok) {
        const errorData = await completeRes.json().catch(() => ({}));
        // Check message field first (where the real error is), then error field
        let errorMsg = errorData.message || errorData.error || 'Failed to complete task';

        // Clean up any prefixes if present
        if (errorMsg.includes('ACTIVE_TASK_EXISTS:')) {
          errorMsg = errorMsg.replace('ACTIVE_TASK_EXISTS:', '');
        }

        throw new Error(errorMsg);
      }

      // Always update status to MENUNGGU_REVIEW_PM, with note/images if provided
      console.log(`Updating task ${t.id} status to MENUNGGU_REVIEW_PM:`, {
        hasNote: !!statusNote,
        hasImages: statusImages.length > 0,
        imageCount: statusImages.length,
        noteLength: statusNote?.length || 0,
        statusNote: statusNote || '(empty)'
      });

      const fd = new FormData();
      fd.set('status', 'MENUNGGU_REVIEW_PM');

      // If no note but has images, use default message
      const finalNote = statusNote || (statusImages.length > 0 ? 'dengan lampiran' : '');
      if (finalNote) {
        fd.set('keterangan', finalNote);
        console.log('Adding keterangan to FormData:', finalNote);
      }

      // Append multiple images
      statusImages.forEach((file, index) => {
        fd.append('images', file);
        console.log(`Adding image ${index + 1} to FormData:`, file.name);
      });

      console.log('Sending PUT request to /api/tasklist/' + t.id);
      const updateRes = await fetch(`/api/tasklist/${t.id}`, {
        method: 'PUT',
        body: fd,
        credentials: 'include',
      });

      console.log('PUT response status:', updateRes.status, updateRes.statusText);

      if (!updateRes.ok) {
        let errorMsg = 'Gagal mengubah status task';
        try {
          const errorData = await updateRes.json();
          if (errorData?.error) errorMsg = errorData.error;
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        console.error('Failed to update task with note/image:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`Successfully updated task ${t.id} with note/image`);

      // NOTE: Programmer description is already saved as part of status update above
      // No need to save it separately to avoid duplicate UPDATE_PROGRAMMER_DESC logs

      // Reload the data
      await reloadWithCurrentParams();
      success('Task berhasil dikirim untuk review');

      // Kirim catatan sebagai pesan chat jika diisi
      if (statusNote?.trim() || statusImages.length > 0) {
        await sendActionChat(t.id, statusNote?.trim() || '', statusImages, 'kirim_review');
      }

      // NOTE: PR info is already saved to sessionStorage by CreatePRDropdown's onBranchSelect callback
      // No need to save it here again to avoid duplication

      // Send WA notification (same logic as transitionStatus)
      try {
        const pmNumber = getPegawaiNumber(t.createdBy);
        const pmName = getPegawaiName(t.createdBy);
        const tWithModule = { ...t, moduleNama: resolveModuleName(t.projectId, t.moduleId, t.moduleNama) };
        const detailMsg = buildDetailedStatusMessage(pmName, 'SEDANG_DIPROSES_USER', 'MENUNGGU_REVIEW_PM', tWithModule);
        await sendWA(pmNumber, detailMsg);
      } catch { }

    } catch (e) {
      console.error('Complete task with status change failed', e);
      const errorMsg = e instanceof Error ? e.message : 'Terjadi kesalahan saat mengirim task untuk review.';
      error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (<>
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Tasklist</h2>
        {(me?.role === 'PM' || me?.role === 'SUPER_ADMIN' || me?.role === 'ADMIN' || userIsPMInAnyProject || (isPIC && picProjects.length > 0)) && (
          <button onClick={openAdd} className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium whitespace-nowrap flex-shrink-0">
            Tambah Task
          </button>
        )}
      </div>

      {/* Grouped Filters: Proyek, User, Rentang Tanggal */}
      <div className="rounded-md border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/30 p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Filter</span>
          {(filterProjectId !== "" || filterPegawaiId !== "" || filterStatus !== "" || filterTeamId !== "" || filterTasklistType !== "" || filterVersion !== "" || filterFrom !== "" || filterTo !== "") && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Reset Filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Proyek */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Filter Proyek</label>
            <Select2Field
              value={typeof filterProjectId === 'number' ? filterProjectId : ''}
              onChange={(v) => {
                const nextVal = v === '' ? '' : Number(v);
                setFilterProjectId(nextVal);
                setFilterVersion('');
                setPage(1);
              }}
              options={projects.map(p => ({ id: p.id, text: p.namaProyek }))}
              placeholder="Semua Proyek"
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
              dropdownToBody={false}
            />
          </div>
          {/* User */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Filter User</label>
            <Select2Field
              value={typeof filterPegawaiId === 'number' ? filterPegawaiId : ''}
              onChange={(v) => {
                const nextVal = v === '' ? '' : Number(v);
                setFilterPegawaiId(nextVal);
                setPage(1);
              }}
              options={pegawais
                .filter(u => {
                  if (!me) return true;
                  if (me.role === 'PROGRAMMER' || me.role === 'ADMIN') return u.id === me.id; // only self
                  if (me.role === 'PM') {
                    // when PM, restrict to team members (filterTeamMemberIds)
                    return filterTeamMemberIds.length === 0 ? false : filterTeamMemberIds.includes(u.id);
                  }
                  return true; // SUPER_ADMIN
                })
                .map(u => ({ id: u.id, text: u.namaLengkap }))}
              placeholder="Semua User"
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
              dropdownToBody={false}
            />
          </div>
          {/* Master Team */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Filter Team</label>
            <Select2Field
              value={typeof filterTeamId === 'number' ? filterTeamId : ''}
              onChange={(v) => {
                const nextVal = v === '' ? '' : Number(v);
                setFilterTeamId(nextVal);
                setPage(1);
              }}
              options={masterTeams.map(t => ({ id: t.id, text: t.nama }))}
              placeholder="Semua Team"
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
              dropdownToBody={false}
            />
          </div>
          {/* Status */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Filter Status</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
            >
              <option value="">Semua Status</option>
              <option value="MENUNGGU_PROSES_USER">Menunggu Proses</option>
              <option value="SEDANG_DIPROSES_USER">Sedang Diproses</option>
              <option value="SEDANG_DIPROSES_USER_PAUSED">Dihentikan</option>
              <option value="MENUNGGU_REVIEW_PM">Menunggu Review PM</option>
              <option value="SELESAI">Selesai</option>
              <option value="TERLAMBAT">Terlambat</option>
            </select>
          </div>
          {/* Tipe Tasklist */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Filter Tipe</label>
            <select
              value={filterTasklistType}
              onChange={(e) => {
                setFilterTasklistType(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
            >
              <option value="">Semua Tipe</option>
              <option value="BLUEPRINT">Blueprint</option>
              <option value="DEVELOPMENT">Development</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
          {/* Filter Version */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Filter Version</label>
            <select
              value={filterVersion}
              onChange={(e) => {
                setFilterVersion(e.target.value);
                setPage(1);
              }}
              disabled={!filterProjectId}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Semua Version</option>
              {availableVersions.map((version) => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))}
            </select>
          </div>
          {/* Rentang Tanggal */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Rentang Tanggal</label>
            <input
              ref={rangeInputRef}
              type="text"
              placeholder="Pilih rentang tanggal"
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          <button
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'table'
              ? 'bg-brand-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Table
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'card'
              ? 'bg-brand-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="4" />
              <rect x="3" y="12" width="18" height="4" />
            </svg>
            Cards
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-700 dark:text-gray-200">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => { const sz = Number(e.target.value); setPageSize(sz); setPage(1); }}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-gray-900 dark:text-gray-100"
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Info note */}
      <div className="mb-3 flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-gray-200">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 text-gray-500 dark:text-gray-300"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        <span>Klik baris pada tabel untuk melihat detail task.</span>
      </div>

      {/* Table/Card View Container */}
      {viewMode === 'table' ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[760px] lg:min-w-0">
              <Table className="text-xs w-full whitespace-nowrap">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-[11px] dark:text-gray-400 w-[40px]">No</TableCell>
                    <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-[11px] dark:text-gray-400 cursor-pointer select-none w-[140px]" onClick={() => toggleSort('aksi')}>Aksi {sortKey === 'aksi' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</TableCell>
                    <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-[11px] dark:text-gray-400 w-[90px] hidden sm:table-cell">Kode</TableCell>
                    <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-[11px] dark:text-gray-400 cursor-pointer select-none w-[70px] hidden sm:table-cell" onClick={() => toggleSort('baVersion')}>Version {sortKey === 'baVersion' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                    <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-[11px] dark:text-gray-400 cursor-pointer select-none w-[100px]" onClick={() => toggleSort('scheduleAt')}>Scheduled {sortKey === 'scheduleAt' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                    <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-[11px] dark:text-gray-400 w-[100px]">Due Date</TableCell>
                    <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-[11px] dark:text-gray-400 cursor-pointer select-none w-[180px] hidden md:table-cell" onClick={() => toggleSort('proyekNama')}>Proyek {sortKey === 'proyekNama' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                    <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-[11px] dark:text-gray-400 cursor-pointer select-none w-[200px]" onClick={() => toggleSort('moduleNama')}>Modul {sortKey === 'moduleNama' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                    <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-[11px] dark:text-gray-400 cursor-pointer select-none w-[130px] hidden md:table-cell" onClick={() => toggleSort('pegawaiNama')}>User {sortKey === 'pegawaiNama' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                    <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-[11px] dark:text-gray-400 w-[100px] hidden xl:table-cell">Tipe</TableCell>
                    <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-[11px] dark:text-gray-400 cursor-pointer select-none w-[100px] hidden lg:table-cell" onClick={() => toggleSort('taskComplexity')}>Kompleksitas {sortKey === 'taskComplexity' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                    <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-[11px] dark:text-gray-400 w-[130px]">Status</TableCell>
                    <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-[11px] dark:text-gray-400 w-[140px] hidden sm:table-cell">Aksi Lain</TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {paged.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-3 py-4 text-center text-gray-500 dark:text-gray-400" colSpan={11}>Belum ada data.</TableCell>
                    </TableRow>
                  ) : (
                    paged.map((t, idx) => (
                      <TableRow
                        key={t.id}
                        className={`
                          hover:bg-gray-50/70 dark:hover:bg-white/5 cursor-pointer
                          ${checkTaskOverlap(t, paged) ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}
                        `}
                        onClick={() => { setDetailItem(t); setDetailOpen(true); }}
                      >
                        {/* No column */}
                        <TableCell className="px-2 py-1.5 text-start align-top whitespace-nowrap text-gray-800 dark:text-gray-200 text-[11px]">
                          <div className="flex flex-col">
                            <span>{(effectivePage - 1) * pageSize + idx + 1}</span>
                            {/* Show condensed info on mobile */}
                            <div className="block sm:hidden text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <div className="truncate">{t.kode || '-'}</div>
                              <div className="truncate">{t.pegawaiNama || '-'}</div>
                            </div>
                          </div>
                        </TableCell>
                        {/* Primary actions column */}
                        <TableCell className="px-2 py-1.5 text-start text-[11px] align-top whitespace-nowrap">
                          <div className="flex items-center gap-1 flex-wrap sm:flex-nowrap">
                            {/* Time tracking component for assignee */}
                            <TaskTimeTracker
                              taskId={t.id}
                              currentStatus={t.status || 'MENUNGGU_PROSES_USER'}
                              isAssignedToCurrentUser={me?.id === t.pegawaiId}
                              onStatusChange={() => {
                                reloadWithCurrentParams();
                              }}
                              compact={true}
                            />
                            {me && me.id === t.pegawaiId && (
                              <>
                                {t.status === 'MENUNGGU_PROSES_USER' && (
                                  <button
                                    title="Mulai"
                                    onClick={(e) => { e.stopPropagation(); askStartTask(t); }}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1 text-[11px]"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6 4l10 6-10 6V4z" /></svg>
                                    Mulai
                                  </button>
                                )}
                                {t.status === 'SEDANG_DIPROSES_USER' && t.startedAt && (
                                  <button
                                    title="Kirim Review"
                                    onClick={(e) => { e.stopPropagation(); askCompleteTask(t); }}
                                    disabled={loading}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2.5 py-1 text-[11px]"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 5 17 10" /><line x1="12" y1="5" x2="12" y2="20" /></svg>
                                    Kirim Review
                                  </button>
                                )}
                              </>
                            )}
                            {/* PM actions when reviewing */}
                            {me && ((me.role === 'PM') || (me.role === 'SUPER_ADMIN' && userInProject[t.projectId] === true) || userPMProjects.includes(t.projectId)) && t.status === 'MENUNGGU_REVIEW_PM' && (() => {
                              // Permission Check: Hide buttons if PM viewing PIC task
                              if (t.createdBy) {
                                const isTaskCreatedByMe = t.createdBy === me.id;

                                // If not the creator, check if creator is PIC
                                if (!isTaskCreatedByMe) {
                                  const creatorJabatan = (t as any).creatorJabatan;

                                  console.log(`[Task ${t.id}] createdBy: ${t.createdBy}, creatorJabatan: ${creatorJabatan}`);

                                  // Hide if creator is PIC (even if task is assigned to current PM)
                                  const creatorIsPIC = creatorJabatan && creatorJabatan.toUpperCase().includes('PIC');

                                  if (creatorIsPIC) {
                                    console.log(`🚫 Hiding approve/reject buttons: Task ${t.id} created by PIC`);
                                    return null; // Hide buttons - PM cannot approve/reject PIC tasks
                                  } else {
                                    console.log(`✅ Showing buttons: Task ${t.id} creator is not PIC (jabatan: ${creatorJabatan})`);
                                  }
                                }
                              }

                              return (
                                <>
                                  <button
                                    title="Approve"
                                    onClick={(e) => { e.stopPropagation(); askStatusChange(t, 'SELESAI'); }}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px]"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                                    Approve
                                  </button>
                                  <button
                                    title="Reject"
                                    onClick={(e) => { e.stopPropagation(); askStatusChange(t, 'MENUNGGU_PROSES_USER'); }}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 text-[11px]"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    Reject
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        </TableCell>
                        {/* Data columns */}
                        <TableCell className="px-2 py-1.5 text-start text-[11px] font-medium text-gray-800 dark:text-gray-200 max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap hidden sm:table-cell">
                          <span title={t.kode || ''}>{t.kode || '-'}</span>
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-start text-[11px] font-medium text-gray-800 dark:text-gray-200 hidden sm:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                            {t.baVersion || t.version || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-start text-[11px] text-gray-800 dark:text-gray-200">
                          {(() => {
                            const ds = fmtDateTimeShort(new Date(t.scheduleAt));
                            return isPastDate(t.scheduleAt) ? (
                              <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-100 border border-red-300 text-red-700 dark:bg-red-500/20 dark:border-transparent dark:text-red-200">
                                {ds}
                              </span>
                            ) : (
                              <span>{ds}</span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-start text-[11px] text-gray-800 dark:text-gray-200">
                          {t.calculatedDueDate ? (
                            (() => {
                              const dueDate = new Date(t.calculatedDueDate);
                              const now = new Date();
                              const isOverdue = dueDate < now && t.status !== 'SELESAI';
                              const ds = fmtDateTimeShort(dueDate);
                              return isOverdue ? (
                                <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-100 border border-red-300 text-red-700 dark:bg-red-500/20 dark:border-transparent dark:text-red-200">
                                  {ds}
                                </span>
                              ) : (
                                <span>{ds}</span>
                              );
                            })()
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-start text-[11px] text-gray-800 dark:text-gray-200 max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap hidden md:table-cell">
                          <span title={t.proyekNama || ''}>{t.proyekNama}</span>
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-start text-[11px] text-gray-800 dark:text-gray-200 max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap">
                          <span title={projectModuleLabel[t.projectId]?.[t.moduleId] ?? t.moduleNama}>
                            {projectModuleLabel[t.projectId]?.[t.moduleId] ?? t.moduleNama}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-start text-[11px] text-gray-800 dark:text-gray-200 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            <span title={t.pegawaiNama || ''} className="truncate">{t.pegawaiNama}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-start text-[11px] w-[120px] hidden xl:table-cell">{tasklistTypeBadge(t.tasklistType)}</TableCell>
                        <TableCell className="px-2 py-1.5 text-start text-[11px] w-[120px] hidden lg:table-cell">{taskComplexityBadge(t.taskComplexity)}</TableCell>
                        <TableCell className="px-2 py-1.5 text-start text-[11px] w-[140px]">{statusBadge(t.status, !!(t.calculatedDueDate && new Date(t.calculatedDueDate) < new Date() && t.status !== 'SELESAI'))}</TableCell>
                        {/* Secondary actions column */}
                        <TableCell className="px-2 py-1.5 text-[11px] w-[160px] whitespace-nowrap hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            {((me?.role === 'PM') || (me?.role === 'SUPER_ADMIN' && userInProject[t.projectId] === true)) && t.status !== 'SELESAI' && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); openEdit(t); }} className="px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-[11px] text-gray-700 dark:text-gray-200">Edit</button>
                                <button onClick={(e) => { e.stopPropagation(); askDelete(t); }} className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px]">Hapus</button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* footer controls */}
            <div className="flex items-center justify-end gap-4 px-4 py-3 border-t border-gray-100 dark:border-white/[0.05]">
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPage(p => Math.max(1, p - 1)); }}
                  className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200"
                >
                  Prev
                </button>
                <span className="text-gray-600 dark:text-gray-300">Page {effectivePage} / {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPage(p => Math.min(totalPages, p + 1)); }}
                  className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Card View */}
          {paged.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-medium">Belum ada data</p>
              <p className="text-sm">Tidak ada task yang ditemukan dengan filter saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paged.map((t, idx) => (
                <div
                  key={t.id}
                  className={`
                    rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer
                    ${checkTaskOverlap(t, paged)
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }
                  `}
                  onClick={() => { setDetailItem(t); setDetailOpen(true); }}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {t.kode || `Task #${t.id}`}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {(() => {
                          const ds = fmtDateTimeShort(new Date(t.scheduleAt));
                          return isPastDate(t.scheduleAt) ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">⚠ {ds}</span>
                          ) : ds;
                        })()}
                      </p>
                    </div>
                    {/* Due Date Display */}
                    {t.calculatedDueDate && (
                      <p className="text-xs mt-1">
                        <span className="text-gray-500 dark:text-gray-400">Due: </span>
                        {(() => {
                          const dueDate = new Date(t.calculatedDueDate);
                          const now = new Date();
                          const isOverdue = dueDate < now && t.status !== 'SELESAI';
                          const ds = fmtDateTimeShort(dueDate);
                          return isOverdue ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">🔴 {ds}</span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400">{ds}</span>
                          );
                        })()}
                      </p>
                    )}
                    <div className="flex flex-col gap-1 items-end">
                      {statusBadge(t.status, !!(t.calculatedDueDate && new Date(t.calculatedDueDate) < new Date() && t.status !== 'SELESAI'))}
                      {tasklistTypeBadge(t.tasklistType)}
                      {taskComplexityBadge(t.taskComplexity)}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="space-y-2 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Proyek</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100 truncate" title={t.proyekNama || ''}>
                        {t.proyekNama || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Modul</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100 truncate" title={projectModuleLabel[t.projectId]?.[t.moduleId] ?? t.moduleNama}>
                        {projectModuleLabel[t.projectId]?.[t.moduleId] ?? t.moduleNama}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Assigned to</p>
                      <div className="flex items-center gap-1">
                        <p className="text-sm text-gray-900 dark:text-gray-100 truncate" title={t.pegawaiNama || ''}>
                          {t.pegawaiNama || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1">
                      {/* Time tracking component for assignee */}
                      <TaskTimeTracker
                        taskId={t.id}
                        currentStatus={t.status || 'MENUNGGU_PROSES_USER'}
                        isAssignedToCurrentUser={me?.id === t.pegawaiId}
                        onStatusChange={() => {
                          // Refresh the task list after status changes
                          reloadWithCurrentParams();
                        }}
                        compact={true}
                      />
                      {/* Original card actions - REPLACED WITH TIME TRACKER ABOVE */}
                      {me && me.id === t.pegawaiId && (
                        <>
                          {t.status === 'MENUNGGU_PROSES_USER' && (
                            <button
                              title="Mulai"
                              onClick={(e) => { e.stopPropagation(); askStartTask(t); }}
                              className="inline-flex items-center gap-1 rounded-md bg-brand-600 hover:bg-brand-700 text-white px-2 py-1 text-xs"
                            >
                              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M6 4l10 6-10 6V4z" /></svg>
                              Mulai
                            </button>
                          )}
                          {/* Show Kirim Review only if timer is running (startedAt exists) */}
                          {t.status === 'SEDANG_DIPROSES_USER' && t.startedAt && (
                            <button
                              title="Kirim Review"
                              onClick={(e) => { e.stopPropagation(); askCompleteTask(t); }}
                              disabled={loading}
                              className="inline-flex items-center gap-1 rounded-md bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2 py-1 text-xs"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 5 17 10" /><line x1="12" y1="5" x2="12" y2="20" /></svg>
                              Review
                            </button>
                          )}
                        </>
                      )}
                      {/* PM actions when reviewing */}
                      {me && ((me.role === 'PM') || (me.role === 'SUPER_ADMIN' && userInProject[t.projectId] === true) || userPMProjects.includes(t.projectId)) && t.status === 'MENUNGGU_REVIEW_PM' && (() => {
                        // Permission Check: Hide buttons if PM viewing PIC task
                        if (t.createdBy) {
                          const isTaskCreatedByMe = t.createdBy === me.id;

                          // If not the creator, check if creator is PIC
                          if (!isTaskCreatedByMe) {
                            const creatorJabatan = (t as any).creatorJabatan;

                            // Hide if creator is PIC (even if task is assigned to current PM)
                            const creatorIsPIC = creatorJabatan && creatorJabatan.toUpperCase().includes('PIC');

                            if (creatorIsPIC) {
                              console.log(`🚫 [Mobile] Hiding approve/reject buttons: Task ${t.id} created by PIC`);
                              return null; // Hide buttons - PM cannot approve/reject PIC tasks
                            }
                          }
                        }

                        return (
                          <>
                            <button
                              title="Approve"
                              onClick={(e) => { e.stopPropagation(); askStatusChange(t, 'SELESAI'); }}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-xs"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                              Approve
                            </button>
                            <button
                              title="Reject"
                              onClick={(e) => { e.stopPropagation(); askStatusChange(t, 'MENUNGGU_PROSES_USER'); }}
                              className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-xs"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                              Reject
                            </button>
                          </>
                        );
                      })()}
                    </div>

                    {/* Secondary actions */}
                    <div className="flex items-center gap-1">
                      {((me?.role === 'PM') || (me?.role === 'SUPER_ADMIN' && userInProject[t.projectId] === true)) && t.status !== 'SELESAI' && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                            className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); askDelete(t); }}
                            className="px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs"
                          >
                            Hapus
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Card View Pagination */}
          <div className="flex items-center justify-center gap-4 py-4">
            <button
              type="button"
              disabled={page === 1}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPage(p => Math.max(1, p - 1)); }}
              className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Page {effectivePage} of {totalPages} ({total} total)
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPage(p => Math.min(totalPages, p + 1)); }}
              className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Task Form Modals */}
      <TaskFormModal
        isOpen={isAddOpen}
        onClose={closeAddModal}
        onSubmit={handleAddTask}
        projects={projects}
        pegawais={pegawais}
        me={me}
        userPMProjects={userPMProjects}
        isPIC={isPIC}
        picProjects={picProjects}
        loading={loading}
      />

      <TaskEditModal
        isOpen={isEditOpen}
        onClose={() => {
          closeEditModal();
          setEditingTask(null);
        }}
        onSubmit={handleEditTask}
        task={editingTask}
        projects={projects}
        pegawais={pegawais}
        me={me}
        userPMProjects={userPMProjects}
        isPIC={isPIC}
        picProjects={picProjects}
        loading={loading}
      />

      {/* Confirm Status Change Modal - Higher z-index to appear above detail modal */}
      <div style={{ zIndex: 100000, position: 'relative' }}>
        <Modal
          isOpen={statusConfirmOpen}
          onClose={() => { if (!loading) cancelStatusChange(); }}
          disableOutsideClose={true}
          disableEscClose={loading}
          className="w-[92vw] max-w-md"
          showCloseButton={false}
        >
          <div className="p-6 relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center rounded">
                <span className="text-sm text-gray-700 dark:text-gray-200">Mengubah status...</span>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ubah Status Task?</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {statusTarget?.kode ? (<span className="font-medium">{statusTarget.kode}</span>) : 'Task'} akan diubah dari
                  {" "}
                  <span className="font-medium">{labelStatus(statusTarget?.status)}</span> menjadi <span className="font-medium">{labelStatus(statusNext || undefined)}</span>.
                </p>

                {/* CRM Task Validation Warning */}
                {(() => {
                  const isStarting = statusTarget?.status === 'MENUNGGU_PROSES_USER' && statusNext === 'SEDANG_DIPROSES_USER';
                  if (!isStarting || !statusTarget?.idCrm) return null;

                  const isDefaultSchedule = statusTarget.scheduleAt &&
                    new Date(statusTarget.scheduleAt).getHours() === 0 &&
                    new Date(statusTarget.scheduleAt).getMinutes() === 0;
                  const hasNoDuration = !statusTarget.customDurationHours || Number(statusTarget.customDurationHours) <= 0;

                  if (!isDefaultSchedule && !hasNoDuration) return null;

                  return (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            ⚠️ Task CRM Belum Divalidasi
                          </p>
                          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                            Task ini dari CRM dan perlu divalidasi terlebih dahulu:
                          </p>
                          <ul className="mt-2 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                            {isDefaultSchedule && (
                              <li className="flex items-center gap-1">
                                <span className="text-amber-600 dark:text-amber-400">•</span>
                                <span>Jadwal masih default (00:00) - perlu diubah</span>
                              </li>
                            )}
                            {hasNoDuration && (
                              <li className="flex items-center gap-1">
                                <span className="text-amber-600 dark:text-amber-400">•</span>
                                <span>Durasi pengerjaan belum diset</span>
                              </li>
                            )}
                          </ul>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => {
                                // Close status modal and open edit modal
                                setStatusConfirmOpen(false);
                                setStatusNext(null);
                                // Open edit modal with current task
                                if (statusTarget) {
                                  openEdit(statusTarget);
                                }
                                setStatusTarget(null);
                              }}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md transition-colors"
                            >
                              Edit Task
                            </button>
                            <button
                              onClick={() => {
                                setStatusConfirmOpen(false);
                                setStatusTarget(null);
                                setStatusNext(null);
                              }}
                              className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                            >
                              Tutup
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            {/* Optional inputs for Reject and Kirim Review */}
            {(() => {
              const isReject = statusTarget?.status === 'MENUNGGU_REVIEW_PM' && statusNext === 'MENUNGGU_PROSES_USER';
              const isSendReview = statusNext === 'MENUNGGU_REVIEW_PM';
              if (!isReject && !isSendReview) return null;
              return (
                <div className="mt-5 space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Keterangan (opsional)</label>
                    <textarea
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
                      placeholder="Masukkan keterangan"
                      disabled={loading}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Gambar (opsional - multiple)</label>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={(e) => {
                        if (e.target.files) {
                          const newFiles = Array.from(e.target.files);
                          // Validate each file
                          for (const file of newFiles) {
                            if (file.size > 5 * 1024 * 1024) {
                              error(`File ${file.name} terlalu besar. Maksimal 5MB.`);
                              e.target.value = '';
                              return;
                            }
                            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                            if (!validTypes.includes(file.type)) {
                              error(`File ${file.name} tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.`);
                              e.target.value = '';
                              return;
                            }
                          }
                          setStatusImages(prev => [...prev, ...newFiles]);
                        }
                        e.target.value = '';
                      }}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
                      disabled={loading}
                    />
                    {statusImages.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {statusImages.length} foto dipilih
                          </span>
                          <button
                            type="button"
                            onClick={() => setStatusImages([])}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Hapus semua
                          </button>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {statusImages.map((file, index) => (
                            <div key={index} className="relative group">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-full aspect-square object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                              />
                              {/* Remove button */}
                              <button
                                type="button"
                                onClick={() => setStatusImages(prev => prev.filter((_, i) => i !== index))}
                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg hover:bg-red-700 transition-colors"
                              >
                                ✕
                              </button>
                              {/* File name tooltip */}
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 rounded-b-lg truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                {file.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Format: JPG, PNG, GIF, WebP. Maksimal 5MB per file.
                    </p>
                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tip: Tekan Ctrl+V untuk paste gambar dari clipboard
                    </p>
                  </div>

                  {/* GitHub Auto-Merge Selection */}
                  {isSendReview && statusTarget && mergeRepoState !== 'not_found' && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      {mergeRepoState === 'found' && (
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            Otomatis Merge Branch
                          </h4>
                          {mergeRepoFullName && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 border border-indigo-300 dark:border-indigo-700 rounded-lg text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
                              </svg>
                              {mergeRepoFullName}
                            </span>
                          )}
                        </div>
                      )}
                      <BranchMergeSelector
                        taskId={statusTarget.id}
                        projectId={statusTarget.projectId}
                        taskStatus={statusTarget.status}
                        onRepoStateChange={(state) => setMergeRepoState(state)}
                        onBranchSelect={(sourceBranch, targetBranch, repoFullName) => {
                          setMergeSourceBranch(sourceBranch);
                          setMergeTargetBranch(targetBranch);
                          setMergeRepoFullName(repoFullName);

                          // Save to sessionStorage for merge creation after status change
                          if (sourceBranch && targetBranch && repoFullName) {
                            const mergeData = {
                              taskId: statusTarget.id,
                              sourceBranch,
                              targetBranch,
                              repoFullName
                            };
                            sessionStorage.setItem('pendingMerge', JSON.stringify(mergeData));
                          } else {
                            // Clear if branches are cleared
                            sessionStorage.removeItem('pendingMerge');
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="mt-6 flex justify-end gap-2">
              {(() => {
                // Check if CRM task needs validation
                const isStarting = statusTarget?.status === 'MENUNGGU_PROSES_USER' && statusNext === 'SEDANG_DIPROSES_USER';
                const isCrmTask = statusTarget?.idCrm;
                const isSendReview = statusNext === 'MENUNGGU_REVIEW_PM';
                let needsValidation = false;

                if (isStarting && isCrmTask) {
                  const isDefaultSchedule = statusTarget.scheduleAt &&
                    new Date(statusTarget.scheduleAt).getHours() === 0 &&
                    new Date(statusTarget.scheduleAt).getMinutes() === 0;
                  const hasNoDuration = !statusTarget.customDurationHours || Number(statusTarget.customDurationHours) <= 0;
                  needsValidation = isDefaultSchedule || hasNoDuration;
                }

                // If validation is needed, hide both Batal and OK buttons (Tutup button is in warning box)
                if (needsValidation) return null;

                const m = statusActionMeta(statusTarget?.status, statusNext || undefined);

                return (
                  <>
                    <button onClick={cancelStatusChange} disabled={loading} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50">Batal</button>
                    <button
                      onClick={confirmStatusChange}
                      disabled={loading || (isSendReview && mergeRepoState === 'checking') || (isSendReview && mergeRepoState === 'found' && !mergeSourceBranch)}
                      className={`px-4 py-2 rounded-md text-white disabled:opacity-50 inline-flex items-center gap-2 ${m.cls}`}
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </Modal>
      </div>

      {/* Detail Modal */}
      <TaskDetailModal
        key={detailItem?.id} // Force re-render when task changes
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailItem(null);
          setDetailActiveTab('detail');

          // Always clear pending merge when closing detail modal
          // It will be set again if user clicks submit
          sessionStorage.removeItem('pendingMerge');
        }}
        task={detailItem}
        onStartTask={(task) => {
          askStartTask(task);
          // Keep detail modal open, will close after confirmation
        }}
        onCompleteTask={(task) => {
          askCompleteTask(task);
          // Keep detail modal open, will close after confirmation
        }}
        onStatusChange={(task, status) => {
          askStatusChange(task, status as TaskItem['status']);
          // Keep detail modal open, will close after confirmation
        }}
      />


      {/* Confirm Delete Modal */}
      <Modal isOpen={confirmOpen} onClose={() => { if (!loading) cancelDelete(); }} disableOutsideClose={true} disableEscClose={loading} className="w-[92vw] max-w-sm" showCloseButton={false}>
        <div className="p-6 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center rounded">
              <span className="text-sm text-gray-700 dark:text-gray-200">Menghapus...</span>
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M12 16.5H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10.29 3.85999L1.81995 18C1.47795 18.592 1.46795 19.32 1.79495 19.921C2.12195 20.523 2.73595 20.9 3.40795 20.9H20.592C21.264 20.9 21.878 20.523 22.205 19.921C22.532 19.319 22.522 18.592 22.18 18L13.71 3.85999C13.366 3.26499 12.706 2.89999 12 2.89999C11.294 2.89999 10.634 3.26499 10.29 3.85999Z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Hapus Task?</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {loading ? 'Menghapus...' : 'Tindakan ini tidak dapat dibatalkan.'}
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={cancelDelete} disabled={loading} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50">Batal</button>
            <button onClick={confirmDelete} disabled={loading} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">{loading ? 'Menghapus...' : 'Hapus'}</button>
          </div>
        </div>
      </Modal>

      {/* Global Loading Overlay for this page (avoid covering when any modal open) */}
      <LoadingOverlay show={loading && !isAddOpen && !isEditOpen && !confirmOpen && !detailOpen} label="Memproses..." />

      {/* Lightbox Modal */}
      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-90"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-7xl max-h-[90vh] p-4">
            {/* Close button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-800 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image counter */}
            {lightboxImages.length > 1 && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 px-3 py-1 bg-black bg-opacity-70 text-white text-sm rounded-full">
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            )}

            {/* Previous button */}
            {lightboxImages.length > 1 && lightboxIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = lightboxIndex - 1;
                  setLightboxIndex(newIndex);
                  setLightboxImage(lightboxImages[newIndex]);
                }}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-800 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Next button */}
            {lightboxImages.length > 1 && lightboxIndex < lightboxImages.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = lightboxIndex + 1;
                  setLightboxIndex(newIndex);
                  setLightboxImage(lightboxImages[newIndex]);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-800 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* CRM Notification Modal */}
      {crmModalTask && (
        <CRMNotificationModal
          isOpen={crmModalOpen}
          onClose={() => {
            setCrmModalOpen(false);
            setCrmModalTask(null);
          }}
          taskId={crmModalTask.id}
          taskCode={crmModalTask.kode || ''}
          onSuccess={() => {
            // Refresh task list after successful CRM notification
            reloadWithCurrentParams();
          }}
        />
      )}
    </div>
  </>);
}


