"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { usePermission } from "@/hooks/usePermissions";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";

type Programmer = {
    id: number;
    namaLengkap: string;
    noHp: string;
    role: string;
};

type ProgrammerStatus = {
    id: number;
    programmerId: number;
    status: string;
    notes: string | null;
    updatedBy: number;
    createdAt: string;
    updatedAt: string;
    programmer?: Programmer;
    updater?: { id: number; namaLengkap: string };
};

type ProgrammerProject = {
    programmerId: number;
    projects: string;
    projectCount: number;
};

type StatusLog = {
    id: number;
    programmerId: number;
    oldStatus: string | null;
    newStatus: string;
    notes: string | null;
    changedBy: number;
    createdAt: string;
    programmer?: { id: number; namaLengkap: string };
    changer?: { id: number; namaLengkap: string };
};

const STATUS_OPTIONS = [
    { value: 'Free', label: 'Free', color: 'success', icon: '🟢' },
    { value: 'Work', label: 'Work', color: 'warning', icon: '🟡' },
    { value: 'OnList', label: 'OnList', color: 'info', icon: '🔵' },
];

const getStatusColor = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return option?.color || 'gray';
};

const getStatusIcon = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return option?.icon || '⚪';
};

export default function ProgrammerStatusPage() {
    const { success, error } = useToast();
    const [statuses, setStatuses] = useState<ProgrammerStatus[]>([]);
    const [logs, setLogs] = useState<StatusLog[]>([]);
    const [programmers, setProgrammers] = useState<Programmer[]>([]);
    const [projects, setProjects] = useState<ProgrammerProject[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [loadingLogs, setLoadingLogs] = useState<Set<number>>(new Set());

    // RBAC permissions
    const canCreate = usePermission('programmer_status.create');
    const canUpdate = usePermission('programmer_status.update');

    // Modal state
    const { isOpen, openModal, closeModal } = useModal(false);
    const [formProgrammerId, setFormProgrammerId] = useState<number | "">("");
    const [formStatus, setFormStatus] = useState("");
    const [formNotes, setFormNotes] = useState("");

    // Load statuses
    useEffect(() => {
        loadStatuses();
        loadProjects();
    }, []);

    // Load programmers
    useEffect(() => {
        const loadProgrammers = async () => {
            try {
                const res = await fetch('/api/pegawai', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data?.items)) {
                        // Filter only programmers
                        const progs = data.items.filter((p: any) => p.role === 'PROGRAMMER');
                        setProgrammers(progs);
                    }
                }
            } catch (e) {
                console.error('Failed to load programmers', e);
            }
        };
        loadProgrammers();
    }, []);

    const loadStatuses = async () => {
        try {
            const res = await fetch('/api/programmer-status', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data?.items)) setStatuses(data.items);
            }
        } catch (e) {
            console.error('Failed to load statuses', e);
        }
    };

    const loadProjects = async () => {
        try {
            const res = await fetch('/api/programmer-status/projects', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data?.items)) setProjects(data.items);
            }
        } catch (e) {
            console.error('Failed to load projects', e);
        }
    };

    const loadLogsForProgrammer = async (programmerId: number) => {
        setLoadingLogs(prev => new Set(prev).add(programmerId));
        try {
            const url = `/api/programmer-status/logs?programmerId=${programmerId}`;
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data?.items)) {
                    setLogs(prev => {
                        // Remove old logs for this programmer and add new ones
                        const filtered = prev.filter(l => l.programmerId !== programmerId);
                        return [...filtered, ...data.items];
                    });
                }
            }
        } catch (e) {
            console.error('Failed to load logs', e);
        } finally {
            setLoadingLogs(prev => {
                const newSet = new Set(prev);
                newSet.delete(programmerId);
                return newSet;
            });
        }
    };

    const toggleRow = (programmerId: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(programmerId)) {
            newExpanded.delete(programmerId);
        } else {
            newExpanded.add(programmerId);
            // Load logs when expanding
            loadLogsForProgrammer(programmerId);
        }
        setExpandedRows(newExpanded);
    };

    const openChangeStatus = (programmerId: number) => {
        const existing = statuses.find(s => s.programmerId === programmerId);
        setFormProgrammerId(programmerId);
        setFormStatus(existing?.status || "");
        setFormNotes("");
        openModal();
    };

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formProgrammerId === "" || !formStatus) return;

        try {
            setLoading(true);
            const res = await fetch('/api/programmer-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    programmerId: Number(formProgrammerId),
                    status: formStatus,
                    notes: formNotes || null,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                // Update or add status
                setStatuses(prev => {
                    const existing = prev.find(s => s.programmerId === data.item.programmerId);
                    if (existing) {
                        return prev.map(s => s.programmerId === data.item.programmerId ? data.item : s);
                    }
                    return [...prev, data.item];
                });
                // Reload logs if row is expanded
                if (expandedRows.has(Number(formProgrammerId))) {
                    loadLogsForProgrammer(Number(formProgrammerId));
                }
                success('Status berhasil diubah');
                closeModal();
            } else {
                const errData = await res.json();
                error(errData?.error || 'Gagal mengubah status');
            }
        } catch (e) {
            console.error('Failed to update status', e);
            error('Terjadi kesalahan');
        } finally {
            setLoading(false);
        }
    };

    const getProgrammerLogs = (programmerId: number) => {
        return logs.filter(l => l.programmerId === programmerId).sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    };

    return (
        <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
                            <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Status Programmer</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Monitor ketersediaan programmer</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-16">No</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Nama Programmer</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Project</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-32">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {programmers.map((prog, idx) => {
                                    const status = statuses.find(s => s.programmerId === prog.id);
                                    const statusValue = status?.status || 'Free';
                                    const colorClass = getStatusColor(statusValue);
                                    const isExpanded = expandedRows.has(prog.id);
                                    const programmerLogs = getProgrammerLogs(prog.id);
                                    const isLoadingLogs = loadingLogs.has(prog.id);
                                    const programmerProjects = projects.find(p => p.programmerId === prog.id);

                                    return (
                                        <React.Fragment key={prog.id}>
                                            {/* Main Row */}
                                            <tr
                                                className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors cursor-pointer"
                                                onClick={() => toggleRow(prog.id)}
                                            >
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold text-sm">
                                                            {prog.namaLengkap.charAt(0)}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{prog.namaLengkap}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                    {programmerProjects?.projects || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${colorClass === 'success' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' :
                                                        colorClass === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                            colorClass === 'error' ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400' :
                                                                colorClass === 'info' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                                                        }`}>
                                                        <span>{getStatusIcon(statusValue)}</span>
                                                        {statusValue}
                                                    </span>
                                                </td>

                                            </tr>

                                            {/* Expanded Row - Logs */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-4 bg-gray-50 dark:bg-gray-900/20">
                                                        <div className="ml-12">
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Status History</h4>

                                                            {isLoadingLogs ? (
                                                                <div className="flex items-center justify-center py-8">
                                                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
                                                                        <span className="text-sm">Loading history...</span>
                                                                    </div>
                                                                </div>
                                                            ) : programmerLogs.length === 0 ? (
                                                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                                                    <p className="text-sm">No history yet</p>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                                                    {programmerLogs.map((log) => (
                                                                        <div key={log.id} className="relative pl-6 pb-3 border-l-2 border-gray-300 dark:border-gray-600 last:border-0 last:pb-0">
                                                                            {/* Timeline dot */}
                                                                            <div className={`absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full ${getStatusColor(log.newStatus) === 'success' ? 'bg-success-500' :
                                                                                getStatusColor(log.newStatus) === 'warning' ? 'bg-yellow-500' :
                                                                                    getStatusColor(log.newStatus) === 'error' ? 'bg-error-500' :
                                                                                        getStatusColor(log.newStatus) === 'info' ? 'bg-blue-500' :
                                                                                            'bg-gray-400'
                                                                                }`} />

                                                                            <div className="flex items-start justify-between gap-4">
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        {log.oldStatus && (
                                                                                            <>
                                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 line-through">{log.oldStatus}</span>
                                                                                                <span className="text-xs text-gray-400">→</span>
                                                                                            </>
                                                                                        )}
                                                                                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{log.newStatus}</span>
                                                                                    </div>
                                                                                    {log.notes && (
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-1">"{log.notes}"</p>
                                                                                    )}
                                                                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                                                                        by {log.changer?.namaLengkap}
                                                                                    </p>
                                                                                </div>
                                                                                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                                                                    {new Date(log.createdAt).toLocaleDateString('id-ID', {
                                                                                        day: '2-digit',
                                                                                        month: 'short',
                                                                                        year: 'numeric',
                                                                                        hour: '2-digit',
                                                                                        minute: '2-digit'
                                                                                    })}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {programmers.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <p className="text-sm">No programmers found</p>
                        </div>
                    )}
                </div>

                {/* Change Status Modal */}
                <Modal
                    isOpen={isOpen}
                    onClose={closeModal}
                    className="w-[92vw] max-w-md"
                    disableOutsideClose
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
                            Change Status
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                                <select
                                    value={formStatus}
                                    onChange={(e) => setFormStatus(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    required
                                    disabled={loading}
                                >
                                    <option value="">-- Select Status --</option>
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.icon} {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes (Optional)</label>
                                <textarea
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    placeholder="Reason for status change..."
                                    rows={3}
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-all shadow-sm hover:shadow-md ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                                disabled={loading}
                            >
                                Save
                            </button>
                        </div>
                    </form>
                </Modal>
            </div>
    );
}
