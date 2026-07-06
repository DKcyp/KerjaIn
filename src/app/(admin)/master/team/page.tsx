"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/context/ToastContext";

interface Project {
  id: number;
  kodeProyek: string;
  namaProyek: string;
}

interface MergedProject {
  id: string; // unique identifier for merged project
  namaCustom: string; // custom name for merged projects
  originalProjects: Project[]; // original projects that are merged
  isMerged: boolean;
}

interface TeamProject {
  id: string;
  namaDisplay: string;
  originalProjects: Project[];
  isMerged: boolean;
}

interface Pegawai {
  id: number;
  nama: string;
  nip?: string;
  jabatan?: string;
}

interface Team {
  id: number;
  noUrut: number;
  namaTeam: string;
  deskripsi: string;
  projects: TeamProject[];
  pegawai?: Pegawai[];
}

type SortKey = "noUrut" | "namaTeam";

export default function TeamMasterPage() {
  const { success, error } = useToast();
  const [items, setItems] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);

  // datatable state
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("namaTeam");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // modal state for add/edit
  const { isOpen, openModal, closeModal } = useModal(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formNamaTeam, setFormNamaTeam] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formSelectedProjects, setFormSelectedProjects] = useState<number[]>([]);
  const [formTeamProjects, setFormTeamProjects] = useState<TeamProject[]>([]);
  const [formSelectedPegawai, setFormSelectedPegawai] = useState<number[]>([]);
  const [availablePegawai, setAvailablePegawai] = useState<Pegawai[]>([]);
  const [loadingPegawai, setLoadingPegawai] = useState(false);

  // merge project modal state
  const { isOpen: isMergeModalOpen, openModal: openMergeModal, closeModal: closeMergeModal } = useModal(false);
  const [mergeSelectedProjects, setMergeSelectedProjects] = useState<number[]>([]);
  const [mergeCustomName, setMergeCustomName] = useState("");

  // delete confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Team | null>(null);

  // Load from API
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch('/api/master-team', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.items)) {
            setItems(data.items);
          }
        } else {
          console.error('Failed to load teams');
        }
      } catch (e) {
        console.error('Error loading teams:', e);
      }
    };

    const loadAvailableProjects = async () => {
      try {
        const res = await fetch('/api/master-team/available-projects', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.items)) {
            setAvailableProjects(data.items);
          }
        } else {
          console.error('Failed to load available projects');
        }
      } catch (e) {
        console.error('Error loading available projects:', e);
      }
    };

    loadTeams();
    loadAvailableProjects();
  }, []);

  // derived rows
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.namaTeam.toLowerCase().includes(q) ||
        i.deskripsi.toLowerCase().includes(q) ||
        i.projects.some(p => 
          p.namaDisplay.toLowerCase().includes(q) || 
          p.originalProjects.some(op => 
            op.kodeProyek.toLowerCase().includes(q) || 
            op.namaProyek.toLowerCase().includes(q)
          )
        )
    );
  }, [items, query]);

  const sorted = useMemo((): Team[] => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let va: string | number;
      let vb: string | number;
      if (sortKey === 'noUrut') {
        return 0; // keep current order
      } else {
        va = (a as any)[sortKey];
        vb = (b as any)[sortKey];
      }
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const fetchPegawaiByProjects = async (teamProjects: TeamProject[]) => {
    if (teamProjects.length === 0) {
      setAvailablePegawai([]);
      return;
    }
    setLoadingPegawai(true);
    try {
      // Collect all project IDs from selected team projects
      const projectIds: number[] = [];
      teamProjects.forEach(tp => {
        tp.originalProjects.forEach(op => {
          if (!projectIds.includes(op.id)) projectIds.push(op.id);
        });
      });
      const res = await fetch(`/api/master-team/pegawai-by-projects?projectIds=${projectIds.join(',')}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.items)) {
          setAvailablePegawai(data.items);
        }
      }
    } catch (e) {
      console.error('Error fetching pegawai:', e);
    } finally {
      setLoadingPegawai(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormNamaTeam("");
    setFormDeskripsi("");
    setFormSelectedProjects([]);
    setFormTeamProjects([]);
    setFormSelectedPegawai([]);
    setAvailablePegawai([]);
    openModal();
  };

  const openEdit = (team: Team) => {
    setEditingId(team.id);
    setFormNamaTeam(team.namaTeam);
    setFormDeskripsi(team.deskripsi);
    setFormTeamProjects([...team.projects]);
    // Extract individual project IDs for the checkbox selection
    const allProjectIds: number[] = [];
    team.projects.forEach(tp => {
      tp.originalProjects.forEach(op => {
        allProjectIds.push(op.id);
      });
    });
    setFormSelectedProjects(allProjectIds);
    // Load pegawai for existing team's projects
    setFormSelectedPegawai((team.pegawai || []).map(p => p.id));
    fetchPegawaiByProjects([...team.projects]);
    openModal();
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaTeam.trim()) return;

    setLoading(true);

    try {
      const payload = {
        namaTeam: formNamaTeam.trim(),
        deskripsi: formDeskripsi.trim(),
        projects: formTeamProjects,
        pegawaiIds: formSelectedPegawai,
      };

      if (editingId == null) {
        // Create new team
        const res = await fetch('/api/master-team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.item) {
            // Reload teams to get updated data
            const teamsRes = await fetch('/api/master-team', { cache: 'no-store' });
            if (teamsRes.ok) {
              const teamsData = await teamsRes.json();
              if (Array.isArray(teamsData?.items)) {
                setItems(teamsData.items);
              }
            }
            success('Berhasil menambah tim');
          }
        } else {
          const errorData = await res.json();
          error(errorData.error || 'Gagal menambah tim');
        }
      } else {
        // Update existing team
        const res = await fetch(`/api/master-team/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.item) {
            // Reload teams to get updated data
            const teamsRes = await fetch('/api/master-team', { cache: 'no-store' });
            if (teamsRes.ok) {
              const teamsData = await teamsRes.json();
              if (Array.isArray(teamsData?.items)) {
                setItems(teamsData.items);
              }
            }
            success('Berhasil mengubah tim');
          }
        } else {
          const errorData = await res.json();
          error(errorData.error || 'Gagal mengubah tim');
        }
      }

      closeModal();
    } catch (e) {
      console.error('Error submitting form:', e);
      error('Terjadi kesalahan saat menyimpan');
    } finally {
      setLoading(false);
    }
  };

  const askDelete = (team: Team) => {
    setToDelete(team);
    setConfirmOpen(true);
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setToDelete(null);
  };

  const confirmDelete = async () => {
    if (toDelete) {
      setLoading(true);
      try {
        const res = await fetch(`/api/master-team/${toDelete.id}`, { 
          method: 'DELETE' 
        });

        if (res.ok) {
          // Reload teams to get updated data
          const teamsRes = await fetch('/api/master-team', { cache: 'no-store' });
          if (teamsRes.ok) {
            const teamsData = await teamsRes.json();
            if (Array.isArray(teamsData?.items)) {
              setItems(teamsData.items);
            }
          }
          success('Berhasil menghapus tim');
        } else {
          const errorData = await res.json();
          error(errorData.error || 'Gagal menghapus tim');
        }
      } catch (e) {
        console.error('Error deleting team:', e);
        error('Terjadi kesalahan saat menghapus');
      } finally {
        setLoading(false);
      }
    }
    setConfirmOpen(false);
    setToDelete(null);
  };

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleProjectSelection = (projectId: number) => {
    setFormSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const addSingleProject = (projectId: number) => {
    const project = availableProjects.find(p => p.id === projectId);
    if (!project) return;

    const teamProject: TeamProject = {
      id: `single_${projectId}`,
      namaDisplay: project.namaProyek,
      originalProjects: [project],
      isMerged: false
    };

    const updated = [...formTeamProjects, teamProject];
    setFormTeamProjects(updated);
    // Refresh pegawai list when project added
    fetchPegawaiByProjects(updated);
  };

  const removeSingleProject = (projectId: number) => {
    const updated = formTeamProjects.filter(tp => 
      !(tp.originalProjects.length === 1 && tp.originalProjects[0].id === projectId)
    );
    setFormTeamProjects(updated);
    // Refresh pegawai list when project removed
    fetchPegawaiByProjects(updated);
  };

  const openMergeProjectModal = () => {
    setMergeSelectedProjects([]);
    setMergeCustomName("");
    openMergeModal();
  };

  const submitMergeProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (mergeSelectedProjects.length < 2 || !mergeCustomName.trim()) return;

    const selectedProjects = availableProjects.filter(p => 
      mergeSelectedProjects.includes(p.id)
    );

    const mergedProject: TeamProject = {
      id: `merged_${Date.now()}`,
      namaDisplay: mergeCustomName.trim(),
      originalProjects: selectedProjects,
      isMerged: true
    };

    setFormTeamProjects(prev => [...prev, mergedProject]);
    closeMergeModal();
  };

  const removeTeamProject = (teamProjectId: string) => {
    const updated = formTeamProjects.filter(tp => tp.id !== teamProjectId);
    setFormTeamProjects(updated);
    fetchPegawaiByProjects(updated);
  };

  const togglePegawai = (pegawaiId: number) => {
    setFormSelectedPegawai(prev =>
      prev.includes(pegawaiId)
        ? prev.filter(id => id !== pegawaiId)
        : [...prev, pegawaiId]
    );
  };

  const selectAllPegawai = () => {
    setFormSelectedPegawai(availablePegawai.map(p => p.id));
  };

  const clearAllPegawai = () => {
    setFormSelectedPegawai([]);
  };

  const isProjectUsed = (projectId: number) => {
    return formTeamProjects.some(tp => 
      tp.originalProjects.some(op => op.id === projectId)
    );
  };

  const getAvailableProjectsForMerge = () => {
    return availableProjects.filter(p => !isProjectUsed(p.id));
  };

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Master Team</h2>
        <button
          onClick={openAdd}
          className="px-3 py-1 rounded-md bg-brand-600 hover:bg-brand-700 text-white"
        >
          Tambah Tim
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Cari nama tim, deskripsi, atau project..."
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-gray-900 dark:text-gray-100"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[960px]">
            <Table className="text-sm">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-3 py-2 font-medium text-gray-500 text-start text-xs dark:text-gray-400 cursor-pointer select-none"
                    onClick={() => toggleSort("noUrut")}
                  >
                    No Urut {sortKey === "noUrut" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-2 font-medium text-gray-500 text-start text-xs dark:text-gray-400 cursor-pointer select-none"
                    onClick={() => toggleSort("namaTeam")}
                  >
                    Nama Tim {sortKey === "namaTeam" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-2 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                  >
                    Deskripsi
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-2 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                  >
                    Project
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-2 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                  >
                    Pegawai
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-2 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                  >
                    Aksi
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell className="px-3 py-3 text-center text-gray-500 dark:text-gray-400" colSpan={6}>
                      Belum ada data tim.
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((team, idx) => (
                    <TableRow key={team.id}>
                      <TableCell className="px-3 py-2 text-start text-gray-800 dark:text-gray-200">
                        {(page - 1) * pageSize + idx + 1}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-start text-gray-800 dark:text-gray-200">
                        {team.namaTeam}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-start text-gray-800 dark:text-gray-200">
                        {team.deskripsi}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-start text-gray-800 dark:text-gray-200">
                        <div className="flex flex-wrap gap-1">
                          {team.projects.map(project => (
                            <div key={project.id} className="flex items-center gap-1">
                              <span
                                className={`inline-block px-2 py-1 text-xs rounded-md ${
                                  project.isMerged 
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                }`}
                              >
                                {project.namaDisplay}
                              </span>
                              {project.isMerged && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ({project.originalProjects.map(p => p.namaProyek).join(', ')})
                                </span>
                              )}
                            </div>
                          ))}
                          {team.projects.length === 0 && (
                            <span className="text-gray-400 text-xs">Belum ada project</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Kolom Pegawai */}
                      <TableCell className="px-3 py-2">
                        {(!team.pegawai || team.pegawai.length === 0) ? (
                          <span className="text-gray-400 text-xs">Belum ada anggota</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="flex -space-x-2">
                              {team.pegawai.slice(0, 4).map((p) => (
                                <span
                                  key={p.id}
                                  title={p.nama}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-[10px] font-semibold ring-2 ring-white dark:ring-gray-900 cursor-default"
                                >
                                  {p.nama.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                                </span>
                              ))}
                              {team.pegawai.length > 4 && (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-semibold ring-2 ring-white dark:ring-gray-900">
                                  +{team.pegawai.length - 4}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {team.pegawai.length} orang
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(team)}
                            className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => askDelete(team)}
                            className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white"
                          >
                            Hapus
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-end gap-4 px-4 py-3 border-t border-gray-100 dark:border-white/[0.05]">
          <div className="flex items-center gap-2 text-sm">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200"
            >
              Prev
            </button>
            <span className="text-gray-700 dark:text-gray-300">
              Page {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="w-[92vw] max-w-2xl"
        disableOutsideClose
        disableEscClose
      >
        <form onSubmit={submitForm} className="relative flex flex-col max-h-[85vh]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/70 dark:bg-gray-900/70">
              <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-lg dark:bg-gray-800">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
                <span className="text-sm text-gray-700 dark:text-gray-200">Menyimpan...</span>
              </div>
            </div>
          )}
          {/* Fixed Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingId == null ? "Tambah Tim" : "Edit Tim"}
            </h3>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Nama Tim</label>
              <input
                type="text"
                value={formNamaTeam}
                onChange={(e) => setFormNamaTeam(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Masukkan nama tim"
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Deskripsi</label>
              <textarea
                value={formDeskripsi}
                onChange={(e) => setFormDeskripsi(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Masukkan deskripsi tim"
                rows={3}
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">Project yang Dibawahin</label>
              
              {/* Current Team Projects */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Project Terpilih:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={openMergeProjectModal}
                      className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-md"
                      disabled={loading}
                    >
                      Merge Project
                    </button>
                  </div>
                </div>
                
                <div className="border border-gray-300 dark:border-gray-700 rounded-md p-3 min-h-[100px] bg-gray-50 dark:bg-gray-900">
                  {formTeamProjects.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Belum ada project dipilih</p>
                  ) : (
                    <div className="space-y-2">
                      {formTeamProjects.map(tp => (
                        <div key={tp.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs rounded ${
                                tp.isMerged 
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                                {tp.namaDisplay}
                              </span>
                              {tp.isMerged && (
                                <span className="text-xs text-gray-500">
                                  (Merged: {tp.originalProjects.map(p => p.namaProyek).join(', ')})
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTeamProject(tp.id)}
                            className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                            disabled={loading}
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Available Projects */}
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Project Tersedia:</span>
                <div className="border border-gray-300 dark:border-gray-700 rounded-md p-3 max-h-48 overflow-y-auto bg-white dark:bg-gray-800">
                  {availableProjects.length === 0 ? (
                    <p className="text-gray-500 text-sm">Belum ada project tersedia</p>
                  ) : (
                    <div className="space-y-2">
                      {availableProjects.map(project => {
                        const isUsed = isProjectUsed(project.id);
                        return (
                          <div key={project.id} className={`flex items-center justify-between p-2 rounded ${
                            isUsed ? 'bg-gray-100 dark:bg-gray-700 opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-medium">{project.kodeProyek}</span> - {project.namaProyek}
                            </span>
                            {!isUsed && (
                              <button
                                type="button"
                                onClick={() => addSingleProject(project.id)}
                                className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded"
                                disabled={loading}
                              >
                                Tambah
                              </button>
                            )}
                            {isUsed && (
                              <span className="text-xs text-gray-500">Sudah dipilih</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Pilih project individual atau gunakan "Merge Project" untuk menggabungkan beberapa project dengan nama custom
              </p>
            </div>

            {/* Pegawai Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pegawai Tim
                  {formTeamProjects.length > 0 && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                      (dari project terpilih)
                    </span>
                  )}
                </label>
                {availablePegawai.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllPegawai}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 underline"
                      disabled={loading}
                    >
                      Pilih Semua
                    </button>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <button
                      type="button"
                      onClick={clearAllPegawai}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 underline"
                      disabled={loading}
                    >
                      Hapus Semua
                    </button>
                  </div>
                )}
              </div>

              <div className="border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden">
                {formTeamProjects.length === 0 ? (
                  <div className="p-4 text-center bg-gray-50 dark:bg-gray-900">
                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Pilih project terlebih dahulu untuk melihat daftar pegawai
                    </p>
                  </div>
                ) : loadingPegawai ? (
                  <div className="p-4 text-center bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                      <p className="text-xs text-gray-500">Memuat pegawai...</p>
                    </div>
                  </div>
                ) : availablePegawai.length === 0 ? (
                  <div className="p-4 text-center bg-gray-50 dark:bg-gray-900">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Tidak ada pegawai ditemukan untuk project yang dipilih
                    </p>
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto bg-white dark:bg-gray-800">
                    {/* Header count */}
                    <div className="sticky top-0 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {availablePegawai.length} pegawai tersedia
                      </span>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {formSelectedPegawai.length} dipilih
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {availablePegawai.map(pegawai => (
                        <label
                          key={pegawai.id}
                          className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                            formSelectedPegawai.includes(pegawai.id)
                              ? 'bg-blue-50 dark:bg-blue-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formSelectedPegawai.includes(pegawai.id)}
                            onChange={() => togglePegawai(pegawai.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                            disabled={loading}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {/* Avatar inisial */}
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs font-semibold flex-shrink-0">
                                {pegawai.nama.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                  {pegawai.nama}
                                </p>
                                {(pegawai.nip || pegawai.jabatan) && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {pegawai.nip && <span>{pegawai.nip}</span>}
                                    {pegawai.nip && pegawai.jabatan && <span> · </span>}
                                    {pegawai.jabatan && <span>{pegawai.jabatan}</span>}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          {formSelectedPegawai.includes(pegawai.id) && (
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {formSelectedPegawai.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  {formSelectedPegawai.length} pegawai akan ditambahkan ke tim ini
                </p>
              )}
            </div>
          </div>
          </div>{/* end scrollable body */}

          {/* Fixed Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 flex-shrink-0 bg-white dark:bg-gray-900 rounded-b-2xl">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* Merge Project Modal */}
      <Modal
        isOpen={isMergeModalOpen}
        onClose={closeMergeModal}
        className="w-[92vw] max-w-lg"
        disableOutsideClose
        disableEscClose
      >
        <form onSubmit={submitMergeProject} className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Merge Project
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                Pilih Project untuk Digabung (minimal 2):
              </label>
              <div className="border border-gray-300 dark:border-gray-700 rounded-md p-3 max-h-48 overflow-y-auto bg-white dark:bg-gray-800">
                {getAvailableProjectsForMerge().length === 0 ? (
                  <p className="text-gray-500 text-sm">Tidak ada project tersedia untuk digabung</p>
                ) : (
                  <div className="space-y-2">
                    {getAvailableProjectsForMerge().map(project => (
                      <label key={project.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mergeSelectedProjects.includes(project.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMergeSelectedProjects(prev => [...prev, project.id]);
                            } else {
                              setMergeSelectedProjects(prev => prev.filter(id => id !== project.id));
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">{project.kodeProyek}</span> - {project.namaProyek}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                Nama Custom untuk Project Gabungan:
              </label>
              <input
                type="text"
                value={mergeCustomName}
                onChange={(e) => setMergeCustomName(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Contoh: Mobile Development Suite"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Nama ini akan ditampilkan sebagai satu project gabungan
              </p>
            </div>
            
            {mergeSelectedProjects.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-1">Preview:</p>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {mergeCustomName || "Nama Custom"} 
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Menggabungkan: {getAvailableProjectsForMerge()
                    .filter(p => mergeSelectedProjects.includes(p.id))
                    .map(p => p.namaProyek)
                    .join(', ')}
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeMergeModal}
              className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              disabled={mergeSelectedProjects.length < 2 || !mergeCustomName.trim()}
            >
              Gabungkan Project
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal isOpen={confirmOpen} onClose={cancelDelete} className="w-[92vw] max-w-sm" showCloseButton={false} disableOutsideClose disableEscClose>
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M12 16.5H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M10.29 3.85999L1.81995 18C1.47795 18.592 1.46795 19.32 1.79495 19.921C2.12195 20.523 2.73595 20.9 3.40795 20.9H20.592C21.264 20.9 21.878 20.523 22.205 19.921C22.532 19.319 22.522 18.592 22.18 18L13.71 3.85999C13.366 3.26499 12.706 2.89999 12 2.89999C11.294 2.89999 10.634 3.26499 10.29 3.85999Z" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Hapus Tim?</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Anda akan menghapus tim
                {toDelete ? ` "${toDelete.namaTeam}"` : ""}. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={cancelDelete} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700" disabled={loading}>
              Batal
            </button>
            <button onClick={confirmDelete} className={`px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white ${loading ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={loading}>
              {loading ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}