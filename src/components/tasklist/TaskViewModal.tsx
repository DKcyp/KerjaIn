"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from "@/components/ui/modal";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { htmlContentStyles } from '@/lib/htmlUtils';
import TaskChatPanel from "./TaskChatPanel";
import {
  FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint,
  FaFileArchive, FaFileVideo, FaFileAudio, FaFileCode, FaFileAlt, FaFile,
} from 'react-icons/fa';
import './tasklist.css';

type TaskItem = {
  id: number;
  projectId?: number;
  moduleId?: number;
  pegawaiId?: number;
  scheduleAt?: string;
  calculatedDueDate?: string | null;
  startedAt?: string | null;
  totalDurationMinutes?: number;
  keterangan?: string | null;
  programmerDescription?: string | null;
  proyekNama?: string;
  moduleNama?: string;
  pegawaiNama?: string;
  pegawaiRole?: string;
  status?: string;
  imagePath?: string | null;
  kode?: string;
  tasklistType?: string;
  taskComplexity?: string;
  version?: string | null;
  baVersion?: string | null;
};

type TaskLog = {
  id: number;
  waktu: string;
  userId: number;
  userNama?: string;
  keterangan?: string | null;
  status?: string | null;
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

interface TaskViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
}

const TaskViewModal: React.FC<TaskViewModalProps> = ({ isOpen, onClose, task }) => {
  const [activeTab, setActiveTab] = useState<'detail' | 'chat' | 'log'>('detail');
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [images, setImages] = useState<TaskImage[]>([]);
  const [logImagesMap, setLogImagesMap] = useState<Record<number, TaskImage[]>>({});
  const [logsLoading, setLogsLoading] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState('');
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (isOpen && task) setActiveTab('chat');
  }, [isOpen, task?.id]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '0 menit';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h} jam${m > 0 ? ` ${m} menit` : ''}`;
    return `${m} menit`;
  };

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

  const getComplexityBadge = (c?: string) => {
    const map: Record<string, { cls: string; text: string }> = {
      'EASY': { cls: 'task-badge task-badge-green', text: 'Easy' },
      'MEDIUM': { cls: 'task-badge task-badge-yellow', text: 'Medium' },
      'HARD': { cls: 'task-badge task-badge-orange', text: 'Hard' },
    };
    const info = map[c || ''] || { cls: 'task-badge task-badge-gray', text: c || '-' };
    return <span className={info.cls}>{info.text}</span>;
  };

  const getTypeBadge = (t?: string) => {
    const map: Record<string, { cls: string; text: string }> = {
      'BLUEPRINT': { cls: 'task-badge task-badge-purple', text: 'Blueprint' },
      'DEVELOPMENT': { cls: 'task-badge task-badge-blue', text: 'Development' },
      'MAINTENANCE': { cls: 'task-badge task-badge-orange', text: 'Maintenance' },
    };
    const info = map[t || ''] || { cls: 'task-badge task-badge-gray', text: t || 'Development' };
    return <span className={info.cls}>{info.text}</span>;
  };

  const getFileExtension = (fn: string) => fn.split('.').pop()?.toLowerCase() || '';

  const isImageFile = (fn: string, ft?: string) => {
    const ext = getFileExtension(fn);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)
      || (ft ? ft.startsWith('image/') : false);
  };

  const getLogFileIcon = (fn: string) => {
    const ext = getFileExtension(fn);
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

  const openLightbox = (imgPath: string, allPaths: string[]) => {
    setLightboxImages(allPaths);
    setLightboxIndex(allPaths.indexOf(imgPath));
    setLightboxImage(imgPath);
    setLightboxOpen(true);
  };

  const handleLightboxNavigate = (idx: number) => {
    setLightboxIndex(idx);
    setLightboxImage(lightboxImages[idx]);
  };

  // Fetch logs
  useEffect(() => {
    if (!isOpen || !task?.id) { setLogs([]); return; }
    let alive = true;
    setLogsLoading(true);
    fetch(`/api/tasklist/${task.id}/logs`, { cache: 'no-store', credentials: 'include' })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { if (alive) setLogs(Array.isArray(d?.items) ? d.items : []); })
      .catch(() => { if (alive) setLogs([]); })
      .finally(() => { if (alive) setLogsLoading(false); });
    return () => { alive = false; };
  }, [isOpen, task?.id]);

  // Fetch images
  useEffect(() => {
    if (!isOpen || !task?.id) { setImages([]); setLogImagesMap({}); return; }
    let alive = true;
    setImagesLoading(true);
    fetch(`/api/tasklist/${task.id}/images`, { cache: 'no-store', credentials: 'include' })
      .then(r => r.ok ? r.json() : { images: [] })
      .then(d => {
        if (!alive) return;
        const imgs = Array.isArray(d?.images) ? d.images as TaskImage[] : [];
        setImages(imgs);
        const map: Record<number, TaskImage[]> = {};
        if (logs.length > 0 && imgs.length > 0) {
          const sorted = [...imgs].sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
          const relevantLogs = logs.filter(l => {
            const k = (l.keterangan || '').toLowerCase();
            const a = (l.action || '').toLowerCase();
            return !(k.includes('task dimulai') || k.includes('task dilanjutkan') || k.includes('task dijeda') || k.includes('task dihentikan') || a === 'start' || a === 'resume' || a === 'pause' || a === 'stop');
          });
          const assigned = new Set<number>();
          sorted.forEach(img => {
            if (assigned.has(img.id)) return;
            const t = new Date(img.uploadedAt).getTime();
            let bestLog: TaskLog | null = null;
            let bestDiff = Infinity;
            for (const l of relevantLogs) {
              const d = Math.abs(new Date(l.waktu).getTime() - t);
              if (d < 60000 && d < bestDiff) { bestDiff = d; bestLog = l; }
            }
            if (bestLog) {
              if (!map[bestLog.id]) map[bestLog.id] = [];
              map[bestLog.id].push(img);
              assigned.add(img.id);
            }
          });
        }
        setLogImagesMap(map);
      })
      .catch(() => { if (alive) { setImages([]); setLogImagesMap({}); } })
      .finally(() => { if (alive) setImagesLoading(false); });
    return () => { alive = false; };
  }, [isOpen, task?.id, logs]);

  if (!task) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        showCloseButton={false}
        className="!w-full !h-[100dvh] !max-h-[100dvh] !rounded-none sm:!w-[85vw] sm:!h-[85vh] sm:!max-h-[90vh] sm:!rounded-3xl max-w-5xl overflow-hidden task-detail-modal flex flex-col"
      >
        <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-gray-900 modal-content">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-end px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body: two-column split */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">

            {/* Mobile tab nav */}
            <div className="task-tab-nav flex-shrink-0 md:!hidden overflow-x-auto whitespace-nowrap hide-scrollbar w-full border-b border-gray-200 dark:border-gray-800">
              <button onClick={() => setActiveTab('detail')} className={`task-tab-btn flex-1 ${activeTab === 'detail' ? 'active' : ''}`}>
                <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Detail
              </button>
              <button onClick={() => setActiveTab('chat')} className={`task-tab-btn flex-1 ${activeTab === 'chat' ? 'active' : ''}`}>
                <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat Internal
              </button>
              <button onClick={() => setActiveTab('log')} className={`task-tab-btn flex-1 ${activeTab === 'log' ? 'active' : ''}`}>
                <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Riwayat
                {logs.length > 0 && <span className="task-tab-count">{logs.length}</span>}
              </button>
            </div>

            {/* Left panel - Task Info */}
            <div className={`task-detail-split-left ${activeTab === 'detail' ? 'flex' : '!hidden'} md:!flex`}>
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

                  {/* Status + Badges row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    {getStatusBadge(task.status)}
                    {getTypeBadge(task.tasklistType)}
                    {getComplexityBadge(task.taskComplexity)}
                    {task.version && <span className="task-badge task-badge-gray">v{task.version}</span>}
                    {task.baVersion && <span className="task-badge task-badge-gray">BA: {task.baVersion}</span>}
                  </div>

                  {/* Info card */}
                  <div className="task-info-single-card">
                    {task.kode && (
                      <div className="task-info-row-single">
                        <span className="task-info-label-single">Kode</span>
                        <span className="task-info-value-single">{task.kode}</span>
                      </div>
                    )}
                    <div className="task-info-row-single">
                      <span className="task-info-label-single">Proyek</span>
                      <span className="task-info-value-single">{task.proyekNama || '—'}</span>
                    </div>
                    <div className="task-info-row-single">
                      <span className="task-info-label-single">Modul</span>
                      <span className="task-info-value-single">{task.moduleNama || '—'}</span>
                    </div>
                    <div className="task-info-row-single">
                      <span className="task-info-label-single">Assignee</span>
                      <span className="task-info-value-single">{task.pegawaiNama || '—'}</span>
                    </div>
                    {task.scheduleAt && (
                      <div className="task-info-row-single">
                        <span className="task-info-label-single">Jadwal</span>
                        <span className="task-info-value-single">{formatDateTime(task.scheduleAt)}</span>
                      </div>
                    )}
                    {task.calculatedDueDate && (
                      <div className="task-info-row-single">
                        <span className="task-info-label-single">Due Date</span>
                        <span className="task-info-value-single">{formatDateTime(task.calculatedDueDate)}</span>
                      </div>
                    )}
                    {task.startedAt && (
                      <div className="task-info-row-single">
                        <span className="task-info-label-single">Dimulai</span>
                        <span className="task-info-value-single">{formatDateTime(task.startedAt)}</span>
                      </div>
                    )}
                    {(task.totalDurationMinutes !== undefined && task.totalDurationMinutes > 0) && (
                      <div className="task-info-row-single">
                        <span className="task-info-label-single">Durasi</span>
                        <span className="task-info-value-single">{formatDuration(task.totalDurationMinutes)}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
                    <p className="task-section-label mb-3">Deskripsi Task</p>
                    <div className="task-desc-box">
                      {task.keterangan ? (
                        <>
                          <style>{htmlContentStyles}</style>
                          <div className="html-content text-sm text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: task.keterangan }} />
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
                          <div className="html-content text-sm text-brand-700 dark:text-blue-300" dangerouslySetInnerHTML={{ __html: task.programmerDescription }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right panel - Chat / Log tabs */}
            <div className={`task-detail-split-right ${activeTab !== 'detail' ? 'flex' : '!hidden'} md:!flex`}>
              {/* Desktop tab nav */}
              <div className="task-tab-nav flex-shrink-0 !hidden md:!flex">
                <button onClick={() => setActiveTab('chat')} className={`task-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}>
                  <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat Internal
                </button>
                <button onClick={() => setActiveTab('log')} className={`task-tab-btn ${activeTab === 'log' ? 'active' : ''}`}>
                  <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Riwayat
                  {logs.length > 0 && <span className="task-tab-count">{logs.length}</span>}
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {/* Chat Tab */}
                {(activeTab === 'chat' || activeTab === 'detail') && (
                  <TaskChatPanel tasklistId={task.id} taskStatus={task.status} readOnly />
                )}

                {/* Log Tab */}
                {activeTab === 'log' && (
                  <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-4 task-detail-scrollbar">
                    {logsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex gap-3">
                            <div className="w-8 h-8 task-shimmer rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3 task-shimmer rounded w-1/3" />
                              <div className="h-16 task-shimmer rounded-xl" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-400 dark:text-gray-600">Belum ada riwayat aktivitas</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {logs.map((log, idx) => {
                          const avatarInit = log.userNama?.charAt(0).toUpperCase() || 'U';
                          return (
                            <div key={log.id} className="task-log-item">
                              {idx < logs.length - 1 && <div className="task-log-line" />}
                              <div className="task-avatar flex-shrink-0" style={{ width: 30, height: 30, fontSize: 11 }}>
                                {avatarInit}
                              </div>
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
                                {logImagesMap[log.id] && logImagesMap[log.id].length > 0 && (
                                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                                    {logImagesMap[log.id].map(file => {
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
                                              <span className="text-xs text-gray-500 text-center truncate w-full mt-0.5" style={{ fontSize: 9 }}>
                                                {file.originalName.length > 12 ? `${file.originalName.substring(0, 12)}…` : file.originalName}
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

          {/* Footer */}
          <div className="task-footer">
            <button onClick={onClose} className="task-action-btn task-action-btn-ghost">
              Tutup
            </button>
          </div>
        </div>
      </Modal>

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

export default TaskViewModal;
