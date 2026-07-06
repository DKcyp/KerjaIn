'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/badge/Badge';

// Types
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ModuleNode {
  id: number;
  nama: string;
  kode: string | null;
  projectId: number;
  parentId: number | null;
  depth: number;
  isLeaf: boolean;
  order: number;
  tasklistCount: number;
  tasklists: TasklistItem[];
  approval: ApprovalData | null;
  children: ModuleNode[];
}

interface TasklistItem {
  id: number;
  kode: string;
  keterangan: string | null;
  status: string;
  moduleId: number;
  projectId: number;
}

interface ApprovalData {
  id: number;
  projectId: number;
  moduleId: number;
  status: ApprovalStatus;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectedBy: number | null;
  rejectedAt: string | null;
  notes: string | null;
  approver: { id: number; namaLengkap: string } | null;
  rejecter: { id: number; namaLengkap: string } | null;
  attachments: AttachmentData[];
}

interface AttachmentData {
  id: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

interface Proyek {
  id: number;
  kodeProyek: string;
  namaProyek: string;
}

interface FlatRow {
  id: number;
  nama: string;
  kode: string | null;
  depth: number;
  isLeaf: boolean;
  tasklistCount: number;
  tasklists: TasklistItem[];
  approval: ApprovalData | null;
  children: ModuleNode[];
}

export default function UATApprovalPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Proyek[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<ApprovalStatus | 'All'>('All');
  const [modulesTree, setModulesTree] = useState<ModuleNode[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleNode | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load projects
  useEffect(() => {
    fetchProjects();
  }, []);

  // Load modules when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchModules();
    } else {
      setModulesTree([]);
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/proyek?activeOnly=true');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchModules = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProjectId) params.append('projectId', selectedProjectId.toString());
      if (selectedStatus !== 'All') params.append('status', selectedStatus);

      const res = await fetch(`/api/uat-approval?${params}`);
      if (res.ok) {
        const data = await res.json();
        setModulesTree(data.modules || []);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const flattenTree = (nodes: ModuleNode[], depth = 0): FlatRow[] => {
    const rows: FlatRow[] = [];
    for (const n of nodes) {
      const kids = n.children || [];
      const isLeaf = kids.length === 0 || n.isLeaf;
      rows.push({
        id: n.id,
        nama: n.nama,
        kode: n.kode,
        depth,
        isLeaf,
        tasklistCount: n.tasklistCount,
        tasklists: n.tasklists,
        approval: n.approval,
        children: kids,
      });
      if (!isLeaf && expanded.has(n.id)) {
        rows.push(...flattenTree(kids, depth + 1));
      }
    }
    return rows;
  };

  const flatRows = useMemo(() => flattenTree(modulesTree, 0), [modulesTree, expanded]);

  const filteredRows = useMemo(() => {
    if (selectedStatus === 'All') return flatRows;
    return flatRows.filter((row) => {
      if (!row.approval) return selectedStatus === 'PENDING';
      return row.approval.status === selectedStatus;
    });
  }, [flatRows, selectedStatus]);

  const getStatusBadge = (status: ApprovalStatus | null) => {
    if (!status || status === 'PENDING') {
      return <Badge variant="light" color="warning" size="sm">Pending</Badge>;
    }
    if (status === 'APPROVED') {
      return <Badge variant="light" color="success" size="sm">Approved</Badge>;
    }
    return <Badge variant="light" color="error" size="sm">Rejected</Badge>;
  };

  const handleApproveClick = (module: ModuleNode, action: 'APPROVED' | 'REJECTED') => {
    setSelectedModule(module);
    setApprovalNotes('');
    setUploadFiles([]);
    setShowApprovalModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadFiles(Array.from(e.target.files));
    }
  };

  const handleSubmitApproval = async (action: 'APPROVED' | 'REJECTED') => {
    if (!selectedModule) return;

    setSubmitting(true);
    try {
      // Submit approval
      const res = await fetch('/api/uat-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedModule.projectId,
          moduleId: selectedModule.id,
          status: action,
          notes: approvalNotes,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit approval');

      const data = await res.json();
      const approvalId = data.approval.id;

      // Upload attachments if any
      if (uploadFiles.length > 0) {
        const formData = new FormData();
        uploadFiles.forEach((file) => {
          formData.append('files', file);
        });

        const uploadRes = await fetch(`/api/uat-approval/${approvalId}/attachments`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          console.error('Failed to upload attachments');
        }
      }

      // Refresh data
      await fetchModules();
      setShowApprovalModal(false);
      setSelectedModule(null);
      alert(`Modul berhasil ${action === 'APPROVED' ? 'disetujui' : 'ditolak'}!`);
    } catch (error) {
      console.error('Error submitting approval:', error);
      alert('Gagal menyimpan approval');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          UAT Approval (Per Modul)
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Proyek
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">-- Pilih Proyek --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.kodeProyek} - {p.namaProyek}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status Approval
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ApprovalStatus | 'All')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="All">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Module Tree */}
      {selectedProjectId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Daftar Modul/Sub-Modul
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Approval dilakukan per modul (jika tidak ada sub-modul) atau per sub-modul (jika ada sub-modul)
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-600 dark:text-gray-400">
              Loading...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-center text-gray-600 dark:text-gray-400">
              Tidak ada data modul
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRows.map((row) => {
                const hasChildren = row.children.length > 0 && !row.isLeaf;
                const isExpanded = expanded.has(row.id);
                const approvalStatus = row.approval?.status || 'PENDING';

                return (
                  <div
                    key={row.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    style={{ paddingLeft: `${row.depth * 2 + 1}rem` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {hasChildren && (
                          <button
                            onClick={() => toggleExpand(row.id)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                          >
                            <svg
                              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                        {!hasChildren && <div className="w-5" />}

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {row.nama}
                            </span>
                            {row.kode && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({row.kode})
                              </span>
                            )}
                            {getStatusBadge(approvalStatus)}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {row.tasklistCount} tasklist
                            {row.approval && row.approval.notes && (
                              <span className="ml-2">• Notes: {row.approval.notes}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons - Only show for leaf nodes or modules without children */}
                      {(row.isLeaf || !hasChildren) && (
                        <div className="flex items-center gap-2">
                          {approvalStatus === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApproveClick(row as any, 'APPROVED')}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApproveClick(row as any, 'REJECTED')}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {approvalStatus === 'APPROVED' && row.approval?.approver && (
                            <div className="text-sm text-green-600 dark:text-green-400">
                              ✓ Approved by {row.approval.approver.namaLengkap}
                            </div>
                          )}
                          {approvalStatus === 'REJECTED' && row.approval?.rejecter && (
                            <div className="text-sm text-red-600 dark:text-red-400">
                              ✗ Rejected by {row.approval.rejecter.namaLengkap}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Show tasklists if expanded */}
                    {isExpanded && row.tasklists.length > 0 && (
                      <div className="mt-3 ml-8 space-y-2">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Tasklist:
                        </div>
                        {row.tasklists.map((task) => (
                          <div
                            key={task.id}
                            className="text-sm text-gray-600 dark:text-gray-400 pl-4 border-l-2 border-gray-300 dark:border-gray-600"
                          >
                            <span className="font-medium">{task.kode}</span>
                            {task.keterangan && <span> - {task.keterangan}</span>}
                            <span className="ml-2 text-xs">({task.status})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedModule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Approval untuk: {selectedModule.nama}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Catatan
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Tambahkan catatan approval..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Attachments (Multiple)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                {uploadFiles.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {uploadFiles.length} file(s) selected
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleSubmitApproval('REJECTED')}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Reject'}
              </button>
              <button
                onClick={() => handleSubmitApproval('APPROVED')}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
