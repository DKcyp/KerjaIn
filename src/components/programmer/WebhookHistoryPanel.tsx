"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";

type WebhookDelivery = {
    id: number;
    guid: string;
    delivered_at: string;
    deliveredAt?: string;
    duration: number;
    status: string;
    status_code: number;
    statusCode?: number; 
    event: string;
    action: string;
    redelivery: boolean;
    repository_id: number;
    repositoryFullName?: string;
    repositoryPrivate?: boolean;
    url: string;
    request: {
        headers: Record<string, string>;
        payload: any;
    };
    response: {
        headers: Record<string, string>;
        payload: string;
    };
    hookId: number;
    commitMessage?: string;
    commitAuthor?: string;
    authorName?: string;
    authorEmail?: string;
    pusherName?: string;
    pusherEmail?: string;
    branch?: string;
    commit?: string;
    prNumber?: number;
    prTitle?: string;
    commitsCount?: number;
    commits?: Array<{
        id: string;
        message: string;
        author: string;
    }>;
    created?: boolean;
    deleted?: boolean;
    forced?: boolean;
    htmlUrl?: string;
};

type WebhookStats = {
    total: number;
    success: number;
    failure: number;
    pending: number;
};

type WebhookHistoryPanelProps = {
    programmerId: number;
    programmerName: string;
    currentRepo?: string;
};

export function WebhookHistoryPanel({ programmerId, programmerName, currentRepo }: WebhookHistoryPanelProps) {
    const { success, error: showError } = useToast();
    const [webhooks, setWebhooks] = useState<WebhookDelivery[]>([]);
    const [stats, setStats] = useState<WebhookStats>({ total: 0, success: 0, failure: 0, pending: 0 });
    const [loading, setLoading] = useState(false);
    const [selectedRepo, setSelectedRepo] = useState<string>("");
    const [repos, setRepos] = useState<string[]>([]);
    const [selectedWebhook, setSelectedWebhook] = useState<WebhookDelivery | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [redelivering, setRedelivering] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        if (currentRepo) {
            setRepos([currentRepo]);
            setSelectedRepo(currentRepo);
        } else {
            loadProgrammerRepos();
        }
    }, [programmerId, currentRepo]);

    useEffect(() => {
        if (selectedRepo) {
            loadWebhooks();
        }
    }, [selectedRepo]);

    const loadProgrammerRepos = async () => {
        try {
            const res = await fetch(`/api/programmer-status/repos?programmerId=${programmerId}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data?.repos)) {
                    setRepos(data.repos);
                    if (data.repos.length > 0) {
                        setSelectedRepo(data.repos[0]);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load repos', e);
        }
    };

    const loadWebhooks = async () => {
        if (!selectedRepo) return;
        
        setLoading(true);
        try {
            const res = await fetch(`/api/github/workflows?repo=${selectedRepo}&type=webhooks&limit=20`);
            if (res.ok) {
                const data = await res.json();
                setWebhooks(data.webhooks || []);
                setStats(data.statistics || { total: 0, success: 0, failure: 0, pending: 0 });
                setCurrentPage(1); // Reset to first page when loading new data
            }
        } catch (e) {
            console.error('Failed to load webhooks', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeliver = async () => {
        if (!selectedWebhook || !selectedRepo) return;
        
        setRedelivering(true);
        try {
            const res = await fetch('/api/github/webhooks/redeliver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repo: selectedRepo,
                    hookId: selectedWebhook.hookId,
                    deliveryId: selectedWebhook.id,
                }),
            });

            if (res.ok) {
                success('Webhook redelivered successfully!');
                setSelectedWebhook(null);
                setTimeout(loadWebhooks, 2000);
            } else {
                const data = await res.json();
                showError(data.error || 'Failed to redeliver webhook');
            }
        } catch (e) {
            console.error('Failed to redeliver webhook', e);
            showError('Failed to redeliver webhook. Please try again.');
        } finally {
            setRedelivering(false);
        }
    };

    const getStatusColor = (status: string, statusCode: number) => {
        // Normalize status - bisa "success", "OK", atau check status code
        const normalizedStatus = status?.toLowerCase();
        const code = statusCode || 0;
        
        if (normalizedStatus === 'success' || normalizedStatus === 'ok' || code === 200 || code === 201 || code === 204) {
            return 'success';
        }
        if (normalizedStatus === 'pending') {
            return 'warning';
        }
        return 'error';
    };

    const getStatusIcon = (status: string, statusCode: number) => {
        const normalizedStatus = status?.toLowerCase();
        const code = statusCode || 0;
        
        if (normalizedStatus === 'success' || normalizedStatus === 'ok' || code === 200 || code === 201 || code === 204) {
            return '✓';
        }
        if (normalizedStatus === 'pending') {
            return '⏳';
        }
        return '✗';
    };

    const getStatusBadge = (item: WebhookDelivery) => {
        const code = item.statusCode || item.status_code || 0;
        const normalizedStatus = item.status?.toLowerCase();
        
        if (normalizedStatus === 'success' || normalizedStatus === 'ok' || code === 200 || code === 201 || code === 204) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-semibold">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {code}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-semibold">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {code}
            </span>
        );
    };

    const getStatusLabel = (item: WebhookDelivery) => {
        const code = item.statusCode || item.status_code || 0;
        const normalizedStatus = item.status?.toLowerCase();
        
        if (normalizedStatus === 'success' || normalizedStatus === 'ok' || code === 200 || code === 201 || code === 204) {
            return 'Delivered successfully';
        }
        return 'Delivery failed';
    };

    const formatDuration = (duration: number) => {
        if (duration < 1) return `${(duration * 1000).toFixed(0)}ms`;
        return `${duration.toFixed(2)}s`;
    };

    // Pagination logic
    const totalPages = Math.ceil(webhooks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentWebhooks = webhooks.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        setCurrentPage(page);
    };

    const goToPrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Webhook History</h3>
                    </div>
                    <button
                        onClick={loadWebhooks}
                        disabled={loading || !selectedRepo}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <svg className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                {!currentRepo && (
                    <select
                        value={selectedRepo}
                        onChange={(e) => setSelectedRepo(e.target.value)}
                        className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-gray-900 dark:text-gray-100"
                        disabled={loading || repos.length === 0}
                    >
                        {repos.length === 0 ? (
                            <option value="">No repos found</option>
                        ) : (
                            repos.map(repo => (
                                <option key={repo} value={repo}>{repo}</option>
                            ))
                        )}
                    </select>
                )}

                {stats.total > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                        <div className="text-center">
                            <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{stats.total}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Total</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-semibold text-success-600 dark:text-success-400">{stats.success}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Success</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-semibold text-error-600 dark:text-error-400">{stats.failure}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Failed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Pending</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
                            <span className="text-xs">Loading...</span>
                        </div>
                    </div>
                ) : webhooks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <svg className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <p className="text-xs">No webhook history</p>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {currentWebhooks.map((webhook) => {
                                const code = webhook.statusCode || webhook.status_code || 0;
                                const statusColor = getStatusColor(webhook.status, code);
                                
                                return (
                                    <div 
                                        key={webhook.id} 
                                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors cursor-pointer flex items-center justify-between gap-2"
                                        onClick={() => setSelectedWebhook(webhook)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`flex-shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold ${
                                                    statusColor === 'success' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' :
                                                    statusColor === 'error' ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400' :
                                                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                    {getStatusIcon(webhook.status, code)}
                                                </span>
                                                <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {webhook.event}
                                                </span>
                                            </div>

                                            {webhook.commitMessage && (
                                                <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate ml-7">
                                                    {webhook.commitMessage}
                                                </p>
                                            )}
                                        </div>

                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                            {new Date(webhook.delivered_at || webhook.deliveredAt || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Showing {startIndex + 1}-{Math.min(endIndex, webhooks.length)} of {webhooks.length}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={goToPrevPage}
                                        disabled={currentPage === 1}
                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        title="Previous"
                                    >
                                        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => goToPage(page)}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                                currentPage === page
                                                    ? 'bg-brand-600 text-white font-semibold'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    
                                    <button
                                        onClick={goToNextPage}
                                        disabled={currentPage === totalPages}
                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        title="Next"
                                    >
                                        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {selectedWebhook && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedWebhook(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 flex-shrink-0">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-bold text-white">Webhook Delivery</h2>
                                        <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                            <span className="text-white text-xs font-bold">
                                                {(() => {
                                                    const code = selectedWebhook.statusCode || selectedWebhook.status_code || 0;
                                                    const normalizedStatus = selectedWebhook.status?.toLowerCase();
                                                    return (normalizedStatus === 'success' || normalizedStatus === 'ok' || code === 200 || code === 201 || code === 204) ? 'success' : 'failed';
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="text-lg text-white/90 font-semibold mb-3">{selectedWebhook.event}</h3>
                                    <div className="flex items-center gap-3 text-sm text-white/80">
                                        <span>ID: {selectedWebhook.id}</span>
                                        <span>•</span>
                                        <span>{new Date(selectedWebhook.delivered_at || selectedWebhook.deliveredAt || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedWebhook(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Status Code</label>
                                    <p className="text-2xl font-bold text-white">{selectedWebhook.statusCode || selectedWebhook.status_code}</p>
                                </div>
                                <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Duration</label>
                                    <p className="text-2xl font-bold text-white">{formatDuration(selectedWebhook.duration)}</p>
                                </div>
                            </div>

                            {selectedWebhook.repositoryFullName && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                        </svg>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-blue-900 dark:text-blue-100 text-xs truncate">{selectedWebhook.repositoryFullName}</span>
                                                {selectedWebhook.repositoryPrivate && (
                                                    <span className="px-1.5 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded flex-shrink-0">Private</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedWebhook.commitMessage && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Commit Message</label>
                                    <div className="text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                                        {selectedWebhook.commitMessage}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                {selectedWebhook.branch && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1 mb-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                                            Branch
                                        </label>
                                        <p className="text-xs text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">{selectedWebhook.branch}</p>
                                    </div>
                                )}
                                {selectedWebhook.commit && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Commit SHA</label>
                                        <p className="text-xs text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">{selectedWebhook.commit.substring(0, 7)}</p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {selectedWebhook.pusherName && (
                                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2">
                                        <label className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-1 block">📤 Pusher</label>
                                        <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{selectedWebhook.pusherName}</div>
                                        {selectedWebhook.pusherEmail && (
                                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{selectedWebhook.pusherEmail}</div>
                                        )}
                                    </div>
                                )}

                                {selectedWebhook.authorName && (
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
                                        <label className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase mb-1 block">✍️ Author</label>
                                        <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{selectedWebhook.authorName}</div>
                                        {selectedWebhook.authorEmail && (
                                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{selectedWebhook.authorEmail}</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedWebhook.commitsCount !== undefined && selectedWebhook.commitsCount > 0 && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                                        📝 Commits ({selectedWebhook.commitsCount})
                                    </label>
                                    <div className="space-y-1.5 bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto">
                                        {selectedWebhook.commits?.map((commit) => (
                                            <div key={commit.id} className="text-xs border-l-2 border-blue-500 pl-2 py-0.5">
                                                <div className="font-mono text-gray-500 dark:text-gray-400">{commit.id.substring(0, 7)}</div>
                                                <div className="text-gray-900 dark:text-white line-clamp-1">{commit.message}</div>
                                                <div className="text-gray-500 dark:text-gray-400">by {commit.author}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(selectedWebhook.created || selectedWebhook.deleted || selectedWebhook.forced) && (
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedWebhook.created && (
                                        <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">✨ Created</span>
                                    )}
                                    {selectedWebhook.deleted && (
                                        <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">🗑️ Deleted</span>
                                    )}
                                    {selectedWebhook.forced && (
                                        <span className="px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">⚡ Force Push</span>
                                    )}
                                </div>
                            )}

                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Delivered: {new Date(selectedWebhook.delivered_at || selectedWebhook.deliveredAt || Date.now()).toLocaleString('id-ID', { 
                                    day: '2-digit', 
                                    month: 'short',
                                    hour: '2-digit', 
                                    minute: '2-digit'
                                })}
                                {selectedWebhook.duration !== null && ` • Duration: ${formatDuration(selectedWebhook.duration)}`}
                            </div>
                        </div>
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 bg-white dark:bg-gray-800">
                            <div className="flex items-center gap-2">
                                {getStatusBadge(selectedWebhook)}
                                <span className="text-xs text-gray-600 dark:text-gray-400">{getStatusLabel(selectedWebhook)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedWebhook.htmlUrl && (
                                    <a 
                                        href={selectedWebhook.htmlUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                        GitHub
                                    </a>
                                )}
                                {selectedWebhook.hookId && (
                                    <button onClick={() => setShowConfirmDialog(true)} disabled={redelivering} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg text-xs font-medium transition-colors">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        {redelivering ? 'Redelivering...' : 'Redeliver'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showConfirmDialog && selectedWebhook && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setShowConfirmDialog(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Webhook Redelivery</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to redeliver this webhook? This will trigger the webhook endpoint again with the same payload.</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3">
                                <button onClick={() => setShowConfirmDialog(false)} disabled={redelivering} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                    Cancel
                                </button>
                                <button onClick={() => { setShowConfirmDialog(false); handleRedeliver(); }} disabled={redelivering} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors">
                                    {redelivering ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Redelivering...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            OK, Redeliver
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
