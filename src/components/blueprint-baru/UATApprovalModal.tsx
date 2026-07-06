'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, CheckCircle, RotateCcw } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

type BAModuleRow = {
  id: string;
  moduleName: string;
  taskName: string;
  programmer: string;
  jadwalMulai: string;
  kompleksitas: 'EASY' | 'MEDIUM' | 'HARD';
  tasklistStatus: string | null;
  tasklistKode: string | null;
  uatApproved: boolean;
  uatApprovedAt: string | null;
  uatExternalApproved: boolean;
  uatExternalApprovedAt: string | null;
  taskId?: number;
  revisiKeterangan?: string | null;
};

type UATApprovalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  baId: number;
  baName: string;
  projectId: number;
  mode?: 'internal' | 'external';
  onSuccess: () => void;
};

export function UATApprovalModal({
  isOpen,
  onClose,
  baId,
  baName,
  projectId,
  mode = 'internal',
  onSuccess
}: UATApprovalModalProps) {
  const [baModuleRows, setBAModuleRows] = useState<BAModuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvingTaskIds, setApprovingTaskIds] = useState<Record<number, boolean>>({});
  const [showRevisi, setShowRevisi] = useState(false);
  const [revisiTaskId, setRevisiTaskId] = useState<number | null>(null);
  const [revisiAlasan, setRevisiAlasan] = useState('');
  const [revisiFile, setRevisiFile] = useState<File | null>(null);
  const [revisiSubmitting, setRevisiSubmitting] = useState(false);
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (isOpen && baId) {
      fetchUATData();
    }
  }, [isOpen, baId, mode]);

  const fetchUATData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blueprint-baru/${projectId}/uat?baId=${baId}`);
      const result = await response.json();

      if (result.success) {
        const moduleRows: BAModuleRow[] = [];
        
        // Process all modules flat — each module's tasks shown directly
        result.data.ba.baModules.forEach((baModule: any) => {
          const tasks = baModule.taskBAs || [];

          tasks.forEach((task: any) => {
            moduleRows.push({
              id: `task_${task.id}`,
              moduleName: baModule.nama,
              taskName: task.nama,
              programmer: task.programmer?.namaLengkap || 'Belum ditentukan',
              jadwalMulai: task.jadwalMulai ? new Date(task.jadwalMulai).toLocaleString('id-ID') : '-',
              kompleksitas: task.kompleksitas,
              tasklistStatus: task.tasklist?.status || null,
              tasklistKode: task.tasklist?.kode || null,
              uatApproved: task.uatApproved || false,
              uatApprovedAt: task.uatApprovedAt || null,
              uatExternalApproved: task.uatExternalApproved || false,
              uatExternalApprovedAt: task.uatExternalApprovedAt || null,
              taskId: task.id,
              revisiKeterangan: task.revisiKeterangan || null,
            });
          });
        });

        setBAModuleRows(moduleRows);
      }
    } catch (error) {
      console.error('Error fetching UAT data:', error);
      showError('Gagal memuat data UAT');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTask = async (taskId: number) => {
    try {
      setApprovingTaskIds(prev => ({ ...prev, [taskId]: true }));

      const endpoint = mode === 'external' ? 'uat-external' : 'uat';
      const response = await fetch(`/api/blueprint-baru/${projectId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, approved: true })
      });

      const result = await response.json();

      if (result.success) {
        console.log('[UAT Modal] Approval result:', result);
        
        if (result.baStatusUpdated) {
          success(`Task berhasil di-approve! Semua ${result.stats?.completedTasks || 0} task selesai sudah di-approve, BA otomatis diubah ke ${mode === 'external' ? 'UAT_EXTERNAL_SELESAI' : 'UAT_INTERNAL_SELESAI'}`);
          onSuccess();
          onClose();
        } else {
          const stats = result.stats || {};
          const approvedTasks = mode === 'external' ? stats.uatExternalApprovedTasks : stats.uatApprovedTasks;
          success(`Task berhasil di-approve untuk ${mode === 'external' ? 'UAT External' : 'UAT Internal'} (${approvedTasks || 0}/${stats.completedTasks || 0} completed tasks approved)`);
          fetchUATData(); // Refresh data
        }
      } else {
        showError(result.error || 'Gagal approve task');
      }
    } catch (error) {
      console.error('Error approving task:', error);
      showError('Error saat approve task');
    } finally {
      setApprovingTaskIds(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleRevisiTask = async (taskId: number) => {
    setRevisiTaskId(taskId);
    setRevisiAlasan('');
    setRevisiFile(null);
    setShowRevisi(true);
  };

  const handleSubmitRevisi = async () => {
    if (!revisiTaskId || !revisiAlasan.trim()) {
      showError('Alasan revisi wajib diisi');
      return;
    }

    try {
      setRevisiSubmitting(true);
      let fileUrl = '';

      if (revisiFile) {
        const fd = new FormData();
        fd.append('file', revisiFile);
        const uploadRes = await fetch(`/api/blueprint-baru/${projectId}/upload-gambar`, { method: 'POST', body: fd });
        const uploadResult = await uploadRes.json();
        if (uploadResult.success) {
          fileUrl = uploadResult.data.fileUrl;
        }
      }

      const endpoint = mode === 'external' ? 'uat-external' : 'uat';
      const response = await fetch(`/api/blueprint-baru/${projectId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: revisiTaskId, approved: false, keterangan: revisiAlasan.trim(), fileUrl: fileUrl || null })
      });

      const result = await response.json();

      if (result.success) {
        success('Task berhasil dikembalikan ke programmer untuk direvisi');
        setShowRevisi(false);
        fetchUATData();
      } else {
        showError(result.error || 'Gagal merevisi task');
      }
    } catch (error) {
      console.error('Error revising task:', error);
      showError('Error saat merevisi task');
    } finally {
      setRevisiSubmitting(false);
    }
  };

  const handleRejectUAT = async () => {
    try {
      const response = await fetch(`/api/blueprint-baru/${projectId}/uat`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baId, status: 'DEVELOPMENT' })
      });

      const result = await response.json();

      if (result.success) {
        success('Status BA dikembalikan ke Development, semua approval UAT di-reset');
        onSuccess();
        onClose();
      } else {
        showError(result.error || 'Gagal reject UAT');
      }
    } catch (error) {
      console.error('Error rejecting UAT:', error);
      showError('Error saat reject UAT');
    }
  };

  const getKompleksitasBadge = (kompleksitas: string) => {
    const colors = {
      'EASY': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'MEDIUM': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'HARD': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[kompleksitas as keyof typeof colors] || colors.MEDIUM;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded">Belum Dibuat</span>;
    }

    const statusColors: Record<string, string> = {
      'SELESAI': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'IN_PROGRESS': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'PENDING': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'BLOCKED': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  if (!isOpen) return null;

  const allTasks = baModuleRows.filter(row => row.taskName);
  const completedTasks = allTasks.filter(row => row.tasklistStatus === 'SELESAI');
  const uatApprovedTasks = completedTasks.filter(row => mode === 'external' ? row.uatExternalApproved : row.uatApproved);
  const modeLabel = mode === 'external' ? 'UAT External' : 'UAT Internal';
  const completeStatusLabel = mode === 'external' ? 'UAT_EXTERNAL_SELESAI' : 'UAT_INTERNAL_SELESAI';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-[98vw] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              UAT Approval - {baName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Approve task yang sudah selesai untuk {modeLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats */}
        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{allTasks.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Task</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedTasks.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Selesai</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{uatApprovedTasks.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{modeLabel} Approved</div>
            </div>
          </div>
        </div>

        {/* Content - Table View */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            </div>
          ) : baModuleRows.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Tidak ada task untuk di-approve
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[250px]">
                      Module
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Task Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[150px]">
                      Programmer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[100px]">
                      Kompleksitas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[120px]">
                      Task Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[120px]">
                      Tasklist Kode
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[150px]">
                      UAT Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {baModuleRows.map((row) => {
                    const isCompleted = row.tasklistStatus === 'SELESAI';
                    const isUatApproved = mode === 'external' ? row.uatExternalApproved : row.uatApproved;
                    const hasRevisi = !!row.revisiKeterangan;
                    const canApprove = isCompleted && !isUatApproved && !hasRevisi && row.taskId;
                    const isApproving = row.taskId ? approvingTaskIds[row.taskId] : false;

                    return (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {row.moduleName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {row.taskName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {row.programmer}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getKompleksitasBadge(row.kompleksitas)}`}>
                            {row.kompleksitas}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(row.tasklistStatus)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {row.tasklistKode || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {isUatApproved ? (
                            <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                              <CheckCircle size={14} />
                              {modeLabel} Approved
                            </span>
                          ) : canApprove ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleApproveTask(row.taskId!)}
                                disabled={isApproving}
                                className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isApproving ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <Check size={14} />
                                    Approve
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleRevisiTask(row.taskId!)}
                                disabled={isApproving}
                                className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <RotateCcw size={14} />
                                Revisi
                              </button>
                            </div>
                          ) : hasRevisi ? (
                            <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
                              <RotateCcw size={14} />
                              Direvisi
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded">
                              {row.tasklistStatus ? 'Belum Selesai' : 'Belum Dibuat'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {completedTasks.length > 0 && completedTasks.length === uatApprovedTasks.length ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                Semua task selesai sudah di-approve. Status BA akan otomatis berubah ke {completeStatusLabel}
              </span>
            ) : (
              <span>
                Approve semua task yang sudah selesai. Status BA akan otomatis berubah ke {completeStatusLabel}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRejectUAT}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <RotateCcw size={14} />
              Reject ke Development
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Revisi Dialog */}
      {showRevisi && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Alasan Revisi</h4>
              <button onClick={() => setShowRevisi(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan Revisi <span className="text-red-500">*</span></label>
                <textarea
                  value={revisiAlasan}
                  onChange={(e) => setRevisiAlasan(e.target.value)}
                  rows={3}
                  placeholder="Jelaskan alasan revisi..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lampiran (opsional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setRevisiFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowRevisi(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmitRevisi}
                  disabled={revisiSubmitting || !revisiAlasan.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {revisiSubmitting ? 'Memproses...' : 'Kirim Revisi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
