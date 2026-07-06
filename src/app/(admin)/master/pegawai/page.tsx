"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/context/ToastContext";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { usePermission } from "@/hooks/usePermissions";

type Pegawai = {
  id: number;
  noUrut: number;
  namaLengkap: string;
  noHp: string;
  username?: string | null;
  role?: 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN';
};

// Data now stored in DB via API

type SortKey = "noUrut" | "namaLengkap" | "noHp";

export default function PegawaiPage() {
  const { success, error } = useToast();
  const [items, setItems] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(false);
  
  // RBAC permissions
  const canCreateUser = usePermission('user.create');
  const canUpdateUser = usePermission('user.update');
  const canDeleteUser = usePermission('user.delete');

  // datatable state
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("namaLengkap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // modal state for add/edit
  const { isOpen, openModal, closeModal } = useModal(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formNamaLengkap, setFormNamaLengkap] = useState("");
  const [formNoHp, setFormNoHp] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN'>("ADMIN");

  const roleValues: Array<'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN'> = [
    'SUPER_ADMIN',
    'PM',
    'PROGRAMMER',
    'ADMIN',
  ];

  const formatRole = (val?: string | null) => {
    if (!val) return 'Admin';
    const s = String(val).toUpperCase();
    if (s === 'PM') return 'PM';
    return s
      .toLowerCase()
      .split('_')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  };

  // delete confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Pegawai | null>(null);

  // Load from API
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/pegawai', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.items)) setItems(data.items);
        }
      } catch (e) {
        console.error('Failed to load pegawai from API', e);
      }
    };
    load();
  }, []);

  // nextId and next noUrut are assigned by DB; not computed on client

  // derived rows
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.namaLengkap.toLowerCase().includes(q) ||
        i.noHp.toLowerCase().includes(q)
    );
  }, [items, query]);

  const sorted = useMemo((): Pegawai[] => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let va: string | number;
      let vb: string | number;
      if (sortKey === 'noUrut') {
        // keep current order when sorting by temporary index
        return 0;
      } else {
        // sort by field values
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

  const openAdd = () => {
    setEditingId(null);
    setFormNamaLengkap("");
    setFormNoHp("");
    setFormUsername("");
    setFormPassword("");
    setFormRole("ADMIN");
    openModal();
  };

  const openEdit = (p: Pegawai) => {
    setEditingId(p.id);
    setFormNamaLengkap(p.namaLengkap);
    setFormNoHp(p.noHp);
    setFormUsername((p as any).username ?? "");
    setFormPassword("");
    setFormRole((p as any).role ?? "ADMIN");
    openModal();
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaLengkap || !formNoHp) return;

    if (editingId == null) {
      // Create
      try {
        setLoading(true);
        const res = await fetch('/api/pegawai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            namaLengkap: formNamaLengkap,
            noHp: formNoHp,
            username: formUsername?.trim() || null,
            password: formPassword || null,
            role: formRole,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.item) setItems((prev) => [...prev, data.item as Pegawai]);
          success('Berhasil menyimpan pegawai');
        } else {
          error('Gagal menyimpan pegawai');
        }
      } catch (e) {
        console.error('POST /api/pegawai failed', e);
        error('Terjadi kesalahan saat menyimpan');
      } finally {
        setLoading(false);
      }
    } else {
      // Update
      try {
        setLoading(true);
        const res = await fetch(`/api/pegawai/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            namaLengkap: formNamaLengkap,
            noHp: formNoHp,
            username: formUsername?.trim(),
            password: formPassword || undefined,
            role: formRole,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const updated: Pegawai | undefined = data?.item;
          if (updated) {
            setItems((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
          }
          success('Berhasil mengubah pegawai');
        } else {
          error('Gagal mengubah pegawai');
        }
      } catch (e) {
        console.error('PUT /api/pegawai/[id] failed', e);
        error('Terjadi kesalahan saat mengubah');
      } finally {
        setLoading(false);
      }
    }
    closeModal();
  };

  const askDelete = (p: Pegawai) => {
    setToDelete(p);
    setConfirmOpen(true);
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setToDelete(null);
  };

  const confirmDelete = async () => {
    if (toDelete) {
      try {
        setLoading(true);
        const res = await fetch(`/api/pegawai/${toDelete.id}`, { method: 'DELETE' });
        if (!res.ok) {
          error('Gagal menghapus pegawai');
        } else {
          setItems((prev) => prev.filter((i) => i.id !== toDelete.id));
          success('Berhasil menghapus pegawai');
        }
      } catch (e) {
        console.error('DELETE /api/pegawai/[id] failed', e);
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

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  return (
    <PermissionGate 
      permission="user.read" 
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-red-600">Access Denied: You don't have permission to view users</div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Master Pegawai</h2>
        {canCreateUser && (
          <button
            onClick={openAdd}
            className="px-3 py-1 rounded-md bg-brand-600 hover:bg-brand-700 text-white"
          >
            Tambah Pegawai
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Cari no urut / nama / no hp"
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
          <div className="min-w-[760px]">
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
                    onClick={() => toggleSort("namaLengkap")}
                  >
                    Nama Lengkap {sortKey === "namaLengkap" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-2 font-medium text-gray-500 text-start text-xs dark:text-gray-400 cursor-pointer select-none"
                    onClick={() => toggleSort("noHp")}
                  >
                    No HP {sortKey === "noHp" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-2 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                  >
                    Role
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
                    <TableCell className="px-3 py-3 text-center text-gray-500 dark:text-gray-400" colSpan={5}>
                      Belum ada data.
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((p, idx) => (
                    <TableRow key={p.id}>
                      <TableCell className="px-3 py-2 text-start text-gray-800 dark:text-gray-200">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell className="px-3 py-2 text-start text-gray-800 dark:text-gray-200">{p.namaLengkap}</TableCell>
                      <TableCell className="px-3 py-2 text-start text-gray-800 dark:text-gray-200">{p.noHp}</TableCell>
                      <TableCell className="px-3 py-2 text-start text-gray-800 dark:text-gray-200">{formatRole((p as any).role ?? 'ADMIN')}</TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="flex gap-2">
                          {canUpdateUser && (
                            <button
                              onClick={() => openEdit(p)}
                              className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                            >
                              Edit
                            </button>
                          )}
                          {canDeleteUser && (
                            <button
                              onClick={() => askDelete(p)}
                              className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* footer controls */}
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
        className="w-[92vw] max-w-md sm:max-w-lg"
        disableOutsideClose
        disableEscClose
      >
        <form onSubmit={submitForm} className="relative p-6">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/70 dark:bg-gray-900/70">
              <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-lg dark:bg-gray-800">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
                <span className="text-sm text-gray-700 dark:text-gray-200">Menyimpan...</span>
              </div>
            </div>
          )}
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {editingId == null ? "Tambah Pegawai" : "Edit Pegawai"}
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={formNamaLengkap}
                onChange={(e) => setFormNamaLengkap(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Nama lengkap"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">No HP</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formNoHp}
                onChange={(e) => setFormNoHp(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="08xxxxxxxxxx"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Role</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as any)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
                disabled={loading}
              >
                {roleValues.map((v) => (
                  <option key={v} value={v}>{formatRole(v)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Username (opsional)</label>
              <input
                type="text"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Username untuk login (opsional)"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Password {editingId != null ? "(isi untuk ganti)" : "(opsional)"}</label>
              <input
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder={editingId != null ? "Biarkan kosong jika tidak mengubah password" : "Password awal (opsional)"}
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Password akan disimpan ter-enkripsi.</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
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

      {/* Confirm Delete Modal */}
      <Modal isOpen={confirmOpen} onClose={cancelDelete} className="w-[92vw] max-w-sm" showCloseButton={false} disableOutsideClose disableEscClose>
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10">
              {/* warning icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M12 16.5H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M10.29 3.85999L1.81995 18C1.47795 18.592 1.46795 19.32 1.79495 19.921C2.12195 20.523 2.73595 20.9 3.40795 20.9H20.592C21.264 20.9 21.878 20.523 22.205 19.921C22.532 19.319 22.522 18.592 22.18 18L13.71 3.85999C13.366 3.26499 12.706 2.89999 12 2.89999C11.294 2.89999 10.634 3.26499 10.29 3.85999Z" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Hapus data?</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Anda akan menghapus pegawai
                {toDelete ? ` (No ${toDelete.noUrut} - ${toDelete.namaLengkap})` : ""}. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={cancelDelete} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700" disabled={loading}>Batal</button>
            <button onClick={confirmDelete} className={`px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white ${loading ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={loading}>
              {loading ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Removed global loading overlay; loading now handled within modals */}
      </div>
    </PermissionGate>
  );
}
