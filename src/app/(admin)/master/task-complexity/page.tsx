"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/context/ToastContext";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { usePermission } from "@/hooks/usePermissions";
import { useAuth } from "@/context/AuthContext";

type TaskComplexityConfig = {
  id: number;
  complexity: 'EASY' | 'MEDIUM' | 'HARD';
  hours: number;
  points: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type SortKey = "complexity" | "hours" | "points";

export default function TaskComplexityMasterPage() {
  const { success, error } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<TaskComplexityConfig[]>([]);
  const [loading, setLoading] = useState(false);

  // RBAC permissions
  const canCreateComplexity = usePermission('system.create');
  const canUpdateComplexity = usePermission('system.update');
  const canDeleteComplexity = usePermission('system.delete');
  const canReadSystem = usePermission('system.read');

  // datatable state
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("complexity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // modal state for add/edit
  const { isOpen, openModal, closeModal } = useModal(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formComplexity, setFormComplexity] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [formHours, setFormHours] = useState<number>(0);
  const [formPoints, setFormPoints] = useState<number>(0);
  const [formDescription, setFormDescription] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // delete confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TaskComplexityConfig | null>(null);

  // Load data
  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/task-complexity');
      if (!response.ok) throw new Error('Failed to fetch task complexity configurations');
      const data = await response.json();
      setItems(Array.isArray(data) ? data : (data.items || []));
    } catch (err) {
      console.error('Error fetching task complexity configurations:', err);
      error('Failed to load task complexity configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Filtered and sorted data
  const filteredItems = useMemo(() => {
    let filtered = items.filter(item =>
      item.complexity.toLowerCase().includes(query.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
    );

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];

      if (sortKey === "complexity") {
        const order = { EASY: 1, MEDIUM: 2, HARD: 3 };
        aVal = order[aVal as keyof typeof order];
        bVal = order[bVal as keyof typeof order];
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [items, query, sortKey, sortDir]);

  // Paginated data
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const totalPages = Math.ceil(filteredItems.length / pageSize);

  // Handle sort
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Handle add/edit
  const handleAddNew = () => {
    setEditingId(null);
    setFormComplexity('EASY');
    setFormHours(0);
    setFormPoints(0);
    setFormDescription('');
    setFormIsActive(true);
    openModal();
  };

  const handleEdit = (item: TaskComplexityConfig) => {
    setEditingId(item.id);
    setFormComplexity(item.complexity);
    setFormHours(item.hours);
    setFormPoints(item.points);
    setFormDescription(item.description || '');
    setFormIsActive(item.isActive);
    openModal();
  };

  const handleSave = async () => {
    try {
      const payload = {
        complexity: formComplexity,
        hours: formHours,
        points: formPoints,
        description: formDescription,
        isActive: formIsActive
      };

      let response;
      if (editingId) {
        response = await fetch(`/api/task-complexity/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch('/api/task-complexity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save task complexity');
      }

      success(editingId ? 'Task complexity updated successfully' : 'Task complexity created successfully');
      closeModal();
      fetchItems();
    } catch (err: any) {
      console.error('Error saving task complexity:', err);
      error(err.message || 'Failed to save task complexity');
    }
  };

  // Handle delete
  const handleDeleteClick = (item: TaskComplexityConfig) => {
    setToDelete(item);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!toDelete) return;

    try {
      const response = await fetch(`/api/task-complexity/${toDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete task complexity');
      }

      success('Task complexity deleted successfully');
      setConfirmOpen(false);
      setToDelete(null);
      fetchItems();
    } catch (err: any) {
      console.error('Error deleting task complexity:', err);
      error(err.message || 'Failed to delete task complexity');
    }
  };

  // Format hours display
  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} menit`;
    } else if (hours === 1) {
      return '1 jam';
    } else if (hours < 8) {
      return `${hours} jam`;
    } else {
      const days = Math.floor(hours / 8);
      const remainingHours = hours % 8;
      if (remainingHours === 0) {
        return `${days} hari`;
      } else {
        return `${days} hari ${remainingHours} jam`;
      }
    }
  };

  // Get complexity color
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'EASY': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'HARD': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  };

  return (
    // <PermissionGate anyPermissions={['system.read']}>
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Task Complexity Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage task complexity levels with hours and points for project estimation
            </p>
          </div>
          <PermissionGate anyPermissions={['system.create']}>
            <button
              onClick={handleAddNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Add Complexity Level
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="mb-4 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search complexity levels..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Showing {paginatedItems.length} of {filteredItems.length} entries
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
                onClick={() => handleSort("complexity")}
              >
                Complexity Level {sortKey === "complexity" && (sortDir === "asc" ? "↑" : "↓")}
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort("hours")}
              >
                Hours {sortKey === "hours" && (sortDir === "asc" ? "↑" : "↓")}
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort("points")}
              >
                Points {sortKey === "points" && (sortDir === "asc" ? "↑" : "↓")}
              </TableCell>
              <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</TableCell>
              <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</TableCell>
              <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  Loading...
                </TableCell>
              </TableRow>
            ) : paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  {query ? 'No complexity levels found matching your search.' : 'No complexity levels configured yet.'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getComplexityColor(item.complexity)}`}>
                      {item.complexity}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-mono">
                    {formatHours(item.hours)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-mono">
                    {item.points} pts
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {item.description || '-'}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <PermissionGate anyPermissions={['system.update']}>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                      </PermissionGate>
                      <PermissionGate anyPermissions={['system.delete']}>
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-2"
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
        <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{((page - 1) * pageSize) + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * pageSize, filteredItems.length)}</span> of{' '}
                  <span className="font-medium">{filteredItems.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} onClose={closeModal}>
        <div className="bg-white dark:bg-gray-800 px-6 py-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {editingId ? 'Edit Task Complexity' : 'Add Task Complexity'}
            </h3>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Complexity Level
              </label>
              <select
                value={formComplexity}
                onChange={(e) => setFormComplexity(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formHours}
                  onChange={(e) => setFormHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 2.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Points
                </label>
                <input
                  type="number"
                  min="0"
                  value={formPoints}
                  onChange={(e) => setFormPoints(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Description of this complexity level..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Active
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="bg-white dark:bg-gray-800 px-6 py-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Confirm Delete
            </h3>
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete the <span className="font-medium">{toDelete?.complexity}</span> complexity level?
              This action cannot be undone.
            </p>
          </div>

          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setConfirmOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
    // </PermissionGate>
  );
}
