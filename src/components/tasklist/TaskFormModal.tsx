/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, @next/next/no-assign-module-variable, @next/next/no-img-element */
"use client";

import React, { useEffect, useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import Select2Field from "@/components/form/Select2Field";
import DateTimeInput from "@/components/form/DateTimeInput";
import { useToast } from "@/context/ToastContext";
import { validateFile, getAcceptString, formatFileSize, getFileTypeCategory } from "@/lib/fileUploadConfig";
import { addWorkingHours, calculateWorkingHoursBetween, DEFAULT_CONFIG, formatWorkingHours } from "@/lib/workingHoursCalculator";
import { CompletionTimePreview } from "@/components/tasklist/CompletionTimePreview";
import RichTextEditor from "@/components/editor/RichTextEditor";

// Types
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
  idCrm?: string | null;
  ticketId?: string | null;
  ticket_id?: string | null;
};

type Proyek = { id: number; namaProyek: string; type?: 'BLUEPRINT' | 'DEVELOPMENT' | 'SUPPORT' | 'CLOSED' };
type Pegawai = { id: number; namaLengkap: string; role?: string };

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: TaskFormData) => Promise<void>;
  projects: Proyek[];
  pegawais: Pegawai[];
  me: any;
  userPMProjects: number[];
  isPIC: boolean;
  picProjects: number[];
  loading: boolean;
}

export interface TaskFormData {
  projectId: number | "";
  moduleId: number | "";
  pegawaiId: number | "";
  scheduleAt: string;
  keterangan: string;
  tasklistType: string;
  taskComplexity: string;
  customDuration: string;
  files: File[];
}

export default function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  projects,
  pegawais,
  me,
  userPMProjects,
  isPIC,
  picProjects,
  loading
}: TaskFormModalProps) {
  const { error } = useToast();

  // Form state
  const [formProjectId, setFormProjectId] = useState<number | "">("");
  const [formModuleId, setFormModuleId] = useState<number | "">("");
  const [formPegawaiId, setFormPegawaiId] = useState<number | "">("");
  const [formScheduleAt, setFormScheduleAt] = useState<string>("");
  const [formKeterangan, setFormKeterangan] = useState<string>("");
  const [formTasklistType, setFormTasklistType] = useState<string>("DEVELOPMENT");
  const [formTaskComplexity, setFormTaskComplexity] = useState<string>("MEDIUM");
  const [formCustomDuration, setFormCustomDuration] = useState<string>("4");
  const [formFiles, setFormFiles] = useState<File[]>([]);

  // Module and team data
  const [modules, setModules] = useState<Array<{ id: number; label: string; disabled: boolean }>>([]);
  const [selectedModuleName, setSelectedModuleName] = useState<string>("");
  const selectedModuleRef = useRef<{ id: number; text: string } | null>(null);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [teamMemberIds, setTeamMemberIds] = useState<number[]>([]);
  const [userJabatanInProject, setUserJabatanInProject] = useState<Record<number, string>>({});

  // Complexity data
  const [complexityHours, setComplexityHours] = useState<Record<string, number>>({ 'EASY': 2, 'MEDIUM': 4, 'HARD': 8 });
  const [complexityOptions, setComplexityOptions] = useState<Array<{ complexity: string; hours: number; description?: string }>>([]);

  // Conflict detection
  const [conflictInfo, setConflictInfo] = useState<{ hasConflict: boolean; conflictingTasks: any[]; suggestedTime: string | null; overlapHours: number } | null>(null);

  // Helper functions
  const resolveModuleCode = (projectId: number, moduleId: number) => {
    return '-';
  };

  const resolveModuleName = (projectId: number, moduleId: number, fallback?: string) => {
    const module = modules.find(m => m.id === moduleId);
    return module?.label || fallback || 'Unknown Module';
  };

  const invalidModuleSelection = typeof formModuleId === 'number' && formModuleId <= 0;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormProjectId("");
      setFormModuleId("");
      setFormPegawaiId("");
      setFormScheduleAt("");
      setFormKeterangan("");
      setFormTasklistType("DEVELOPMENT");
      setFormTaskComplexity("MEDIUM");
      setFormCustomDuration("4");
      setFormFiles([]);
      setConflictInfo(null);
      setSelectedModuleName("");
      selectedModuleRef.current = null;
    }
  }, [isOpen]);

  // Auto-update custom duration when complexity changes
  useEffect(() => {
    const hours = complexityHours[formTaskComplexity] || 4;
    setFormCustomDuration(String(hours));
  }, [formTaskComplexity, complexityHours]);

  // Fetch task complexity from master data when modal opens
  useEffect(() => {
    const fetchComplexityData = async () => {
      try {
        const response = await fetch('/api/task-complexity');
        const data = await response.json();

        if (data.items && Array.isArray(data.items)) {
          setComplexityOptions(data.items);
          const hoursMap: Record<string, number> = {};
          data.items.forEach((item: any) => {
            hoursMap[item.complexity] = item.hours;
          });
          setComplexityHours(hoursMap);
        }
      } catch (e) {
        console.error('Failed to fetch complexity data:', e);
      }
    };

    if (isOpen) {
      fetchComplexityData();
    }
  }, [isOpen]);

  // Load modules when project changes
  useEffect(() => {
    const loadModules = async () => {
      if (!formProjectId || typeof formProjectId !== "number") {
        setModules([]);
        setFormModuleId("");
        setSelectedModuleName("");
        selectedModuleRef.current = null;
        setTeamMemberIds([]);
        return;
      }

      try {
        setModulesLoading(true);
        const resTree = await fetch(`/api/proyek-modules/${formProjectId}/tree`, { cache: "no-store", credentials: 'include' });
        let list: Array<{ id: number; label: string; disabled: boolean }> = [];

        if (resTree.ok) {
          const data = await resTree.json();
          const tree: any[] = Array.isArray(data?.tree) ? data.tree : [];
          const flatten = (nodes: any[], depth: number) => {
            for (const n of nodes) {
              const prefix = depth > 0 ? `${"\u00A0".repeat(depth * 2)}` : "";
              const marker = n.children && n.children.length > 0 ? "▸ " : "• ";
              list.push({ id: n.id, label: `${prefix}${marker}${n.nama}`, disabled: !(n.isLeaf ?? ((n.children?.length || 0) === 0)) });
              if (n.children && n.children.length) flatten(n.children, depth + 1);
            }
          };
          flatten(tree, 0);
        }

        if (list.length === 0) {
          const resLeaves = await fetch(`/api/proyek-modules/${formProjectId}/leaves`, { cache: "no-store", credentials: 'include' });
          if (resLeaves.ok) {
            const data = await resLeaves.json();
            const leaves: any[] = Array.isArray(data?.items) ? data.items : [];
            list = leaves.map((m) => ({ id: m.id, label: m.path || m.nama, disabled: false }));
          }
        }
        setModules(list);

        const selectedProject = projects.find(p => p.id === formProjectId);

        let hasRegionTeam = false;
        if (selectedProject?.type === 'DEVELOPMENT') {
          const resTeamCheck = await fetch(`/api/proyek-team/${formProjectId}`, { cache: 'no-store', credentials: 'include' });
          if (resTeamCheck.ok) {
            const teamData = await resTeamCheck.json();
            hasRegionTeam = Array.isArray(teamData?.items) && teamData.items.some((m: any) => m.teamSource === 'region');
          }
        }

        const useAvailableUsersAPI = selectedProject?.type === 'SUPPORT' || (selectedProject?.type === 'DEVELOPMENT' && hasRegionTeam);

        const resTeam = await fetch(`/api/proyek-team/${formProjectId}`, { cache: 'no-store', credentials: 'include' });
        if (resTeam.ok) {
          const data = await resTeam.json();
          const teamMembers = Array.isArray(data?.items) ? data.items : [];

          const jabatanMap: Record<number, string> = {};
          teamMembers.forEach((member: any) => {
            if (member.pegawaiId && member.jabatan) {
              jabatanMap[member.pegawaiId] = member.jabatan;
            }
          });
          setUserJabatanInProject(jabatanMap);

          if (useAvailableUsersAPI) {
            const requesterParam = me?.id ? `&requesterId=${me.id}` : '';
            const resUsers = await fetch(`/api/tasklist/available-users?projectId=${formProjectId}${requesterParam}`, { cache: 'no-store', credentials: 'include' });
            if (resUsers.ok) {
              const userData = await resUsers.json();
              const ids = Array.isArray(userData?.users) ? userData.users.map((u: { id: number }) => u.id) : [];
              setTeamMemberIds(ids);
            } else {
              setTeamMemberIds([]);
            }
          } else {
            const ids = teamMembers.map((r: { pegawaiId: number }) => r.pegawaiId);
            setTeamMemberIds(ids);
          }
        } else {
          setTeamMemberIds([]);
          setUserJabatanInProject({});
        }
      } catch (e) {
        console.error("Failed loading modules", e);
      } finally {
        setModulesLoading(false);
      }
    };
    loadModules();
  }, [formProjectId, projects, me?.id]);

  // Auto-sync tasklistType with selected project's type
  useEffect(() => {
    if (!formProjectId || typeof formProjectId !== 'number') return;

    const selectedProject = projects.find(p => p.id === formProjectId);
    if (!selectedProject?.type) {
      setFormTasklistType('DEVELOPMENT');
      return;
    }

    const typeMapping: Record<string, string> = {
      'BLUEPRINT': 'BLUEPRINT',
      'DEVELOPMENT': 'DEVELOPMENT',
      'SUPPORT': 'MAINTENANCE',
    };

    const mappedType = typeMapping[selectedProject.type] || 'DEVELOPMENT';
    setFormTasklistType(mappedType);
  }, [formProjectId, projects]);

  // Check for schedule conflicts
  const checkScheduleConflict = async () => {
    if (!formPegawaiId || !formScheduleAt || !formTaskComplexity) {
      setConflictInfo(null);
      return;
    }

    try {
      const scheduledDate = new Date(formScheduleAt);
      if (isNaN(scheduledDate.getTime())) {
        setConflictInfo(null);
        return;
      }

      const dateStr = scheduledDate.toISOString().split('T')[0];
      const response = await fetch(
        `/api/tasklist?pegawaiId=${formPegawaiId}&from=${dateStr}&to=${dateStr}&status=MENUNGGU_PROSES_USER,SEDANG_DIPROSES_USER,SEDANG_DIPROSES_USER_PAUSED`
      );
      const data = await response.json();

      if (!data.items || !Array.isArray(data.items)) {
        setConflictInfo(null);
        return;
      }

      const existingTasks = data.items;
      const duration = parseFloat(formCustomDuration) || complexityHours[formTaskComplexity] || 4;
      //   const newEnd = new Date(scheduledDate.getTime() + duration * 60 * 60 * 1000);
      const newEnd = addWorkingHours(scheduledDate, duration, DEFAULT_CONFIG);

      const conflicts: any[] = [];
      let totalOverlap = 0;

      existingTasks.forEach((task: any) => {
        const taskStart = new Date(task.scheduleAt);
        // Convert Decimal to number if needed
        const customDuration = task.customDurationHours ? parseFloat(String(task.customDurationHours)) : null;
        const taskDuration = customDuration || complexityHours[task.taskComplexity] || 4;

        // Use working hours calculator for accurate end time
        const taskEnd = addWorkingHours(taskStart, taskDuration, DEFAULT_CONFIG);

        // Calculate overlap if time ranges intersect
        if (scheduledDate < taskEnd && newEnd > taskStart) {

          // Get the intersection time range
          const overlapStart = scheduledDate > taskStart ? scheduledDate : taskStart;
          const overlapEnd = newEnd < taskEnd ? newEnd : taskEnd;

          // Calculate WORKING hours within that intersection
          const effectiveOverlapHours = calculateWorkingHoursBetween(overlapStart, overlapEnd, DEFAULT_CONFIG);

          // Only flag as conflict if there is actual working time overlap
          if (effectiveOverlapHours > 0) {
            conflicts.push({
              ...task,
              estimatedEnd: taskEnd.toISOString(),
              duration: taskDuration
            });

            totalOverlap += effectiveOverlapHours;
          }
        }
      });

      let suggestedTime: string | null = null;
      if (existingTasks.length > 0) {
        const sortedTasks = [...existingTasks].sort((a, b) =>
          new Date(a.scheduleAt).getTime() - new Date(b.scheduleAt).getTime()
        );

        // Find the earliest available time that doesn't overlap with any existing task
        // Look for the end time of the last task that actually conflicts with our scheduled time
        const taskSlots = sortedTasks.map(task => {
          const start = new Date(task.scheduleAt);
          // Convert Decimal to number if needed
          const customDuration = task.customDurationHours ? parseFloat(String(task.customDurationHours)) : null;
          const taskDuration = customDuration || complexityHours[task.taskComplexity] || 4;
          // Use addWorkingHours to calculate end time (includes lunch break)
          const end = addWorkingHours(start, taskDuration, DEFAULT_CONFIG);
          return { start, end, task };
        });

        // Find tasks that overlap with our scheduled time
        const overlappingTasks = taskSlots.filter(slot => {
          // Check if this task overlaps with our new task
          return scheduledDate < slot.end && newEnd > slot.start;
        });

        if (overlappingTasks.length > 0) {
          // Suggest time after the last overlapping task ends
          const lastOverlappingTask = overlappingTasks[overlappingTasks.length - 1];
          suggestedTime = lastOverlappingTask.end.toISOString();
        } else {
          // No overlaps, suggest the scheduled time itself or start of work day
          const morning = new Date(scheduledDate);
          morning.setHours(9, 0, 0, 0);
          suggestedTime = morning.toISOString();
        }
      } else {
        const morning = new Date(scheduledDate);
        morning.setHours(9, 0, 0, 0);
        suggestedTime = morning.toISOString();
      }

      setConflictInfo({
        hasConflict: conflicts.length > 0,
        conflictingTasks: conflicts,
        suggestedTime,
        overlapHours: Math.round(totalOverlap * 10) / 10
      });

    } catch (e) {
      console.error('Failed to check schedule conflict:', e);
      setConflictInfo(null);
    }
  };

  useEffect(() => {
    checkScheduleConflict();
  }, [formPegawaiId, formScheduleAt, formTaskComplexity, formCustomDuration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData: TaskFormData = {
      projectId: formProjectId,
      moduleId: formModuleId,
      pegawaiId: formPegawaiId,
      scheduleAt: formScheduleAt,
      keterangan: formKeterangan,
      tasklistType: formTasklistType,
      taskComplexity: formTaskComplexity,
      customDuration: formCustomDuration,
      files: formFiles
    };

    await onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="!w-full !h-[100dvh] !max-h-[100dvh] !rounded-none sm:!w-[90vw] sm:!h-[90vh] sm:!max-h-[90vh] sm:!rounded-3xl max-w-4xl overflow-hidden flex flex-col" showCloseButton={false}>
      <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white dark:bg-gray-900">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <span className="text-2xl">➕</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tambah Task Baru</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Buat task baru untuk tim Anda</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <span className="text-xl text-gray-500">✕</span>
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 task-form-scrollbar space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Proyek */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    <span className="text-blue-500">📁</span>
                    Proyek
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Select2Field
                      disabled={loading}
                      value={typeof formProjectId === 'number' ? formProjectId : ''}
                      onChange={(v) => {
                        const val = v === '' ? '' : Number(v);
                        setFormProjectId(val);
                        setFormModuleId('');
                        setSelectedModuleName('');
                        selectedModuleRef.current = null;
                      }}
                      placeholder="🔍 Pilih proyek untuk task ini..."
                      options={projects.filter(p => {
                        if (me?.role === 'SUPER_ADMIN') return true;
                        if (me?.role === 'PM' || me?.role === 'ADMIN') return true;
                        if (userPMProjects.includes(p.id)) return true;
                        if (isPIC) {
                          return picProjects.includes(p.id);
                        }
                        return false;
                      }).map(p => ({
                        id: p.id,
                        text: `${p.namaProyek}${p.type ? ` - ${p.type === 'BLUEPRINT' ? '📋 Blueprint' : p.type === 'DEVELOPMENT' ? '💻 Development' : '🛠️ Support'}` : ''}`
                      }))}
                      className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all duration-200"
                      dropdownToBody={false}
                    />
                    {formProjectId && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="text-green-500 text-lg">✅</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modul */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    <span className="text-purple-500">🔧</span>
                    Modul
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Select2Field
                      disabled={!formProjectId || loading}
                      value={typeof formModuleId === 'number' ? formModuleId : ''}
                      onChange={(v, data) => {
                        const newValue = v === '' ? '' : Number(v);
                        setFormModuleId(newValue);
                        if (data && data.text && newValue) {
                          setSelectedModuleName(data.text);
                          // Simpan ke ref agar tidak berubah-ubah
                          selectedModuleRef.current = { id: newValue, text: data.text };
                        } else if (newValue === '') {
                          setSelectedModuleName('');
                          selectedModuleRef.current = null;
                        }
                      }}
                      placeholder={formProjectId ? '🔍 Pilih modul untuk task ini...' : '⚠️ Pilih proyek terlebih dahulu'}
                      ajaxUrl={formProjectId ? `/api/proyek-modules/${Number(formProjectId)}/leaves?format=select2` : undefined}
                      minimumInputLength={0}
                      options={[]}
                      initialSelected={selectedModuleRef.current || undefined}
                      className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900 transition-all duration-200 disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                      dropdownToBody={false}
                    />
                    {formModuleId && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="text-green-500 text-lg">✅</span>
                      </div>
                    )}
                  </div>
                  {invalidModuleSelection && (
                    <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="text-amber-600 text-lg">⚠️</span>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Modul berasal dari data legacy. Silakan migrasikan modul proyek ke struktur baru sebelum menyimpan task.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* User */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    <span className="text-green-500">👤</span>
                    Assignee
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      disabled={!formProjectId || loading}
                      value={typeof formPegawaiId === 'number' ? formPegawaiId : ''}
                      onChange={(e) => setFormPegawaiId(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 dark:text-gray-100 focus:border-green-500 focus:ring-4 focus:ring-green-100 dark:focus:ring-green-900 transition-all duration-200 disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:cursor-not-allowed appearance-none"
                      required
                    >
                      <option value="">{formProjectId ? '👤 Pilih anggota tim...' : '⚠️ Pilih proyek terlebih dahulu'}</option>
                      {pegawais.filter(u => teamMemberIds.includes(u.id)).map(u => {
                        const jabatan = userJabatanInProject[u.id];
                        const role = u.role;
                        let label = u.namaLengkap;
                        let emoji = '👤';

                        if (jabatan) {
                          const jabatanUpper = jabatan.toUpperCase();
                          if (jabatanUpper.includes('PM') && jabatanUpper.includes('PIC')) {
                            label += ' (PM & PIC)';
                            emoji = '👑';
                          } else if (jabatanUpper.includes('PM')) {
                            label += ' (PM)';
                            emoji = '👨‍💼';
                          } else if (jabatanUpper.includes('PIC')) {
                            label += ' (PIC)';
                            emoji = '🎯';
                          } else {
                            label += ` (${jabatan})`;
                            emoji = '👷';
                          }
                        } else {
                          if (role === 'SUPER_ADMIN') {
                            label += ' (Super Admin)';
                            emoji = '⚡';
                          } else if (role === 'PM') {
                            label += ' (PM)';
                            emoji = '👨‍💼';
                          } else if (role === 'ADMIN') {
                            label += ' (Admin)';
                            emoji = '🛡️';
                          } else if (role === 'PROGRAMMER') {
                            label += ' (Programmer)';
                            emoji = '💻';
                          }
                        }

                        return (
                          <option key={u.id} value={u.id}>
                            {emoji} {label}
                          </option>
                        );
                      })}
                    </select>
                    {formPegawaiId && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="text-green-500 text-lg">✅</span>
                      </div>
                    )}
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {formProjectId && teamMemberIds.length === 0 && (
                    <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="text-amber-600 text-lg">⚠️</span>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Belum ada tim pada proyek ini. Tambahkan anggota tim di menu Proyek Team.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Completion Time Preview - details panel in left column below Assignee */}
                {formScheduleAt && formPegawaiId && (
                  <CompletionTimePreview
                    pegawaiId={Number(formPegawaiId)}
                    scheduleAt={formScheduleAt}
                    customDurationHours={parseFloat(formCustomDuration) || undefined}
                    taskComplexity={formTaskComplexity}
                    variant="details"
                    onAdjustTime={(adjustedTime) => {
                      // Format adjusted time to ISO string for datetime-local input
                      const year = adjustedTime.getFullYear();
                      const month = String(adjustedTime.getMonth() + 1).padStart(2, '0');
                      const day = String(adjustedTime.getDate()).padStart(2, '0');
                      const hours = String(adjustedTime.getHours()).padStart(2, '0');
                      const minutes = String(adjustedTime.getMinutes()).padStart(2, '0');
                      const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
                      setFormScheduleAt(formatted);
                    }}
                  />
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Task Complexity */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    <span className="text-orange-500">⚡</span>
                    Kompleksitas Task
                    <span className="text-red-500">*</span>
                  </label>
                  {complexityOptions.length === 0 ? (
                    <div className="w-full rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-red-600 text-xl">⚠️</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">Task Complexity Belum Diset</p>
                          <p className="text-xs text-red-700 dark:text-red-300 mt-1">Silakan setting master Task Complexity terlebih dahulu di menu Master → Task Complexity</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={formTaskComplexity}
                        onChange={(e) => setFormTaskComplexity(e.target.value)}
                        className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 dark:text-gray-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900 transition-all duration-200 appearance-none"
                        required
                        disabled={loading}
                      >
                        <option value="">⚡ Pilih tingkat kompleksitas...</option>
                        {complexityOptions.map(opt => {
                          const emoji = opt.complexity === 'EASY' ? '🟢' : opt.complexity === 'MEDIUM' ? '🟡' : '🔴';
                          return (
                            <option key={opt.complexity} value={opt.complexity}>
                              {emoji} {opt.complexity} - {opt.hours} jam
                            </option>
                          );
                        })}
                      </select>
                      {formTaskComplexity && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <span className="text-green-500 text-lg">✅</span>
                        </div>
                      )}
                      <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Duration */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    <span className="text-indigo-500">⏱️</span>
                    Estimasi Durasi (jam)
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formCustomDuration}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setFormCustomDuration(val);
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || val < 0.5) {
                          setFormCustomDuration('0.5');
                        } else {
                          setFormCustomDuration(String(val));
                        }
                      }}
                      className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base pr-16 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all duration-200"
                      placeholder="Contoh: 3.5 untuk 3 jam 30 menit"
                      required
                      disabled={loading}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      jam
                    </div>
                  </div>
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      💡 <strong>Tips:</strong> Default dari kompleksitas, bisa disesuaikan. Contoh: 3.5 = 3 jam 30 menit
                    </p>
                  </div>
                </div>

                {/* Schedule Date Time */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    <span className="text-pink-500">📅</span>
                    Jadwal Mulai
                    <span className="text-red-500">*</span>
                  </label>
                  <DateTimeInput
                    value={formScheduleAt}
                    onChange={(v: string) => setFormScheduleAt(v)}
                    label=""
                    placeholder="Pilih tanggal dan waktu mulai task"
                    disabled={loading}
                    required
                  />
                </div>

                {/* Completion Time Preview - summary card below schedule */}
                {formScheduleAt && formPegawaiId && (
                  <CompletionTimePreview
                    pegawaiId={Number(formPegawaiId)}
                    scheduleAt={formScheduleAt}
                    customDurationHours={parseFloat(formCustomDuration) || undefined}
                    taskComplexity={formTaskComplexity}
                    variant="summary"
                    onAdjustTime={(adjustedTime) => {
                      // Format adjusted time to ISO string for datetime-local input
                      const year = adjustedTime.getFullYear();
                      const month = String(adjustedTime.getMonth() + 1).padStart(2, '0');
                      const day = String(adjustedTime.getDate()).padStart(2, '0');
                      const hours = String(adjustedTime.getHours()).padStart(2, '0');
                      const minutes = String(adjustedTime.getMinutes()).padStart(2, '0');
                      const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
                      setFormScheduleAt(formatted);
                    }}
                  />
                )}
              </div>
            </div>

            {/* Conflict Warning Banner - Compact */}
            {conflictInfo?.hasConflict && (
              <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-yellow-600 text-lg flex-shrink-0">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      Konflik Jadwal Terdeteksi!
                    </h4>
                    <div className="space-y-3">
                      <div className="text-xs text-yellow-700 dark:text-yellow-300">
                        <span className="font-medium">Programmer sudah memiliki {conflictInfo.conflictingTasks.length} task:</span>
                        <div className="mt-1 space-y-1">
                          {conflictInfo.conflictingTasks.map((task) => (
                            <div key={task.id} className="flex items-center justify-between bg-yellow-100 dark:bg-yellow-800/30 rounded px-2 py-1">
                              <span className="font-medium truncate">
                                {task.kode || `Task #${task.id}`}
                              </span>
                              <span className="text-xs ml-2 flex-shrink-0">
                                {new Date(task.scheduleAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ({task.duration}h)
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-red-700 dark:text-red-300 font-medium">
                          Total Overlap: {conflictInfo.overlapHours} jam
                        </div>
                      </div>
                      {conflictInfo.suggestedTime && (
                        <div className="flex items-center justify-between gap-3 bg-green-50 dark:bg-green-900/30 rounded p-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-green-700 dark:text-green-300 font-medium">Saran Waktu:</div>
                            <div className="text-xs text-green-800 dark:text-green-200 font-mono">
                              {new Date(conflictInfo.suggestedTime).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date(conflictInfo.suggestedTime!);
                              const year = d.getFullYear();
                              const month = String(d.getMonth() + 1).padStart(2, '0');
                              const day = String(d.getDate()).padStart(2, '0');
                              const hours = String(d.getHours()).padStart(2, '0');
                              const minutes = String(d.getMinutes()).padStart(2, '0');
                              const formatted = `${year}-${month}-${day} ${hours}:${minutes}`;
                              setFormScheduleAt(formatted);
                            }}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors flex-shrink-0"
                          >
                            ✓ Gunakan
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Fields - Full Width */}
            <div className="mt-8 space-y-6">
              {/* Keterangan */}
              <div className="group">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <span className="text-teal-500">📝</span>
                  Deskripsi Task
                  <span className="text-gray-400 text-xs">(opsional)</span>
                </label>
                <div className="relative">
                  <RichTextEditor
                    value={formKeterangan}
                    onChange={setFormKeterangan}
                    placeholder="Jelaskan detail task, requirement, atau catatan khusus..."
                    disabled={loading}
                  />
                </div>
                <div className="mt-2 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                  <p className="text-xs text-teal-700 dark:text-teal-300">
                    💡 <strong>Tips:</strong> Semakin detail deskripsi, semakin mudah programmer memahami requirement
                  </p>
                </div>
              </div>

              {/* Upload File */}
              <div className="group">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <span className="text-purple-500">📎</span>
                  Lampiran File
                  <span className="text-gray-400 text-xs">(opsional)</span>
                </label>

                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept={getAcceptString()}
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        const validFiles: File[] = [];

                        for (const file of newFiles) {
                          const validation = validateFile(file);
                          if (!validation.isValid) {
                            error(validation.error || `File ${file.name} tidak valid`);
                            continue;
                          }
                          validFiles.push(file);
                        }

                        if (validFiles.length > 0) {
                          setFormFiles(prev => [...prev, ...validFiles]);
                        }
                      }
                      e.target.value = '';
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={loading}
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <span className="text-4xl mb-3 text-gray-400">📎</span>
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Klik untuk upload</span> atau drag & drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Gambar, Dokumen, Spreadsheet, Video, Audio, dll<br />
                        (Limit berbeda per jenis file)
                      </p>
                    </div>
                  </label>
                </div>

                {formFiles.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        📎 {formFiles.length} file dipilih
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormFiles([])}
                        className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        🗑️ Hapus semua
                      </button>
                    </div>
                    <div className="space-y-3">
                      {formFiles.map((file, index) => {
                        const fileCategory = getFileTypeCategory(file);
                        const isImage = fileCategory === 'images';

                        // File type icons
                        const getFileIcon = (category: string, mimeType: string) => {
                          if (category === 'images') return '🖼️';
                          if (category === 'documents') {
                            if (mimeType.includes('pdf')) return '📄';
                            return '📝';
                          }
                          if (category === 'spreadsheets') return '📊';
                          if (category === 'presentations') return '📽️';
                          if (category === 'archives') return '🗜️';
                          if (category === 'videos') return '🎥';
                          if (category === 'audio') return '🎵';
                          if (category === 'textFiles') return '📄';
                          if (category === 'codeFiles') return '💻';
                          return '📎';
                        };

                        return (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex-shrink-0">
                              {isImage ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-500">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-2xl">
                                  {getFileIcon(fileCategory, file.type)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(file.size)} • {fileCategory}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormFiles(prev => prev.filter((_, i) => i !== index))}
                              className="flex-shrink-0 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    💡 <strong>Tips:</strong> Upload mockup, dokumen requirement, atau file pendukung lainnya
                  </p>
                  <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                    <strong>Limit file:</strong> Gambar (5MB), Dokumen (10MB), Spreadsheet (15MB), Video (50MB), dll
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 gap-4">
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left order-2 sm:order-1 hidden sm:block">
              <span className="font-medium">💡 Tips:</span> Pastikan semua field wajib sudah diisi dengan benar
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto order-1 sm:order-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm sm:text-base font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                ❌ Batal
              </button>
              <button
                type="submit"
                disabled={invalidModuleSelection || loading || !formProjectId || !formModuleId || !formPegawaiId || !formScheduleAt}
                className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 ${invalidModuleSelection || loading || !formProjectId || !formModuleId || !formPegawaiId || !formScheduleAt
                    ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform sm:hover:scale-105'
                  }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menyimpan...
                  </span>
                ) : (
                  '✅ Buat Task'
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}