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
    namaLengkap: string;
    noHp: string;
    role: string;
};

type Region = {
    id: number;
    kode: string;
    nama: string;
    picId: number;
    pic?: Pegawai;
    createdAt: string;
    updatedAt: string;
};

type RegionMember = {
    id: number;
    regionId: number;
    pegawaiId: number;
    pegawai: Pegawai;
    createdAt: string;
    updatedAt: string;
};

type SortKey = "kode" | "nama" | "pic";

export default function RegionPage() {
    const { success, error } = useToast();
    const [items, setItems] = useState<Region[]>([]);
    const [loading, setLoading] = useState(false);
    const [pegawaiOptions, setPegawaiOptions] = useState<Pegawai[]>([]);

    // RBAC permissions
    const canCreateRegion = usePermission('region.create');
    const canUpdateRegion = usePermission('region.update');
    const canDeleteRegion = usePermission('region.delete');

    // datatable state
    const [query, setQuery] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("kode");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // modal state for add/edit
    const { isOpen, openModal, closeModal } = useModal(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formKode, setFormKode] = useState("");
    const [formNama, setFormNama] = useState("");
    const [formPicId, setFormPicId] = useState<number | "">("");

    // delete confirm modal state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [toDelete, setToDelete] = useState<Region | null>(null);

    // Member management state
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
    const [members, setMembers] = useState<RegionMember[]>([]);
    const { isOpen: memberModalOpen, openModal: openMemberModal, closeModal: rawCloseMemberModal } = useModal(false);
    const [selectedPegawaiIds, setSelectedPegawaiIds] = useState<number[]>([]);

    // Delete member confirmation state
    const [deleteMemberConfirmOpen, setDeleteMemberConfirmOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<RegionMember | null>(null);

    // Custom dropdown states
    const [picDropdownOpen, setPicDropdownOpen] = useState(false);
    const [programmerDropdownOpen, setProgrammerDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Load regions from API
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/region', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data?.items)) setItems(data.items);
                }
            } catch (e) {
                console.error('Failed to load regions from API', e);
            }
        };
        load();
    }, []);

    // Load pegawai options for PIC selector
    useEffect(() => {
        const loadPegawai = async () => {
            try {
                const res = await fetch('/api/pegawai', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data?.items)) setPegawaiOptions(data.items);
                }
            } catch (e) {
                console.error('Failed to load pegawai options', e);
            }
        };
        loadPegawai();
    }, []);

    // derived rows
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (i) =>
                i.kode.toLowerCase().includes(q) ||
                i.nama.toLowerCase().includes(q) ||
                i.pic?.namaLengkap.toLowerCase().includes(q)
        );
    }, [items, query]);

    const sorted = useMemo((): Region[] => {
        const rows = [...filtered];
        rows.sort((a, b) => {
            let va: string | number;
            let vb: string | number;

            if (sortKey === 'kode') {
                va = a.kode;
                vb = b.kode;
            } else if (sortKey === 'nama') {
                va = a.nama;
                vb = b.nama;
            } else if (sortKey === 'pic') {
                va = a.pic?.namaLengkap || '';
                vb = b.pic?.namaLengkap || '';
            } else {
                return 0;
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
        setFormKode("");
        setFormNama("");
        setFormPicId("");
        openModal();
    };

    const openEdit = (r: Region) => {
        setEditingId(r.id);
        setFormKode(r.kode);
        setFormNama(r.nama);
        setFormPicId(r.picId);
        openModal();
    };

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formKode || !formNama || formPicId === "") return;

        if (editingId == null) {
            // Create
            try {
                setLoading(true);
                const res = await fetch('/api/region', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        kode: formKode.trim(),
                        nama: formNama.trim(),
                        picId: Number(formPicId),
                    }),
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.item) setItems((prev) => [...prev, data.item as Region]);
                    success('Berhasil menyimpan region');
                } else {
                    const errData = await res.json();
                    error(errData?.error || 'Gagal menyimpan region');
                }
            } catch (e) {
                console.error('POST /api/region failed', e);
                error('Terjadi kesalahan saat menyimpan');
            } finally {
                setLoading(false);
            }
        } else {
            // Update
            try {
                setLoading(true);
                const res = await fetch(`/api/region/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        kode: formKode.trim(),
                        nama: formNama.trim(),
                        picId: Number(formPicId),
                    }),
                });
                if (res.ok) {
                    const data = await res.json();
                    const updated: Region | undefined = data?.item;
                    if (updated) {
                        setItems((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
                    }
                    success('Berhasil mengubah region');
                } else {
                    const errData = await res.json();
                    error(errData?.error || 'Gagal mengubah region');
                }
            } catch (e) {
                console.error('PUT /api/region/[id] failed', e);
                error('Terjadi kesalahan saat mengubah');
            } finally {
                setLoading(false);
            }
        }
        closeModal();
    };

    const askDelete = (r: Region) => {
        setToDelete(r);
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
                const res = await fetch(`/api/region/${toDelete.id}`, { method: 'DELETE' });
                if (!res.ok) {
                    error('Gagal menghapus region');
                } else {
                    setItems((prev) => prev.filter((i) => i.id !== toDelete.id));
                    success('Berhasil menghapus region');
                }
            } catch (e) {
                console.error('DELETE /api/region/[id] failed', e);
                error('Terjadi kesalahan saat menghapus');
            } finally {
                setLoading(false);
            }
        }
        setConfirmOpen(false);
        setToDelete(null);
        closeModal();
    };

    // Member management functions
    const viewMembers = async (region: Region) => {
        setSelectedRegion(region);
        try {
            const res = await fetch(`/api/region/${region.id}/members`);
            if (res.ok) {
                const data = await res.json();
                setMembers(data.items || []);
            }
        } catch (e) {
            console.error('Failed to load members', e);
            error('Gagal memuat anggota tim');
        }
    };

    const closeMemberModal = React.useCallback(() => {
        rawCloseMemberModal();
        setSelectedPegawaiIds([]);
        setSearchTerm('');
        setProgrammerDropdownOpen(false);
    }, [rawCloseMemberModal]);

    const openAddMember = () => {
        setSelectedPegawaiIds([]);
        setSearchTerm('');
        openMemberModal();
    };

    const submitAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRegion || selectedPegawaiIds.length === 0) return;

        setLoading(true);
        try {
            // Add members one by one
            const promises = selectedPegawaiIds.map(pegawaiId =>
                fetch(`/api/region/${selectedRegion.id}/members`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pegawaiId })
                })
            );

            const results = await Promise.all(promises);
            const allSuccess = results.every(res => res.ok);

            if (allSuccess) {
                success(`${selectedPegawaiIds.length} anggota berhasil ditambahkan`);
                closeMemberModal();
                viewMembers(selectedRegion);
            } else {
                const failedCount = results.filter(res => !res.ok).length;
                error(`${failedCount} anggota gagal ditambahkan`);
            }
        } catch (err) {
            console.error('Error adding members:', err);
            error('Gagal menambahkan anggota');
        } finally {
            setLoading(false);
        }
    };

    const askDeleteMember = (member: RegionMember) => {
        setMemberToDelete(member);
        setDeleteMemberConfirmOpen(true);
    };

    const cancelDeleteMember = () => {
        setDeleteMemberConfirmOpen(false);
        setMemberToDelete(null);
    };

    const confirmDeleteMember = async () => {
        if (!selectedRegion || !memberToDelete) return;

        try {
            const res = await fetch(`/api/region/${selectedRegion.id}/members/${memberToDelete.id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                success('Anggota berhasil dihapus');
                viewMembers(selectedRegion);
            } else {
                error('Gagal menghapus anggota');
            }
        } catch (e) {
            console.error(e);
            error('Gagal menghapus anggota');
        } finally {
            setDeleteMemberConfirmOpen(false);
            setMemberToDelete(null);
        }
    };

    // Filter programmers only
    const programmerOptions = useMemo(() => {
        return pegawaiOptions.filter(p => p.role === 'PROGRAMMER');
    }, [pegawaiOptions]);

    // Filter out already added members
    const availableProgrammers = useMemo(() => {
        const memberIds = members.map(m => m.pegawaiId);
        // Exclude PIC and existing members
        const picId = selectedRegion?.picId;
        return programmerOptions.filter(p => !memberIds.includes(p.id) && p.id !== picId);
    }, [programmerOptions, members, selectedRegion]);

    // Filter by search term
    const filteredProgrammers = useMemo(() => {
        if (!searchTerm.trim()) return availableProgrammers;
        const term = searchTerm.toLowerCase();
        return availableProgrammers.filter(p =>
            p.namaLengkap.toLowerCase().includes(term) ||
            p.noHp?.toLowerCase().includes(term)
        );
    }, [availableProgrammers, searchTerm]);
    const toggleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const dropdown = document.getElementById('programmer-dropdown');
            const isClickInside = dropdown?.contains(target) || target.closest('[data-multi-select]');

            if (!isClickInside && programmerDropdownOpen) {
                setProgrammerDropdownOpen(false);
            }
        };

        if (programmerDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [programmerDropdownOpen]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [totalPages, page]);

    return (
        <PermissionGate
            permission="region.read"
            fallback={
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-red-600">Access Denied: You don't have permission to view regions</div>
                </div>
            }
        >
            <div className="space-y-6 p-6">
                {/* Header with Icon */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/20">
                            <svg className="h-6 w-6 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Master Region</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola data region dan PIC</p>
                        </div>
                    </div>
                    {canCreateRegion && (
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah Region
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
                        placeholder="Cari kode / nama region / PIC"
                        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    />
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Rows:</span>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    const dropdown = document.getElementById('rows-dropdown');
                                    if (dropdown) {
                                        dropdown.classList.toggle('hidden');
                                    }
                                }}
                                onBlur={(e) => {
                                    // Close dropdown when clicking outside
                                    setTimeout(() => {
                                        const dropdown = document.getElementById('rows-dropdown');
                                        if (dropdown && !dropdown.contains(document.activeElement)) {
                                            dropdown.classList.add('hidden');
                                        }
                                    }, 150);
                                }}
                                className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 cursor-pointer focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all hover:border-gray-400 dark:hover:border-gray-600 font-medium min-w-[70px] justify-between"
                            >
                                <span>{pageSize}</span>
                                <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {/* Dropdown Menu */}
                            <div
                                id="rows-dropdown"
                                className="hidden absolute top-full mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-10 overflow-hidden"
                            >
                                {[5, 10, 20, 50].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => {
                                            setPageSize(n);
                                            setPage(1);
                                            const dropdown = document.getElementById('rows-dropdown');
                                            if (dropdown) dropdown.classList.add('hidden');
                                        }}
                                        className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${pageSize === n ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium' : 'text-gray-900 dark:text-gray-100'
                                            }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Table with Glassmorphism */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] shadow-theme-md">
                    <div className="max-w-full overflow-x-auto">
                        <div className="min-w-[760px]">
                            <Table className="text-sm">
                                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
                                    <TableRow>
                                        <TableCell
                                            isHeader
                                            className="px-4 py-3 font-semibold text-gray-700 text-start text-xs uppercase dark:text-gray-300 cursor-pointer select-none hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                            onClick={() => toggleSort("kode")}
                                        >
                                            Kode Region {sortKey === "kode" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                                        </TableCell>
                                        <TableCell
                                            isHeader
                                            className="px-4 py-3 font-semibold text-gray-700 text-start text-xs uppercase dark:text-gray-300 cursor-pointer select-none hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                            onClick={() => toggleSort("nama")}
                                        >
                                            Nama Region {sortKey === "nama" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                                        </TableCell>
                                        <TableCell
                                            isHeader
                                            className="px-4 py-3 font-semibold text-gray-700 text-start text-xs uppercase dark:text-gray-300 cursor-pointer select-none hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                            onClick={() => toggleSort("pic")}
                                        >
                                            PIC (Person in Charge) {sortKey === "pic" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                                        </TableCell>
                                        <TableCell
                                            isHeader
                                            className="px-4 py-3 font-semibold text-gray-700 text-center text-xs uppercase dark:text-gray-300"
                                        >
                                            Aksi
                                        </TableCell>
                                    </TableRow>
                                </TableHeader>

                                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                    {paged.length === 0 ? (
                                        <TableRow>
                                            <TableCell className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                                                <div className="flex flex-col items-center gap-2">
                                                    <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                    </svg>
                                                    <span className="font-medium">Belum ada data region</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paged.map((r, idx) => (
                                            <TableRow
                                                key={r.id}
                                                className={`transition-colors ${idx % 2 === 0
                                                    ? 'bg-white dark:bg-gray-900/50'
                                                    : 'bg-gray-50 dark:bg-gray-800/50'
                                                    } hover:bg-brand-50 dark:hover:bg-brand-900/10`}
                                            >
                                                <TableCell className="px-4 py-4 text-start">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                                            <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{r.kode.substring(0, 2)}</span>
                                                        </div>
                                                        <span className="font-semibold text-brand-600 dark:text-brand-400">{r.kode}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-4 text-start">
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">{r.nama}</span>
                                                </TableCell>
                                                <TableCell className="px-4 py-4 text-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold text-sm">
                                                            {r.pic?.namaLengkap?.charAt(0) || '?'}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-900 dark:text-gray-100">{r.pic?.namaLengkap || '-'}</span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">{r.pic?.noHp || ''}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-4">
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => viewMembers(r)}
                                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                            </svg>
                                                            Kelola Tim
                                                        </button>
                                                        {canUpdateRegion && (
                                                            <button
                                                                onClick={() => openEdit(r)}
                                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                                                            >
                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                                Edit
                                                            </button>
                                                        )}
                                                        {canDeleteRegion && (
                                                            <button
                                                                onClick={() => askDelete(r)}
                                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-error-600 hover:bg-error-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
                                                            >
                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
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
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Menampilkan {paged.length > 0 ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, sorted.length)} dari {sorted.length} data
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                            >
                                Prev
                            </button>
                            <span className="px-3 text-gray-700 dark:text-gray-300 font-medium">
                                Page {page} / {totalPages}
                            </span>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
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
                >
                    <form onSubmit={submitForm} className="relative p-6">
                        {loading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                                <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-lg dark:bg-gray-800">
                                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
                                    <span className="text-sm text-gray-700 dark:text-gray-200">Menyimpan...</span>
                                </div>
                            </div>
                        )}
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                            {editingId == null ? "Tambah Region" : "Edit Region"}
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kode Region</label>
                                <input
                                    type="text"
                                    value={formKode}
                                    onChange={(e) => setFormKode(e.target.value.toUpperCase())}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="Contoh: REG01"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nama Region</label>
                                <input
                                    type="text"
                                    value={formNama}
                                    onChange={(e) => setFormNama(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="Contoh: Region Jakarta"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">PIC (Person in Charge)</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => !loading && setPicDropdownOpen(!picDropdownOpen)}
                                        onBlur={(e) => {
                                            setTimeout(() => {
                                                const dropdown = document.getElementById('pic-dropdown');
                                                if (dropdown && !dropdown.contains(document.activeElement)) {
                                                    setPicDropdownOpen(false);
                                                }
                                            }, 150);
                                        }}
                                        className="w-full flex items-center justify-between rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loading}
                                    >
                                        <span className={formPicId === "" ? "text-gray-400 dark:text-gray-500" : ""}>
                                            {formPicId === ""
                                                ? "-- Pilih PIC --"
                                                : pegawaiOptions.find(p => p.id === formPicId)?.namaLengkap || "-- Pilih PIC --"}
                                        </span>
                                        <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {picDropdownOpen && (
                                        <div
                                            id="pic-dropdown"
                                            className="absolute top-full mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-10 max-h-60 overflow-y-auto"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormPicId("");
                                                    setPicDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700"
                                            >
                                                -- Pilih PIC --
                                            </button>
                                            {pegawaiOptions.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormPicId(p.id);
                                                        setPicDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${formPicId === p.id
                                                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium'
                                                        : 'text-gray-900 dark:text-gray-100'
                                                        }`}
                                                >
                                                    <div>
                                                        <div className="font-medium">{p.namaLengkap}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{p.noHp}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Pilih pegawai yang bertanggung jawab untuk region ini</p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                disabled={loading}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className={`px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-all shadow-sm hover:shadow-md ${loading ? 'opacity-60 cursor-not-allowed' : ''
                                    }`}
                                disabled={loading}
                            >
                                Simpan
                            </button>
                        </div>
                    </form>
                </Modal>

                {/* Member Management Section */}
                {selectedRegion && (
                    <div className="mt-8 bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-gray-300 dark:border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Anggota Tim - {selectedRegion.nama}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    PIC: {selectedRegion.pic?.namaLengkap}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {canUpdateRegion && (
                                    <button
                                        onClick={openAddMember}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Tambah Anggota
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedRegion(null)}
                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>

                        {members.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">Belum ada anggota tim</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-brand-500 dark:hover:border-brand-500 transition-all bg-white dark:bg-gray-800"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                                <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                                                    {member.pegawai.namaLengkap.charAt(0)}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                                    {member.pegawai.namaLengkap}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {member.pegawai.noHp}
                                                </p>
                                            </div>
                                        </div>
                                        {canUpdateRegion && (
                                            <button
                                                onClick={() => askDeleteMember(member)}
                                                className="text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300 p-2 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-all"
                                                title="Hapus anggota"
                                            >
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Add Member Modal */}
                <Modal isOpen={memberModalOpen} onClose={closeMemberModal} className="w-auto min-w-[400px] max-w-[600px]">
                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 text-center">
                            Tambah Anggota Tim
                        </h3>
                        <form onSubmit={submitAddMember}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                                    Programmer (Klik untuk Pilih/Hapus)
                                </label>

                                {/* Multi-select with animated tags */}
                                <div className="relative">
                                    {/* Input area with selected tags */}
                                    <div
                                        data-multi-select
                                        onClick={() => !loading && availableProgrammers.length > 0 && setProgrammerDropdownOpen(!programmerDropdownOpen)}
                                        className={`min-h-[42px] w-full rounded-lg ${programmerDropdownOpen
                                            ? 'border-2 border-brand-500 ring-2 ring-brand-500/20'
                                            : 'border-2 border-gray-300 dark:border-gray-600'
                                            } bg-white dark:bg-gray-800 px-3 py-2 cursor-pointer transition-all ${loading || availableProgrammers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                    >
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            {/* Selected tags with animation */}
                                            {selectedPegawaiIds.map((id, index) => {
                                                const programmer = programmerOptions.find(p => p.id === id);
                                                return programmer ? (
                                                    <span
                                                        key={id}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-sm font-medium animate-fadeIn whitespace-nowrap"
                                                        style={{ animationDelay: `${index * 50}ms` }}
                                                    >
                                                        {programmer.namaLengkap}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedPegawaiIds(prev => prev.filter(pid => pid !== id));
                                                            }}
                                                            className="hover:bg-brand-200 dark:hover:bg-brand-800 rounded-full p-0.5 transition-colors"
                                                        >
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </span>
                                                ) : null;
                                            })}

                                            {/* Inline search input - shows when dropdown is open */}
                                            {programmerDropdownOpen && (
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            closeMemberModal();
                                                        } else if (e.key === 'Enter' && filteredProgrammers.length > 0) {
                                                            e.preventDefault();
                                                            const firstProgrammer = filteredProgrammers.find(p => !selectedPegawaiIds.includes(p.id));
                                                            if (firstProgrammer) {
                                                                setSelectedPegawaiIds(prev => [...prev, firstProgrammer.id]);
                                                                setSearchTerm('');
                                                            }
                                                        }
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    placeholder="Ketik untuk mencari..."
                                                    className="flex-1 min-w-[150px] px-2 py-1 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                                    autoFocus
                                                />
                                            )}

                                            {/* Placeholder when no selection and dropdown closed */}
                                            {selectedPegawaiIds.length === 0 && !programmerDropdownOpen && (
                                                <span className="text-gray-400 dark:text-gray-500 text-sm whitespace-nowrap">
                                                    {availableProgrammers.length === 0 ? 'Tidak ada programmer tersedia' : 'Pilih programmer...'}
                                                </span>
                                            )}

                                            {/* Spacer to push dropdown arrow to right */}
                                            <div className="flex-1 min-w-[20px]"></div>

                                            {/* Dropdown arrow */}
                                            <svg
                                                className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 flex-shrink-0 ${programmerDropdownOpen ? 'rotate-180' : ''
                                                    }`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Dropdown menu with programmer list */}
                                    {programmerDropdownOpen && availableProgrammers.length > 0 && (
                                        <div
                                            id="programmer-dropdown"
                                            className="absolute top-full mt-1 w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-10 max-h-60 overflow-y-auto animate-slideDown"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {filteredProgrammers.filter(p => !selectedPegawaiIds.includes(p.id)).length === 0 ? (
                                                <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                                                    {searchTerm ? 'Tidak ada hasil' : 'Semua programmer sudah dipilih'}
                                                </div>
                                            ) : (
                                                filteredProgrammers
                                                    .filter(p => !selectedPegawaiIds.includes(p.id))
                                                    .map((p, index) => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedPegawaiIds(prev => [...prev, p.id]);
                                                                setSearchTerm('');
                                                            }}
                                                            className="w-full text-left px-4 py-2.5 transition-all duration-150 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-700 animate-fadeIn"
                                                            style={{ animationDelay: `${index * 30}ms` }}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                                                        {p.namaLengkap}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{p.noHp}</div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                {availableProgrammers.length === 0 && (
                                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 text-center">
                                        Semua programmer sudah menjadi anggota
                                    </p>
                                )}
                            </div>
                            <div className="flex justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={closeMemberModal}
                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                    disabled={loading}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                                    disabled={loading || selectedPegawaiIds.length === 0}
                                >
                                    {loading ? 'Menambahkan...' : 'Tambah'}
                                </button>
                            </div>
                        </form>
                    </div>
                </Modal>

                {/* Delete Member Confirmation Modal */}
                <Modal isOpen={deleteMemberConfirmOpen} onClose={cancelDeleteMember} className="w-[92vw] max-w-sm" showCloseButton={false} disableOutsideClose disableEscClose>
                    <div className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-100 text-error-600 dark:bg-error-500/10">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 9V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M12 16.5H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M10.29 3.85999L1.81995 18C1.47795 18.592 1.46795 19.32 1.79495 19.921C2.12195 20.523 2.73595 20.9 3.40795 20.9H20.592C21.264 20.9 21.878 20.523 22.205 19.921C22.532 19.319 22.522 18.592 22.18 18L13.71 3.85999C13.366 3.26499 12.706 2.89999 12 2.89999C11.294 2.89999 10.634 3.26499 10.29 3.85999Z" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Hapus Anggota?</h3>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Anda akan menghapus anggota
                                    {memberToDelete ? ` "${memberToDelete.pegawai.namaLengkap}"` : ""} dari tim region ini. Tindakan ini tidak dapat dibatalkan.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={cancelDeleteMember} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all" disabled={loading}>Batal</button>
                            <button
                                onClick={confirmDeleteMember}
                                className={`px-4 py-2 rounded-lg bg-error-600 hover:bg-error-700 text-white transition-all shadow-sm hover:shadow-md ${loading ? 'opacity-60 cursor-not-allowed' : ''
                                    }`}
                                disabled={loading}
                            >
                                {loading ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Confirm Delete Modal */}
                <Modal isOpen={confirmOpen} onClose={cancelDelete} className="w-[92vw] max-w-sm" showCloseButton={false} disableOutsideClose disableEscClose>
                    <div className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-100 text-error-600 dark:bg-error-500/10">
                                {/* warning icon */}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 9V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M12 16.5H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M10.29 3.85999L1.81995 18C1.47795 18.592 1.46795 19.32 1.79495 19.921C2.12195 20.523 2.73595 20.9 3.40795 20.9H20.592C21.264 20.9 21.878 20.523 22.205 19.921C22.532 19.319 22.522 18.592 22.18 18L13.71 3.85999C13.366 3.26499 12.706 2.89999 12 2.89999C11.294 2.89999 10.634 3.26499 10.29 3.85999Z" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Hapus Region?</h3>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Anda akan menghapus region
                                    {toDelete ? ` "${toDelete.kode} - ${toDelete.nama}"` : ""}. Tindakan ini tidak dapat dibatalkan.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={cancelDelete} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all" disabled={loading}>Batal</button>
                            <button onClick={confirmDelete} className={`px-4 py-2 rounded-lg bg-error-600 hover:bg-error-700 text-white transition-all shadow-sm hover:shadow-md ${loading ? 'opacity-60 cursor-not-allowed' : ''} `} disabled={loading}>
                                {loading ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </Modal>
            </div >
        </PermissionGate >
    );
}
