'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface TaskDispositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  onSuccess: () => void;
}

export default function TaskDispositionModal({
  isOpen,
  onClose,
  task,
  onSuccess,
}: TaskDispositionModalProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [programmers, setProgrammers] = useState<any[]>([]);
  const [selectedProgrammer, setSelectedProgrammer] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingProgrammers, setFetchingProgrammers] = useState(false);
  const [currentAssigneeName, setCurrentAssigneeName] = useState<string>('');

  // Fetch current assignee and programmers when modal opens
  useEffect(() => {
    if (isOpen && task) {
      fetchCurrentAssignee();
      fetchProgrammers();
    } else if (!isOpen) {
      // Reset state when modal closes
      setSelectedProgrammer(null);
      setReason('');
      setCurrentAssigneeName('');
    }
  }, [isOpen, task]);

  const fetchCurrentAssignee = async () => {
    if (!task?.pegawaiId) {
      setCurrentAssigneeName('Unknown');
      return;
    }

    try {
      const response = await fetch(`/api/pegawai?id=${task.pegawaiId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentAssigneeName(data.namaLengkap || 'Unknown');
      } else {
        setCurrentAssigneeName(task.pegawaiNama || 'Unknown');
      }
    } catch (error) {
      console.error('Error fetching current assignee:', error);
      setCurrentAssigneeName(task.pegawaiNama || 'Unknown');
    }
  };

  const fetchProgrammers = async () => {
    try {
      setFetchingProgrammers(true);
      
      // First, get project info to check type
      const projectRes = await fetch(`/api/proyek/${task.projectId}`);
      const projectData = await projectRes.json();
      const projectType = projectData?.item?.type || projectData?.type;
      
      console.log(`🔍 Disposition: Project ${task.projectId} type: ${projectType}`);
      
      // Check if project has region team
      const teamRes = await fetch(`/api/proyek-team/${task.projectId}`);
      const teamData = await teamRes.json();
      const hasRegionTeam = teamData?.items?.some((m: any) => m.teamSource === 'region');
      
      console.log(`🔍 Disposition: hasRegionTeam: ${hasRegionTeam}`);
      
      // Use available-users API only for SUPPORT or DEV with region (same logic as TaskEditModal)
      const useAvailableUsersAPI = projectType === 'SUPPORT' || (projectType === 'DEVELOPMENT' && hasRegionTeam);
      
      console.log(`🔍 Disposition: useAvailableUsersAPI: ${useAvailableUsersAPI}`);
      
      let programmerList: any[] = [];
      
      if (useAvailableUsersAPI) {
        // Use available-users API that respects team hierarchy
        const response = await fetch(
          `/api/tasklist/available-users?projectId=${task.projectId}&requesterId=${user?.id}`
        );
        const data = await response.json();

        if (data.users) {
          console.log(`🔍 Disposition: Available users from API:`, data.users);
          
          // Filter only programmers (not PM) from available users
          programmerList = data.users
            .filter((member: any) => {
              const isProgrammer = member.jabatan && 
                member.jabatan.includes('Programmer') && 
                !member.jabatan.includes('PM');
              console.log(`🔍 User ${member.namaLengkap} (${member.jabatan}): isProgrammer=${isProgrammer}`);
              return isProgrammer;
            })
            .map((member: any) => ({
              id: member.id,
              name: member.namaLengkap,
              jabatan: member.jabatan,
            }));
          
          console.log(`✅ Disposition (hierarchy): PM can dispose to ${programmerList.length} programmers`, programmerList);
        }
      } else {
        // For regular projects, get all team programmers
        if (teamData?.items) {
          programmerList = teamData.items
            .filter((member: any) => 
              member.jabatan === 'Programmer' && 
              member.pegawai
            )
            .map((member: any) => ({
              id: member.pegawai.id,
              name: member.pegawai.namaLengkap,
              jabatan: member.jabatan,
            }));
          
          console.log(`✅ Disposition (regular): PM can dispose to ${programmerList.length} programmers`);
        }
      }
      
      setProgrammers(programmerList);
    } catch (error) {
      console.error('Error fetching programmers:', error);
      showError('Gagal memuat daftar programmer');
    } finally {
      setFetchingProgrammers(false);
    }
  };

  const handleDisposition = async () => {
    if (!selectedProgrammer) {
      showError('Pilih programmer tujuan disposisi');
      return;
    }

    if (!reason.trim()) {
      showError('Alasan disposisi wajib diisi');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/tasklist/${task.id}/disposition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAssigneeId: selectedProgrammer,
          reason: reason.trim(),
          disposedBy: user?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        success('Task berhasil didisposisi');
        onSuccess();
        onClose();
      } else {
        showError(data.error || 'Gagal disposisi task');
      }
    } catch (error) {
      console.error('Error disposing task:', error);
      showError('Terjadi kesalahan saat disposisi task');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedProgrammer(null);
    setReason('');
    setCurrentAssigneeName('');
    onClose();
  };

  const availableProgrammers = programmers.filter((p) => p.id !== task?.pegawaiId);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      className="max-w-md p-0 z-[100000]" 
      showCloseButton={false}
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Disposisi Task
          </h3>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Close button clicked');
              onClose();
            }}
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Task Info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              {task?.kode}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {task?.keterangan || 'Tidak ada deskripsi'}
            </p>
          </div>

          {/* Current Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assignee Saat Ini
            </label>
            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100">
              {currentAssigneeName || 'Loading...'}
            </div>
          </div>

          {/* New Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Disposisi Ke <span className="text-red-500">*</span>
            </label>
            {fetchingProgrammers ? (
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500">
                Memuat programmer...
              </div>
            ) : (
              <select
                value={selectedProgrammer || ''}
                onChange={(e) => setSelectedProgrammer(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              >
                <option value="">Pilih Programmer</option>
                {availableProgrammers.map((programmer) => (
                  <option key={programmer.id} value={programmer.id}>
                    {programmer.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Alasan Disposisi <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Programmer sebelumnya sedang cuti, task perlu segera diselesaikan"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-colors"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Alasan akan dicatat dalam log aktivitas task
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Batal button clicked');
              onClose();
            }}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDisposition}
            disabled={loading || !selectedProgrammer || !reason.trim()}
            className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : 'Disposisi Sekarang'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
