"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/context/ToastContext";

interface BranchMergeSelectorProps {
  taskId: number;
  projectId: number;
  taskStatus?: string;
  onBranchSelect?: (sourceBranch: string, targetBranch: string, repoFullName: string) => void;
  onRepoStateChange?: (state: 'checking' | 'found' | 'not_found') => void;
}

type Branch = {
  name: string;
  sha: string;
  protected: boolean;
};

export default function BranchMergeSelector({
  projectId,
  taskStatus,
  onBranchSelect,
  onRepoStateChange,
}: BranchMergeSelectorProps) {
  const { error } = useToast();

  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch] = useState("staging"); // Fixed target branch for Kirim Review
  const [repoFullName, setRepoFullName] = useState<string | null>(null);

  // For custom source branch input
  const [isCustomSource, setIsCustomSource] = useState(false);
  const [customSourceInput, setCustomSourceInput] = useState("");
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);

  // Fetch repository info
  useEffect(() => {
    const fetchRepoInfo = async () => {
      if (!projectId) return;

      try {
        if (onRepoStateChange) onRepoStateChange('checking');
        setLoading(true);
        const response = await fetch(`/api/github/repo-by-project/${projectId}`);
        
        if (!response.ok) {
          if (onRepoStateChange) onRepoStateChange('not_found');
          return;
        }

        const data = await response.json();
        if (data.repository) {
          setRepoFullName(data.repository.repositoryFullName);
          if (onRepoStateChange) onRepoStateChange('found');
          // Notify parent immediately when repo is loaded
          if (onBranchSelect) {
            onBranchSelect('', '', data.repository.repositoryFullName);
          }
        } else {
          if (onRepoStateChange) onRepoStateChange('not_found');
        }
      } catch (err) {
        if (onRepoStateChange) onRepoStateChange('not_found');
        console.error("Failed to fetch repo", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepoInfo();
  }, [projectId]); // Deliberately excluding onRepoStateChange and onBranchSelect to avoid infinite loops

  // Fetch branches when repo is known
  useEffect(() => {
    const fetchBranches = async () => {
      if (!repoFullName) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/github/branches?repo=${encodeURIComponent(repoFullName)}`);

        if (!response.ok) {
          throw new Error("Failed to fetch branches");
        }

        const data = await response.json();
        setBranches(data.branches || []);
      } catch (err: any) {
        error(err.message || "Gagal memuat branches");
      } finally {
        setLoading(false);
      }
    };

    if (repoFullName) {
      fetchBranches();
    }
  }, [repoFullName, error]);

  // Notify parent when both branches are selected
  const notifyParent = useCallback(() => {
    const effectiveSource = isCustomSource ? customSourceInput : sourceBranch;

    // If source branch is empty, clear parent state
    if (!effectiveSource) {
      if (onBranchSelect && repoFullName) {
        onBranchSelect('', '', repoFullName);
      }
      return;
    }

    // Validate: source and target must be different
    if (effectiveSource === targetBranch) {
      // Clear source
      if (isCustomSource) {
        setCustomSourceInput("");
      } else {
        setSourceBranch("");
      }
      // Clear parent state for invalid selection
      if (onBranchSelect && repoFullName) {
        onBranchSelect('', '', repoFullName);
      }
      return;
    }

    // Only notify parent if both branches are valid and different
    if (repoFullName && onBranchSelect) {
      onBranchSelect(effectiveSource, targetBranch, repoFullName);
    }
  }, [sourceBranch, customSourceInput, isCustomSource, targetBranch, repoFullName, onBranchSelect]);

  // Call notifyParent when branches change
  useEffect(() => {
    notifyParent();
  }, [notifyParent]);

  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Filter branches for source dropdown based on input
  const filteredBranches = branches.filter(b =>
    b.name.toLowerCase().includes(customSourceInput.toLowerCase())
  );

  const validateBranchWithTarget = async (branchName: string) => {
    if (!repoFullName || !branchName || branchName === targetBranch) {
      setCompareError(null);
      return true; 
    }

    setIsComparing(true);
    setCompareError(null);
    try {
      const res = await fetch('/api/github/compare-branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: repoFullName, base: targetBranch, head: branchName })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.total_commits === 0 || data.status === 'identical' || data.status === 'behind') {
          const msg = `Branch "${branchName}" tidak memiliki code terbaru dibandingkan "${targetBranch}".`;
          setCompareError(msg);
          error(msg);
          return false;
        }
      }
    } catch (e) {
      console.error("Failed to compare branches", e);
    } finally {
      setIsComparing(false);
    }
    return true;
  };

  // Handle source branch selection from dropdown
  const handleSourceSelect = async (branchName: string) => {
    const isValid = await validateBranchWithTarget(branchName);
    if (!isValid) {
      setSourceBranch("");
      setCustomSourceInput("");
      setIsCustomSource(false);
      setShowSourceDropdown(false);
      if (onBranchSelect && repoFullName) onBranchSelect('', '', repoFullName);
      return;
    }

    setSourceBranch(branchName);
    setCustomSourceInput(branchName); // Update input to show selected branch
    setIsCustomSource(false); // Mark as selected from dropdown, not custom
    setShowSourceDropdown(false);
  };

  // Handle custom input
  const handleCustomInputChange = (value: string) => {
    setCustomSourceInput(value);
    setIsCustomSource(true);
    setShowSourceDropdown(true);
    setSourceBranch(""); // Clear dropdown selection
    setCompareError(null); // Clear previous errors
  };

  // Reset selection
  const handleReset = () => {
    setSourceBranch("");
    setCustomSourceInput("");
    setIsCustomSource(false);
    setShowSourceDropdown(false);
    sessionStorage.removeItem('pendingMerge');
  };

  if (loading && !repoFullName) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-indigo-500">
        <svg className="animate-spin w-8 h-8 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Memeriksa koneksi repo GitHub...</span>
      </div>
    );
  }

  if (!repoFullName) {
    return null;
  }

  const effectiveSource = isCustomSource ? customSourceInput : sourceBranch;

  return (
    <div className="space-y-3">
      {/* Source Branch - Searchable */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Source Branch (Branch pengerjaan)
        </label>
        <div className="relative">
          <input
            type="text"
            value={customSourceInput}
            onChange={(e) => handleCustomInputChange(e.target.value)}
            onFocus={() => setShowSourceDropdown(true)}
            onClick={() => setShowSourceDropdown(prev => !prev)}
            onBlur={() => setTimeout(() => setShowSourceDropdown(false), 200)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (showSourceDropdown && filteredBranches.length > 0) {
                  handleSourceSelect(filteredBranches[0].name);
                } else if (customSourceInput.trim()) {
                  const branchName = customSourceInput.trim();
                  const isValid = await validateBranchWithTarget(branchName);
                  if (!isValid) {
                    setSourceBranch("");
                    setCustomSourceInput("");
                  } else {
                    setSourceBranch(branchName);
                    setIsCustomSource(false);
                    setShowSourceDropdown(false);
                  }
                }
              }
              if (e.key === 'Escape') {
                setShowSourceDropdown(false);
              }
            }}
            placeholder="Ketik atau pilih branch..."
            disabled={loading}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {showSourceDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredBranches.length > 0 ? (
                filteredBranches.map((branch) => (
                  <button
                    key={branch.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSourceSelect(branch.name);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center justify-between"
                  >
                    <span className="font-mono text-sm">{branch.name}</span>
                    {branch.protected && (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400">🔒</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  Tidak ada branch yang cocok
                </div>
              )}
            </div>
          )}
        </div>
        {compareError && (
          <p className="mt-1.5 text-sm text-red-500 flex items-start gap-1">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {compareError}
          </p>
        )}
        {isComparing && (
          <p className="mt-1.5 text-sm text-blue-500 flex items-center gap-1.5">
            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Memeriksa perubahan code...
          </p>
        )}
      </div>

      {/* Target Branch - Fixed / Readonly */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Target Branch
        </label>
        <div className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 opacity-80 cursor-not-allowed flex items-center">
          <span className="font-mono">{targetBranch}</span>
        </div>
      </div>

      {/* Action Buttons */}
      {effectiveSource && targetBranch && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Branch akan di-merge:
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
              <span className="text-blue-600 dark:text-blue-400">{effectiveSource}</span>
              <span className="mx-2">→</span>
              <span className="text-green-600 dark:text-green-400">{targetBranch}</span>
            </p>
          </div>
          <button
            onClick={handleReset}
            className="ml-4 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1"
            title="Batalkan pilihan"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reset
          </button>
        </div>
      )}

      {!effectiveSource && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Wajib memilih branch pengerjaan. Kode akan di-merge ke branch staging secara otomatis saat Submit Kirim Review.
          </p>
        </div>
      )}
    </div>
  );
}
