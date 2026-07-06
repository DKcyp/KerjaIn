"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import CreatePRForm from "./ProgrammerGuide";
import WorkflowHistory from "@/components/github/WorkflowHistory";
import CollaboratorsPanel from "@/components/github/CollaboratorsPanel";

interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
  };
  base: {
    ref: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  draft: boolean;
  additions: number;
  deletions: number;
  changed_files: number;
}

interface Branch {
  name: string;
  commit: {
    sha: string;
  };
}

export default function RepoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const repoParam = params.repo as string;
  const { user } = useAuth();

  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [org, setOrg] = useState<string>("");
  const [fullRepo, setFullRepo] = useState<string>("");
  const [accessibleRepos, setAccessibleRepos] = useState<{ name: string; full_name: string }[]>([]);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'prs' | 'cicd' | 'collaborators'>('prs'); // Updated tabs

  // Click outside listener for branch dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isBranchDropdownOpen && !target.closest('.branch-dropdown-container')) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBranchDropdownOpen]);

  // Extract repo name from parameter (handle both "repo-name" and "owner/repo-name")
  const repoName = repoParam.includes('/') ? repoParam.split('/').pop() || repoParam : repoParam;

  // Redirect if URL contains full repo name instead of just repo name
  useEffect(() => {
    if (repoParam.includes('/')) {
      console.log('[Repo Page] Detected full repo name in URL:', repoParam);
      console.log('[Repo Page] Redirecting to:', `/github/repo/${repoName}`);
      // Use push instead of replace to ensure redirect happens
      router.push(`/github/repo/${repoName}`);
    }
  }, [repoParam, repoName, router]);

  // Fetch active GitHub username/org
  useEffect(() => {
    const fetchActiveUsername = async () => {
      try {
        const res = await fetch('/api/github/repositories');
        if (res.ok) {
          const data = await res.json();
          // Save all accessible repos for dropdown
          setAccessibleRepos(data.repositories.map((r: any) => ({
            name: r.name,
            full_name: r.full_name
          })));
          // Find the repo that matches this name
          const repo = data.repositories.find((r: any) => r.name === repoName);
          if (repo) {
            setOrg(repo.owner_source);
            setFullRepo(repo.full_name);
          } else {
            setError(`Repository "${repoName}" not found or you don't have access.`);
            setAccessDenied(true);
            setLoading(false);
          }
        } else {
          setError('GitHub credential not configured. Please contact Super Admin to add GitHub credentials.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch repository owner:', error);
        setError('Failed to load GitHub configuration. Please contact Super Admin.');
        setLoading(false);
      }
    };

    fetchActiveUsername();
  }, [repoName]);

  // Check access for PROGRAMMER and PM
  useEffect(() => {
    if (!fullRepo) return; // Wait for fullRepo to be set

    if (user?.role === 'PROGRAMMER' || user?.role === 'PM') {
      checkAccess();
    } else {
      checkAccessAndFetchData();
    }
  }, [user, fullRepo]);

  const checkAccess = async () => {
    try {
      setLoading(true);
      const accessRes = await fetch(`/api/github/check-access?repo=${encodeURIComponent(repoName)}`);
      if (!accessRes.ok) {
        setAccessDenied(true);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error checking access:", err);
      setAccessDenied(true);
      setLoading(false);
    }
  };

  // If user is PROGRAMMER, show PR creation form (after access check)
  if (user?.role === 'PROGRAMMER') {
    // Wait for BOTH loading to finish AND fullRepo to be populated (unless there's an error)
    if (loading || (!fullRepo && !error)) {
      return (
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading repository data...</p>
            </div>
          </div>
        </div>
      );
    }

    if (accessDenied) {
      return (
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Access Denied
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You don't have permission to access this repository. Please contact your PM or administrator.
              </p>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <CreatePRForm key={repoName} repoName={repoName} fullRepo={fullRepo} />;
  }

  useEffect(() => {
    // Only run when fullRepo is available
    if (!fullRepo) return;
    
    // ALWAYS fetch fresh data - no cache
    checkAccessAndFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullRepo]);

  const checkAccessAndFetchData = async () => {
    try {
      setLoading(true);

      // Check if user has access to this repository
      const accessRes = await fetch(`/api/github/check-access?repo=${encodeURIComponent(repoName)}`);
      if (!accessRes.ok) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      // Fetch branches
      const branchesRes = await fetch(`/api/github/branches?repo=${encodeURIComponent(fullRepo)}`);
      let branchesData: Branch[] = [];
      if (branchesRes.ok) {
        const data = await branchesRes.json();
        branchesData = data.branches || [];
        setBranches(branchesData);
      }

      // Fetch pull requests with cache busting
      const timestamp = Date.now();
      const prsRes = await fetch(`/api/github/pull-requests?repo=${encodeURIComponent(fullRepo)}&_t=${timestamp}`, {
        cache: 'no-store'
      });
      let prsData: PullRequest[] = [];
      if (prsRes.ok) {
        const data = await prsRes.json();
        prsData = data.pullRequests || [];
        setPullRequests(prsData);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (accessDenied) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don't have permission to access this repository. Please contact your administrator.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/github')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Go to GitHub Dashboard
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stagingBranch = branches.find((b) => b.name === "staging");
  const mainBranch = branches.find((b) => b.name === "main");

  const getStatusBadge = (state: string, draft: boolean) => {
    if (draft) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Draft</span>;
    }
    if (state === "open") {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">Open</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">Merged</span>;
  };

  // Filter branches for dropdown
  const filteredBranches = branches.filter(b =>
    b.name.toLowerCase().includes(branchSearchQuery.toLowerCase())
  );

  // Sort branches: main -> staging -> trial -> others
  const sortedBranches = [...filteredBranches].sort((a, b) => {
    const priorities: Record<string, number> = { 'main': 1, 'staging': 2, 'trial': 3 };
    const pA = priorities[a.name] || 99;
    const pB = priorities[b.name] || 99;
    return pA - pB;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading repository...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.push('/github')}
        className="group flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mb-4"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="font-medium">Back to GitHub Dashboard</span>
      </button>

      {/* Header */}
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                </svg>
              </div>
              {repoName}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Review and approve pull requests
            </p>

          </div>

          {/* Branch Info - Dropdown for All Branches */}
          <div className="flex items-center gap-2 relative">
            {/* Create PR Toggle Button */}
            <button
              onClick={() => setIsCreatingPR(!isCreatingPR)}
              className={`min-w-[140px] px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 ${isCreatingPR
                ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
            >
              {isCreatingPR ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Pull Request</span>
                </>
              )}
            </button>

            {/* Branch Selector (Input Style) */}
            <div className="relative branch-dropdown-container w-40">
              <div className="relative">
                <input
                  type="text"
                  value={isBranchDropdownOpen ? branchSearchQuery : "View Branch"}
                  onChange={(e) => {
                    setBranchSearchQuery(e.target.value);
                    if (!isBranchDropdownOpen) setIsBranchDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setIsBranchDropdownOpen(true);
                    setBranchSearchQuery('');
                  }}
                  className={`w-full px-3 py-1.5 pr-8 text-xs font-medium border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer ${isBranchDropdownOpen
                    ? "bg-white dark:bg-gray-800 border-blue-500 text-gray-900 dark:text-white"
                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-blue-400"
                    }`}
                  readOnly={!isBranchDropdownOpen}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isBranchDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {isBranchDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 animate-slideDown overflow-hidden">
                  <div className="max-h-64 overflow-y-auto p-1">
                    {sortedBranches.map((branch) => (
                      <button
                        key={branch.name}
                        onClick={() => router.push(`/github/branch/${encodeURIComponent(fullRepo)}/${branch.name}`)}
                        className="w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${branch.name === 'main' ? 'bg-green-500' : branch.name === 'staging' ? 'bg-yellow-500' : 'bg-gray-400'}`}></span>
                          <span className="font-mono truncate max-w-[120px]" title={branch.name}>{branch.name}</span>
                        </div>
                        <svg className="w-3 h-3 text-gray-400 group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                    {sortedBranches.length === 0 && (
                      <div className="text-center py-2 text-gray-500 text-xs">No branches found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area: Either Create PR Form or Tabbed Content */}
      {isCreatingPR ? (
        <div className="animate-fadeIn">
          <CreatePRForm
            repoName={repoName}
            fullRepo={fullRepo}
            hideRepoSelection={true}
            allowAllTargetBranches={false}
            hideHeader={true}
          />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-4">
              <button
                onClick={() => setActiveTab('prs')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'prs'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Pull Requests
                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    {pullRequests.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('collaborators')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'collaborators'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Collaborators
                </div>
              </button>
              <button
                onClick={() => setActiveTab('cicd')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'cicd'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Webhook History
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'prs' ? (
            /* Pull Requests List */
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-md">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Pull Requests
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300">
              {pullRequests.length}
            </span>
          </div>

          {pullRequests.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-block p-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
                <svg
                  className="w-8 h-8 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                No open pull requests
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                All changes have been merged. Great work! 🎉
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pullRequests.map((pr, index) => (
                <div
                  key={pr.id}
                  onClick={() => router.push(`/github/pr/${repoName}/${pr.number}`)}
                  className="group bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:from-blue-50 hover:to-blue-100 dark:hover:from-gray-700/50 dark:hover:to-gray-800/50 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:scale-[1.005]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* PR Title */}
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-mono">
                          #{pr.number}
                        </span>
                        {pr.title}
                      </h3>

                      {/* Author & Date */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="relative">
                          <img
                            src={pr.user.avatar_url}
                            alt={pr.user.login}
                            className="w-5 h-5 rounded-full ring-1 ring-gray-200 dark:ring-gray-600 group-hover:ring-blue-300 dark:group-hover:ring-blue-700 transition-all"
                          />
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white dark:border-gray-800"></span>
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {pr.user.login}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(pr.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Branch Info */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-[10px] font-mono border border-gray-200 dark:border-gray-600">
                          {pr.head.ref}
                        </span>
                        <svg className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <span className="px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-[10px] font-mono border border-gray-200 dark:border-gray-600">
                          {pr.base.ref}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {pr.additions}
                        </span>
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                          {pr.deletions}
                        </span>
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          {pr.changed_files} files
                        </span>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-col gap-1.5 items-end ml-3">
                      {getStatusBadge(pr.state, pr.draft)}
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          ) : activeTab === 'collaborators' ? (
            /* Collaborators Tab */
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <CollaboratorsPanel repoFullName={fullRepo} />
            </div>
          ) : (
            /* CI/CD History Tab */
            <WorkflowHistory fullRepo={fullRepo} />
          )}
        </>
      )}
    </div>
  );
}
