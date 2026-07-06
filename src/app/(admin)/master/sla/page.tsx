"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/context/ToastContext";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { usePermission } from "@/hooks/usePermissions";

type SLAConfig = {
  id: number;
  slaType: 'EASY' | 'MEDIUM' | 'HARD';
  assigneeStartTask: number;
  assigneeWorkDuration: number;
  pmReviewDuration: number;
  createdAt: string;
  updatedAt: string;
};

type SortKey = "slaType" | "assigneeStartTask" | "assigneeWorkDuration" | "pmReviewDuration";

export default function SLAMasterPage() {
  const { success, error } = useToast();
  const [items, setItems] = useState<SLAConfig[]>([]);
  const [loading, setLoading] = useState(false);
  
  // RBAC permissions
  const canCreateSLA = usePermission('system.create');
  const canUpdateSLA = usePermission('system.update');
  const canDeleteSLA = usePermission('system.delete');

  // datatable state
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("slaType");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // modal state for add/edit
  const { isOpen, openModal, closeModal } = useModal(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formSlaType, setFormSlaType] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [formAssigneeStartTask, setFormAssigneeStartTask] = useState<number>(0);
  const [formAssigneeWorkDuration, setFormAssigneeWorkDuration] = useState<number>(0);
  const [formPmReviewDuration, setFormPmReviewDuration] = useState<number>(0);

  // delete confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<SLAConfig | null>(null);

  // Load from API
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/master-sla', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setItems(data);
        }
      } catch (e) {
        error('Failed to load SLA configurations');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [error]);

  const resetForm = () => {
    setFormSlaType('EASY');
    setFormAssigneeStartTask(0);
    setFormAssigneeWorkDuration(0);
    setFormPmReviewDuration(0);
    setEditingId(null);
  };

  const handleAdd = () => {
    resetForm();
    openModal();
  };

  const handleEdit = (item: SLAConfig) => {
    setEditingId(item.id);
    setFormSlaType(item.slaType);
    setFormAssigneeStartTask(item.assigneeStartTask);
    setFormAssigneeWorkDuration(item.assigneeWorkDuration);
    setFormPmReviewDuration(item.pmReviewDuration);
    openModal();
  };

  const handleSave = async () => {
    try {
      const payload = {
        slaType: formSlaType,
        assigneeStartTask: formAssigneeStartTask,
        assigneeWorkDuration: formAssigneeWorkDuration,
        pmReviewDuration: formPmReviewDuration,
      };

      const url = editingId ? `/api/master-sla/${editingId}` : '/api/master-sla';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        success(editingId ? 'SLA configuration updated successfully' : 'SLA configuration created successfully');
        closeModal();
        // Reload data
        const loadRes = await fetch('/api/master-sla', { cache: 'no-store' });
        if (loadRes.ok) {
          const data = await loadRes.json();
          if (Array.isArray(data)) setItems(data);
        }
      } else {
        const errorData = await res.json();
        error(errorData.error || 'Failed to save SLA configuration');
      }
    } catch (e) {
      error('Failed to save SLA configuration');
    }
  };

  const handleDeleteClick = (item: SLAConfig) => {
    setToDelete(item);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    try {
      const res = await fetch(`/api/master-sla/${toDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        success('SLA configuration deleted successfully');
        setConfirmOpen(false);
        setToDelete(null);
        // Reload data
        const loadRes = await fetch('/api/master-sla', { cache: 'no-store' });
        if (loadRes.ok) {
          const data = await loadRes.json();
          if (Array.isArray(data)) setItems(data);
        }
      } else {
        error('Failed to delete SLA configuration');
      }
    } catch (e) {
      error('Failed to delete SLA configuration');
    }
  };

  const getSLATypeColor = (type: string) => {
    switch (type) {
      case 'EASY':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'HARD':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // derived rows
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.slaType.toLowerCase().includes(q) ||
        String(i.assigneeStartTask).includes(q) ||
        String(i.assigneeWorkDuration).includes(q) ||
        String(i.pmReviewDuration).includes(q)
    );
  }, [items, query]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "slaType") cmp = a.slaType.localeCompare(b.slaType);
      if (sortKey === "assigneeStartTask") cmp = a.assigneeStartTask - b.assigneeStartTask;
      if (sortKey === "assigneeWorkDuration") cmp = a.assigneeWorkDuration - b.assigneeWorkDuration;
      if (sortKey === "pmReviewDuration") cmp = a.pmReviewDuration - b.pmReviewDuration;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [filtered, sortKey, sortDir]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const totalPages = Math.ceil(sorted.length / pageSize);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Master SLA Configuration
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage Service Level Agreement durations for different task complexities
            </p>
          </div>
          <PermissionGate permission="system.create">
            <button
              onClick={handleAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Add SLA Configuration
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="mb-4 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search SLA configurations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Showing {paged.length} of {sorted.length} entries
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-700">
              <TableCell 
                isHeader 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort("slaType")}
              >
                SLA Type {sortKey === "slaType" && (sortDir === "asc" ? "↑" : "↓")}
              </TableCell>
              <TableCell 
                isHeader 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort("assigneeStartTask")}
              >
                Start Task {sortKey === "assigneeStartTask" && (sortDir === "asc" ? "↑" : "↓")}
              </TableCell>
              <TableCell 
                isHeader 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort("assigneeWorkDuration")}
              >
                Work Duration {sortKey === "assigneeWorkDuration" && (sortDir === "asc" ? "↑" : "↓")}
              </TableCell>
              <TableCell 
                isHeader 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort("pmReviewDuration")}
              >
                PM Review {sortKey === "pmReviewDuration" && (sortDir === "asc" ? "↑" : "↓")}
              </TableCell>
              <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  Loading...
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  {query ? "No SLA configurations found matching your search." : "No SLA configurations found. Create your first one to get started."}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSLATypeColor(item.slaType)}`}>
                      {item.slaType}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatDuration(item.assigneeStartTask)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatDuration(item.assigneeWorkDuration)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatDuration(item.pmReviewDuration)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <PermissionGate permission="system.update">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                      </PermissionGate>
                      <PermissionGate permission="system.delete">
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </PermissionGate>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {editingId ? 'Edit SLA Configuration' : 'Add SLA Configuration'}
        </h2>
        
        <div className="space-y-4">
          {/* SLA Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SLA Type
            </label>
            <select
              value={formSlaType}
              onChange={(e) => setFormSlaType(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={!!editingId}
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
            {editingId && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                SLA type cannot be changed. Delete and recreate to change type.
              </p>
            )}
          </div>

          {/* Assignee Start Task */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assignee Start Task (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={formAssigneeStartTask}
              onChange={(e) => setFormAssigneeStartTask(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Assignee Work Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assignee Work Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={formAssigneeWorkDuration}
              onChange={(e) => setFormAssigneeWorkDuration(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* PM Review Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              PM Review Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={formPmReviewDuration}
              onChange={(e) => setFormPmReviewDuration(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} className="max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Confirm Delete
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete the SLA configuration for <strong>{toDelete?.slaType}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setConfirmOpen(false)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
