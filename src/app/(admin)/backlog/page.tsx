"use client";

import React, { useEffect, useMemo, useState } from "react";
import BacklogTableView from "@/components/backlog/BacklogTableView";
import BacklogCardView from "@/components/backlog/BacklogCardView";
import BacklogFilters from "@/components/backlog/BacklogFilters";
import BacklogPagination from "@/components/backlog/BacklogPagination";
import BacklogModal from "@/components/backlog/BacklogModal";
import BacklogDetailModal from "@/components/backlog/BacklogDetailModal";
import BacklogImportModal from "@/components/backlog/BacklogImportModal";
import { buildModuleLabelCache } from "@/lib/moduleUtils";
import { useToast } from "@/context/ToastContext";

type Proyek = { id: number; namaProyek: string };

type BacklogNote = {
  id: number;
  title: string;
  note: string;
  projectId: number | null;
  moduleId: number | null;
  assignedTo: number | null;
  tasklistId: number | null;
  estimatedManHour: number | null;
  isDeleted: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

// server paging config (simple)
const PAGE_SIZE = 20;
const NOTE_MAX = 1000;

export default function BacklogPage() {
  const toast = useToast();

  // master
  const [projects, setProjects] = useState<Proyek[]>([]);

  // data
  const [notes, setNotes] = useState<BacklogNote[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [filterProjectId, setFilterProjectId] = useState<number | "">("");
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('unassigned');

  // form state
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<BacklogNote | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formProjectId, setFormProjectId] = useState<number | "">("");
  const [formModuleId, setFormModuleId] = useState<number | "">("");
  const [formEstimatedManHour, setFormEstimatedManHour] = useState<number | "">("");
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [moduleOptions, setModuleOptions] = useState<Array<{ id: number; text: string }>>([]);
  const [moduleLabelCache, setModuleLabelCache] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ project?: string; module?: string; note?: string }>({});

  const isValid = useMemo(() => {
    // Validation: Title OR Note must be present. Project/Module optional.
    return Boolean(formTitle.trim()) || Boolean(formNote.trim());
  }, [formTitle, formNote]);

  // load projects (for optional association)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/proyek?activeOnly=true", { credentials: "include" });
        if (r.ok) {
          const d = await r.json();
          if (Array.isArray(d?.items)) setProjects(d.items);
        }
      } catch { }
    })();
  }, []);

  // Load modules label cache for all projects in notes
  useEffect(() => {
    const loadModulesForAllProjects = async () => {
      const uniqueProjectIds = [...new Set(notes.map(note => note.projectId).filter(Boolean))];

      for (const projectId of uniqueProjectIds) {
        // Skip if we already have cache for this project
        const hasModulesForProject = notes
          .filter(note => note.projectId === projectId && note.moduleId)
          .some(note => moduleLabelCache[note.moduleId!]);

        if (hasModulesForProject) continue;

        try {
          const res = await fetch(`/api/proyek-modules/${projectId}/tree`, {
            credentials: 'include',
            cache: 'no-store'
          });

          if (!res.ok) continue;

          const data = await res.json();
          const tree: Array<{ id: number; nama: string; children?: any[] }> = Array.isArray(data?.tree) ? data.tree : [];

          // Build module cache using utility function
          const moduleCache = buildModuleLabelCache(tree);

          // Update cache
          setModuleLabelCache(prev => ({
            ...prev,
            ...moduleCache
          }));
        } catch (error) {
          console.error(`Failed to load modules for project ${projectId}:`, error);
        }
      }
    };

    if (notes.length > 0) {
      loadModulesForAllProjects();
    }
  }, [notes]);

  // Load modules label cache for selected project (for form display and initialSelected)
  useEffect(() => {
    const loadModules = async (pid: number) => {
      try {
        const res = await fetch(`/api/proyek-modules/${pid}/tree`, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) { setModuleOptions([]); return; }
        const data = await res.json();
        const tree: Array<{ id: number; nama: string; children?: any[] }> = Array.isArray(data?.tree) ? data.tree : [];
        // Build module cache using utility function
        const moduleCache = buildModuleLabelCache(tree);

        // merge into cache
        setModuleLabelCache(prev => ({
          ...prev,
          ...moduleCache
        }));
      } catch {
        setModuleOptions([]);
      }
    };
    const pid = typeof formProjectId === 'number' ? formProjectId : 0;
    if (pid && pid > 0) {
      loadModules(pid);
    } else {
      setModuleOptions([]);
    }
  }, [formProjectId]);

  // load notes from API (default assigned=unassigned)
  const loadNotes = async (resetPage = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (filterProjectId) params.set('projectId', String(filterProjectId));
      params.set('assigned', assignmentFilter);
      params.set('page', String(resetPage ? 1 : page));
      params.set('size', String(pageSize));
      const res = await fetch(`/api/backlog?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setNotes(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total || 0));
        setPage(Number(data?.page || 1));
      } else {
        setNotes([]); setTotal(0);
      }
    } catch {
      setNotes([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filterProjectId, assignmentFilter, page, pageSize]);

  const filtered = useMemo(() => notes, [notes]);

  // view mode (table | card)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openDetail = (id: number) => {
    const n = notes.find(x => x.id === id);
    if (!n) return;
    setSelectedNote(n);
    setDetailOpen(true);
  };

  const openEdit = (id: number) => {
    const n = notes.find(x => x.id === id);
    if (!n) return;
    setEditId(id);
    setFormTitle(n.title);
    setFormNote(n.note);
    setFormProjectId(n.projectId ?? "");
    setFormModuleId(n.moduleId ?? "");
    setFormEstimatedManHour(n.estimatedManHour ?? "");
    setFormFiles([]); // Reset files for edit mode
    setErrors({});
    setDetailOpen(false); // Close detail modal if open
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditId(null);
    setFormTitle("");
    setFormNote("");
    setFormProjectId("");
    setFormModuleId("");
    setFormEstimatedManHour("");
    setFormFiles([]);
    setErrors({});
  };

  const saveForm = async () => {
    // Validate: Title OR Note required. Project/Module optional.
    const nextErrors: { project?: string; module?: string; note?: string } = {};
    if (!formTitle.trim() && !formNote.trim()) nextErrors.note = 'Judul atau Catatan wajib diisi';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    try {
      let res: Response;
      
      // Use FormData if there are files, otherwise use JSON
      if (formFiles.length > 0 && !editId) {
        // For create with files, use FormData
        const formData = new FormData();
        formData.append('title', formTitle);
        formData.append('note', formNote);
        if (formProjectId) formData.append('projectId', String(formProjectId));
        if (formModuleId) formData.append('moduleId', String(formModuleId));
        if (formEstimatedManHour) formData.append('estimatedManHour', String(formEstimatedManHour));
        
        // Append files
        formFiles.forEach(file => {
          formData.append('files', file);
        });

        res = await fetch('/api/backlog', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
      } else {
        // For edit or create without files, use JSON
        const body = { 
          title: formTitle, 
          note: formNote, 
          projectId: formProjectId || null, 
          moduleId: formModuleId || null,
          estimatedManHour: formEstimatedManHour ? parseFloat(String(formEstimatedManHour)) : null
        };

        if (editId) {
          res = await fetch(`/api/backlog/${editId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
          });
        } else {
          res = await fetch('/api/backlog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
          });
        }
      }
      
      if (!res.ok) {
        let msg = 'Gagal menyimpan';
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch { }
        throw new Error(msg);
      }
      // After save: close form, reset form, set filter to selected project so the new item is visible, and refresh
      setFormOpen(false);
      resetForm();
      if (formProjectId) setFilterProjectId(formProjectId);
      setPage(1);
      await loadNotes(true);
    } finally {
      setSaving(false);
    }
  };

  const removeNote = async (id: number) => {
    if (!confirm("Hapus catatan ini?")) return;

    try {
      const res = await fetch(`/api/backlog/${id}`, { method: 'DELETE', credentials: 'include' });

      if (!res.ok) {
        let msg = 'Gagal menghapus catatan';
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { }
        throw new Error(msg);
      }

      toast.success('Catatan backlog berhasil dihapus!', 4000);
      await loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus catatan. Silakan coba lagi.', 6000);
    }
  };

  const assignNote = async (id: number, userId: number | null, tasklistId?: number | null) => {
    try {
      const updateData: any = { assignedTo: userId };
      if (tasklistId !== undefined) {
        updateData.tasklistId = tasklistId;
      }

      const res = await fetch(`/api/backlog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (!res.ok) {
        let msg = 'Gagal mengassign catatan';
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { }
        throw new Error(msg);
      }

      // Update local state
      setNotes(prev => prev.map(note =>
        note.id === id ? { ...note, assignedTo: userId, tasklistId: tasklistId || note.tasklistId } : note
      ));

      // Update selected note if it's the same
      if (selectedNote?.id === id) {
        setSelectedNote(prev => prev ? {
          ...prev,
          assignedTo: userId,
          tasklistId: tasklistId || prev.tasklistId
        } : null);
      }

      // Refresh notes to get updated data
      await loadNotes();

      // Show success toast for assignment changes
      if (userId === null) {
        toast.success('Catatan berhasil di-unassign!', 4000);
      } else {
        // This will be handled by BacklogDetailModal for task creation
        // Only show toast here for simple assignment without task creation
        if (tasklistId === undefined) {
          toast.success('Catatan berhasil di-assign!', 4000);
        }
      }
    } catch (error) {
      console.error('Error assigning note:', error);
      throw error; // Re-throw to be handled by the modal
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Filters and Header */}
        <BacklogFilters
          projects={projects}
          filterProjectId={filterProjectId}
          setFilterProjectId={(value) => { setFilterProjectId(value); setPage(1); }}
          q={q}
          setQ={(value) => { setQ(value); setPage(1); }}
          assignmentFilter={assignmentFilter}
          setAssignmentFilter={(value) => { setAssignmentFilter(value); setPage(1); }}
          viewMode={viewMode}
          setViewMode={setViewMode}
          pageSize={pageSize}
          setPageSize={(size) => { setPageSize(size); setPage(1); }}
          total={total}
          onReset={() => { setFilterProjectId(''); setQ(''); setAssignmentFilter('unassigned'); setPage(1); }}
          onAddNew={openCreate}
          onImport={() => setImportOpen(true)}
        />

        {/* Modal */}
        <BacklogModal
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          editId={editId}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formNote={formNote}
          setFormNote={setFormNote}
          formProjectId={formProjectId}
          setFormProjectId={(value) => { setFormProjectId(value); setFormModuleId(""); }}
          formModuleId={formModuleId}
          setFormModuleId={setFormModuleId}
          formEstimatedManHour={formEstimatedManHour}
          setFormEstimatedManHour={setFormEstimatedManHour}
          formFiles={formFiles}
          setFormFiles={setFormFiles}
          projects={projects}
          moduleLabelCache={moduleLabelCache}
          errors={errors}
          saving={saving}
          isValid={isValid}
          onSave={saveForm}
        />

        {/* Import Modal */}
        <BacklogImportModal
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          onImportSuccess={() => loadNotes(true)}
          projects={projects}
        />

        {/* Content */}
        {viewMode === 'table' ? (
          <BacklogTableView
            notes={filtered}
            projects={projects}
            moduleLabelCache={moduleLabelCache}
            loading={loading}
            page={page}
            pageSize={pageSize}
            onView={openDetail}
            onEdit={openEdit}
            onDelete={removeNote}
          />
        ) : (
          <BacklogCardView
            notes={filtered}
            projects={projects}
            moduleLabelCache={moduleLabelCache}
            loading={loading}
            onView={openDetail}
            onEdit={openEdit}
            onDelete={removeNote}
          />
        )}

        {/* Detail Modal */}
        <BacklogDetailModal
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
          note={selectedNote}
          projects={projects}
          moduleLabelCache={moduleLabelCache}
          onEdit={openEdit}
          onDelete={removeNote}
          onAssign={assignNote}
        />

        {/* Pagination */}
        <BacklogPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          loading={loading}
        />
      </div>
    </div>
  );
}
