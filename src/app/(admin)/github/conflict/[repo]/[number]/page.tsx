"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface ConflictFile {
  filename: string;
  headContent: string;
  baseContent: string;
  headSha: string;
  baseSha: string;
  patch: string;
  hasConflictMarkers?: boolean; // From merge session
}

export default function ConflictResolvePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const repo = params.repo as string;
  const number = params.number as string;

  const [files, setFiles] = useState<ConflictFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prData, setPrData] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [resolvedContent, setResolvedContent] = useState<Record<string, string>>({});
  const [resolvedChoices, setResolvedChoices] = useState<Record<string, 'current' | 'incoming'>>({});
  const [resolvedFiles, setResolvedFiles] = useState<Set<string>>(new Set()); // Track resolved files locally
  const [previewModal, setPreviewModal] = useState<{
    show: boolean;
    type: 'current' | 'incoming' | 'both' | null;
    preview: string;
  }>({
    show: false,
    type: null,
    preview: '',
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });
  const [org, setOrg] = useState<string>("");

  // Fetch active GitHub username/org
  useEffect(() => {
    const fetchActiveUsername = async () => {
      try {
        const res = await fetch('/api/github/active-username');
        if (res.ok) {
          const data = await res.json();
          setOrg(data.username);
        } else {
          toast.error('GitHub credential not configured. Please contact Super Admin.');
        }
      } catch (error) {
        console.error('Failed to fetch active username:', error);
        toast.error('Failed to load GitHub configuration. Please contact Super Admin.');
      }
    };
    fetchActiveUsername();
  }, []);

  useEffect(() => {
    if (org) {
      initConflictResolution();
    }
  }, [org]);

  const initConflictResolution = async () => {
    try {
      setLoading(true);
      const fullRepo = `${org}/${repo}`;

      // Fetch PR details first
      const prRes = await fetch(`/api/github/pull-requests/${encodeURIComponent(fullRepo)}/${number}`);
      if (!prRes.ok) throw new Error("Failed to fetch PR");
      const prData = await prRes.json();
      setPrData(prData);

      // Start merge session
      const startRes = await fetch('/api/github/git-resolve-conflict?action=start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: org,
          repo: repo,
          pullRequestNumber: parseInt(number),
        }),
      });

      if (!startRes.ok) {
        const errorData = await startRes.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Init] Failed to start merge:', errorData);
        setLoading(false);
        return;
      }

      const startData = await startRes.json();

      if (!startData.hasConflicts) {
        console.log('[Init] No conflicts');
        setFiles([]);
        setLoading(false);
        return;
      }

      setSessionId(startData.sessionId);
      console.log('[Init] Session created:', startData.sessionId);

      // Fetch file content from merge session
      const conflictFiles: ConflictFile[] = [];
      for (const filePath of startData.conflictedFiles) {
        const readRes = await fetch('/api/github/git-resolve-conflict?action=read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: startData.sessionId,
            filePath: filePath,
          }),
        });

        if (readRes.ok) {
          const readData = await readRes.json();
          const parsed = parseConflictMarkers(readData.content);

          conflictFiles.push({
            filename: filePath,
            headContent: parsed.incoming,
            baseContent: parsed.current,
            headSha: '',
            baseSha: '',
            patch: '',
            hasConflictMarkers: readData.hasConflictMarkers, // Store from backend
          });
        }
      }

      setFiles(conflictFiles);
      setLoading(false);
    } catch (err: any) {
      console.error('[Init] Error:', err);
      setLoading(false);
    }
  };



  // Parse conflict markers to extract current and incoming changes
  const parseConflictMarkers = (content: string): { current: string; incoming: string } => {
    const lines = content.split('\n');
    const currentLines: string[] = [];
    const incomingLines: string[] = [];

    let state: 'normal' | 'current' | 'incoming' = 'normal';

    for (const line of lines) {
      if (line.startsWith('<<<<<<<')) {
        // After <<<<<<< comes the CURRENT changes (from HEAD/current branch)
        state = 'current';
        continue;
      } else if (line.startsWith('=======')) {
        // After ======= comes the INCOMING changes (from base/target branch)
        state = 'incoming';
        continue;
      } else if (line.startsWith('>>>>>>>')) {
        state = 'normal';
        continue;
      }

      if (state === 'current') {
        currentLines.push(line);
      } else if (state === 'incoming') {
        incomingLines.push(line);
      } else {
        // Normal lines (outside conflict) go to both
        currentLines.push(line);
        incomingLines.push(line);
      }
    }

    return {
      current: currentLines.join('\n'),
      incoming: incomingLines.join('\n'),
    };
  };

  const smartMerge = (headContent: string, baseContent: string, filename: string): string => {
    console.log('[Smart Merge] Starting merge for:', filename);

    // For JS/JSON files, try to merge arrays/objects intelligently
    if (filename.endsWith('.json') || filename.endsWith('.js')) {
      try {
        let headJson, baseJson;

        // Handle JS files that export arrays/objects
        if (filename.endsWith('.js')) {
          // Clean up content first
          const cleanHead = headContent.trim();
          const cleanBase = baseContent.trim();

          console.log('[Smart Merge] Clean head preview:', cleanHead.substring(0, 100));
          console.log('[Smart Merge] Clean base preview:', cleanBase.substring(0, 100));

          // Try to extract JSON from various JS patterns
          let headJsonStr = null;
          let baseJsonStr = null;

          // Pattern 1: export default [...]
          if (cleanHead.startsWith('export default')) {
            const match = cleanHead.match(/export\s+default\s+([\s\S]+?)(?:;?\s*)$/);
            if (match) {
              headJsonStr = match[1].replace(/;$/, '').trim();
            }
          }

          if (cleanBase.startsWith('export default')) {
            const match = cleanBase.match(/export\s+default\s+([\s\S]+?)(?:;?\s*)$/);
            if (match) {
              baseJsonStr = match[1].replace(/;$/, '').trim();
            }
          }

          // Pattern 2: Just array/object (already extracted from conflict markers)
          if (!headJsonStr && (cleanHead.startsWith('[') || cleanHead.startsWith('{'))) {
            headJsonStr = cleanHead;
          }

          if (!baseJsonStr && (cleanBase.startsWith('[') || cleanBase.startsWith('{'))) {
            baseJsonStr = cleanBase;
          }

          if (headJsonStr && baseJsonStr) {
            console.log('[Smart Merge] Attempting to parse JavaScript...');

            // Convert JavaScript object notation to JSON
            // This is a simple approach - wrap in function and eval
            // For production, consider using a proper JS parser
            try {
              // Use Function constructor to safely evaluate JS object
              headJson = new Function('return ' + headJsonStr)();
              baseJson = new Function('return ' + baseJsonStr)();
              console.log('[Smart Merge] Successfully parsed JavaScript!');
            } catch (evalError: any) {
              console.error('[Smart Merge] Failed to eval JavaScript:', evalError.message);
              return headContent + '\n\n// ========== MERGED FROM BASE ==========\n\n' + baseContent;
            }
          } else {
            console.warn('[Smart Merge] Could not extract content from JS files');
            return headContent + '\n\n// ========== MERGED FROM BASE ==========\n\n' + baseContent;
          }
        } else {
          // Pure JSON
          console.log('[Smart Merge] Parsing as pure JSON');
          headJson = JSON.parse(headContent);
          baseJson = JSON.parse(baseContent);
        }

        // If both are arrays, merge them
        if (Array.isArray(headJson) && Array.isArray(baseJson)) {
          console.log('[Smart Merge] Merging arrays:', { headCount: headJson.length, baseCount: baseJson.length });

          // Simple concat - keep both items
          const merged = [...headJson, ...baseJson];

          console.log('[Smart Merge] Merged array count:', merged.length);

          if (filename.endsWith('.js')) {
            // Format back as JavaScript with proper indentation
            const jsonStr = JSON.stringify(merged, null, 2);
            return `export default ${jsonStr};`;
          }

          return JSON.stringify(merged, null, 2);
        }

        // If both are objects, merge them
        if (typeof headJson === 'object' && typeof baseJson === 'object' && !Array.isArray(headJson) && !Array.isArray(baseJson)) {
          console.log('[Smart Merge] Merging objects');
          const merged = { ...baseJson, ...headJson };

          if (filename.endsWith('.js')) {
            const jsonStr = JSON.stringify(merged, null, 2);
            return `export default ${jsonStr};`;
          }

          return JSON.stringify(merged, null, 2);
        }
      } catch (e: any) {
        console.error('[Smart Merge] Failed to parse for smart merge:', e.message);
        console.log('[Smart Merge] Stack:', e.stack);
      }
    }

    // Fallback: simple concat
    console.warn('[Smart Merge] Using fallback concat for', filename);
    return headContent + '\n\n// ========== MERGED FROM BASE ==========\n\n' + baseContent;
  };

  const showPreview = (type: 'current' | 'incoming' | 'both') => {
    console.log('[Show Preview] ===== START =====');
    console.log('[Show Preview] Type:', type);

    const currentFile = files[currentFileIndex];
    if (!currentFile) {
      console.error('[Show Preview] No current file!');
      console.error('[Show Preview] currentFileIndex:', currentFileIndex);
      console.error('[Show Preview] files length:', files.length);
      toast.error('No file selected');
      return;
    }

    console.log('[Show Preview] File:', currentFile.filename);
    console.log('[Show Preview] Head content exists:', !!currentFile.headContent);
    console.log('[Show Preview] Head content length:', currentFile.headContent?.length || 0);
    console.log('[Show Preview] Base content exists:', !!currentFile.baseContent);
    console.log('[Show Preview] Base content length:', currentFile.baseContent?.length || 0);

    let preview = '';

    try {
      if (type === 'current') {
        // Current = base branch (main) - the branch we're merging INTO
        if (!currentFile.baseContent) {
          console.error('[Show Preview] Base content is empty!');
          toast.error('Current version content is empty');
          return;
        }
        preview = currentFile.baseContent;
        console.log('[Show Preview] Using base content (current/main)');
      } else if (type === 'incoming') {
        // Incoming = head branch (tabrak) - the branch with incoming changes
        if (!currentFile.headContent) {
          console.error('[Show Preview] Head content is empty!');
          toast.error('Incoming version content is empty');
          return;
        }
        preview = currentFile.headContent;
        console.log('[Show Preview] Using head content (incoming/tabrak)');
      } else if (type === 'both') {
        if (!currentFile.headContent || !currentFile.baseContent) {
          console.error('[Show Preview] Missing content for merge!');
          toast.error('Cannot merge - missing content');
          return;
        }
        // Merge: base (current) + head (incoming)
        preview = smartMerge(currentFile.baseContent, currentFile.headContent, currentFile.filename);
        console.log('[Show Preview] Using smart merge (both)');
      }

      console.log('[Show Preview] Preview generated');
      console.log('[Show Preview] Preview length:', preview?.length || 0);
      console.log('[Show Preview] Preview start:', preview?.substring(0, 100));

      if (!preview || preview.trim().length === 0) {
        console.error('[Show Preview] Preview is empty after generation!');
        toast.error('Cannot generate preview - content is empty');
        return;
      }

      console.log('[Show Preview] Setting preview modal...');
      setPreviewModal({
        show: true,
        type,
        preview,
      });

      console.log('[Show Preview] Modal should be visible now');
      console.log('[Show Preview] ===== END =====');
    } catch (error: any) {
      console.error('[Show Preview] Error:', error);
      console.error('[Show Preview] Error stack:', error.stack);
      toast.error(`Error generating preview: ${error.message}`);
    }
  };

  const confirmAccept = async () => {
    const currentFile = files[currentFileIndex];
    if (!currentFile || !previewModal.type) {
      console.error('[Confirm Accept] Missing file or type!', { currentFile, type: previewModal.type });
      return;
    }

    console.log('[Confirm Accept] ===== START =====');
    console.log('[Confirm Accept] Type:', previewModal.type);
    console.log('[Confirm Accept] File:', currentFile.filename);
    console.log('[Confirm Accept] Current session ID:', sessionId);

    // Close modal first
    setPreviewModal({
      show: false,
      type: null,
      preview: '',
    });

    try {
      setSaving(true);

      // Step 1: Start merge session if not exists
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        console.log('[Confirm Accept] No session, starting merge...');

        const startRes = await fetch('/api/github/git-resolve-conflict?action=start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            owner: org,
            repo: repo,
            pullRequestNumber: parseInt(number),
          }),
        });

        if (!startRes.ok) {
          const errorData = await startRes.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[Confirm Accept] Start merge failed:', errorData);
          toast.error(`❌ Failed to start merge\\n\\n${errorData.error || 'Unknown error'}`);
          setSaving(false);
          return;
        }

        const startData = await startRes.json();

        if (!startData.hasConflicts) {
          toast.success('✅ No conflicts found - PR can be merged directly!');
          setSaving(false);
          return;
        }

        currentSessionId = startData.sessionId;
        setSessionId(currentSessionId);

        console.log('[Confirm Accept] Merge session started:', currentSessionId);
      }

      // Step 2: Resolve current file
      console.log('[Confirm Accept] Resolving file with session:', currentSessionId);

      const resolveRes = await fetch('/api/github/git-resolve-conflict?action=resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          filePath: currentFile.filename,
          resolutionMode: previewModal.type,
        }),
      });

      if (!resolveRes.ok) {
        const errorData = await resolveRes.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Confirm Accept] Resolve failed:', errorData);
        toast.error(`❌ Failed to resolve file\\n\\n${errorData.error || 'Unknown error'}`);
        setSaving(false);
        return;
      }

      const resolveData = await resolveRes.json();
      console.log('[Confirm Accept] File resolved:', resolveData);

      const typeLabel = previewModal.type === 'current'
        ? `Current (${prData?.pr?.base?.ref || 'base'})`
        : `Incoming (${prData?.pr?.head?.ref || 'head'})`;

      toast.success(`✅ File resolved!\\n📝 Accepted ${typeLabel}\\n📄 ${currentFile.filename}`);

      // Close the modal immediately after success
      setPreviewModal({ show: false, type: null, preview: '' });
      setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => { } });

      // Mark as resolved locally
      setResolvedContent(prev => ({
        ...prev,
        [currentFile.filename]: 'resolved'
      }));

      setResolvedChoices(prev => ({
        ...prev,
        [currentFile.filename]: previewModal.type as 'current' | 'incoming'
      }));

      // Mark as resolved in reliable local state
      const newResolvedFiles = new Set(resolvedFiles);
      newResolvedFiles.add(currentFile.filename);
      setResolvedFiles(newResolvedFiles);

      // Auto-advance to next unresolved file
      if (!resolveData.allResolved) {
        let nextIndex = -1;
        // Search forward from current
        for (let i = currentFileIndex + 1; i < files.length; i++) {
          if (!newResolvedFiles.has(files[i].filename)) {
            nextIndex = i;
            break;
          }
        }
        // If not found forward, search from start
        if (nextIndex === -1) {
          for (let i = 0; i < currentFileIndex; i++) {
            if (!newResolvedFiles.has(files[i].filename)) {
              nextIndex = i;
              break;
            }
          }
        }

        if (nextIndex !== -1) {
          setCurrentFileIndex(nextIndex);
        }
      }

      // Step 3: Check if all files resolved
      if (resolveData.allResolved) {
        console.log('[Confirm Accept] All files resolved, committing merge...');

        // Commit merge
        const commitRes = await fetch('/api/github/git-resolve-conflict?action=commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId,
          }),
        });

        if (!commitRes.ok) {
          const errorData = await commitRes.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[Confirm Accept] Commit failed:', errorData);
          toast.error(`❌ Failed to commit merge\\n\\n${errorData.error || 'Unknown error'}`);
          setSaving(false);
          return;
        }

        const commitData = await commitRes.json();
        console.log('[Confirm Accept] Merge committed:', commitData);

        toast.success(`🎉 All conflicts resolved!\\n✅ Commit: ${commitData.commitSha.substring(0, 7)}\\n\\nRedirecting...`);

        // Clear session
        setSessionId(null);

        // Set flag for PR page to refresh
        localStorage.setItem(`pr-${repo}-${number}-needs-refresh`, 'true');

        // Wait a bit for GitHub to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Redirect back to PR page
        router.push(`/github/pr/${repo}/${number}`);
      } else {
        console.log('[Confirm Accept] Remaining conflicts:', resolveData.remainingConflicts);
        setSaving(false);
      }

      console.log('[Confirm Accept] ===== END =====');
    } catch (err: any) {
      console.error('[Confirm Accept] Error:', err);
      toast.error(`❌ Failed to resolve conflict\\n\\n${err.message || 'Unknown error'}`);
      setSaving(false);
    }
  };


  const cancelPreview = () => {
    setPreviewModal({
      show: false,
      type: null,
      preview: '',
    });
  };

  // ESC key handler for modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && previewModal.show) {
        cancelPreview();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [previewModal.show]);


  const saveChanges = async () => {
    // Check if any files have been resolved
    const resolvedFiles = Object.keys(resolvedContent).filter(key => resolvedContent[key]);

    if (resolvedFiles.length === 0) {
      toast.error('⚠️ Belum ada file yang dipilih!\n\nSilakan pilih "Accept Current" atau "Accept Incoming" untuk setiap file terlebih dahulu.');
      return;
    }

    // Check if all files have been resolved
    const unresolvedCount = files.length - resolvedFiles.length;
    if (unresolvedCount > 0) {
      toast.error(`⚠️ Masih ada ${unresolvedCount} file yang belum dipilih!\n\nSilakan resolve semua file terlebih dahulu.`);
      return;
    }

    setConfirmDialog({
      show: true,
      title: 'Save All Changes?',
      message: `This will save ${files.length} resolved ${files.length === 1 ? 'file' : 'files'} to branch ${prData.pr.head.ref}.\n\nAre you sure you want to continue?`,
      onConfirm: async () => {
        setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => { } });

        try {
          setSaving(true);
          const fullRepo = `${org}/${repo}`;

          // Prepare files for batch commit
          const filesToSave = files
            .map(file => ({
              path: file.filename,
              content: resolvedContent[file.filename],
            }))
            .filter(f => f.content); // Only include files with resolved content

          if (filesToSave.length === 0) {
            toast.error('No resolved files to save');
            setSaving(false);
            return;
          }

          console.log('[Conflict Save] Saving files via batch commit:', filesToSave.map(f => f.path));

          // Use the new resolve-conflicts API that creates a single commit
          const resolveRes = await fetch('/api/github/resolve-conflicts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              repo: fullRepo,
              branch: prData.pr.head.ref,
              files: filesToSave,
              message: `Resolve merge conflicts (${filesToSave.length} ${filesToSave.length === 1 ? 'file' : 'files'})`,
            }),
          });

          if (!resolveRes.ok) {
            const errorData = await resolveRes.json().catch(() => ({ error: 'Unknown error' }));
            console.error('[Conflict Save] Failed to resolve conflicts:', errorData);
            toast.error(`Failed to save changes: ${errorData.error || 'Unknown error'}`);
            setSaving(false);
            return;
          }

          const resolveData = await resolveRes.json();
          console.log('[Conflict Save] Successfully resolved conflicts:', resolveData);

          toast.success(`All conflicts resolved and saved!\n📁 ${filesToSave.length} ${filesToSave.length === 1 ? 'file' : 'files'} updated\n✅ Commit: ${resolveData.commitSha.substring(0, 7)}`);

          // Set flag for PR page to refresh
          localStorage.setItem(`pr-${repo}-${number}-needs-refresh`, 'true');

          // Wait a bit for GitHub to process the changes
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Redirect back to PR page
          router.push(`/github/pr/${repo}/${number}`);
        } catch (err) {
          console.error("Error saving:", err);
          toast.error('Failed to save changes. Please try again.');
          setSaving(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-950 font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading conflicts...</p>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-950 font-sans">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4 text-lg">No conflicting files found</p>
          <button
            onClick={() => router.push(`/github/pr/${repo}/${number}`)}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-all shadow-lg shadow-blue-500/20"
          >
            Back to PR
          </button>
        </div>
      </div>
    );
  }

  const currentFile = files[currentFileIndex];

  return (
    <div className="h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white flex flex-col font-sans">
      {/* Immersive Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4 shadow-sm z-10 flex-none">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push(`/github/pr/${repo}/${number}`)}
              className="group p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title="Back to PR"
            >
              <svg className="w-5 h-5 text-gray-500Group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Conflict Resolver
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30">
                  {files.length} conflicts
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                Merging <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">{prData?.pr.head.ref}</span>
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-500/20">{prData?.pr.base.ref}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (prData?.pr?.html_url) {
                  window.open(prData.pr.html_url + '/conflicts', '_blank');
                }
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition-colors"
            >
              Open in GitHub
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row max-w-[1920px] mx-auto w-full relative">
        {/* Sidebar File List */}
        <div className="w-full md:w-64 lg:w-80 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 overflow-y-auto flex-none">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conflicting Files</h3>
          </div>
          <div className="p-2 space-y-1">
            {files.map((file, index) => {
              // Check if file has conflict markers from backend
              const hasConflicts = file.hasConflictMarkers !== false;
              const isResolved = resolvedFiles.has(file.filename);

              return (
                <button
                  key={index}
                  onClick={() => !isResolved && setCurrentFileIndex(index)}
                  disabled={isResolved}
                  className={`w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium transition-all group flex items-start gap-3 relative overflow-hidden ${isResolved
                    ? 'bg-gray-50/50 dark:bg-slate-800/50 text-gray-400 cursor-not-allowed opacity-75'
                    : index === currentFileIndex
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-500/30'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                >
                  <svg className={`w-5 h-5 flex-none mt-0.5 ${isResolved ? 'text-green-500' : index === currentFileIndex ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isResolved ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    )}
                  </svg>
                  <span className={`break-all flex-1 ${isResolved ? 'line-through decoration-gray-300' : ''}`}>{file.filename}</span>

                  {isResolved && (
                    <span className="flex-none px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold flex items-center gap-1">
                      Resolved
                    </span>
                  )}

                  {!isResolved && !hasConflicts && (
                    <span className="flex-none px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-semibold flex items-center gap-1" title="Git reports conflict but no markers found">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      No Markers
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-950 relative z-0">
          {/* Action Toolbar */}
          <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-2 flex items-center justify-between shadow-sm z-10 sticky top-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                Line-by-line comparison
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => showPreview('current')}
                disabled={resolvedFiles.has(currentFile?.filename)}
                className={`px-5 py-2 border rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow-md group ${resolvedFiles.has(currentFile?.filename)
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300'
                  }`}
              >
                <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                Accept Current
              </button>
              <button
                onClick={() => showPreview('incoming')}
                disabled={resolvedFiles.has(currentFile?.filename)}
                className={`px-5 py-2 border rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow-md group ${resolvedFiles.has(currentFile?.filename)
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300'
                  }`}
              >
                <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                Accept Incoming
              </button>
            </div>
          </div>

          {/* Diff View */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-2 h-full min-h-[500px]">
              {/* Left: Current (Base) */}
              <div className="border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                <div className="px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      Current Changes
                    </span>
                    <span className="font-mono text-xs text-blue-600/70 dark:text-blue-400/70">{prData?.pr.base.ref}</span>
                  </div>
                </div>
                <div className="p-0 flex-1 relative">
                  <pre className="p-4 text-xs sm:text-sm font-mono leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-slate-300 tab-4">
                    {currentFile.baseContent || <span className="text-gray-400 italic">Empty content</span>}
                  </pre>
                </div>
              </div>

              {/* Right: Incoming (Head) */}
              <div className="bg-white dark:bg-slate-900 flex flex-col">
                <div className="px-4 py-3 bg-green-50/50 dark:bg-green-900/10 border-b border-green-100 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Incoming Changes
                    </span>
                    <span className="font-mono text-xs text-green-600/70 dark:text-green-400/70">{prData?.pr.head.ref}</span>
                  </div>
                </div>
                <div className="p-0 flex-1 relative">
                  <pre className="p-4 text-xs sm:text-sm font-mono leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-slate-300 tab-4">
                    {currentFile.headContent || <span className="text-gray-400 italic">Empty content</span>}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewModal.show && (
        <div
          className="fixed inset-0 bg-gray-900/40 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 px-8 pt-20 pb-6 animate-fadeIn transition-all duration-300"
          onClick={cancelPreview}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-6xl h-full flex flex-col border border-white/20 dark:border-slate-700/50 animate-scaleIn transform transition-all ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Slim */}
            <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-none items-center justify-between rounded-t-[2rem]">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  {previewModal.type === 'current'
                    ? <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Preview: Current</span>
                    : previewModal.type === 'incoming'
                      ? <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Preview: Incoming</span>
                      : <span className="text-purple-600 dark:text-purple-400">Merged Result</span>}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-mono border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {currentFile.filename}
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span>{previewModal.preview.split('\n').length} lines</span>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className="font-mono bg-gray-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded text-xs border border-gray-100 dark:border-slate-700/50">
                    {previewModal.type === 'current' ? prData?.pr.base.ref : prData?.pr.head.ref}
                  </span>
                </div>
              </div>
              <button
                onClick={cancelPreview}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Preview Content */}
            <div className="flex-1 overflow-auto p-0 bg-gray-50/50 dark:bg-slate-950/50 relative scroll-smooth">
              <pre className="p-8 text-sm font-mono leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-slate-300 tab-4">
                {previewModal.preview}
              </pre>
            </div>

            {/* Modal Footer - Slim */}
            <div className="px-6 py-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 rounded-b-[2rem]">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {previewModal.type === 'both' && (
                  <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-900/20">
                    <svg className="w-3.5 h-3.5 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>This will merge both versions</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={cancelPreview}
                  disabled={saving}
                  className="px-6 py-2 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 font-semibold transition-all shadow-sm hover:shadow text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Show confirmation dialog
                    setConfirmDialog({
                      show: true,
                      title: 'Confirm Resolution',
                      message: `Are you sure you want to resolve this conflict by accepting ${previewModal.type === 'current' ? 'CURRENT' : 'INCOMING'} version?\n\nThis will create a merge commit and push to GitHub.`,
                      onConfirm: confirmAccept,
                    });
                  }}
                  disabled={saving}
                  className={`px-6 py-2 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${previewModal.type === 'current'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20'
                    : previewModal.type === 'incoming'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-500/20'
                    }`}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirm
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        show={confirmDialog.show}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="warning"
        confirmText="Save Changes"
        cancelText="Cancel"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => { } })}
        isLoading={saving}
      />
    </div>
  );
}
