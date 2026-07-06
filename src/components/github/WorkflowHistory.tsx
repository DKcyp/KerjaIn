"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";

interface WorkflowRun {
  id: number;
  guid?: string;
  name?: string;
  displayTitle?: string;
  status: string;
  statusCode?: number;
  conclusion?: string | null;
  branch?: string | null;
  commit?: string | null;
  commitMessage?: string;
  commitUrl?: string;
  event: string;
  triggeredBy?: string | null;
  avatarUrl?: string;
  createdAt?: string;
  deliveredAt?: string;
  runNumber?: number;
  htmlUrl?: string;
  duration: number | null;
  hookId?: number;
  
  // Pusher info
  pusherName?: string;
  pusherEmail?: string;
  
  // Author info
  authorName?: string;
  authorEmail?: string;
  authorUsername?: string;
  
  // Committer info
  committerName?: string;
  committerEmail?: string;
  
  // Sender info
  senderUrl?: string;
  
  // Repository info
  repositoryName?: string;
  repositoryFullName?: string;
  repositoryUrl?: string;
  repositoryPrivate?: boolean;
  repositoryDescription?: string;
  
  // Compare & commits
  compareUrl?: string;
  commitsCount?: number;
  commits?: Array<{
    id: string;
    message: string;
    author: string;
    url: string;
  }>;
  
  // Additional metadata
  created?: boolean;
  deleted?: boolean;
  forced?: boolean;
  baseRef?: string;
  
  // Ping event specific
  zenMessage?: string;
  hookDescription?: string;
  hookUrl?: string;
  hookEvents?: string[];
  hookActive?: boolean;
  
  // Pull request info
  pullRequest?: {
    number: number;
    title: string;
    state: string;
    url: string;
    user: string;
    userAvatar: string;
    baseBranch: string;
    headBranch: string;
    merged: boolean;
  } | null;
  
  // Issue info
  issue?: {
    number: number;
    title: string;
    state: string;
    url: string;
    user: string;
    userAvatar: string;
  } | null;
}

interface WorkflowHistoryProps {
  fullRepo: string;
}

export default function WorkflowHistory({ fullRepo }: WorkflowHistoryProps) {
  const { success, error: showError } = useToast();
  const [allItems, setAllItems] = useState<WorkflowRun[]>([]);
  const [displayedItems, setDisplayedItems] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'workflows' | 'webhooks'>('webhooks');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [hasWebhooks, setHasWebhooks] = useState<boolean | null>(null);
  const [selectedItem, setSelectedItem] = useState<WorkflowRun | null>(null);
  const [redelivering, setRedelivering] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [statistics, setStatistics] = useState({
    total: 0,
    success: 0,
    failure: 0,
    in_progress: 0,
    cancelled: 0
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullRepo, viewType]);

  useEffect(() => {
    // Show items from start to current page * items per page
    const endIndex = currentPage * itemsPerPage;
    setDisplayedItems(allItems.slice(0, endIndex));
  }, [currentPage, allItems, itemsPerPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setCurrentPage(1);
      
      const response = await fetch(
        `/api/github/workflows?repo=${encodeURIComponent(fullRepo)}&limit=100&type=${viewType}`,
        { cache: 'no-store' }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[WorkflowHistory] API Response:`, data);
        const items = data.workflows || data.webhooks || [];
        console.log(`[WorkflowHistory] Fetched ${items.length} items for ${viewType}`, items);
        
        // Track if webhooks are configured
        if (viewType === 'webhooks') {
          setHasWebhooks(data.totalHooks > 0);
          // hookId is now included in each webhook item from the API
        }
        
        setAllItems(items);
        setDisplayedItems(items.slice(0, itemsPerPage));
        setStatistics(data.statistics || { total: 0, success: 0, failure: 0, in_progress: 0, cancelled: 0 });
      } else {
        console.error(`[WorkflowHistory] API Error:`, response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const getStatusBadge = (item: WorkflowRun) => {
    if (item.statusCode !== undefined) {
      if (item.statusCode >= 200 && item.statusCode < 300) {
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">✓ {item.statusCode}</span>;
      }
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">✗ {item.statusCode}</span>;
    }

    if (item.status === 'in_progress' || item.status === 'queued') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center gap-1"><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>Running</span>;
    }

    const styles: Record<string, string> = {
      success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      failure: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      cancelled: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      skipped: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
    };

    const icons: Record<string, string> = { success: '✓', failure: '✗', cancelled: '⊘', skipped: '⊙' };
    const conclusion = item.conclusion || 'skipped';

    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[conclusion]}`}>{icons[conclusion]} {conclusion}</span>;
  };

  const getEventIcon = (event: string) => {
    const icons: Record<string, string> = { 
      push: '📤', 
      pull_request: '🔀', 
      workflow_dispatch: '🔄', 
      schedule: '⏰', 
      release: '🚀',
      create: '✨',
      delete: '🗑️',
      issues: '📋',
      issue_comment: '💬'
    };
    return icons[event] || '📋';
  };

  const getEventLabel = (event: string) => {
    const labels: Record<string, string> = {
      push: 'Push to branch',
      pull_request: 'Pull Request',
      workflow_dispatch: 'Manual trigger',
      schedule: 'Scheduled run',
      release: 'Release published',
      create: 'Branch/Tag created',
      delete: 'Branch/Tag deleted',
      issues: 'Issue event',
      issue_comment: 'Comment on issue'
    };
    return labels[event] || event;
  };

  const getStatusLabel = (item: WorkflowRun) => {
    if (item.statusCode !== undefined) {
      if (item.statusCode >= 200 && item.statusCode < 300) {
        return 'Delivered successfully';
      }
      if (item.statusCode >= 400 && item.statusCode < 500) {
        return 'Client error';
      }
      if (item.statusCode >= 500) {
        return 'Server error';
      }
      return `HTTP ${item.statusCode}`;
    }

    if (item.status === 'in_progress' || item.status === 'queued') {
      return 'Running...';
    }

    const labels: Record<string, string> = {
      success: 'Completed successfully',
      failure: 'Failed',
      cancelled: 'Cancelled by user',
      skipped: 'Skipped'
    };
    return labels[item.conclusion || 'skipped'] || item.conclusion || 'Unknown';
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleRedeliver = async () => {
    if (!selectedItem || !selectedItem.hookId) return;

    try {
      setRedelivering(true);
      const response = await fetch('/api/github/webhooks/redeliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: fullRepo,
          hookId: selectedItem.hookId,
          deliveryId: selectedItem.id
        })
      });

      if (response.ok) {
        success('Webhook redelivered successfully!');
        setSelectedItem(null);
        setTimeout(fetchData, 2000); // Refresh list after 2 seconds
      } else {
        const error = await response.json();
        console.error('Failed to redeliver:', error);
        showError(`Failed to redeliver: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to redeliver webhook:', error);
      showError('Failed to redeliver webhook. Please try again.');
    } finally {
      setRedelivering(false);
    }
  };

  const hasMore = displayedItems.length < allItems.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white"> Webhook History</h3>
          
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button onClick={() => setViewType('webhooks')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewType === 'webhooks' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}>Webhooks</button>
            <button onClick={() => setViewType('workflows')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewType === 'workflows' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}>Workflows</button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-medium">✓ {statistics.success}</span>
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-medium">✗ {statistics.failure}</span>
            {statistics.in_progress > 0 && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-medium animate-pulse">⟳ {statistics.in_progress}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading} className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50" title="Refresh">
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {displayedItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            {viewType === 'webhooks' ? (
              hasWebhooks === false ? (
                <>
                  <p className="font-medium text-orange-600 dark:text-orange-400">No webhooks configured</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Configure a webhook in GitHub repository settings to see delivery history
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">No webhook deliveries yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Webhook is configured but no events have been triggered yet
                  </p>
                </>
              )
            ) : (
              <>
                <p className="font-medium">No workflow runs yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  No workflows have been executed yet
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {displayedItems.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {item.avatarUrl && <img src={item.avatarUrl} alt={item.triggeredBy || 'User'} className="w-8 h-8 rounded-full ring-2 ring-gray-200 dark:ring-gray-700" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getEventIcon(item.event)}</span>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{getEventLabel(item.event)}</span>
                        {item.htmlUrl ? (
                          <a 
                            href={item.htmlUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {item.name || item.event} {item.runNumber ? `#${item.runNumber}` : ''}
                          </a>
                        ) : (
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.name || item.event} {item.guid ? `(${item.guid.substring(0, 8)})` : ''}</span>
                        )}
                        {getStatusBadge(item)}
                      </div>
                      {(item.displayTitle || item.commitMessage) && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">{item.displayTitle || item.commitMessage}</p>}
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                        {item.branch && <><span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>{item.branch}</span><span>•</span></>}
                        {item.commit && <><span className="font-mono">{item.commit.substring(0, 7)}</span><span>•</span></>}
                        {item.triggeredBy && <><span>by {item.triggeredBy}</span><span>•</span></>}
                        {item.duration !== null && <><span>{formatDuration(item.duration)}</span><span>•</span></>}
                        <span>{new Date(item.deliveredAt || item.createdAt || Date.now()).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  {item.htmlUrl && (
                    <a href={item.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="View on GitHub">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
            <button onClick={handleLoadMore} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              Load More ({displayedItems.length} of {allItems.length})
            </button>
          </div>
        )}

        {!hasMore && displayedItems.length > 0 && (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              All items loaded ({allItems.length} total)
              {viewType === 'webhooks' && allItems.length >= 30 && (
                <span className="text-xs text-gray-400 ml-2">(GitHub limits webhook history to 30 items)</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getEventIcon(selectedItem.event)}</span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{getEventLabel(selectedItem.event)}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedItem.name || selectedItem.guid}</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {/* Repository Info */}
              {selectedItem.repositoryFullName && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-blue-900 dark:text-blue-100 text-xs truncate">{selectedItem.repositoryFullName}</span>
                        {selectedItem.repositoryPrivate && (
                          <span className="px-1.5 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded flex-shrink-0">Private</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Commit Message */}
              {selectedItem.commitMessage && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Commit Message</label>
                  <div className="text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                    {selectedItem.commitMessage}
                  </div>
                </div>
              )}

              {/* Branch & Commit - Inline */}
              <div className="grid grid-cols-2 gap-2">
                {selectedItem.branch && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1 mb-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                      Branch
                    </label>
                    <p className="text-xs text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">{selectedItem.branch}</p>
                  </div>
                )}
                {selectedItem.commit && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Commit SHA</label>
                    <p className="text-xs text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">{selectedItem.commit.substring(0, 7)}</p>
                  </div>
                )}
              </div>

              {/* Pusher & Author - Side by side */}
              <div className="grid grid-cols-2 gap-2">
                {selectedItem.pusherName && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2">
                    <label className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-1 block">📤 Pusher</label>
                    <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{selectedItem.pusherName}</div>
                    {selectedItem.pusherEmail && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{selectedItem.pusherEmail}</div>
                    )}
                  </div>
                )}

                {selectedItem.authorName && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
                    <label className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase mb-1 block">✍️ Author</label>
                    <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{selectedItem.authorName}</div>
                    {selectedItem.authorEmail && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{selectedItem.authorEmail}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Triggered By */}
              {selectedItem.triggeredBy && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Triggered By</label>
                  <div className="flex items-center gap-2">
                    {selectedItem.avatarUrl && <img src={selectedItem.avatarUrl} alt={selectedItem.triggeredBy} className="w-5 h-5 rounded-full ring-2 ring-gray-200 dark:ring-gray-700" />}
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{selectedItem.triggeredBy}</span>
                  </div>
                </div>
              )}

              {/* Commits List - Compact */}
              {selectedItem.commitsCount !== undefined && selectedItem.commitsCount > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                    📝 Commits ({selectedItem.commitsCount})
                  </label>
                  <div className="space-y-1.5 bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto">
                    {selectedItem.commits?.map((commit) => (
                      <div key={commit.id} className="text-xs border-l-2 border-blue-500 pl-2 py-0.5">
                        <div className="font-mono text-gray-500 dark:text-gray-400">{commit.id.substring(0, 7)}</div>
                        <div className="text-gray-900 dark:text-white line-clamp-1">{commit.message}</div>
                        <div className="text-gray-500 dark:text-gray-400">by {commit.author}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Flags */}
              {(selectedItem.created || selectedItem.deleted || selectedItem.forced) && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.created && (
                    <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">✨ Created</span>
                  )}
                  {selectedItem.deleted && (
                    <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">🗑️ Deleted</span>
                  )}
                  {selectedItem.forced && (
                    <span className="px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">⚡ Force Push</span>
                  )}
                </div>
              )}

              {/* Timing - Compact */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Delivered: {new Date(selectedItem.createdAt || selectedItem.deliveredAt || Date.now()).toLocaleString('id-ID', { 
                  day: '2-digit', 
                  month: 'short',
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
                {selectedItem.duration !== null && ` • Duration: ${formatDuration(selectedItem.duration)}`}
              </div>
            </div>

            {/* Actions - Sticky Footer with Status */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedItem)}
                <span className="text-xs text-gray-600 dark:text-gray-400">{getStatusLabel(selectedItem)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedItem.htmlUrl && (
                  <a 
                    href={selectedItem.htmlUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    GitHub
                  </a>
                )}
                
                {selectedItem.hookId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConfirmDialog(true);
                    }}
                    disabled={redelivering}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m1 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {redelivering ? 'Redelivering...' : 'Redeliver'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Redeliver Dialog */}
      {showConfirmDialog && selectedItem && (
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
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Confirm Webhook Redelivery
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Are you sure you want to redeliver this webhook? This will trigger the webhook endpoint again with the same payload.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={redelivering}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmDialog(false);
                    handleRedeliver();
                  }}
                  disabled={redelivering}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
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
