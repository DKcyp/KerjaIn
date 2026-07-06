"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchOnce } from "@/lib/fetchOnce";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { usePermission } from "@/hooks/usePermissions";
import { useToast } from "@/context/ToastContext";
import CrmDepartmentProjectDropdown from "@/components/proyek/CrmDepartmentProjectDropdown";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface TeamMember {
  id: number; // unique within project
  pegawaiId: number;
  jabatan: string;
  pegawai?: {
    id: number;
    namaLengkap: string;
    role: string;
    username: string | null;
  };
}

interface ModulNode {
  id: number; // unique within project
  parentId: number | null; // null means root
  nama: string;
  kode: string | null; // used for backend order persistence
  version?: string | null; // version of the module
  baVersion?: string | null; // BA version when approved
  children?: ModulNode[];
  expanded?: boolean;
}

// Local flat representation of modul nodes (replaces NodeModel from react-dnd-treeview)
interface FlatNode {
  id: number | string;
  parent: number | string;
  text?: string;
  droppable?: boolean;
  data?: any;
}

interface Proyek {
  id: number;
  noUrut: number;
  kodeProyek: string;
  namaProyek: string;
  crmId?: string;
  idDep?: string;
  depNama?: string;
  projectNamaCrm?: string;
  type: 'BLUEPRINT' | 'DEVELOPMENT' | 'SUPPORT' | 'CLOSED';
  isActive?: boolean;
  idDeployment?: string;
  team?: TeamMember[];
  modules?: ModulNode[];
}

type SortKey = "noUrut" | "kodeProyek" | "namaProyek";

type SortDir = "asc" | "desc";

// Data now stored in DB via API

export default function MasterProyekPage() {
  const { success, error } = useToast();
  const [items, setItems] = useState<Proyek[]>([]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("noUrut");

  // RBAC permissions
  const canCreateProject = usePermission('project.create');
  const canUpdateProject = usePermission('project.update');
  const canDeleteProject = usePermission('project.delete');
  const canAssignTeam = usePermission('project.assign_team');
  const canReadUsers = usePermission('user.read');
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // modal state for add/edit
  const { isOpen, openModal, closeModal } = useModal(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formKodeProyek, setFormKodeProyek] = useState("");
  const [formNamaProyek, setFormNamaProyek] = useState("");
  const [formCrmId, setFormCrmId] = useState("");
  const [formIdDep, setFormIdDep] = useState("");
  const [formDepNama, setFormDepNama] = useState("");
  const [formProjectNamaCrm, setFormProjectNamaCrm] = useState("");
  const [formType, setFormType] = useState<'BLUEPRINT' | 'DEVELOPMENT' | 'SUPPORT' | 'CLOSED'>('DEVELOPMENT');
  const [formRepository, setFormRepository] = useState<string>("");
  const [formIdDeployment, setFormIdDeployment] = useState<string>("");
  const [repositories, setRepositories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // delete confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Proyek | null>(null);
  const [deleting, setDeleting] = useState(false);

  // toggle status confirm modal state
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [toToggle, setToToggle] = useState<Proyek | null>(null);
  const [toggling, setToggling] = useState(false);

  // inline team management state
  const [teamProject, setTeamProject] = useState<Proyek | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  // team modal form state
  const { isOpen: isTeamFormOpen, openModal: openTeamForm, closeModal: closeTeamForm } = useModal(false);
  const [teamEditingId, setTeamEditingId] = useState<number | null>(null);
  const [teamFormPegawaiId, setTeamFormPegawaiId] = useState<number | "">("");
  const [teamFormJabatan, setTeamFormJabatan] = useState("");
  const [teamSaving, setTeamSaving] = useState(false);
  // team datatable state
  const [teamQuery, setTeamQuery] = useState("");
  const [teamSortKey, setTeamSortKey] = useState<"pegawai" | "jabatan">("pegawai");
  const [teamSortDir, setTeamSortDir] = useState<SortDir>("asc");
  const [teamPage, setTeamPage] = useState(1);
  const [teamPageSize, setTeamPageSize] = useState(10);
  const [pegawaiOptions, setPegawaiOptions] = useState<Array<{ id: number; namaLengkap: string }>>([]);
  const [allPegawaiOptions, setAllPegawaiOptions] = useState<Array<{ id: number; namaLengkap: string }>>([]);

  // modul inline management state (mirrors Team)
  const [modulProject, setModulProject] = useState<Proyek | null>(null);
  const [latestProjectVersion, setLatestProjectVersion] = useState<string>('');
  const [modules, setModules] = useState<ModulNode[]>([]);
  const [modulesFlat, setModulesFlat] = useState<FlatNode[]>([]);
  // expanded state for collapsible tree (by id)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  // add submodule action removed; always add at root
  const [modulQuery, setModulQuery] = useState("");
  // helper: collect an id and all of its descendants (by parent linkage) from a flat list
  const collectDescendantsFlat = (items: FlatNode[], rootId: number | string): Set<number | string> => {
    const result: Set<number | string> = new Set([rootId]);
    const mapChildren = new Map<any, any[]>();
    items.forEach((n) => {
      const arr = mapChildren.get(n.parent) || [];
      arr.push(n);
      mapChildren.set(n.parent, arr);
    });
    const stack: (number | string)[] = [rootId];
    while (stack.length) {
      const cur = stack.pop()!;
      const children = mapChildren.get(cur) || [];
      for (const c of children) {
        if (!result.has(c.id)) {
          result.add(c.id);
          stack.push(c.id);
        }
      }
    }
    return result;
  };
  const displayedModulesFlat = useMemo(() => {
    const q = modulQuery.trim().toLowerCase();
    const base = modulesFlat; // preserve original order from flattening/API
    if (q) {
      // search mode: show matches + ancestors (ignores expanded state)
      const byId = new Map<any, FlatNode>(base.map((n) => [n.id, n]));
      const matches = new Set<any>();
      base.forEach((n) => {
        if ((String((n as any).data?.kode || "") + " " + String(n.text || "")).toLowerCase().includes(q)) {
          // include this node and all ancestors, preserving order via base.filter
          let curParent = n.parent;
          matches.add(n.id);
          while (curParent !== 0 && byId.has(curParent)) {
            matches.add(curParent);
            const parentNode = byId.get(curParent)!;
            curParent = parentNode.parent as any;
          }
        }
      });
      return base.filter((n) => matches.has(n.id));
    }
    // normal mode: show nodes only if all ancestors are expanded
    const parentMap = new Map<any, any>();
    base.forEach((n) => parentMap.set(n.id, n.parent));
    const isVisible = (node: FlatNode) => {
      let cur = node.parent;
      while (cur !== 0) {
        const idNum = Number(cur);
        if (!expandedIds.has(idNum)) return false;
        cur = parentMap.get(cur);
      }
      return true; // roots always visible
    };
    return base.filter(isVisible);
  }, [modulesFlat, modulQuery, expandedIds]);
  // Debug: trace roots order shown by UI after filtering/search
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const roots = displayedModulesFlat.filter((n) => n.parent === 0);
    // logs removed
  }, [displayedModulesFlat]);
  const { isOpen: isModulFormOpen, openModal: openModulForm, closeModal: closeModulForm } = useModal(false);
  const [modulEditingId, setModulEditingId] = useState<number | null>(null);
  const [modulFormNama, setModulFormNama] = useState("");
  const [modulSortDir, setModulSortDir] = useState<SortDir>("asc"); // sort by nama only
  // removed pagination for tree modal; show all to preserve natural order
  // scroll container ref for content area
  const modulScrollRef = useRef<HTMLDivElement | null>(null);
  // dnd state for table rows
  const [dragRowId, setDragRowId] = useState<number | string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<number | string | null>(null);
  // delete confirm modal state for modules
  const [modulConfirmOpen, setModulConfirmOpen] = useState(false);
  const [modulToDeleteId, setModulToDeleteId] = useState<number | null>(null);
  const [modulToDeleteName, setModulToDeleteName] = useState<string>("");
  // Build nested modules from flat list and persist to project
  const persistModulesFromFlat = async (flat: FlatNode[]): Promise<boolean> => {
    const key = (v: any) => String(v);
    const buildChildrenMap = new Map<string, FlatNode[]>()
    flat.forEach((n) => {
      const k = key(n.parent);
      const arr = buildChildrenMap.get(k) || [];
      arr.push(n);
      buildChildrenMap.set(k, arr);
    });
    const buildNested = (parentId: number | string): ModulNode[] => {
      const list = (buildChildrenMap.get(key(parentId)) || []);
      // sanitize: dedupe by lowercased trimmed name per parent, preserving first occurrence
      const seen = new Set<string>();
      const result: ModulNode[] = [];
      for (const n of list) {
        const name = String(n.text || "").trim();
        if (!name) continue;
        const lc = name.toLowerCase();
        if (seen.has(lc)) continue;
        seen.add(lc);
        const parentId: number | null = String(n.parent) === '0' ? null : Number(n.parent);
        result.push({ id: Number(n.id), nama: name, kode: (n.data as any)?.kode ?? null, parentId, children: buildNested(n.id) });
      }
      return result;
    };

    // Assign sequential kode by current order: roots 01,02,... and children parent.kode + . + 01,02,...
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const assignKodes = (nodes: ModulNode[], parentKode: string | null) => {
      nodes.forEach((node, idx) => {
        const myKode = parentKode ? `${parentKode}.${pad2(idx + 1)}` : pad2(idx + 1);
        node.kode = myKode;
        if (node.children && node.children.length) assignKodes(node.children, myKode);
      });
    };

    // Flatten nested to FlatNode preserving the current order
    const flattenNoSort = (nodes: ModulNode[], parent: number | string, depth: number, out: FlatNode[]) => {
      nodes.forEach((n) => {
        out.push({ id: n.id, parent, text: n.nama, droppable: true, data: { depth, kode: n.kode ?? null } });
        if (n.children && n.children.length) flattenNoSort(n.children, n.id, depth + 1, out);
      });
      return out;
    };

    const nested = buildNested(0);
    assignKodes(nested, null);
    // update both nested and flat state so UI shows updated kodes immediately
    setModules(nested);
    const newFlat: FlatNode[] = flattenNoSort(nested, 0, 0, [] as FlatNode[]);
    setModulesFlat(newFlat);
    const success = await persistModules(nested);
    if (!success) {
      console.warn('Failed to persist modules, but UI state was updated');
    }
    return success;
  };


  // Load from API
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchOnce('/api/proyek', { ttlMs: 3000 });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.items)) setItems(data.items);
        }
      } catch (e) {
        // silent
      }
    };
    load();
  }, []);

  // No implicit reordering; array order is source of truth

  // No localStorage persistence; server is source of truth

  // Load pegawai options from API
  useEffect(() => {
    const loadPegawai = async () => {
      if (canReadUsers) {
        // If user has permission, load full pegawai list
        try {
          const res = await fetchOnce('/api/pegawai', { ttlMs: 3000 });
          if (res.ok) {
            const data = await res.json();
            const rows = Array.isArray(data?.items) ? data.items : [];
            const options = rows.map((p: any) => ({ id: p.id, namaLengkap: p.namaLengkap }));
            setPegawaiOptions(options);
            setAllPegawaiOptions(options);
          }
        } catch (e) {
          console.warn('Failed to load pegawai options:', e);
        }
      } else {
        // If user doesn't have permission, try to load basic pegawai info for team management
        try {
          const res = await fetchOnce('/api/pegawai-basic', { ttlMs: 3000 });
          if (res.ok) {
            const data = await res.json();
            const rows = Array.isArray(data?.items) ? data.items : [];
            const options = rows.map((p: any) => ({ id: p.id, namaLengkap: p.namaLengkap }));
            setPegawaiOptions(options);
            setAllPegawaiOptions(options);
          }
        } catch (e) {
          console.warn('Failed to load basic pegawai options:', e);
          // Fallback: we'll build the list from team data as we load teams
        }
      }
    };
    loadPegawai();
  }, [canReadUsers]);

  // Load GitHub repositories for mapping
  useEffect(() => {
    const loadRepositories = async () => {
      try {
        const res = await fetch('/api/github/repositories');
        if (res.ok) {
          const data = await res.json();
          setRepositories(data.repositories || []);
        }
      } catch (e) {
        console.warn('Failed to load repositories:', e);
      }
    };
    loadRepositories();
  }, []);

  // next id and next noUrut are assigned by DB

  // derived rows
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        String(i.noUrut).includes(q) ||
        (i.crmId || '').toLowerCase().includes(q) ||
        (i.idDep || '').toLowerCase().includes(q) ||
        i.kodeProyek.toLowerCase().includes(q) ||
        i.namaProyek.toLowerCase().includes(q)
    );
  }, [items, query]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "noUrut") {
        // Keep current order when sorting by the sequential index column
        return 0;
      }
      if (sortKey === "kodeProyek") cmp = a.kodeProyek.localeCompare(b.kodeProyek);
      if (sortKey === "namaProyek") cmp = a.namaProyek.localeCompare(b.namaProyek);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const openAdd = () => {
    setEditingId(null);
    setFormKodeProyek("");
    setFormNamaProyek("");
    setFormCrmId("");
    setFormIdDep("");
    setFormDepNama("");
    setFormProjectNamaCrm("");
    setFormType('DEVELOPMENT');
    setFormRepository("");
    setFormIdDeployment("");
    openModal();
  };

  const openEdit = async (p: Proyek) => {
    setEditingId(p.id);
    setFormKodeProyek(p.kodeProyek);
    setFormNamaProyek(p.namaProyek);
    setFormCrmId(p.crmId || "");
    setFormIdDep(p.idDep || "");
    setFormDepNama(p.depNama || "");
    setFormProjectNamaCrm(p.projectNamaCrm || "");
    setFormType(p.type);
    setFormIdDeployment(p.idDeployment || "");

    // Fetch current repository mapping
    try {
      const res = await fetch(`/api/github/repository-mapping?projectId=${p.id}`);
      if (res.ok) {
        const data = await res.json();
        setFormRepository(data.repositoryName || "");
      } else {
        setFormRepository("");
      }
    } catch (e) {
      setFormRepository("");
    }

    openModal();
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKodeProyek || !formNamaProyek) return;
    setSaving(true);

    let projectId = editingId;
    let projectSuccess = false;

    if (editingId == null) {
      // Create via API
      try {
        const res = await fetch('/api/proyek', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kodeProyek: formKodeProyek.trim(), namaProyek: formNamaProyek.trim(), crmId: formCrmId.trim(), idDep: formIdDep.trim(), depNama: formDepNama.trim(), projectNamaCrm: formProjectNamaCrm.trim(), type: formType, idDeployment: formIdDeployment.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.item) {
            setItems((prev) => [...prev, data.item as Proyek]);
            projectId = data.item.id;
            projectSuccess = true;
          }
        } else {
          // Parse error response to show detailed message
          try {
            const errorData = await res.json();
            const errorMessage = errorData.details || errorData.error || 'Gagal membuat proyek';
            error(errorMessage);
          } catch {
            error('Gagal membuat proyek');
          }
        }
      } catch (e) {
        error('Gagal membuat proyek');
      }
    } else {
      // Update via API
      try {
        const res = await fetch(`/api/proyek/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kodeProyek: formKodeProyek.trim(), namaProyek: formNamaProyek.trim(), crmId: formCrmId.trim(), idDep: formIdDep.trim(), depNama: formDepNama.trim(), projectNamaCrm: formProjectNamaCrm.trim(), type: formType, idDeployment: formIdDeployment.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          const updated: Proyek | undefined = data?.item;
          if (updated) {
            setItems((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
            projectSuccess = true;
          }
        } else {
          error('Gagal mengupdate proyek');
        }
      } catch (e) {
        error('Gagal mengupdate proyek');
      }
    }

    // Save or delete repository mapping
    if (projectId) {
      try {
        if (formRepository) {
          // Save/update mapping
          console.log('[Form] Saving repository mapping:', { projectId, formRepository });
          const selectedRepo = repositories.find(r => r.name === formRepository);
          console.log('[Form] Selected repo:', selectedRepo);

          if (selectedRepo) {
            const mapRes = await fetch('/api/github/repository-mapping', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId,
                repositoryName: selectedRepo.name,
                repositoryFullName: selectedRepo.full_name,
              }),
            });

            if (mapRes.ok) {
              console.log('[Form] Repository mapping saved successfully');
            } else {
              const errorData = await mapRes.json().catch(() => ({ error: 'Unknown error' }));
              console.error('[Form] Failed to save mapping:', mapRes.status, errorData);
              error(`Gagal menyimpan mapping repository: ${errorData.error || 'Unknown error'}`);
              setSaving(false);
              return; // Don't close modal on error
            }
          } else {
            console.warn('[Form] Selected repository not found in list');
            error('Repository tidak ditemukan');
            setSaving(false);
            return;
          }
        } else if (editingId) {
          // Delete mapping if repository is cleared during edit
          console.log('[Form] Deleting repository mapping for project:', projectId);
          const deleteRes = await fetch(`/api/github/repository-mapping?projectId=${projectId}`, {
            method: 'DELETE',
          });

          if (deleteRes.ok) {
            console.log('[Form] Repository mapping deleted successfully');
          } else {
            console.warn('[Form] Failed to delete mapping, but continuing');
          }
        }

        // Show success message
        if (projectSuccess) {
          success(editingId ? 'Proyek berhasil diupdate' : 'Proyek berhasil dibuat');
        }
      } catch (e) {
        console.error('Failed to save/delete repository mapping:', e);
        error('Gagal menyimpan mapping repository. Periksa koneksi internet.');
        setSaving(false);
        return; // Don't close modal on error
      }
    } else if (projectSuccess) {
      success(editingId ? 'Proyek berhasil diupdate' : 'Proyek berhasil dibuat');
    }

    closeModal();
    setSaving(false);
  };

  const askDelete = (p: Proyek) => {
    setToDelete(p);
    setConfirmOpen(true);
  };

  const askToggle = (p: Proyek) => {
    setToToggle(p);
    setToggleConfirmOpen(true);
  };

  const cancelToggle = () => {
    setToggleConfirmOpen(false);
    setToToggle(null);
  };

  const confirmToggle = async () => {
    if (!toToggle) return;
    try {
      setToggling(true);
      const res = await fetch(`/api/proyek/${toToggle.id}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (res.ok) {
        const data = await res.json();
        const updated: Proyek = data?.item;
        if (updated) {
          setItems((prev) => prev.map((item) => (item.id === toToggle.id ? { ...item, isActive: updated.isActive } : item)));
          success(`Proyek ${toToggle.namaProyek} berhasil ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
        }
      } else {
        error('Gagal mengubah status proyek');
      }
    } catch (e) {
      console.error('Toggle project status failed', e);
      error('Gagal mengubah status proyek');
    } finally {
      setToggling(false);
      setToggleConfirmOpen(false);
      setToToggle(null);
    }
  };

  const toggleProjectStatus = async (p: Proyek) => {
    try {
      const res = await fetch(`/api/proyek/${p.id}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (res.ok) {
        const data = await res.json();
        const updated: Proyek = data?.item;
        if (updated) {
          setItems((prev) => prev.map((item) => (item.id === p.id ? { ...item, isActive: updated.isActive } : item)));
          success(`Proyek berhasil ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
        }
      } else {
        error('Gagal mengubah status proyek');
      }
    } catch (e) {
      console.error('Toggle project status failed', e);
      error('Gagal mengubah status proyek');
    }
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setToDelete(null);
  };

  const confirmDelete = async () => {
    if (toDelete) {
      setDeleting(true);
      try {
        await fetch(`/api/proyek/${toDelete.id}`, { method: 'DELETE' });
        setItems((prev) => prev.filter((i) => i.id !== toDelete.id));
      } catch (e) {
        console.error('DELETE /api/proyek/[id] failed', e);
      }
    }
    setDeleting(false);
    setConfirmOpen(false);
    setToDelete(null);
  };

  // Team actions
  const openTeamFor = async (p: Proyek) => {
    // ensure modul panel is closed when opening team panel
    closeModulPanel();
    setTeamProject(p);
    setTeamEditingId(null);
    setTeamFormPegawaiId("");
    setTeamFormJabatan("");
    setTeamQuery("");
    setTeamSortKey("pegawai");
    setTeamSortDir("asc");
    setTeamPage(1);
    try {
      const res = await fetch(`/api/proyek-team/${p.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const rows: TeamMember[] = Array.isArray(data?.items) ? data.items : [];
        setTeamMembers(rows);

        // Extract pegawai info from team data and add to our options if not already present
        const teamPegawaiOptions = rows
          .filter(member => member.pegawai)
          .map(member => ({
            id: member.pegawai!.id,
            namaLengkap: member.pegawai!.namaLengkap
          }));

        setAllPegawaiOptions(prev => {
          const existing = new Set(prev.map(p => p.id));
          const newOptions = teamPegawaiOptions.filter(p => !existing.has(p.id));
          return [...prev, ...newOptions];
        });

        // reflect team into items for highlighting/consistency
        setItems((prev) => prev.map((i) => (i.id === p.id ? { ...i, team: rows } : i)));
      } else {
        setTeamMembers(p.team ? [...p.team] : []);
      }
    } catch (e) {
      setTeamMembers(p.team ? [...p.team] : []);
    }
  };

  const persistTeam = (next: TeamMember[]) => {
    if (!teamProject) return;
    setItems((prev) => prev.map((i) => (i.id === teamProject.id ? { ...i, team: next } : i)));
  };

  const submitTeamForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamFormPegawaiId === "" || !teamFormJabatan.trim() || !teamProject) return;
    setTeamSaving(true);
    if (teamEditingId) {
      // update via API
      try {
        const res = await fetch(`/api/proyek-team/item/${teamEditingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pegawaiId: Number(teamFormPegawaiId), jabatan: teamFormJabatan.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          const updated: TeamMember | undefined = data?.item;
          if (updated) {
            setTeamMembers((prev) => {
              const next = prev.map((m) => (m.id === teamEditingId ? updated : m));
              persistTeam(next);
              return next;
            });
          }
        }
      } catch (e) {
        // silent
      }
    } else {
      // prevent duplicate pegawai in team (client-side, server also enforces)
      if (teamMembers.some((m) => m.pegawaiId === Number(teamFormPegawaiId))) return;
      try {
        const res = await fetch(`/api/proyek-team/${teamProject.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pegawaiId: Number(teamFormPegawaiId), jabatan: teamFormJabatan.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          const created: TeamMember | undefined = data?.item;
          if (created) {
            setTeamMembers((prev) => {
              const next = [...prev, created];
              persistTeam(next);
              return next;
            });
          }
        }
      } catch (e) {
        // silent
      }
    }
    closeTeamForm();
    setTeamEditingId(null);
    setTeamFormPegawaiId("");
    setTeamFormJabatan("");
    setTeamSaving(false);
  };

  const removeTeamMember = async (id: number) => {
    try {
      await fetch(`/api/proyek-team/item/${id}`, { method: 'DELETE' });
    } catch (e) {
      // silent
    }
    setTeamMembers((prev) => {
      const next = prev.filter((m) => m.id !== id);
      persistTeam(next);
      return next;
    });
  };

  const closeTeamPanel = () => {
    setTeamProject(null);
    setTeamMembers([]);
    setTeamEditingId(null);
    setTeamFormPegawaiId("");
    setTeamFormJabatan("");
    setTeamQuery("");
  };

  // Modul actions (mirror Team)
  const openModulFor = async (p: Proyek) => {
    // ensure team panel is closed when opening modul panel
    closeTeamPanel();
    setModulProject(p);
    // Ensure tree shape with defaults
    const toTree = (arr?: any[]): ModulNode[] =>
      (arr || []).map((m) => ({ 
        id: m.id, 
        nama: m.nama, 
        kode: m.kode ?? null, 
        parentId: m.parentId ?? null, 
        version: m.version ?? null,
        baVersion: m.baVersion ?? null,
        children: m.children ? toTree(m.children) : m.children 
      }));
    let tree: ModulNode[] = [];
    
    // Fetch latest BA version for UI
    try {
      const resBA = await fetch(`/api/business-analyst?projectId=${p.id}`, { cache: 'no-store' });
      if (resBA.ok) {
        const dataBA = await resBA.json();
        if (dataBA.items && dataBA.items.length > 0) {
          setLatestProjectVersion(dataBA.items[0].version);
        } else {
          setLatestProjectVersion('0.0.1');
        }
      } else {
        setLatestProjectVersion('0.0.1');
      }
    } catch(e) {
      setLatestProjectVersion('0.0.1');
    }

    try {
      const res = await fetch(`/api/proyek-modules/${p.id}/tree`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.tree)) {
          tree = toTree(data.tree);
          // logs removed
        }
      } else {
        // non-OK
      }
    } catch (e) {
      // fallback to local
    }
    if (!tree.length) tree = toTree(p.modules);
    // logs removed
    setModules(tree);
    // Build a flattened list with per-level kode sorting to guarantee correct sibling order in Tree
    const splitNum = (k?: string | null) => String(k ?? '').split('.').map((s) => {
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? n : s;
    });
    const cmpKode = (a?: string | null, b?: string | null) => {
      const ka = a == null || String(a) === '' ? null : String(a);
      const kb = b == null || String(b) === '' ? null : String(b);
      if (ka && !kb) return -1;
      if (!ka && kb) return 1;
      if (!ka && !kb) return 0;
      const sa = splitNum(ka);
      const sb = splitNum(kb);
      const len = Math.max(sa.length, sb.length);
      for (let i = 0; i < len; i++) {
        const ai = sa[i] ?? 0;
        const bi = sb[i] ?? 0;
        if (typeof ai === 'number' && typeof bi === 'number' && ai !== bi) return ai - bi;
        if (String(ai) !== String(bi)) return String(ai).localeCompare(String(bi));
      }
      return 0;
    };
    const flattenSorted = (nodes: ModulNode[], parent: number | string = 0, depth: number = 0, out: FlatNode[] = []): FlatNode[] => {
      // sort current level by kode ascending (natural compare), nulls last
      const level = [...nodes].sort((a, b) => {
        const ka = a.kode ?? "";
        const kb = b.kode ?? "";
        if (!ka && !kb) return 0;
        if (!ka) return 1;
        if (!kb) return -1;
        const sa = splitNum(ka);
        const sb = splitNum(kb);
        const len = Math.max(sa.length, sb.length);
        for (let i = 0; i < len; i++) {
          const ai = (sa[i] ?? 0) as any;
          const bi = (sb[i] ?? 0) as any;
          if (typeof ai === 'number' && typeof bi === 'number' && ai !== bi) return ai - bi;
          if (String(ai) !== String(bi)) return String(ai).localeCompare(String(bi));
        }
        return 0;
      });
      level.forEach((n) => {
        out.push({ 
          id: n.id, 
          parent, 
          text: n.nama, 
          droppable: true, 
          data: { 
            depth, 
            kode: n.kode ?? null,
            version: n.version ?? null,
            baVersion: n.baVersion ?? null
          } 
        });
        if (n.children && n.children.length) flattenSorted(n.children, n.id, depth + 1, out);
      });
      return out;
    };
    const flat = flattenSorted(tree);
    // logs removed
    setModulesFlat(flat);
    // initialize expanded roots by default
    const roots = flat.filter((n) => String(n.parent) === '0').map((n) => Number(n.id));
    setExpandedIds(new Set<number>(roots));
    setModulEditingId(null);
    setModulFormNama("");
    setModulQuery("");
    setModulSortDir("asc");
  };

  const persistModules = async (next: ModulNode[]): Promise<boolean> => {
    if (!modulProject) return true; // No project to persist, consider it successful
    setItems((prev) => prev.map((i) => (i.id === modulProject.id ? { ...i, modules: next } : i)));
    // Fire-and-forget persist to API
    if (modulProject?.id) {
      try {
        const res = await fetch(`/api/proyek-modules/${modulProject.id}/tree`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tree: next }),
        });
        if (!res.ok) {
          let msg = 'Gagal menyimpan perubahan modul.';
          try {
            const err = await res.json();
            if (err?.error) msg = err.error;
          } catch { }
          console.error('Failed to persist modules:', msg);
          error(msg);
          return false; // Return false to indicate failure
        }
        return true; // Return true to indicate success
      } catch (e) {
        const msg = 'Gagal menyimpan perubahan modul. Periksa koneksi internet.';
        console.error('Network error persisting modules:', e);
        error(msg);
        return false;
      }
    }
    return true;
  };

  const [modulSaving, setModulSaving] = useState(false);
  const submitModulForm = (e: React.FormEvent) => {
    e.preventDefault();
    const nama = modulFormNama.trim();
    if (!nama) {
      // nothing to save
      return;
    }
    setModulSaving(true);
    if (modulEditingId) {
      // edit text in flat then persist
      setModulesFlat((prev) => {
        const list = [...prev];
        const idx = list.findIndex((n) => n.id === modulEditingId);
        if (idx < 0) return prev;
        const node = list[idx];
        const parentKey = String(node.parent);
        // check duplicate among siblings (exclude self)
        const dup = list.some((n) => String(n.parent) === parentKey && n.id !== modulEditingId && String(n.text || "").trim().toLowerCase() === nama.toLowerCase());
        if (dup) {
          if (typeof window !== 'undefined') window.alert('Nama modul duplikat pada level yang sama.');
          setModulSaving(false);
          return prev;
        }
        const nextFlat = list.map((n) => (n.id === modulEditingId ? { ...n, text: nama } : n));
        persistModulesFromFlat(nextFlat).catch(console.error);
        return nextFlat;
      });
    } else {
      // prevent duplicate root name
      const rootDup = modulesFlat.some((n) => String(n.parent) === "0" && String(n.text || "").trim().toLowerCase() === nama.toLowerCase());
      if (rootDup) {
        if (typeof window !== 'undefined') window.alert('Nama modul level 1 duplikat.');
        setModulSaving(false);
        return;
      }
      const usedIds = new Set(modulesFlat.map((n) => Number(n.id)));
      let nextId = 1;
      while (usedIds.has(nextId)) nextId++;
      setModulesFlat((prev) => {
        const newNode: FlatNode = { id: nextId, parent: 0, text: nama, droppable: true };
        const nextFlat = [...prev, newNode];
        persistModulesFromFlat(nextFlat).catch(console.error);
        return nextFlat;
      });
    }
    closeModulForm();
    setModulEditingId(null);
    setModulFormNama("");
    setModulSaving(false);
  };

  const removeModul = async (id: number) => {
    if (!modulProject) return;
    const collectDescendants = (items: FlatNode[], rootId: number | string): (number | string)[] => {
      const result: (number | string)[] = [rootId];
      const mapChildren = new Map<any, any[]>();
      items.forEach((n) => {
        const arr = mapChildren.get(n.parent) || [];
        arr.push(n);
        mapChildren.set(n.parent, arr);
      });
      const stack: (number | string)[] = [...result];
      while (stack.length) {
        const cur = stack.pop()!;
        const children = mapChildren.get(cur) || [];
        for (const c of children) {
          result.push(c.id);
          stack.push(c.id);
        }
      }
      return result;
    };
    // snapshot current state for rollback
    const prevFlat = modulesFlat;
    const ids = new Set(collectDescendants(prevFlat, id));
    const nextFlat = prevFlat.filter((n) => !ids.has(n.id));

    // optimistic UI update
    setModulesFlat(nextFlat);
    const success = await persistModulesFromFlat(nextFlat);
    if (!success) {
      // rollback on failure
      setModulesFlat(prevFlat);
      await persistModulesFromFlat(prevFlat); // Try to restore previous state
    }
  };

  const askDeleteModul = (id: number, name: string) => {
    setModulToDeleteId(id);
    setModulToDeleteName(name);
    setModulConfirmOpen(true);
  };
  const cancelDeleteModul = () => {
    setModulConfirmOpen(false);
    setModulToDeleteId(null);
    setModulToDeleteName("");
  };
  const [modulDeleting, setModulDeleting] = useState(false);
  const confirmDeleteModul = async () => {
    if (modulToDeleteId == null) return;
    setModulDeleting(true);
    await removeModul(modulToDeleteId);
    setModulDeleting(false);
    cancelDeleteModul();
  };


  const closeModulPanel = () => {
    setModulProject(null);
    setModules([]);
    setModulEditingId(null);
    setModulFormNama("");
    setModulQuery("");
    setExpandedIds(new Set());
  };

  // No sibling order normalization; we rely on array order only

  // Reorder a node among its siblings by swapping kode only (server-driven ordering by kode)
  const reorderSibling = async (id: number | string, direction: "up" | "down") => {
    if (!modulProject) return;
    try {
      const res = await fetch(`/api/proyek-modules/${modulProject.id}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: Number(id), direction }),
      });
      if (!res.ok) {
        let msg = 'Gagal mengubah urutan modul.';
        try { const err = await res.json(); if (err?.error) msg = err.error; } catch { }
        throw new Error(msg);
      }
      // reload tree from server (ordered by kode)
      await openModulFor(modulProject);
      // ensure moved node is visible
      if (typeof window !== 'undefined') {
        const idKey = String(id);
        const block: ScrollLogicalPosition = direction === 'up' ? 'start' : 'end';
        setTimeout(() => {
          const el = document.querySelector(`[data-modul-node-id="${idKey}"]`) as HTMLElement | null;
          el?.scrollIntoView({ behavior: 'smooth', block, inline: 'nearest' });
        }, 0);
      }
    } catch (e) {
      if (typeof window !== 'undefined') window.alert((e as any)?.message || 'Gagal mengubah urutan modul.');
    }
  };

  // Move a node to root (parent 0) and append at the end (array order)
  const moveToRoot = (id: number | string) => {
    setModulesFlat((prev) => {
      const list = [...prev];
      // remove node
      const idx = list.findIndex((n) => String(n.id) === String(id));
      if (idx < 0) return prev;
      const [item] = list.splice(idx, 1);
      // change parent to 0
      const changed: FlatNode = { ...item, parent: 0 };
      // append to end to keep array order as last among roots
      list.push(changed);
      persistModulesFromFlat(list).catch(console.error);
      return list;
    });
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, pageSize, sortKey, sortDir]);

  return (
      <div className="space-y-6 overflow-x-hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Master Proyek</h2>
          {canCreateProject && (
            <button
              onClick={openAdd}
              className="px-3 py-1 rounded-md bg-brand-600 hover:bg-brand-700 text-white"
            >
              Tambah Proyek
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Cari no urut / CRM ID / ID DEP / kode / nama"
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Rows</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-gray-900 dark:text-gray-100"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-white/[0.05]">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[760px]">
              <Table className="text-[12px] w-full whitespace-nowrap">
                <TableHeader className="bg-gray-50 dark:bg-white/[0.02]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer select-none w-[100px]"
                      onClick={() => toggleSort("noUrut")}
                    >
                      No Urut {sortKey === "noUrut" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer select-none w-[140px]"
                      onClick={() => toggleSort("kodeProyek")}
                    >
                      Kode Proyek {sortKey === "kodeProyek" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 cursor-pointer select-none w-[280px]"
                      onClick={() => toggleSort("namaProyek")}
                    >
                      Nama Proyek {sortKey === "namaProyek" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[120px]"
                    >
                      CRM ID
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[120px]"
                    >
                      ID DEP
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[140px]"
                    >
                      ID Deployment
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[120px]"
                    >
                      Type
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[100px]"
                    >
                      Status
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[280px]"
                    >
                      Aksi
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {paged.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-3 text-center text-gray-500 dark:text-gray-400" colSpan={9}>
                        Belum ada data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((p, idx) => (
                      <TableRow
                        key={p.id}
                        className={
                          (teamProject && teamProject.id === p.id) || (modulProject && modulProject.id === p.id)
                            ? "bg-green-100/90 dark:bg-green-900/40 ring-2 ring-green-400"
                            : ""
                        }
                      >
                        <TableCell className="px-5 py-2 text-start text-gray-800 dark:text-gray-200 max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">{(page - 1) * pageSize + idx + 1}</TableCell>
                        <TableCell className="px-5 py-2 text-start text-gray-800 dark:text-gray-200 max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">
                          <span title={p.kodeProyek}>{p.kodeProyek}</span>
                        </TableCell>
                        <TableCell className="px-5 py-2 text-start text-gray-800 dark:text-gray-200 max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap">
                          <span title={p.namaProyek}>{p.namaProyek}</span>
                        </TableCell>
                        <TableCell className="px-5 py-2 text-start text-gray-800 dark:text-gray-200 w-[120px]">
                          <span title={p.projectNamaCrm || p.crmId || '-'}>{p.projectNamaCrm || p.crmId || '-'}</span>
                        </TableCell>
                        <TableCell className="px-5 py-2 text-start text-gray-800 dark:text-gray-200 w-[120px]">
                          <span title={p.depNama || p.idDep || '-'}>{p.depNama || p.idDep || '-'}</span>
                        </TableCell>
                        <TableCell className="px-5 py-2 text-start text-gray-800 dark:text-gray-200 w-[140px]">
                          <span title={p.idDeployment || '-'}>{p.idDeployment || '-'}</span>
                        </TableCell>
                        <TableCell className="px-5 py-2 text-start text-gray-800 dark:text-gray-200 w-[120px]">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${p.type === 'BLUEPRINT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                            p.type === 'DEVELOPMENT' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                              'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
                            }`}>
                            {p.type}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-2 text-start text-gray-800 dark:text-gray-200 w-[100px]">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            p.isActive !== false 
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                          }`}>
                            {p.isActive !== false ? 'Aktif' : 'Non-Aktif'}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-2 whitespace-nowrap w-[280px]">
                          <div className="flex gap-1.5 flex-nowrap">
                            <button
                              onClick={() => askToggle(p)}
                              className={`px-2 py-1 rounded-md text-[11px] ${
                                p.isActive !== false
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                              title={p.isActive !== false ? 'Nonaktifkan proyek' : 'Aktifkan proyek'}
                            >
                              {p.isActive !== false ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button
                              onClick={() => openTeamFor(p)}
                              className="px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px]"
                            >
                              Tim
                            </button>
                            <button
                              onClick={() => openModulFor(p)}
                              className="px-2 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[11px]"
                            >
                              Modul
                            </button>
                            <button
                              onClick={() => openEdit(p)}
                              className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-[11px] text-gray-700 dark:text-gray-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => askDelete(p)}
                              className="px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px]"
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
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-white/[0.05]">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200"
              >
                Prev
              </button>
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
        <Modal isOpen={isOpen} onClose={() => { if (!saving) closeModal(); }} disableOutsideClose={true} disableEscClose={saving} className="w-[92vw] max-w-md sm:max-w-lg">
          <form onSubmit={submitForm} className="p-6 relative">
            {saving && (
              <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center rounded">
                <span className="text-sm text-gray-700 dark:text-gray-200">Menyimpan...</span>
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingId == null ? "Tambah Proyek" : "Edit Proyek"}
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Kode Proyek</label>
                <input
                  type="text"
                  value={formKodeProyek}
                  onChange={(e) => setFormKodeProyek(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="misal: PRJ-001"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Nama Proyek</label>
                <input
                  type="text"
                  value={formNamaProyek}
                  onChange={(e) => setFormNamaProyek(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Nama Proyek"
                  required
                  disabled={saving}
                />
              </div>
              
              {/* CRM Department & Project Dropdown */}
              <CrmDepartmentProjectDropdown
                defaultDepId={formIdDep}
                defaultProjectId={formCrmId}
                onDepartmentSelect={(depId, depName) => {
                  setFormIdDep(depId);
                  setFormDepNama(depName);
                }}
                onProjectSelect={(projectId, projectName) => {
                  setFormCrmId(projectId);
                  setFormProjectNamaCrm(projectName);
                }}
              />
              
              <SearchableSelect
                label="Type"
                value={formType}
                onChange={(value) => setFormType(value as 'BLUEPRINT' | 'DEVELOPMENT' | 'SUPPORT' | 'CLOSED')}
                options={[
                  { value: 'BLUEPRINT', label: 'Blueprint' },
                  { value: 'DEVELOPMENT', label: 'Development' },
                  { value: 'SUPPORT', label: 'Support' },
                  { value: 'CLOSED', label: 'Closed' }
                ]}
                placeholder="Pilih tipe proyek"
                required
                disabled={saving}
              />
              
              <SearchableSelect
                label="GitHub Repository (Optional)"
                value={formRepository}
                onChange={setFormRepository}
                options={[
                  { value: '', label: '-- Pilih Repository --' },
                  ...repositories.map((repo) => ({
                    value: repo.name,
                    label: repo.full_name || repo.name,
                    badge: repo.owner?.login
                  }))
                ]}
                placeholder="Pilih repository"
                disabled={saving}
              />
              
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">ID Deployment (Optional)</label>
                <input
                  type="text"
                  value={formIdDeployment}
                  onChange={(e) => setFormIdDeployment(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="misal: DEPLOY-001"
                  disabled={saving}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modul Section as Fullscreen Modal */}
        {modulProject && (
          <Modal
            isOpen={true}
            onClose={() => { if (!modulSaving) closeModulPanel(); }}
            disableOutsideClose={true}
            disableEscClose={modulSaving}
            className="w-screen h-screen max-w-none sm:max-w-none"
            showCloseButton={false}
          >
            <div className="p-4 h-full flex flex-col overflow-hidden overscroll-contain min-h-0 max-h-screen">
              {/* Title and primary actions */}
              <div className="flex items-center justify-between sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/[0.06] py-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Modul Proyek - {modulProject.kodeProyek}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setModulEditingId(null);
                      setModulFormNama("");
                      openModulForm();
                    }}
                    className="px-3 py-1 rounded-md bg-brand-600 hover:bg-brand-700 text-white"
                  >
                    Tambah Modul
                  </button>
                  <button onClick={closeModulPanel} className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200">Tutup</button>
                </div>
              </div>

              {/* Filter */}
              <div className="mt-3 flex items-center justify-between gap-3">
                <input
                  value={modulQuery}
                  onChange={(e) => setModulQuery(e.target.value)}
                  placeholder="Cari no urut / kode / nama"
                  className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 w-full max-w-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              {/* Body scrollable area */}
              <div
                ref={modulScrollRef}
                className="mt-3 flex-1 rounded-md border border-gray-200 dark:border-white/[0.05] text-[12px] overflow-x-auto overflow-y-auto min-h-0 max-w-full max-h-full"
              >
                <div className="min-w-[560px] w-full">
                  {modulesFlat.length === 0 ? (
                    <div className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">Belum ada modul.</div>
                  ) : (
                    <Table className="text-[12px]">
                      <TableHeader className="bg-gray-50 dark:bg-white/[0.02]">
                        <TableRow>
                          <TableCell isHeader className="px-3 py-2 text-start text-gray-600 dark:text-gray-400">Kode</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-start text-gray-600 dark:text-gray-400">Nama Modul</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-start text-gray-600 dark:text-gray-400">Version</TableCell>
                          <TableCell isHeader className="px-3 py-2 text-end text-gray-600 dark:text-gray-400">Aksi</TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {displayedModulesFlat.map((node) => {
                          const depth = Number((node as any).data?.depth || 0);
                          const kode = (node as any).data?.kode as string | null | undefined;
                          const label = `${kode ? kode + ' - ' : ''}${String(node.text || '')}`;
                          const isRoot = String(node.parent) === '0';
                          return (
                            <TableRow
                              key={String(node.id)}
                              data-modul-node-id={String(node.id)}
                              className={`${dragRowId === node.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''} ${dragOverTargetId === node.id ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}
                            >
                              {/* Kode */}
                              <TableCell className="px-3 py-2 text-gray-800 dark:text-gray-200">
                                <div className="truncate" style={{ paddingLeft: 4 }} title={kode ?? ''}>
                                  {kode ?? ''}
                                </div>
                              </TableCell>
                              {/* Nama Modul with expand/collapse toggle and drag handle */}
                              <TableCell className="px-3 py-2 text-gray-800 dark:text-gray-200">
                                {(() => {
                                  const hasChildren = modulesFlat.some((n) => String(n.parent) === String(node.id));
                                  const expanded = expandedIds.has(Number(node.id));
                                  return (
                                    <div className="flex items-center gap-1" style={{ paddingLeft: depth * 20 + 0 }}>
                                      <button
                                        type="button"
                                        className={`w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-white/5 ${hasChildren ? '' : 'opacity-0 pointer-events-none'}`}
                                        onClick={(e) => { e.stopPropagation(); toggleExpand(Number(node.id)); }}
                                        title={expanded ? 'Collapse' : 'Expand'}
                                      >
                                        {expanded ? '▾' : '▸'}
                                      </button>
                                      <div
                                        className="truncate cursor-move select-none"
                                        style={{ paddingLeft: 4 }}
                                        title={String(node.text || '')}
                                        draggable
                                        onDragStart={(e) => {
                                          setDragRowId(node.id);
                                          try {
                                            e.dataTransfer?.setData('text/plain', String(node.id));
                                            e.dataTransfer!.effectAllowed = 'move';
                                          } catch { }
                                        }}
                                        onDragEnd={() => { setDragRowId(null); setDragOverTargetId(null); }}
                                        onDragOver={(e) => {
                                          if (dragRowId == null) return;
                                          const draggedIdsSet = collectDescendantsFlat(modulesFlat, dragRowId);
                                          if (draggedIdsSet.has(node.id)) return;
                                          e.preventDefault();
                                          try { e.dataTransfer!.dropEffect = 'move'; } catch { }
                                          setDragOverTargetId(node.id);
                                        }}
                                        onDragLeave={() => { if (dragOverTargetId === node.id) setDragOverTargetId(null); }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          const dragId = dragRowId;
                                          setDragRowId(null);
                                          setDragOverTargetId(null);
                                          if (dragId == null) return;
                                          const dragNode = modulesFlat.find((n) => String(n.id) === String(dragId));
                                          if (!dragNode) return;
                                          const draggedIdsSet = collectDescendantsFlat(modulesFlat, dragId);
                                          if (draggedIdsSet.has(node.id)) return;
                                          const draggedIds = Array.from(draggedIdsSet);
                                          const block = modulesFlat.filter((n) => draggedIds.some((id) => String(id) === String(n.id)));
                                          const remainder = modulesFlat.filter((n) => !draggedIds.some((id) => String(id) === String(n.id)));
                                          const newParentId: number | string = node.id;
                                          const updatedBlock = block.map((n) => ({ ...n }));
                                          const rootIdx = updatedBlock.findIndex((n) => String(n.id) === String(dragId));
                                          if (rootIdx >= 0) updatedBlock[rootIdx].parent = newParentId as any;
                                          let insertIndex = -1;
                                          const targetSubtreeIds = collectDescendantsFlat(modulesFlat, node.id);
                                          let lastIdx = -1;
                                          for (let i = 0; i < remainder.length; i++) {
                                            if (targetSubtreeIds.has(remainder[i].id)) lastIdx = i;
                                          }
                                          insertIndex = lastIdx + 1;
                                          if (insertIndex < 0) return;
                                          const next = [...remainder.slice(0, insertIndex), ...updatedBlock, ...remainder.slice(insertIndex)];
                                          setModulesFlat(next);
                                          persistModulesFromFlat(next).catch(console.error);
                                        }}
                                      >
                                        {String(node.text || '')}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              {/* Version */}
                              <TableCell className="px-3 py-2 text-gray-800 dark:text-gray-200">
                                <div className="truncate text-xs" title={(node as any).data?.baVersion ?? ''}>
                                  {(node as any).data?.baVersion || '-'}
                                </div>
                              </TableCell>
                              {/* Aksi */}
                              <TableCell className="px-3 py-2 text-right">
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => reorderSibling(node.id, 'up')}
                                    className="px-1 py-0.5 rounded-md border border-gray-300 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200"
                                    title="Naikkan urutan"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => reorderSibling(node.id, 'down')}
                                    className="px-1 py-0.5 rounded-md border border-gray-300 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200"
                                    title="Turunkan urutan"
                                  >
                                    ▼
                                  </button>
                                  {!isRoot && (
                                    <button
                                      type="button"
                                      onClick={() => moveToRoot(node.id)}
                                      className="px-2 py-0.5 rounded-md border border-gray-300 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200"
                                      title="Pindah ke Level 1"
                                    >
                                      Ke Level 1
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { setModulEditingId(Number(node.id)); setModulFormNama(String(node.text || '')); openModulForm(); }}
                                    className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => { setModulToDeleteId(Number(node.id)); setModulToDeleteName(String(node.text || '')); setModulConfirmOpen(true); }}
                                    className="px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Modul Modal Form */}
        <Modal isOpen={isModulFormOpen} onClose={() => { if (!modulSaving) closeModulForm(); }} disableOutsideClose={true} disableEscClose={modulSaving} className="w-[92vw] max-w-md sm:max-w-lg">
          <form onSubmit={submitModulForm} className="p-6 space-y-4 relative">
            {modulSaving && (
              <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center rounded">
                <span className="text-sm text-gray-700 dark:text-gray-200">Menyimpan...</span>
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{modulEditingId ? "Edit Modul" : "Tambah Modul"}</h3>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Nama Modul</label>
              <input
                type="text"
                value={modulFormNama}
                onChange={(e) => setModulFormNama(e.target.value)}
                placeholder="Contoh: Autentikasi, Dashboard, Laporan"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                disabled={modulSaving}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Version (Read-Only)</label>
              <input
                type="text"
                value={modulEditingId ? (modulesFlat.find(m => m.id === modulEditingId)?.data?.baVersion || '-') : latestProjectVersion}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 px-3 py-2 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                readOnly
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeModulForm} disabled={modulSaving} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200">Batal</button>
              <button type="submit" disabled={modulSaving} className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50">{modulSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>

        {/* Confirm Delete Modal */
        }
        <Modal isOpen={confirmOpen} onClose={() => { if (!deleting) cancelDelete(); }} disableOutsideClose={true} disableEscClose={deleting} className="w-[92vw] max-w-sm" showCloseButton={false}>
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10">
                {/* warning icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 16.5H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M10.29 3.85999L1.81995 18C1.47795 18.592 1.46795 19.32 1.79495 19.921C2.12195 20.523 2.73595 20.9 3.40795 20.9H20.592C21.264 20.9 21.878 20.523 22.205 19.921C22.532 19.319 22.522 18.592 22.18 18L13.71 3.85999C13.366 3.26499 12.706 2.89999 12 2.89999C11.294 2.89999 10.634 3.26499 10.29 3.85999Z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Hapus data?</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Anda akan menghapus proyek
                  {toDelete ? ` (No ${toDelete.noUrut} - ${toDelete.kodeProyek} - ${toDelete.namaProyek})` : ""}. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={cancelDelete} disabled={deleting} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50">Batal</button>
              <button onClick={confirmDelete} disabled={deleting} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">{deleting ? 'Menghapus...' : 'Hapus'}</button>
            </div>
          </div>
        </Modal>

        {/* Confirm Delete Modul Modal */}
        <Modal isOpen={modulConfirmOpen} onClose={() => { if (!modulDeleting) cancelDeleteModul(); }} disableOutsideClose={true} disableEscClose={modulDeleting} className="w-[92vw] max-w-sm" showCloseButton={false}>
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10">
                {/* warning icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 16.5H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M10.29 3.85999L1.81995 18C1.47795 18.592 1.46795 19.32 1.79495 19.921C2.12195 20.523 2.73595 20.9 3.40795 20.9H20.592C21.264 20.9 21.878 20.523 22.205 19.921C22.532 19.319 22.522 18.592 22.18 18L13.71 3.85999C13.366 3.26499 12.706 2.89999 12 2.89999C11.294 2.89999 10.634 3.26499 10.29 3.85999Z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Hapus data?</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Anda akan menghapus modul
                  {modulToDeleteName ? ` (\"${modulToDeleteName}\")` : ""}. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={cancelDeleteModul} disabled={modulDeleting} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50">Batal</button>
              <button onClick={confirmDeleteModul} disabled={modulDeleting} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">{modulDeleting ? 'Menghapus...' : 'Hapus'}</button>
            </div>
          </div>
        </Modal>

        {/* Confirm Toggle Status Modal */}
        <Modal isOpen={toggleConfirmOpen} onClose={() => { if (!toggling) cancelToggle(); }} disableOutsideClose={true} disableEscClose={toggling} className="w-[92vw] max-w-sm" showCloseButton={false}>
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 16.5H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M10.29 3.85999L1.81995 18C1.47795 18.592 1.46795 19.32 1.79495 19.921C2.12195 20.523 2.73595 20.9 3.40795 20.9H20.592C21.264 20.9 21.878 20.523 22.205 19.921C22.532 19.319 22.522 18.592 22.18 18L13.71 3.85999C13.366 3.26499 12.706 2.89999 12 2.89999C11.294 2.89999 10.634 3.26499 10.29 3.85999Z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Ubah status proyek?</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {toToggle?.isActive !== false
                    ? `Nonaktifkan proyek ${toToggle ? `(${toToggle.kodeProyek} - ${toToggle.namaProyek})` : ''}?`
                    : `Aktifkan kembali proyek ${toToggle ? `(${toToggle.kodeProyek} - ${toToggle.namaProyek})` : ''}?`}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={cancelToggle} disabled={toggling} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50">Batal</button>
              <button onClick={confirmToggle} disabled={toggling} className={`px-4 py-2 rounded-md text-white disabled:opacity-50 ${toToggle?.isActive !== false ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                {toggling ? 'Memproses...' : toToggle?.isActive !== false ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Separator and Inline Team Section (datatable + modal form) */}
        {teamProject && (
          <>
            <hr className="mt-8 border-2 border-emerald-400/70 dark:border-emerald-500/60 rounded-full" />
            <div className="mt-6 space-y-3">
              {/* Title and primary actions */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tim Proyek - {teamProject.kodeProyek}</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setTeamEditingId(null); setTeamFormPegawaiId(""); setTeamFormJabatan(""); openTeamForm(); }} className="px-3 py-1 rounded-md bg-brand-600 hover:bg-brand-700 text-white">Tambah Anggota</button>
                  <button onClick={closeTeamPanel} className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200">Tutup</button>
                </div>
              </div>

              {/* Filter and rows controls */}
              <div className="flex items-center justify-between gap-3">
                <input
                  value={teamQuery}
                  onChange={(e) => { setTeamQuery(e.target.value); setTeamPage(1); }}
                  placeholder="Cari anggota..."
                  className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 w-full max-w-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Rows</span>
                  <select
                    value={teamPageSize}
                    onChange={(e) => { setTeamPageSize(Number(e.target.value)); setTeamPage(1); }}
                    className="px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border border-gray-200 dark:border-white/[0.05]">
                <div className="max-w-full overflow-x-auto">
                  <div className="min-w-[640px]">
                    <Table className="text-[12px] w-full whitespace-nowrap">
                      <TableHeader className="bg-gray-50 dark:bg-white/[0.02]">
                        <TableRow>
                          <TableCell
                            isHeader
                            className="px-4 py-2 text-start text-sm text-gray-600 dark:text-gray-400 select-none w-[60px]"
                          >
                            No
                          </TableCell>
                          <TableCell
                            isHeader
                            className="px-4 py-2 text-start text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none w-[280px]"
                            onClick={() => {
                              if (teamSortKey === "pegawai") setTeamSortDir((d) => (d === "asc" ? "desc" : "asc"));
                              setTeamSortKey("pegawai");
                            }}
                          >
                            Pegawai {teamSortKey === "pegawai" ? (teamSortDir === "asc" ? "▲" : "▼") : ""}
                          </TableCell>
                          <TableCell
                            isHeader
                            className="px-4 py-2 text-start text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none w-[220px]"
                            onClick={() => {
                              if (teamSortKey === "jabatan") setTeamSortDir((d) => (d === "asc" ? "desc" : "asc"));
                              setTeamSortKey("jabatan");
                            }}
                          >
                            Jabatan {teamSortKey === "jabatan" ? (teamSortDir === "asc" ? "▲" : "▼") : ""}
                          </TableCell>
                          <TableCell isHeader className="px-4 py-2 text-start text-sm text-gray-600 dark:text-gray-400 w-[160px]">Aksi</TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {(() => {
                          const rows = teamMembers.map((m) => ({
                            ...m,
                            pegawaiName: (m as any).pegawai?.namaLengkap ||
                              (pegawaiOptions.length > 0 ? pegawaiOptions : allPegawaiOptions).find((p) => p.id === m.pegawaiId)?.namaLengkap ||
                              `Pegawai #${m.pegawaiId}`,
                          }));
                          const filtered = rows.filter((r) =>
                            (r.pegawaiName + " " + r.jabatan).toLowerCase().includes(teamQuery.toLowerCase())
                          );
                          filtered.sort((a, b) => {
                            const key = teamSortKey === "pegawai" ? "pegawaiName" : "jabatan";
                            const av = String(a[key]).toLowerCase();
                            const bv = String(b[key]).toLowerCase();
                            if (av < bv) return teamSortDir === "asc" ? -1 : 1;
                            if (av > bv) return teamSortDir === "asc" ? 1 : -1;
                            return 0;
                          });
                          const total = filtered.length;
                          const totalPages = Math.max(1, Math.ceil(total / teamPageSize));
                          const curPage = Math.min(teamPage, totalPages);
                          const start = (curPage - 1) * teamPageSize;
                          const pageRows = filtered.slice(start, start + teamPageSize);
                          if (pageRows.length === 0) {
                            return (
                              <TableRow>
                                <TableCell className="px-4 py-4 text-center text-gray-500 dark:text-gray-400" colSpan={4}>Belum ada anggota.</TableCell>
                              </TableRow>
                            );
                          }
                          return (
                            <>
                              {pageRows.map((m, idx) => (
                                <TableRow key={m.id}>
                                  <TableCell className="px-4 py-3 text-gray-800 dark:text-gray-200 max-w-[60px] overflow-hidden text-ellipsis whitespace-nowrap">{start + idx + 1}</TableCell>
                                  <TableCell className="px-4 py-3 text-gray-800 dark:text-gray-200 max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap">
                                    <span title={m.pegawaiName}>{m.pegawaiName}</span>
                                  </TableCell>
                                  <TableCell className="px-4 py-3 text-gray-800 dark:text-gray-200 max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap">
                                    <span title={m.jabatan}>{m.jabatan}</span>
                                  </TableCell>
                                  <TableCell className="px-4 py-3 w-[160px] whitespace-nowrap">
                                    <div className="flex gap-1.5 flex-nowrap">
                                      <button
                                        onClick={() => {
                                          setTeamEditingId(m.id);
                                          setTeamFormPegawaiId(m.pegawaiId);
                                          setTeamFormJabatan(m.jabatan);
                                          openTeamForm();
                                        }}
                                        className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-[11px] text-gray-700 dark:text-gray-200"
                                      >
                                        Edit
                                      </button>
                                      <button onClick={() => removeTeamMember(m.id)} className="px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px]">Hapus</button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell colSpan={4} className="px-4 py-3">
                                  <div className="flex items-center justify-between text-[12px] text-gray-700 dark:text-gray-300">
                                    <span>
                                      Menampilkan {start + 1}-{Math.min(start + teamPageSize, total)} dari {total}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => setTeamPage((p) => Math.max(1, p - 1))}
                                        disabled={curPage === 1}
                                        className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-[11px] text-gray-700 dark:text-gray-200"
                                      >
                                        Prev
                                      </button>
                                      <span className="text-[12px]">Hal {curPage} / {totalPages}</span>
                                      <button
                                        onClick={() => setTeamPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={curPage === totalPages}
                                        className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-[11px] text-gray-700 dark:text-gray-200"
                                      >
                                        Next
                                      </button>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </>
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Team Member Modal Form */}
        <Modal isOpen={isTeamFormOpen} onClose={() => { if (!teamSaving) closeTeamForm(); }} disableOutsideClose={true} disableEscClose={teamSaving} className="w-[92vw] max-w-md sm:max-w-lg">
          <form onSubmit={submitTeamForm} className="p-6 space-y-4 relative">
            {teamSaving && (
              <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center rounded">
                <span className="text-sm text-gray-700 dark:text-gray-200">Menyimpan...</span>
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{teamEditingId ? "Edit Anggota Tim" : "Tambah Anggota Tim"}</h3>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Pegawai</label>
              <select
                value={teamFormPegawaiId === "" ? "" : String(teamFormPegawaiId)}
                onChange={(e) => setTeamFormPegawaiId(e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
                disabled={teamSaving}
              >
                <option value="">Pilih pegawai</option>
                {(pegawaiOptions.length > 0 ? pegawaiOptions : allPegawaiOptions).map((pg) => {
                  const disabled = teamEditingId
                    ? teamMembers.some((m) => m.pegawaiId === pg.id && m.id !== teamEditingId)
                    : teamMembers.some((m) => m.pegawaiId === pg.id);
                  return (
                    <option key={pg.id} value={pg.id} disabled={disabled}>
                      {pg.namaLengkap}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Jabatan</label>
              <select
                value={teamFormJabatan}
                onChange={(e) => setTeamFormJabatan(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
                disabled={teamSaving}
              >
                <option value="">Pilih jabatan</option>
                <option value="PM">PM</option>
                <option value="Admin">Admin</option>
                <option value="Programmer">Programmer</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeTeamForm} disabled={teamSaving} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200">Batal</button>
              <button type="submit" disabled={teamSaving} className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50">{teamSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      </div>
  );
}
