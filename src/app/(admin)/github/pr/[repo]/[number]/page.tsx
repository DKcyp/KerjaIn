"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface PRDetail {
  number: number;
  title: string;
  body: string;
  state: string;
  user: { login: string; avatar_url: string };
  head: { ref: string; sha: string };
  base: { ref: string };
  created_at: string;
  mergeable: boolean | null;
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
  html_url: string;
}

interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export default function PRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const repo = params.repo as string;
  const number = params.number as string;

  const [pr, setPr] = useState<PRDetail | null>(null);
  const [files, setFiles] = useState<FileChange[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [targetBranch, setTargetBranch] = useState<string>("");
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [loadedDiffs, setLoadedDiffs] = useState<Set<string>>(new Set());
  const [fileContents, setFileContents] = useState<Record<string, { content: string; sha: string }>>({});
  const [inlineEditingFile, setInlineEditingFile] = useState<string | null>(null);
  const [inlineEditContent, setInlineEditContent] = useState<Record<string, string>>({});
  const [conflictModal, setConflictModal] = useState<{ show: boolean; action: string; filename: string; preview: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info" | "success";
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });
  const [org, setOrg] = useState<string>("");




  useEffect(() => {
    const fetchActiveUsername = async () => {
      try {
        const res = await fetch('/api/github/repositories');
        if (res.ok) {
          const data = await res.json();
          // Find the repo that matches this name
          const repoData = data.repositories.find((r: any) => r.name === repo);
          if (repoData) {
            setOrg(repoData.owner_source);
          } else {
            setError(`Repository "${repo}" not found.`);
          }
        } else {
          setError('GitHub credential not configured. Please contact Super Admin.');
        }
      } catch (error) {
        console.error('Failed to fetch repository owner:', error);
        setError('Failed to load GitHub configuration. Please contact Super Admin.');
      }
    };
    fetchActiveUsername();
  }, []);

  useEffect(() => {
    // Only fetch once when org is available (org is fetched from first useEffect)
    if (repo && number && org) {
      // Use sessionStorage to track if we've already fetched this PR in this session
      const sessionKey = `pr-fetched-${repo}-${number}`;
      const cacheKey = `pr-data-${repo}-${number}`;
      const hasFetched = sessionStorage.getItem(sessionKey);
      const cachedData = sessionStorage.getItem(cacheKey);
      
      // Check if we need to refresh (e.g., from localStorage flag after conflict resolution)
      const needsRefresh = localStorage.getItem(`pr-${repo}-${number}-needs-refresh`);
      
      if (needsRefresh === 'true') {
        localStorage.removeItem(`pr-${repo}-${number}-needs-refresh`);
        
        // Show loading toast
        toast.success('Checking PR status after conflict resolution...');
        
        // Refresh after a delay to let GitHub process
        setTimeout(() => {
          fetchPRDetail();
          sessionStorage.setItem(sessionKey, 'true');
        }, 2000);
      } else if (hasFetched && cachedData) {
        // Load from cache - no need to fetch again
        try {
          const cached = JSON.parse(cachedData);
          setPr(cached.pr);
          setFiles(cached.files);
          setTargetBranch(cached.targetBranch);
          setBranches(cached.branches);
          
          // Auto-expand all files
          const allFilenames = cached.files.map((f: FileChange) => f.filename);
          setExpandedFiles(new Set(allFilenames));
          
          setLoading(false);
        } catch (e) {
          // If cache is corrupted, fetch fresh data
          fetchPRDetail();
          sessionStorage.setItem(sessionKey, 'true');
        }
      } else {
        // Normal fetch on first mount - only if not fetched yet
        fetchPRDetail();
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]); // Only depend on org - fetch once when org is loaded

  const fetchPRDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const fullRepo = `${org}/${repo}`;

      const response = await fetch(`/api/github/pull-requests/${encodeURIComponent(fullRepo)}/${number}`);
      if (!response.ok) throw new Error("Failed to fetch PR details");

      const data = await response.json();
      setPr(data.pr);
      setFiles(data.files || []);
      setTargetBranch(data.pr.base.ref);

      // Auto-expand all files by default
      const allFilenames = (data.files || []).map((f: FileChange) => f.filename);
      setExpandedFiles(new Set(allFilenames));

      let branchList: string[] = [];
      const branchesRes = await fetch(`/api/github/branches?repo=${encodeURIComponent(fullRepo)}`);
      if (branchesRes.ok) {
        const branchesData = await branchesRes.json();
        branchList = branchesData.branches.map((b: any) => b.name);
        setBranches(branchList);
      }
      
      // Cache the data in sessionStorage
      const cacheKey = `pr-data-${repo}-${number}`;
      sessionStorage.setItem(cacheKey, JSON.stringify({
        pr: data.pr,
        files: data.files || [],
        targetBranch: data.pr.base.ref,
        branches: branchList
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  const toggleFileExpand = (filename: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const loadDiff = (filename: string) => {
    const newLoaded = new Set(loadedDiffs);
    newLoaded.add(filename);
    setLoadedDiffs(newLoaded);
  };

  const isLargeDiff = (file: FileChange): boolean => {
    // Consider a diff "large" if:
    // 1. Total changes > 500 lines, OR
    // 2. File has > 1000 lines in patch
    const totalChanges = file.additions + file.deletions;
    const patchLines = file.patch ? file.patch.split('\n').length : 0;
    return totalChanges > 500 || patchLines > 1000;
  };



  const handleInlineEdit = async (filename: string) => {
    // Toggle inline edit mode
    if (inlineEditingFile === filename) {
      setInlineEditingFile(null);
      return;
    }

    setInlineEditingFile(filename);

    // Get file content if not already loaded
    if (!inlineEditContent[filename]) {
      try {
        const fullRepo = `${org}/${repo}`;

        const response = await fetch(
          `/api/github/file-content?repo=${encodeURIComponent(fullRepo)}&path=${encodeURIComponent(filename)}&ref=${pr?.head.ref}`
        );

        if (response.ok) {
          const data = await response.json();
          setInlineEditContent(prev => ({ ...prev, [filename]: data.content }));
          setFileContents(prev => ({
            ...prev,
            [filename]: { content: data.content, sha: data.sha }
          }));
        } else {
          throw new Error("Failed to fetch file content");
        }
      } catch (err: any) {
        console.error("Failed to fetch file content:", err);
        toast.error(`Error loading file: ${err.message}`);
      }
    }
  };

  const handleSaveInlineEdit = async (filename: string) => {
    if (!pr) return;

    try {
      const fullRepo = `${org}/${repo}`;
      const fileInfo = fileContents[filename];

      if (!fileInfo) {
        throw new Error("File info not found. Please reload the file.");
      }

      console.log('[Save Inline] Saving file:', filename);
      console.log('[Save Inline] Branch:', pr.head.ref);
      console.log('[Save Inline] SHA:', fileInfo.sha?.substring(0, 7));

      const response = await fetch(`/api/github/file-content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: fullRepo,
          path: filename,
          content: inlineEditContent[filename],
          sha: fileInfo.sha,
          branch: pr.head.ref,
          message: `Update ${filename} via inline editor`,
        }),
      });

      const responseData = await response.json();
      console.log('[Save Inline] Response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to update file (${response.status})`);
      }

      toast.success(`File saved successfully!\n✅ Commit: ${responseData.commit?.sha?.substring(0, 7) || 'N/A'}\n📁 Branch: ${pr.head.ref}`);
      setInlineEditingFile(null);

      // Refresh PR details to get updated file info
      setTimeout(() => fetchPRDetail(), 1000);
    } catch (err: any) {
      console.error('[Save Inline] Error:', err);
      toast.error(`Error saving file:\n${err.message}`);
    }
  };

  // Smart conflict resolution functions with deduplication
  const resolveConflict = (content: string, action: 'current' | 'incoming' | 'both'): string => {
    let resolved = content;

    if (action === 'current') {
      resolved = content.replace(
        /<<<<<<< .*?\n([\s\S]*?)\n=======\n[\s\S]*?\n>>>>>>> .*?\n/g,
        '$1\n'
      );
    } else if (action === 'incoming') {
      resolved = content.replace(
        /<<<<<<< .*?\n[\s\S]*?\n=======\n([\s\S]*?)\n>>>>>>> .*?\n/g,
        '$1\n'
      );
    } else if (action === 'both') {
      // Smart merge: intelligently combine both versions
      resolved = content.replace(
        /<<<<<<< .*?\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> .*?\n/g,
        (match, current, incoming) => {
          const currentTrim = current.trim();
          const incomingTrim = incoming.trim();

          // If both are arrays/objects, try to merge them intelligently
          if (currentTrim.includes('[') && incomingTrim.includes('[')) {
            // Extract array content
            const currentMatch = currentTrim.match(/\[([\s\S]*)\]/);
            const incomingMatch = incomingTrim.match(/\[([\s\S]*)\]/);

            if (currentMatch && incomingMatch) {
              const currentItems = currentMatch[1].trim();
              const incomingItems = incomingMatch[1].trim();

              // Combine array items
              const combined = currentItems && incomingItems
                ? `${currentItems},\n${incomingItems}`
                : currentItems || incomingItems;

              return `[\n${combined}\n];\n`;
            }
          }

          // Default: just concatenate both
          return `${currentTrim}\n${incomingTrim}\n`;
        }
      );
    }

    return resolved;
  };

  const acceptCurrent = (filename: string) => {
    const content = inlineEditContent[filename] || '';
    const preview = resolveConflict(content, 'current');
    setConflictModal({
      show: true,
      action: 'Accept Current Changes',
      filename,
      preview
    });
  };

  const acceptIncoming = (filename: string) => {
    const content = inlineEditContent[filename] || '';
    const preview = resolveConflict(content, 'incoming');
    setConflictModal({
      show: true,
      action: 'Accept Incoming Changes',
      filename,
      preview
    });
  };

  const acceptBoth = (filename: string) => {
    const content = inlineEditContent[filename] || '';
    const preview = resolveConflict(content, 'both');
    setConflictModal({
      show: true,
      action: 'Merge Both (Smart)',
      filename,
      preview
    });
  };

  const applyConflictResolution = () => {
    if (!conflictModal) return;
    setInlineEditContent(prev => ({ ...prev, [conflictModal.filename]: conflictModal.preview }));
    setConflictModal(null);
  };

  const handleMerge = async () => {
    if (!pr || !user) return;

    setConfirmDialog({
      show: true,
      title: 'Approve and Merge PR',
      message: `Approve dan merge PR ini ke branch ${targetBranch}?\n\nPR #${pr.number}: ${pr.title}\nFrom: ${pr.head.ref} → To: ${targetBranch}`,
      confirmText: 'Merge PR',
      type: 'success',
      onConfirm: async () => {
        setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => { } });

        try {
          setMerging(true);
          const fullRepo = `${org}/${repo}`;

          const response = await fetch(`/api/github/merge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              repo: fullRepo,
              prNumber: pr.number,
              targetBranch,
              approvedBy: user.namaLengkap,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();

            // Handle 405 Not Mergeable (Conflict)
            if (response.status === 405) {
              toast.error("⚠️ Conflict detected! Reloading to update status...");
              // Hard refresh to force backend to re-check mergeability
              setTimeout(() => {
                window.location.reload();
              }, 1500);
              return;
            }

            throw new Error(errorData.error || "Failed to merge PR");
          }

          toast.success(`PR berhasil di-merge ke ${targetBranch}!\n✅ PR #${pr.number} merged successfully`);

          setTimeout(() => {
            router.push("/github");
          }, 1500);
        } catch (err: any) {
          toast.error(`Error: ${err.message}`);
          setMerging(false);
        }
      },
    });
  };

  const handleClosePR = async () => {
    if (!pr || !user) return;

    setConfirmDialog({
      show: true,
      title: 'Close Pull Request',
      message: `Tutup Pull Request ini tanpa merge?\n\nPR #${pr.number}: ${pr.title}`,
      confirmText: 'Close Pull Request',
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => { } });

        try {
          setClosing(true);
          const fullRepo = `${org}/${repo}`;

          const response = await fetch(`/api/github/pull-requests/${encodeURIComponent(fullRepo)}/${number}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state: 'closed' }),
          });

          if (!response.ok) {
            throw new Error("Failed to close PR");
          }

          toast.success(`PR #${pr.number} berhasil ditutup!`);

          setTimeout(() => {
            router.push("/github");
          }, 1500);
        } catch (err: any) {
          toast.error(`Error: ${err.message}`);
          setClosing(false);
        }
      },
    });
  };







  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading PR details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-300 font-semibold mb-2">Error</h3>
          <p className="text-red-600 dark:text-red-400">{error || "PR not found"}</p>
          <button onClick={() => router.push("/github")} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Back to GitHub
          </button>
        </div>
      </div>
    );
  }

  const hasConflicts = pr.mergeable === false;
  // Warning for leftover markers (non-blocking)
  const hasLeftoverMarkers = files.some(file =>
    file.patch && (
      file.patch.includes('<<<<<<<') ||
      file.patch.includes('=======') ||
      file.patch.includes('>>>>>>>')
    )
  );

  const canMerge = pr.state === "open" && !hasConflicts;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button onClick={() => router.push(`/github/repo/${repo}`)} className="group flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mb-4">
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="font-medium">Back</span>
      </button>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        #{pr.number} {pr.title}
      </h1>
      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-6">
        <img src={pr.user.avatar_url} alt={pr.user.login} className="w-6 h-6 rounded-full" />
        <span>{pr.user.login}</span>
        <span>•</span>
        <span>{new Date(pr.created_at).toLocaleDateString()}</span>
      </div>

      {/* 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Branch Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
              <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg font-medium text-sm">{pr.head.ref}</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span className="px-3 py-1.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg font-medium text-sm">{pr.base.ref}</span>
            </div>
            <div className="flex gap-6 text-sm">
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {pr.additions}
              </span>
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                {pr.deletions}
              </span>
              <span className="text-gray-600 dark:text-gray-400">{pr.changed_files} files changed</span>
            </div>
          </div>

          {/* Conflict Warning */}
          {hasConflicts && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-red-800 dark:text-red-300 font-semibold">⚠️ This PR has merge conflicts</p>
                    <p className="text-red-700 dark:text-red-400 text-sm">Resolve conflicts before merging</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/github/conflict/${repo}/${number}`)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Resolve Conflicts
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          {pr.body && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{pr.body}</p>
            </div>
          )}

          {/* Files Changed */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Files Changed ({files.length})</h3>
            <div className="space-y-3">
              {files.map((file, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* File Header */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer" onClick={() => toggleFileExpand(file.filename)}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedFiles.has(file.filename) ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className={`px-2 py-1 text-xs rounded-md font-medium ${file.status === "added" ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : file.status === "removed" ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300" : "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"}`}>
                        {file.status}
                      </span>
                      <span className="font-mono text-sm text-gray-900 dark:text-white truncate">{file.filename}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div className="flex gap-3 text-sm">
                        <span className="text-green-600 dark:text-green-400 font-medium">+{file.additions}</span>
                        <span className="text-red-600 dark:text-red-400 font-medium">-{file.deletions}</span>
                      </div>
                      {file.status !== "removed" && file.patch?.includes('<<<<<<<') && (
                        <button onClick={(e) => { e.stopPropagation(); handleInlineEdit(file.filename); }} className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${inlineEditingFile === file.filename ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          {inlineEditingFile === file.filename ? 'Editing...' : 'Edit Inline'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* File Diff */}
                  {expandedFiles.has(file.filename) && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      {inlineEditingFile === file.filename ? (
                        /* Inline Editor Mode */
                        <div className="bg-gray-900 dark:bg-gray-950">
                          {/* Editor Toolbar */}
                          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              <span className="font-semibold">Inline Editing Mode</span>
                              {inlineEditContent[file.filename]?.includes('<<<<<<<') && (
                                <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">Conflicts Detected</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Quick Conflict Resolution Buttons */}
                              {inlineEditContent[file.filename]?.includes('<<<<<<<') && (
                                <div className="flex items-center gap-1 mr-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 mr-1">Quick Fix:</span>
                                  <button
                                    onClick={() => acceptCurrent(file.filename)}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors flex items-center gap-1"
                                    title="Keep your changes, discard incoming"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Current
                                  </button>
                                  <button
                                    onClick={() => acceptIncoming(file.filename)}
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center gap-1"
                                    title="Keep incoming changes, discard yours"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                    </svg>
                                    Incoming
                                  </button>
                                  <button
                                    onClick={() => acceptBoth(file.filename)}
                                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors flex items-center gap-1"
                                    title="Keep both changes"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Both
                                  </button>
                                </div>
                              )}
                              <button onClick={() => handleSaveInlineEdit(file.filename)} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Save Changes
                              </button>
                              <button onClick={() => setInlineEditingFile(null)} className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md transition-colors">
                                Cancel
                              </button>
                            </div>
                          </div>

                          {/* Editable Content */}
                          <div className="flex">
                            {/* Line Numbers */}
                            <div className="bg-gray-800 dark:bg-gray-900 border-r border-gray-700 p-4 select-none" style={{ minWidth: '60px' }}>
                              <div className="text-xs font-mono text-gray-500 text-right leading-6">
                                {(inlineEditContent[file.filename] || '').split('\n').map((_, i) => (
                                  <div key={i}>{i + 1}</div>
                                ))}
                              </div>
                            </div>

                            {/* Simple Highlighted Editor */}
                            <div className="flex-1 bg-gray-900 overflow-auto">
                              <div className="p-4 min-h-[400px]">
                                {(inlineEditContent[file.filename] || '').split('\n').map((line, i) => {
                                  let bgColor = '';
                                  let textColor = 'text-gray-100';
                                  let borderLeft = '';
                                  let fontWeight = '';
                                  let padding = 'px-3 py-1';

                                  // Conflict markers - VERY BRIGHT
                                  if (line.includes('<<<<<<<')) {
                                    bgColor = 'bg-red-600';
                                    textColor = 'text-white';
                                    borderLeft = 'border-l-4 border-red-300';
                                    fontWeight = 'font-bold';
                                    padding = 'px-3 py-1.5';
                                  } else if (line.includes('=======')) {
                                    bgColor = 'bg-yellow-600';
                                    textColor = 'text-gray-900';
                                    borderLeft = 'border-l-4 border-yellow-300';
                                    fontWeight = 'font-bold';
                                    padding = 'px-3 py-1.5';
                                  } else if (line.includes('>>>>>>>')) {
                                    bgColor = 'bg-red-600';
                                    textColor = 'text-white';
                                    borderLeft = 'border-l-4 border-red-300';
                                    fontWeight = 'font-bold';
                                    padding = 'px-3 py-1.5';
                                  }
                                  // Added lines
                                  else if (line.trim().startsWith('+') && !line.startsWith('+++')) {
                                    bgColor = 'bg-green-700/60';
                                    textColor = 'text-green-100';
                                    borderLeft = 'border-l-2 border-green-400';
                                  }
                                  // Removed lines
                                  else if (line.trim().startsWith('-') && !line.startsWith('---')) {
                                    bgColor = 'bg-red-700/60';
                                    textColor = 'text-red-100';
                                    borderLeft = 'border-l-2 border-red-400';
                                  }

                                  return (
                                    <div
                                      key={i}
                                      className={`${bgColor} ${textColor} ${borderLeft} ${fontWeight} ${padding} font-mono text-sm leading-6 group hover:bg-opacity-80 transition-colors`}
                                    >
                                      <input
                                        type="text"
                                        value={line}
                                        onChange={(e) => {
                                          const lines = (inlineEditContent[file.filename] || '').split('\n');
                                          lines[i] = e.target.value;
                                          setInlineEditContent(prev => ({ ...prev, [file.filename]: lines.join('\n') }));
                                        }}
                                        className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-inherit font-inherit"
                                        spellCheck={false}
                                      />
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Conflict Quick Actions Guide */}
                              {inlineEditContent[file.filename]?.includes('<<<<<<<') && (
                                <div className="fixed top-24 right-8 bg-gradient-to-br from-blue-600 to-purple-600 border-2 border-blue-300 rounded-xl p-4 text-white shadow-2xl z-30 max-w-sm">
                                  <div className="font-bold mb-3 flex items-center gap-2 text-lg">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                    </svg>
                                    QUICK RESOLVE
                                  </div>

                                  <div className="space-y-3 text-sm">
                                    <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-xs font-bold">✓</div>
                                        <span className="font-semibold">Accept Current</span>
                                      </div>
                                      <p className="text-xs opacity-90 ml-8">Keep YOUR changes, discard incoming</p>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-xs font-bold">↓</div>
                                        <span className="font-semibold">Accept Incoming</span>
                                      </div>
                                      <p className="text-xs opacity-90 ml-8">Keep THEIR changes, discard yours</p>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center text-xs font-bold">+</div>
                                        <span className="font-semibold">Accept Both</span>
                                      </div>
                                      <p className="text-xs opacity-90 ml-8">Keep BOTH changes (merge)</p>
                                    </div>
                                  </div>

                                  <div className="mt-4 pt-3 border-t border-white/20 text-xs opacity-90">
                                    💡 Click buttons in toolbar for instant resolve!
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : file.patch ? (
                        /* Diff View Mode */
                        isLargeDiff(file) && !loadedDiffs.has(file.filename) ? (
                          /* Large Diff - Show Load Button */
                          <div className="bg-gray-50 dark:bg-gray-900 p-8 flex flex-col items-center justify-center border-t border-gray-200 dark:border-gray-700">
                            <div className="text-center mb-4">
                              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3">
                                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {file.additions + file.deletions} <span className="text-gray-500 dark:text-gray-400 font-normal">lines changed</span>
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Large diffs are not rendered by default.
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                +{file.additions} additions, -{file.deletions} deletions
                              </p>
                            </div>
                            <button
                              onClick={() => loadDiff(file.filename)}
                              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Load diff
                            </button>
                          </div>
                        ) : (
                          /* Normal Diff View */
                          <div className="bg-gray-900 dark:bg-gray-950 p-4 overflow-x-auto">
                            <pre className="text-xs font-mono text-gray-300 leading-relaxed">
                              {file.patch.split('\n').map((line, i) => (
                                <div key={i} className={`${line.startsWith('+') && !line.startsWith('+++') ? 'bg-green-900/30 text-green-300' : line.startsWith('-') && !line.startsWith('---') ? 'bg-red-900/30 text-red-300' : 'text-gray-400'} px-2 py-0.5`}>
                                  {line || ' '}
                                </div>
                              ))}
                            </pre>
                          </div>
                        )
                      ) : (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                          No diff available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Merge Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-1.5 rounded-lg ${canMerge ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                <svg className={`w-5 h-5 ${canMerge ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {canMerge ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  )}
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {canMerge ? "Ready to Merge" : "Merge Blocked"}
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Target Branch:</label>
                <div className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{pr.base.ref}</span>
                  <span className="text-xs text-gray-500 font-normal ml-auto">(PR Target)</span>
                </div>
              </div>

              {hasConflicts ? (
                <button
                  onClick={() => router.push(`/github/conflict/${repo}/${number}`)}
                  className="w-full px-4 py-2.5 rounded-lg font-medium text-sm bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Resolve Conflicts First
                </button>
              ) : (
                <button onClick={handleMerge} disabled={!canMerge || merging || closing} className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${canMerge && !merging && !closing ? "bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md" : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"}`}>
                  {merging ? "Merging..." : `Approve & Merge to ${targetBranch}`}
                </button>
              )}

              {pr.state === 'open' && (
                <button
                  onClick={handleClosePR}
                  disabled={merging || closing}
                  className="w-full mt-2 px-4 py-2.5 border border-red-200 dark:border-red-900/50 rounded-lg font-medium text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {closing ? "Closing..." : "Close Pull Request"}
                </button>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Merge to branch target PR
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {conflictModal?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {conflictModal.action}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Preview changes for <span className="font-mono text-blue-600 dark:text-blue-400">{conflictModal.filename}</span>
                  </p>
                </div>
                <button
                  onClick={() => setConflictModal(null)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body - Preview */}
            <div className="flex-1 overflow-auto p-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Preview Result</h4>
                </div>
                <div className="bg-gray-900 dark:bg-gray-950 rounded-lg overflow-hidden border border-gray-700">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                    <span className="text-xs text-gray-400 font-mono">{conflictModal.filename}</span>
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Conflicts Resolved
                    </span>
                  </div>
                  <div className="p-4 max-h-96 overflow-auto">
                    <pre className="text-sm text-gray-100 font-mono leading-relaxed whitespace-pre-wrap">
                      {conflictModal.preview}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-semibold mb-1">What will happen:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                      <li>Conflict markers will be removed</li>
                      <li>Changes will be applied to the editor</li>
                      <li>You can review and save when ready</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-end gap-3">
              <button
                onClick={() => setConflictModal(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={applyConflictResolution}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        show={confirmDialog.show}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type || "info"}
        confirmText={confirmDialog.confirmText || "OK"}
        cancelText={confirmDialog.cancelText || "Cancel"}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => { } })}
      />
    </div>
  );
}
