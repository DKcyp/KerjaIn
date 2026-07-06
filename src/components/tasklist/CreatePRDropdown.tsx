"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

interface CreatePRSimpleProps {
  taskId: number;
  projectId: number;
  taskStatus?: string;
  onBranchSelect?: (sourceBranch: string, targetBranch: string, repoFullName: string) => void;
}

type Branch = {
  name: string;
  sha: string;
  protected: boolean;
};

export default function CreatePRSimple({
  projectId,
  taskStatus,
  onBranchSelect,
}: CreatePRSimpleProps) {
  const fetchedRepoRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState("");
  const [repoFullName, setRepoFullName] = useState<string | null>(null);
  
  // For custom source branch input
  const [isCustomSource, setIsCustomSource] = useState(false);
  const [customSourceInput, setCustomSourceInput] = useState("");
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);

  // Check if task is completed
  const isTaskCompleted = taskStatus === 'SELESAI';

  // Fetch repository info
  useEffect(() => {
    const fetchRepoInfo = async () => {
      try {
        const response = await fetch(`/api/github/repo-by-project/${projectId}`);
        if (!response.ok) {
          return;
        }
        
        const data = await response.json();
        if (data.repository) {
          setRepoFullName(data.repository.repositoryFullName);
          // Notify parent immediately when repo is loaded
          if (onBranchSelect) {
            onBranchSelect('', '', data.repository.repositoryFullName);
          }
        }
      } catch (err) {
        console.error("Error fetching repo info:", err);
      }
    };

    if (projectId) {
      fetchRepoInfo();
    }
  }, [projectId, onBranchSelect]);

  // Fetch branches when repo is known — only once per repoFullName, never blocks send
  useEffect(() => {
    if (!repoFullName || fetchedRepoRef.current === repoFullName) return;
    fetchedRepoRef.current = repoFullName;

    const fetchBranches = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/github/branches?repo=${encodeURIComponent(repoFullName)}`);
        if (!response.ok) return; // silently ignore — branch selection is optional
        const data = await response.json();
        setBranches(data.branches || []);
        setTargetBranch('staging');
      } catch {
        // silently ignore — branch selection is optional, don't block the send button
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [repoFullName]);

  // Notify parent when both branches are selected
  const notifyParent = useCallback(() => {
    const effectiveSource = isCustomSource ? customSourceInput : sourceBranch;
    
    // If either branch is empty, clear parent state
    if (!effectiveSource || !targetBranch) {
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

  // Filter branches for source dropdown based on input
  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(customSourceInput.toLowerCase())
  );

  // Handle source branch selection from dropdown
  const handleSourceSelect = (branchName: string) => {
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
  };

  // Handle custom input submit
  const handleCustomInputSubmit = () => {
    if (customSourceInput.trim()) {
      setIsCustomSource(true);
      setShowSourceDropdown(false);
    }
  };

  // Reset selection
  const handleReset = () => {
    setSourceBranch("");
    setCustomSourceInput("");
    setIsCustomSource(false);
    setShowSourceDropdown(false);
    sessionStorage.removeItem('pendingPR');
  };

  if (!repoFullName) {
    return null;
  }

  const effectiveSource = isCustomSource ? customSourceInput : sourceBranch;

  return (
    <div className="space-y-3">
      {/* Source Branch - Searchable/Creatable */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Source Branch (dari mana)
        </label>
        <div className="relative">
          <input
            type="text"
            value={customSourceInput}
            onChange={(e) => handleCustomInputChange(e.target.value)}
            onFocus={() => setShowSourceDropdown(true)}
            onClick={() => setShowSourceDropdown(prev => !prev)} // Toggle dropdown on click
            onBlur={() => setTimeout(() => setShowSourceDropdown(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                // If dropdown is open and there are filtered branches, select the first one
                if (showSourceDropdown && filteredBranches.length > 0) {
                  handleSourceSelect(filteredBranches[0].name);
                } else if (customSourceInput.trim()) {
                  // If no branches match, treat as custom branch
                  handleCustomInputSubmit();
                }
              }
              // Close dropdown on Escape
              if (e.key === 'Escape') {
                setShowSourceDropdown(false);
              }
            }}
            placeholder="Ketik atau pilih branch..."
            disabled={loading || isTaskCompleted}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          {/* Dropdown icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Dropdown list */}
          {showSourceDropdown && !isTaskCompleted && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredBranches.length > 0 ? (
                filteredBranches.map((branch) => (
                  <button
                    key={branch.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
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
              ) : customSourceInput ? (
                <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Buat branch baru: <span className="font-mono font-semibold">{customSourceInput}</span></span>
                  </div>
                  <p className="text-xs mt-1 text-gray-500">Tekan Enter untuk konfirmasi</p>
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  Tidak ada branch yang cocok
                </div>
              )}
            </div>
          )}
        </div>
        {isCustomSource && customSourceInput && (
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Branch custom akan dibuat saat PR dibuat
          </p>
        )}
      </div>

      {/* Target Branch - Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Target Branch (ke mana)
        </label>
        <select
          value={targetBranch}
          onChange={(e) => setTargetBranch(e.target.value)}
          disabled={loading || branches.length === 0 || isTaskCompleted}
          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
        >
          <option value="">Pilih target branch...</option>
          <option value="staging">staging</option>
        </select>
      </div>

      {/* Action Buttons */}
      {!isTaskCompleted && effectiveSource && targetBranch && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Pull Request akan dibuat:
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
            title="Batalkan pilihan PR"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reset
          </button>
        </div>
      )}

      {/* Status messages */}
      {isTaskCompleted && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Task sudah selesai. Branch tidak dapat diubah.
          </p>
        </div>
      )}

      {!isTaskCompleted && !effectiveSource && !targetBranch && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pilih branch untuk membuat Pull Request otomatis saat submit task
          </p>
        </div>
      )}
    </div>
  );
}
