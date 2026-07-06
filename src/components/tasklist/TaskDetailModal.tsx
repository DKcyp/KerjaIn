"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from "@/components/ui/modal";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import TaskChatPanel from "./TaskChatPanel";
import TaskDispositionModal from "./TaskDispositionModal";
import FileAttachmentGrid from "@/components/ui/FileAttachmentGrid";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { htmlContentStyles } from '@/lib/htmlUtils';
import {
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileArchive,
  FaFileVideo,
  FaFileAudio,
  FaFileCode,
  FaFileAlt,
  FaFile,
} from 'react-icons/fa';
import './tasklist.css';

type TaskItem = {
  id: number;
  projectId: number;
  moduleId: number;
  pegawaiId: number;
  createdBy?: number | null;
  scheduleAt: string;
  calculatedDueDate?: string | null;
  startedAt?: string | null;
  pausedAt?: string | null;
  totalDurationMinutes?: number;
  isPaused?: boolean;
  keterangan: string | null;
  programmerDescription?: string | null;
  proyekNama?: string;
  moduleNama?: string;
  pegawaiNama?: string;
  pegawaiRole?: string;
  pegawaiJabatan?: string | null;
  status?: 'MENUNGGU_PROSES_USER' | 'SEDANG_DIPROSES_USER' | 'SEDANG_DIPROSES_USER_PAUSED' | 'MENUNGGU_REVIEW_PM' | 'SELESAI';
  imagePath?: string | null;
  kode?: string;
  tasklistType?: 'BLUEPRINT' | 'DEVELOPMENT' | 'MAINTENANCE';
  taskComplexity?: 'EASY' | 'MEDIUM' | 'HARD';
  version?: string;
  baVersion?: string;
  idCrm?: string | null;
  ticketId?: string | null;
  ticket_id?: string | null;
  availableActions?: string[];
};

type TaskLog = {
  id: number;
  waktu: string;
  userId: number;
  userNama?: string;
  keterangan?: string | null;
  status?: TaskItem['status'] | null;
  action: string;
  imagePath?: string | null;
};

type TaskImage = {
  id: number;
  taskId: number;
  logId?: number | null;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedBy: number | null;
  uploadedAt: string;
};

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
  onStartTask?: (task: TaskItem) => void;
  onCompleteTask?: (task: TaskItem) => void;
  onStatusChange?: (task: TaskItem, status: string) => void;
  initialShowChat?: boolean;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task: taskProp,
  onStartTask,
  onCompleteTask,
  onStatusChange,
  initialShowChat = false,
}) => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  // State to hold enriched task data with availableActions
  const [enrichedTask, setEnrichedTask] = useState<TaskItem | null>(null);
  const [loadingActions, setLoadingActions] = useState(false);

  // Active tab for the right panel: 'detail' | 'chat' | 'log' | 'chat_crm_pm' | 'chat_crm_pic'
  const [activeTab, setActiveTab] = useState<'detail' | 'chat' | 'log' | 'chat_crm_pm' | 'chat_crm_pic'>('detail');

  // CRM Chat data
  type CrmMessage = {
    id: string;
    id_komplain: string;
    keterangan: string;
    sender_id: string;
    sender_name: string;
    sender_tipe: string; // 'c' = client/PIC, 'i' = internal/PM
    status: string;
    created_at: string;
    attachments: any[];
  };
  type CrmTicket = {
    id_crm: string;
    nomor: string;
    subject: string;
    status: string;
    tipe: string;
    project_nama: string;
    client_nama: string;
    created_at: string;
  };
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmTicket, setCrmTicket] = useState<CrmTicket | null>(null);
  const [crmMessagesPM, setCrmMessagesPM] = useState<CrmMessage[]>([]);
  const [crmMessagesPIC, setCrmMessagesPIC] = useState<CrmMessage[]>([]);
  const [crmError, setCrmError] = useState<string | null>(null);
  const [crmFetched, setCrmFetched] = useState(false);
  const [crmInputMessage, setCrmInputMessage] = useState('');
  const [crmFiles, setCrmFiles] = useState<File[]>([]);
  const [crmSending, setCrmSending] = useState(false);

  // Fetch task with availableActions if not present
  useEffect(() => {
    const fetchTaskWithActions = async () => {
      if (!isOpen || !taskProp) {
        setEnrichedTask(null);
        return;
      }

      if (taskProp.availableActions !== undefined) {
        setEnrichedTask(taskProp);
        return;
      }

      setLoadingActions(true);
      try {
        const response = await fetch(`/api/tasklist/${taskProp.id}`, {
          credentials: 'include',
          cache: 'no-store'
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.item) {
            setEnrichedTask({ ...taskProp, ...data.item });
          } else {
            setEnrichedTask(taskProp);
          }
        } else {
          setEnrichedTask(taskProp);
        }
      } catch {
        setEnrichedTask(taskProp);
      } finally {
        setLoadingActions(false);
      }
    };

    fetchTaskWithActions();
  }, [isOpen, taskProp, taskProp?.id]);

  const task = enrichedTask || taskProp;

  const [detailLogs, setDetailLogs] = useState<TaskLog[]>([]);
  const [detailImages, setDetailImages] = useState<TaskImage[]>([]);
  const [isDispositionModalOpen, setIsDispositionModalOpen] = useState(false);
  const [logImagesMap, setLogImagesMap] = useState<Record<number, TaskImage[]>>({});
  const [detailLogsLoading, setDetailLogsLoading] = useState(false);
  const [detailImagesLoading, setDetailImagesLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string>('');
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [brokenFiles, setBrokenFiles] = useState<Set<number>>(new Set());

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen && task) {
      setActiveTab('detail');
      setCrmFetched(false);
      setCrmTicket(null);
      setCrmMessagesPM([]);
      setCrmMessagesPIC([]);
      setCrmError(null);
    }
  }, [isOpen, task?.id]);

  // Fetch CRM chat when CRM tab becomes active
  useEffect(() => {
    const fetchCrmChat = async () => {
      if (!task?.id || crmFetched) return;
      setCrmLoading(true);
      setCrmError(null);
      try {
        const res = await fetch(`/api/tasklist/${task.id}/crm-chat`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await res.json();
        if (data.error && !data.ticket) {
          setCrmError(data.error);
        } else {
          setCrmTicket(data.ticket || null);
          setCrmMessagesPM(data.messages_pm || []);
          setCrmMessagesPIC(data.messages_pic || []);
        }
      } catch (e: any) {
        setCrmError('Gagal memuat data CRM chat');
      } finally {
        setCrmLoading(false);
        setCrmFetched(true);
      }
    };

    if (activeTab === 'chat_crm_pm' || activeTab === 'chat_crm_pic') {
      fetchCrmChat();
    }
  }, [activeTab, task?.id, crmFetched]);

  const handleCompleteTask = (taskItem: TaskItem) => {
    if (onCompleteTask) onCompleteTask(taskItem);
  };

  const handleStatusChange = (taskItem: TaskItem, status: string) => {
    if (onStatusChange) onStatusChange(taskItem, status);
  };

  const handleReturnToBacklog = async (taskItem: TaskItem) => {
    try {
      const response = await fetch(`/api/tasklist/${taskItem.id}/return-to-backlog`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh atau close modal
        onClose();
        // Optional: trigger refresh di parent component
        window.location.reload();
      } else {
        const error = await response.json();
        console.error('Failed to return task to backlog:', error);
        alert('Gagal mengembalikan task ke backlog');
      }
    } catch (error) {
      console.error('Error returning task to backlog:', error);
      alert('Terjadi kesalahan saat mengembalikan task ke backlog');
    }
  };

  // Load logs
  useEffect(() => {
    let alive = true;
    const loadLogs = async () => {
      if (!isOpen || !task?.id) { setDetailLogs([]); return; }
      try {
        setDetailLogsLoading(true);
        const res = await fetch(`/api/tasklist/${task.id}/logs`, {
          cache: 'no-store', credentials: 'include'
        });
        if (!alive) return;
        if (res.ok) {
          const data = await res.json();
          setDetailLogs(Array.isArray(data?.items) ? data.items as TaskLog[] : []);
        } else {
          setDetailLogs([]);
        }
      } catch {
        if (alive) setDetailLogs([]);
      } finally {
        if (alive) setDetailLogsLoading(false);
      }
    };
    loadLogs();
    return () => { alive = false; };
  }, [isOpen, task?.id]);

  // Load images
  useEffect(() => {
    let alive = true;
    const loadImages = async () => {
      if (!isOpen || !task?.id) {
        setDetailImages([]); setLogImagesMap({}); setBrokenFiles(new Set()); return;
      }
      try {
        setDetailImagesLoading(true);
        const res = await fetch(`/api/tasklist/${task.id}/images`, {
          cache: 'no-store', credentials: 'include'
        });
        if (!alive) return;
        if (res.ok) {
          const data = await res.json();
          const images = Array.isArray(data?.images) ? data.images : [];
          const imageMap: Record<number, TaskImage[]> = {};

          if (detailLogs.length > 0 && images.length > 0) {
            const sortedImages = [...images].sort((a: TaskImage, b: TaskImage) =>
              new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
            );
            const logsWithImageUploads = detailLogs.filter((log) => {
              const keterangan = log.keterangan || '';
              const action = log.action || '';
              if (keterangan.includes('Task dimulai') || action === 'START') return false;
              if (keterangan.includes('Task dilanjutkan') || action === 'RESUME') return false;
              if (keterangan.includes('Task dijeda') || action === 'PAUSE') return false;
              if (keterangan.includes('Task dihentikan') || action === 'STOP') return false;
              return true;
            }) as TaskLog[];
            const assignedImageIds = new Set<number>();
            sortedImages.forEach((img: TaskImage) => {
              if (assignedImageIds.has(img.id)) return;
              const imgTime = new Date(img.uploadedAt).getTime();
              let closestLog: TaskLog | null = null;
              let closestTimeDiff = Infinity;
              logsWithImageUploads.forEach((log) => {
                const logTime = new Date(log.waktu).getTime();
                const timeDiff = Math.abs(imgTime - logTime);
                if (timeDiff < 60000 && timeDiff < closestTimeDiff) {
                  closestTimeDiff = timeDiff; closestLog = log;
                }
              });
              if (closestLog) {
                const log = closestLog as TaskLog;
                if (!imageMap[log.id]) imageMap[log.id] = [];
                imageMap[log.id].push(img);
                assignedImageIds.add(img.id);
              }
            });
          }

          setLogImagesMap(imageMap);
          const taskAttachments = images.filter((img: TaskImage) => {
            if (!img.logId) return true;
            const createLog = detailLogs.find(log => log.id === img.logId && log.action === 'CREATE');
            return !!createLog;
          });
          setDetailImages(taskAttachments as TaskImage[]);
        } else {
          setDetailImages([]); setLogImagesMap({});
        }
      } catch {
        if (alive) { setDetailImages([]); setLogImagesMap({}); }
      } finally {
        if (alive) setDetailImagesLoading(false);
      }
    };
    loadImages();
    return () => { alive = false; };
  }, [isOpen, task?.id, detailLogs]);

  const handleSendCrmMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crmInputMessage.trim() && crmFiles.length === 0) return;
    if (!task?.id || crmSending) return;
    
    const messageToSend = crmInputMessage.trim();
    setCrmSending(true);
    
    try {
      const formData = new FormData();
      formData.append('message', messageToSend);
      crmFiles.forEach((file) => {
        formData.append('file', file);
      });

      const response = await fetch(`/api/tasklist/${task.id}/crm-chat`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal mengirim pesan ke CRM');
      }

      setCrmInputMessage('');
      setCrmFiles([]);
      success('Pesan berhasil dikirim ke CRM');
      
      // Refresh CRM messages
      const refreshRes = await fetch(`/api/tasklist/${task.id}/crm-chat`, {
        credentials: 'include',
        cache: 'no-store'
      });
      const refreshData = await refreshRes.json();
      if (refreshData.status || refreshData.ticket) {
        setCrmMessagesPM(refreshData.messages_pm || []);
        setCrmMessagesPIC(refreshData.messages_pic || []);
      }
    } catch (err: any) {
      console.error('Error sending CRM message:', err);
      showError(err.message || 'Terjadi kesalahan saat mengirim pesan');
    } finally {
      setCrmSending(false);
    }
  };

  // ── Helpers ──
  const getStatusBadge = (status?: string) => {
    const map: Record<string, { cls: string; text: string }> = {
      'MENUNGGU_PROSES_USER': { cls: 'task-badge task-badge-yellow', text: 'Menunggu Proses' },
      'SEDANG_DIPROSES_USER': { cls: 'task-badge task-badge-blue', text: 'Sedang Diproses' },
      'SEDANG_DIPROSES_USER_PAUSED': { cls: 'task-badge task-badge-orange', text: 'Dijeda' },
      'MENUNGGU_REVIEW_PM': { cls: 'task-badge task-badge-purple', text: 'Menunggu Review' },
      'SELESAI': { cls: 'task-badge task-badge-green', text: 'Selesai' },
    };
    const info = map[status || ''] || { cls: 'task-badge task-badge-gray', text: status || 'Unknown' };
    return <span className={info.cls}>{info.text}</span>;
  };

  const getComplexityBadge = (complexity?: string) => {
    const map: Record<string, { cls: string; text: string }> = {
      'EASY': { cls: 'task-badge task-badge-green', text: 'Easy' },
      'MEDIUM': { cls: 'task-badge task-badge-yellow', text: 'Medium' },
      'HARD': { cls: 'task-badge task-badge-orange', text: 'Hard' },
    };
    const info = map[complexity || ''] || { cls: 'task-badge task-badge-gray', text: complexity || 'Unknown' };
    return <span className={info.cls}>{info.text}</span>;
  };

  const getTypeBadge = (type?: string) => {
    const map: Record<string, { cls: string; text: string }> = {
      'BLUEPRINT': { cls: 'task-badge task-badge-purple', text: 'Blueprint' },
      'DEVELOPMENT': { cls: 'task-badge task-badge-blue', text: 'Development' },
      'MAINTENANCE': { cls: 'task-badge task-badge-orange', text: 'Maintenance' },
    };
    const info = map[type || ''] || { cls: 'task-badge task-badge-gray', text: type || 'Development' };
    return <span className={info.cls}>{info.text}</span>;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '0 menit';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours} jam${mins > 0 ? ` ${mins} menit` : ''}`;
    return `${mins} menit`;
  };

  const openLightbox = (imagePath: string, allImages: string[]) => {
    setLightboxImages(allImages);
    setLightboxIndex(allImages.indexOf(imagePath));
    setLightboxImage(imagePath);
    setLightboxOpen(true);
  };

  const handleLightboxNavigate = (index: number) => {
    setLightboxIndex(index);
    setLightboxImage(lightboxImages[index]);
  };

  const getFileExtension = (filename: string) => filename.split('.').pop()?.toLowerCase() || '';

  const isImageFile = (filename: string, fileType?: string) => {
    const ext = getFileExtension(filename);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) ||
      (fileType ? fileType.startsWith('image/') : false);
  };

  const getLogFileIcon = (filename: string) => {
    const ext = getFileExtension(filename);
    if (ext === 'pdf') return <FaFilePdf className="w-6 h-6 text-red-500" />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord className="w-6 h-6 text-blue-500" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FaFileExcel className="w-6 h-6 text-green-500" />;
    if (['ppt', 'pptx'].includes(ext)) return <FaFilePowerpoint className="w-6 h-6 text-orange-500" />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FaFileArchive className="w-6 h-6 text-purple-500" />;
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) return <FaFileVideo className="w-6 h-6 text-red-400" />;
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return <FaFileAudio className="w-6 h-6 text-green-400" />;
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'php', 'py', 'java'].includes(ext)) return <FaFileCode className="w-6 h-6 text-gray-500" />;
    if (['txt', 'md', 'json', 'xml', 'yaml', 'log'].includes(ext)) return <FaFileAlt className="w-6 h-6 text-gray-400" />;
    return <FaFile className="w-6 h-6 text-gray-400" />;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'START':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'PAUSE':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'COMPLETE':
      case 'approve':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  if (!task) return null;

  const hasActions = task.availableActions && task.availableActions.length > 0;
  const initials = task.pegawaiNama
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        showCloseButton={false}
        className="!w-full !h-[100dvh] !max-h-[100dvh] !rounded-none sm:!w-[90vw] sm:!h-[90vh] sm:!max-h-[95vh] sm:!rounded-3xl max-w-7xl overflow-hidden task-detail-modal flex flex-col"
      >
        {/* ── Main container ── */}
        <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-gray-900 modal-content">

          {/* ════════════════════════════════════════
              TOP HEADER BAR (clean, only close button)
              ════════════════════════════════════════ */}
          <div className="flex-shrink-0 flex items-center justify-end px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              aria-label="Tutup"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ════════════════════════════════════════
              BODY: two-column split
              ════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">

            {/* ── MOBILE UNIFIED TAB NAVIGATION (ONLY VISIBLE ON MOBILE) ── */}
            <div className="task-tab-nav flex-shrink-0 md:!hidden overflow-x-auto whitespace-nowrap hide-scrollbar w-full border-b border-gray-200 dark:border-gray-800">
              <button onClick={() => setActiveTab('detail')} className={`task-tab-btn flex-1 whitespace-nowrap ${activeTab === 'detail' ? 'active' : ''}`}>
                <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Detail
              </button>
              <button onClick={() => setActiveTab('chat')} className={`task-tab-btn flex-1 whitespace-nowrap ${activeTab === 'chat' ? 'active' : ''}`}>
                <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Chat Internal
              </button>
              {(task?.idCrm || task?.ticketId || task?.ticket_id) && (
                <>
                  <button onClick={() => setActiveTab('chat_crm_pm')} className={`task-tab-btn whitespace-nowrap ${activeTab === 'chat_crm_pm' ? 'active' : ''}`}>
                    <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    CRM Chat (PM)
                  </button>
                  <button onClick={() => setActiveTab('chat_crm_pic')} className={`task-tab-btn whitespace-nowrap ${activeTab === 'chat_crm_pic' ? 'active' : ''}`}>
                    <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                    CRM Chat (PIC)
                  </button>
                </>
              )}
              <button onClick={() => setActiveTab('log')} className={`task-tab-btn flex-1 whitespace-nowrap ${activeTab === 'log' ? 'active' : ''}`}>
                <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Riwayat
                {detailLogs.length > 0 && <span className="task-tab-count">{detailLogs.length}</span>}
              </button>
            </div>

            {/* ══════════════════════════════════════
                LEFT PANEL (40%)
                ══════════════════════════════════════ */}
            <div className={`task-detail-split-left ${activeTab === 'detail' ? 'flex' : '!hidden'} md:!flex`}>

              {/* ── 1. Action Buttons Bar ── */}
              <div className="task-action-header flex-shrink-0">
                {user && (
                  <div className="flex flex-wrap gap-1.5">
                    {loadingActions && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-7 task-shimmer rounded-lg" />
                        <div className="w-20 h-7 task-shimmer rounded-lg" />
                      </div>
                    )}
                    {!loadingActions && !hasActions && (
                      <span className="text-xs text-gray-400 dark:text-gray-600 italic">
                        Tidak ada aksi tersedia
                      </span>
                    )}
                    {task.availableActions?.includes('start') && onStartTask && (
                      <button onClick={() => onStartTask(task)} className="task-action-btn task-action-btn-blue">
                        {getActionIcon('START')} Mulai Task
                      </button>
                    )}
                    {task.availableActions?.includes('pause') && onStatusChange && (
                      <button onClick={() => handleStatusChange(task, 'SEDANG_DIPROSES_USER_PAUSED')} className="task-action-btn task-action-btn-orange">
                        {getActionIcon('PAUSE')} Jeda
                      </button>
                    )}
                    {task.availableActions?.includes('resume') && onStatusChange && (
                      <button onClick={() => handleStatusChange(task, 'SEDANG_DIPROSES_USER')} className="task-action-btn task-action-btn-blue">
                        {getActionIcon('START')} Lanjutkan
                      </button>
                    )}
                    {task.availableActions?.includes('complete') && onCompleteTask && (
                      <button onClick={() => handleCompleteTask(task)} className="task-action-btn task-action-btn-amber">
                        {getActionIcon('COMPLETE')} Selesaikan
                      </button>
                    )}
                    {task.availableActions?.includes('approve') && onStatusChange && (
                      <button onClick={() => handleStatusChange(task, 'SELESAI')} className="task-action-btn task-action-btn-green">
                        {getActionIcon('approve')} Approve
                      </button>
                    )}
                    {task.availableActions?.includes('reject') && onStatusChange && (
                      <button onClick={() => handleStatusChange(task, 'MENUNGGU_PROSES_USER')} className="task-action-btn task-action-btn-red">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    )}
                    {task.availableActions?.includes('return-to-backlog') && (
                      <button onClick={() => handleReturnToBacklog(task)} className="task-action-btn task-action-btn-purple">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19l-7-7m0 0l7-7m-7 7h16" />
                        </svg>
                        Kembalikan ke Backlog
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── 2. Detail Info (single card) ── */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain task-detail-scrollbar bg-gray-50/30 dark:bg-gray-900/20">
                <div className="p-3">
                  {/* Header dengan icon */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Informasi Task</h3>
                  </div>
                  
                  {/* Single card dengan list */}
                  <div className="task-info-single-card">
                    {/* Status */}
                    <div className="task-info-row-single">
                      <span className="task-info-label-single">Status</span>
                      <div className="task-info-value-single">
                        {getStatusBadge(task.status)}
                      </div>
                    </div>

                    {/* Type */}
                    <div className="task-info-row-single">
                      <span className="task-info-label-single">Type</span>
                      <div className="task-info-value-single">
                        {getTypeBadge(task.tasklistType)}
                      </div>
                    </div>

                    {/* Complexity */}
                    <div className="task-info-row-single">
                      <span className="task-info-label-single">Complexity</span>
                      <div className="task-info-value-single">
                        {getComplexityBadge(task.taskComplexity)}
                      </div>
                    </div>

                    {/* Proyek */}
                    <div className="task-info-row-single">
                      <span className="task-info-label-single">Proyek</span>
                      <span className="task-info-value-single">{task.proyekNama || '—'}</span>
                    </div>

                    {/* Modul */}
                    <div className="task-info-row-single">
                      <span className="task-info-label-single">Modul</span>
                      <span className="task-info-value-single">{task.moduleNama || '—'}</span>
                    </div>

                    {/* Jadwal */}
                    <div className="task-info-row-single">
                      <span className="task-info-label-single">Jadwal</span>
                      <span className="task-info-value-single">{formatDateTime(task.scheduleAt)}</span>
                    </div>

                    {/* Due Date */}
                    {task.calculatedDueDate && (
                      <div className="task-info-row-single">
                        <span className="task-info-label-single">Due Date</span>
                        <span className="task-info-value-single">{formatDateTime(task.calculatedDueDate)}</span>
                      </div>
                    )}

                    {/* Dimulai */}
                    {task.startedAt && (
                      <div className="task-info-row-single">
                        <span className="task-info-label-single">Dimulai</span>
                        <span className="task-info-value-single">{formatDateTime(task.startedAt)}</span>
                      </div>
                    )}

                    {/* Durasi */}
                    {task.totalDurationMinutes !== undefined && task.totalDurationMinutes > 0 && (
                      <div className="task-info-row-single">
                        <span className="task-info-label-single">Total Durasi</span>
                        <span className="task-info-value-single">{formatDuration(task.totalDurationMinutes)}</span>
                      </div>
                    )}

                    {/* Ticket */}
                    {(task.ticketId || task.idCrm) && (
                      <div className="task-info-row-single">
                        <span className="task-info-label-single">Ticket</span>
                        <span className="task-info-value-single">{task.ticketId || task.idCrm}</span>
                      </div>
                    )}
                  </div>

                  {/* Deskripsi Task - dipisah dengan border */}
                  <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
                    <p className="task-section-label mb-3">Deskripsi Task</p>
                    <div className="task-desc-box">
                      {task.keterangan ? (
                        <>
                          <style>{htmlContentStyles}</style>
                          <div 
                            className="html-content text-sm text-gray-700 dark:text-gray-300"
                            dangerouslySetInnerHTML={{ __html: task.keterangan }}
                          />
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada deskripsi</p>
                      )}
                    </div>

                    {task.programmerDescription && (
                      <div className="mt-4">
                        <p className="task-section-label mb-3">Catatan Programmer</p>
                        <div className="task-desc-box-note">
                          <style>{htmlContentStyles}</style>
                          <div 
                            className="html-content text-sm text-brand-700 dark:text-blue-300"
                            dangerouslySetInnerHTML={{ __html: task.programmerDescription }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════
                RIGHT PANEL (60%) — Deskripsi / Chat / Log tabs
                ══════════════════════════════════════ */}
            <div className={`task-detail-split-right ${activeTab !== 'detail' ? 'flex' : '!hidden'} md:!flex`}>

              {/* Tab navigation (hidden on mobile) */}
              <div className="task-tab-nav flex-shrink-0 !hidden md:!flex">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`task-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                >
                  <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat Internal
                </button>
                {(task?.idCrm || task?.ticketId || task?.ticket_id) && (
                  <>
                    <button
                      onClick={() => setActiveTab('chat_crm_pm')}
                      className={`task-tab-btn ${activeTab === 'chat_crm_pm' ? 'active' : ''}`}
                    >
                      <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      CRM Chat (PM)
                    </button>
                    <button
                      onClick={() => setActiveTab('chat_crm_pic')}
                      className={`task-tab-btn ${activeTab === 'chat_crm_pic' ? 'active' : ''}`}
                    >
                      <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                      </svg>
                      CRM Chat (PIC)
                    </button>
                  </>
                )}
                <button
                  onClick={() => setActiveTab('log')}
                  className={`task-tab-btn ${activeTab === 'log' ? 'active' : ''}`}
                >
                  <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Riwayat
                  {detailLogs.length > 0 && (
                    <span className="task-tab-count">{detailLogs.length}</span>
                  )}
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {/* Chat Tab */}
                {(activeTab === 'chat' || activeTab === 'detail') && (
                  <TaskChatPanel tasklistId={task.id} taskStatus={task.status} />
                )}

                {/* CRM Chat PM Tab */}
                {(task?.idCrm || task?.ticketId || task?.ticket_id) && activeTab === 'chat_crm_pm' && (
                  <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-900">
                    {/* ... (rest of the CRM PM content) ... */}
                    {crmTicket && (
                      <div className="flex-shrink-0 px-4 py-2.5 bg-brand-50 dark:bg-brand-900/20 border-b border-brand-100 dark:border-brand-800">
                        <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 truncate">
                          #{crmTicket.nomor} — {crmTicket.subject}
                        </p>
                        <p className="text-xs text-brand-500 dark:text-brand-400">
                          {crmTicket.project_nama} • {crmTicket.client_nama}
                        </p>
                      </div>
                    )}
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 task-detail-scrollbar">
                      {crmLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
                        </div>
                      ) : crmError && crmMessagesPM.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{crmError}</p>
                          {!crmTicket && <p className="text-xs text-gray-400 mt-1">Task ini belum memiliki tiket CRM yang terhubung</p>}
                        </div>
                      ) : crmMessagesPM.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada pesan dari PM</p>
                        </div>
                      ) : (
                        crmMessagesPM.map((msg) => {
                          const msgTime = new Date(msg.created_at).toLocaleString('id-ID', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          });
                          const isRightAlign = msg.sender_name === 'SWA Digital Solusindo' || msg.sender_name === 'Expressa';
                          return (
                            <div key={msg.id} className={`flex flex-col ${isRightAlign ? 'items-end' : 'items-start'}`}>
                              <span className="text-xs text-gray-500 mb-1 mx-1">
                                {msg.sender_name} • {msgTime}
                              </span>
                              <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                                isRightAlign 
                                  ? 'bg-brand-600 text-white rounded-tr-none' 
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                              }`}>
                                {msg.keterangan}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {msg.attachments.map((att: any, i: number) => {
                                      const attUrl = att.url || att.file_url || att.path || att.link || '';
                                      const attName = att.name || att.file_name || att.filename || '';
                                      const attType = att.type || att.mime_type || att.content_type || att.file_type || '';
                                      const ext = (attName || attUrl).split('.').pop()?.toLowerCase() || '';
                                      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext) || attType.startsWith('image/');
                                      return isImage ? (
                                        <a key={i} href={attUrl || '#'} target="_blank" rel="noopener noreferrer"
                                          className="block mt-1.5">
                                          <img src={attUrl} alt={attName}
                                            className="max-w-full max-h-48 rounded-lg object-cover border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity"
                                            loading="lazy" />
                                        </a>
                                      ) : (
                                        <a key={i} href={attUrl || '#'} target="_blank" rel="noopener noreferrer"
                                          className={`flex items-center gap-1 text-xs underline ${isRightAlign ? 'text-white' : 'text-brand-600'}`}>
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                          </svg>
                                          {attName || `Lampiran ${i + 1}`}
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {/* Chat Input Area */}
                    <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-3">
                      {/* File preview */}
                      {crmFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {crmFiles.map((file, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs">
                              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => setCrmFiles(prev => prev.filter((_, idx) => idx !== i))}
                                className="text-gray-400 hover:text-red-500 ml-0.5"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <form onSubmit={handleSendCrmMessage} className="flex gap-2 items-center">
                        <label className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full p-2.5 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer shrink-0">
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const selected = Array.from(e.target.files || []);
                              setCrmFiles(prev => [...prev, ...selected]);
                              e.target.value = '';
                            }}
                          />
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </label>
                        <input
                          type="text"
                          value={crmInputMessage}
                          onChange={(e) => setCrmInputMessage(e.target.value)}
                          placeholder="Ketik balasan untuk CRM..."
                          className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:text-white"
                          disabled={crmSending}
                        />
                        <button
                          type="submit"
                          disabled={crmSending || (!crmInputMessage.trim() && crmFiles.length === 0)}
                          className="bg-brand-600 text-white rounded-full p-2.5 flex items-center justify-center hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      </form>
                      <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-2">
                        Pesan akan dikirim ke sistem CRM eksternal.
                      </p>
                    </div>
                  </div>
                )}

                {/* CRM Chat PIC Tab — sender_tipe === 'c' (client/customer) */}
                {(task?.idCrm || task?.ticketId || task?.ticket_id) && activeTab === 'chat_crm_pic' && (
                  <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-900">
                    {/* Ticket Info Header */}
                    {crmTicket && (
                      <div className="flex-shrink-0 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 truncate">
                          #{crmTicket.nomor} — {crmTicket.subject}
                        </p>
                        <p className="text-xs text-blue-500 dark:text-blue-400">
                          {crmTicket.project_nama} • {crmTicket.client_nama}
                        </p>
                      </div>
                    )}
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 task-detail-scrollbar">
                      {crmLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                        </div>
                      ) : crmError && crmMessagesPIC.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{crmError}</p>
                          {!crmTicket && <p className="text-xs text-gray-400 mt-1">Task ini belum memiliki tiket CRM yang terhubung</p>}
                        </div>
                      ) : crmMessagesPIC.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada pesan dari klien (PIC)</p>
                        </div>
                      ) : (
                        (() => {
                          const uniqueSenders = Array.from(new Set(crmMessagesPIC.map(m => m.sender_name).filter(Boolean)));
                          const firstSender = uniqueSenders[0] || '';
                          
                          return crmMessagesPIC.map((msg) => {
                            const msgTime = new Date(msg.created_at).toLocaleString('id-ID', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            });
                            // First sender is on the left (isRightAlign = false), second/others on the right (isRightAlign = true)
                            const isRightAlign = msg.sender_name ? msg.sender_name !== firstSender : false;
                            
                            return (
                              <div key={msg.id} className={`flex flex-col ${isRightAlign ? 'items-end' : 'items-start'}`}>
                                <span className="text-xs text-gray-500 mb-1 mx-1">
                                  {msg.sender_name} • {msgTime}
                                </span>
                                <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                                  isRightAlign 
                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                                }`}>
                                  {msg.keterangan}
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {msg.attachments.map((att: any, i: number) => {
                                        const attUrl = att.url || att.file_url || att.path || att.link || '';
                                        const attName = att.name || att.file_name || att.filename || '';
                                        const attType = att.type || att.mime_type || att.content_type || att.file_type || '';
                                        const ext = (attName || attUrl).split('.').pop()?.toLowerCase() || '';
                                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext) || attType.startsWith('image/');
                                        return isImage ? (
                                          <a key={i} href={attUrl || '#'} target="_blank" rel="noopener noreferrer"
                                            className="block mt-1.5">
                                            <img src={attUrl} alt={attName}
                                              className="max-w-full max-h-48 rounded-lg object-cover border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity"
                                              loading="lazy" />
                                          </a>
                                        ) : (
                                          <a key={i} href={attUrl || '#'} target="_blank" rel="noopener noreferrer"
                                            className={`flex items-center gap-1 text-xs underline ${isRightAlign ? 'text-white' : 'text-blue-600'}`}>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                            {attName || `Lampiran ${i + 1}`}
                                          </a>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()
                      )}
                    </div>
                    {/* Read-only notice */}
                    <div className="flex-shrink-0 px-4 py-2.5 border-t border-gray-200 dark:border-gray-800">
                      <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
                        Chat CRM hanya dapat dibaca. Balas melalui sistem CRM.
                      </p>
                    </div>
                  </div>
                )}

                {/* Log Tab */}
                {activeTab === 'log' && (
                  <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-4 task-detail-scrollbar">
                    {detailLogsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-8 h-8 task-shimmer rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3 task-shimmer rounded w-1/3" />
                              <div className="h-16 task-shimmer rounded-xl" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : detailLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-400 dark:text-gray-600">Belum ada riwayat aktivitas</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {detailLogs.map((log, index) => {
                          const avatarInit = log.userNama?.charAt(0).toUpperCase() || 'U';
                          return (
                            <div key={log.id} className="task-log-item">
                              {/* Timeline connector */}
                              {index < detailLogs.length - 1 && (
                                <div className="task-log-line" />
                              )}

                              {/* Avatar */}
                              <div className="task-avatar flex-shrink-0" style={{ width: 30, height: 30, fontSize: 11 }}>
                                {avatarInit}
                              </div>

                              {/* Card */}
                              <div className="task-log-card">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div>
                                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                                      {log.userNama || 'Unknown User'}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-600">
                                      {formatDateTime(log.waktu)}
                                    </p>
                                  </div>
                                  {log.status && (
                                    <span className="task-badge task-badge-blue flex-shrink-0" style={{ fontSize: 10 }}>
                                      {log.status.replace(/_/g, ' ')}
                                    </span>
                                  )}
                                </div>

                                {log.keterangan && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap mt-1 leading-relaxed">
                                    {log.keterangan}
                                  </p>
                                )}

                                {/* Log attachments */}
                                {logImagesMap[log.id] && logImagesMap[log.id].length > 0 && (
                                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                                    {logImagesMap[log.id].map((file) => {
                                      const isImg = isImageFile(file.originalName, file.fileType);
                                      return (
                                        <div key={file.id} className="cursor-pointer group">
                                          {isImg ? (
                                            <img
                                              src={`/api/uploads/tasklist/${file.fileName}`}
                                              alt={file.originalName}
                                              className="w-full h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-700 group-hover:border-brand-400 transition-all duration-150"
                                              onClick={() => openLightbox(
                                                `/api/uploads/tasklist/${file.fileName}`,
                                                logImagesMap[log.id]
                                                  .filter(f => isImageFile(f.originalName, f.fileType))
                                                  .map(f => `/api/uploads/tasklist/${f.fileName}`)
                                              )}
                                              loading="lazy"
                                            />
                                          ) : (
                                            <a
                                              href={`/api/uploads/tasklist/${file.fileName}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex flex-col items-center justify-center h-14 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all duration-150 p-1.5"
                                              title={file.originalName}
                                            >
                                              {getLogFileIcon(file.originalName)}
                                              <span className="text-xs text-gray-500 dark:text-gray-500 text-center truncate w-full mt-0.5" style={{ fontSize: 9 }}>
                                                {file.originalName.length > 12
                                                  ? `${file.originalName.substring(0, 12)}…`
                                                  : file.originalName}
                                              </span>
                                            </a>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="task-footer">
            <button
              onClick={onClose}
              className="task-action-btn task-action-btn-ghost"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* Disposition Modal */}
      {task && (
        <TaskDispositionModal
          isOpen={isDispositionModalOpen}
          onClose={() => setIsDispositionModalOpen(false)}
          task={task}
          onSuccess={() => { onClose(); }}
        />
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imageSrc={lightboxImage}
        imageAlt="Task Image Preview"
        images={lightboxImages}
        currentIndex={lightboxIndex}
        onNavigate={handleLightboxNavigate}
      />
    </>
  );
};

export default TaskDetailModal;
