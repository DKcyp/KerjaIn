"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { OwnerPanel } from "./components/OwnerPanel";
import { getPusherClient } from "@/lib/pusher-client";

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
  mergeable: boolean | null;
  mergeable_state: string;
  additions: number;
  deletions: number;
  changed_files: number;
  repoName: string;
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  open_issues_count: number;
  updated_at: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  open_issues?: number;
  open_prs_count?: number;
  branches_count?: number;
  owner_source?: string; // NEW: Owner label (username/org)
  is_organization?: boolean; // NEW: Is this from an organization
}

interface RepoWithPRs extends Repository {
  pullRequests: PullRequest[];
  loading: boolean;
}

export default function GitHubPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [repos, setRepos] = useState<RepoWithPRs[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<RepoWithPRs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noRepoMapped, setNoRepoMapped] = useState(false);

  // Search and Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent_commit' | 'recent_pr' | 'name'>('recent_pr');

  useEffect(() => {
    checkAccessAndRedirect();
  }, [user]);

  // Listen for PR notifications via Pusher and soft refresh
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher || !user) return;

    const channelName = `private-user-${user.id}`;
    let channel = pusher.channel(channelName);

    if (!channel) {
      console.log(`🔔 [GitHub Page] Subscribing to ${channelName}`);
      channel = pusher.subscribe(channelName);
    }

    const handleTaskNotification = (data: any) => {
      // Check if it's a PR notification
      if (data.type === 'task.created' && data.data?.prNumber) {
        console.log('🔔 [GitHub Page] PR notification received, soft refreshing...', {
          prNumber: data.data.prNumber,
          repo: data.data.repo
        });

        // Soft refresh - refetch data without full page reload
        fetchAllData();
      }
    };

    channel.bind('task-notification', handleTaskNotification);

    return () => {
      console.log(`🔔 [GitHub Page] Unbinding task-notification`);
      channel.unbind('task-notification', handleTaskNotification);
    };
  }, [user]);

  const checkAccessAndRedirect = async () => {
    // Only SUPER_ADMIN can access dashboard
    // PM and PROGRAMMER should be redirected to repo list page
    if (user && (user.role === 'PM' || user.role === 'PROGRAMMER')) {
      // Redirect to repo list page
      router.push('/github/repo');
      return;
    }

    // SUPER_ADMIN - show dashboard
    fetchAllData();
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch repositories with cache busting
      const timestamp = Date.now();
      const response = await fetch(`/api/github/repositories?_t=${timestamp}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch repositories");
      }

      const data = await response.json();
      const repositories: Repository[] = data.repositories || [];
      console.log('[Frontend] Fetched repositories from API:', repositories.length, repositories.map(r => r.name));

      // Initialize repos with loading state
      const reposWithPRs: RepoWithPRs[] = repositories.map(repo => ({
        ...repo,
        pullRequests: [],
        loading: true,
      }));

      console.log('[Frontend] Setting repos to state:', reposWithPRs.length);
      setRepos(reposWithPRs);
      setLoading(false);

      // Fetch PRs for each repository in parallel (Optimized: Skip repos with 0 issues)
      await Promise.all(
        repositories.map(async (repo, index) => {
          // Optimization: If open_issues_count is 0, there are no PRs (GitHub counts PRs as issues)
          if (repo.open_issues_count === 0) {
            setRepos(prev => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                pullRequests: [],
                loading: false,
              };
              return updated;
            });
            return;
          }

          try {
            const prTimestamp = Date.now();
            const prResponse = await fetch(`/api/github/pull-requests?repo=${encodeURIComponent(repo.full_name)}&_t=${prTimestamp}`, {
              cache: 'no-store'
            });

            if (prResponse.ok) {
              const prData = await prResponse.json();
              setRepos(prev => {
                const updated = [...prev];
                updated[index] = {
                  ...updated[index],
                  pullRequests: prData.pullRequests || [],
                  loading: false,
                };
                return updated;
              });
            } else {
              setRepos(prev => {
                const updated = [...prev];
                updated[index] = {
                  ...updated[index],
                  loading: false,
                };
                return updated;
              });
            }
          } catch (err) {
            console.error(`Error fetching PRs for ${repo.name}:`, err);
            setRepos(prev => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                loading: false,
              };
              return updated;
            });
          }
        })
      );
    } catch (err: any) {
      console.error("Error fetching repositories:", err);
      setError(err.message || "Failed to load repositories");
      setLoading(false);
    }
  };

  // Filter and sort repos
  useEffect(() => {
    let result = [...repos];

    // Apply search filter
    if (searchQuery) {
      result = result.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'recent_commit':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'recent_pr':
          const aLatestPR = a.pullRequests[0]?.updated_at || '1970-01-01';
          const bLatestPR = b.pullRequests[0]?.updated_at || '1970-01-01';
          return new Date(bLatestPR).getTime() - new Date(aLatestPR).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredRepos(result);
  }, [repos, searchQuery, sortBy]);

  const getStatusBadge = (state: string, draft: boolean) => {
    if (draft) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Draft</span>;
    }
    if (state === "open") {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">Open</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">Merged</span>;
  };

  const getMergeabilityBadge = (mergeable: boolean | null, mergeableState: string) => {
    if (mergeable === null) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700">Checking...</span>;
    }
    if (mergeable && mergeableState === "clean") {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">Ready to merge</span>;
    }
    if (mergeableState === "unstable") {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">Checks pending</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">Has conflicts</span>;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading repositories...</p>
          </div>
        </div>
      </div>
    );
  }

  if (noRepoMapped) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-8 text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No Repository Mapped
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your project doesn't have a GitHub repository mapped yet. Please contact your administrator to map a repository to your project.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/master/proyek')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Go to Projects
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-300 font-semibold mb-2">Error</h3>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchAllData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Flatten all PRs from all repos into single array
  const allPRs = repos.flatMap((repo) =>
    repo.pullRequests.map((pr) => ({
      ...pr,
      repoName: repo.name,
      repoFullName: repo.full_name,
      repoPrivate: repo.private,
    }))
  );

  // Check if still loading PRs
  const stillLoadingPRs = repos.some((repo) => repo.loading);

  // Calculate stats
  const totalRepos = repos.length;
  const totalOpenPRs = allPRs.length;
  const totalConflicts = allPRs.filter(pr => pr.mergeable === false).length;
  const reposWithPRs = repos.filter(repo => repo.pullRequests.length > 0).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          GitHub Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor and manage your repositories
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Repositories */}
        <div className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="text-blue-100 text-xs font-medium">+{repos.length > 0 ? '100%' : '0%'}</div>
            </div>
            <div className="text-4xl font-bold mb-1">{totalRepos}</div>
            <div className="text-blue-100 text-sm font-medium">Total Repositories</div>
          </div>
        </div>

        {/* Open Pull Requests */}
        <div className="group bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              {totalOpenPRs > 0 && (
                <div className="animate-pulse">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                </div>
              )}
            </div>
            <div className="text-4xl font-bold mb-1 ">{totalOpenPRs}</div>
            <div className="text-green-100 text-sm font-medium">Open Pull Requests</div>
          </div>
        </div>

        {/* Conflicts */}
        <div className="group bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              {totalConflicts > 0 && (
                <div className="animate-bounce">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div className="text-4xl font-bold mb-1 ">{totalConflicts}</div>
            <div className="text-red-100 text-sm font-medium">Merge Conflicts</div>
          </div>
        </div>

        {/* Active Repos */}
        <div className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-purple-100 text-xs font-medium">{totalRepos > 0 ? Math.round((reposWithPRs / totalRepos) * 100) : 0}%</div>
            </div>
            <div className="text-4xl font-bold mb-1 ">{reposWithPRs}</div>
            <div className="text-purple-100 text-sm font-medium">Active Repositories</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Repositories List - 2 columns */}
        <div className="lg:col-span-2">
          {/* Search and Sort Controls */}
          <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Search Bar */}
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search repositories..."
                    className="w-full px-4 py-2.5 pl-10 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Sort By */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  <option value="recent_pr">Recent Activity (PR)</option>
                  <option value="recent_commit">Last Updated</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-3 flex items-center justify-between text-xs">
              <div className="text-gray-600 dark:text-gray-400">
                Showing <span className="font-bold text-blue-600 dark:text-blue-400">{filteredRepos.length}</span> of <span className="font-semibold text-gray-900 dark:text-gray-100">{repos.length}</span> repositories
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear search
                </button>
              )}
            </div>
          </div>

          {/* Grouped Repositories by Owner */}
          {(() => {
            // Group repos by owner_source
            const groupedRepos = filteredRepos.reduce((acc, repo) => {
              const owner = repo.owner_source || 'Unknown';
              if (!acc[owner]) {
                acc[owner] = [];
              }
              acc[owner].push(repo);
              return acc;
            }, {} as Record<string, RepoWithPRs[]>);

            console.log('[Frontend] Grouped repos:', groupedRepos);
            const owners = Object.keys(groupedRepos);
            console.log('[Frontend] Owners:', owners);

            if (owners.length === 0) {
              return (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 shadow-lg text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No repositories found</p>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {owners.map((owner, ownerIndex) => (
                  <OwnerPanel
                    key={owner}
                    owner={owner}
                    repos={groupedRepos[owner]}
                    ownerIndex={ownerIndex}
                    stillLoadingPRs={stillLoadingPRs}
                  />
                ))}
              </div>
            );
          })()}
        </div>

        {/* Sidebar Stats - 1 column */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h3>
            </div>
            <div className="space-y-3">
              {allPRs.slice(0, 5).map((pr, index) => (
                <div
                  key={`${pr.repoName}-${pr.id}`}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 transform hover:scale-105"
                  onClick={() => router.push(`/github/pr/${pr.repoName}/${pr.number}`)}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative">
                    <img
                      src={pr.user.avatar_url}
                      alt={pr.user.login}
                      className="w-10 h-10 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
                    />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {pr.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {pr.repoName} • {pr.user.login}
                    </p>
                  </div>
                </div>
              ))}
              {allPRs.length === 0 && (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Contributors */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Contributors
              </h3>
            </div>
            <div className="space-y-3">
              {(() => {
                const contributors = allPRs.reduce((acc: Record<string, { count: number; avatar: string }>, pr) => {
                  if (!acc[pr.user.login]) {
                    acc[pr.user.login] = { count: 0, avatar: pr.user.avatar_url };
                  }
                  acc[pr.user.login].count++;
                  return acc;
                }, {});

                return Object.entries(contributors)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .slice(0, 5)
                  .map(([login, data], index) => (
                    <div key={login} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={data.avatar}
                            alt={login}
                            className="w-10 h-10 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
                          />
                          {index === 0 && (
                            <span className="absolute -top-1 -right-1 text-xs">🏆</span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{login}</span>
                      </div>
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300">
                        {data.count} PR{data.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  ));
              })()}
              {allPRs.length === 0 && (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-500">No contributors yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Needs Attention */}
          {totalConflicts > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg animate-bounce">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
                  ⚠️ Needs Attention
                </h3>
              </div>
              <div className="space-y-2">
                {allPRs
                  .filter(pr => pr.mergeable === false)
                  .slice(0, 3)
                  .map((pr) => (
                    <div
                      key={`${pr.repoName}-${pr.id}`}
                      onClick={() => router.push(`/github/pr/${pr.repoName}/${pr.number}`)}
                      className="p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer transition-all duration-200 transform hover:scale-105 border border-red-200 dark:border-red-800"
                    >
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        {pr.repoName} #{pr.number}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-500 mt-1 line-clamp-1">
                        {pr.title}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
