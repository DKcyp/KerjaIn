"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface Repository {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    private: boolean;
    html_url: string;
    owner_source?: string;
    updated_at: string;
    language: string | null;
}

interface PullRequest {
    id: number;
    number: number;
    title: string;
    state: string;
    user: {
        login: string;
        avatar_url: string;
    };
    created_at: string;
    updated_at: string;
    repoName: string;
}

interface RepoWithPRs extends Repository {
    pullRequests: PullRequest[];
    loading: boolean;
}

export default function RepoListPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [repos, setRepos] = useState<RepoWithPRs[]>([]);
    const [filteredRepos, setFilteredRepos] = useState<RepoWithPRs[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [noRepoAssigned, setNoRepoAssigned] = useState(false);

    // Search and Sort states
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'recent_commit' | 'recent_pr' | 'name'>('recent_pr');

    // Expand/collapse state for owner panels
    const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());

    // Access control - only SUPER_ADMIN and PM can access repo list dashboard
    // PROGRAMMER should be redirected to their first assigned repo
    useEffect(() => {
        if (!user) return;

        // Redirect Programmer to first assigned repo
        if (user.role === 'PROGRAMMER') {
            // Fetch first accessible repo and redirect
            fetch('/api/github/repositories')
                .then(res => res.json())
                .then(data => {
                    if (data.repositories && data.repositories.length > 0) {
                        router.push(`/github/repo/${data.repositories[0].name}`);
                    } else {
                        // No repository assigned - show message instead of redirect
                        setNoRepoAssigned(true);
                        setLoading(false);
                    }
                })
                .catch(() => {
                    setNoRepoAssigned(true);
                    setLoading(false);
                });
            return;
        }

        // Block other roles except SUPER_ADMIN and PM
        if (user.role !== 'SUPER_ADMIN' && user.role !== 'PM') {
            router.push('/');
            return;
        }
    }, [user, router]);

    useEffect(() => {
        const fetchRepos = async () => {
            try {
                const response = await fetch("/api/github/repositories");
                if (!response.ok) {
                    throw new Error("Failed to fetch repositories");
                }

                const data = await response.json();
                const repositories: Repository[] = data.repositories || [];

                const reposWithPRs: RepoWithPRs[] = repositories.map(repo => ({
                    ...repo,
                    pullRequests: [],
                    loading: true,
                }));

                setRepos(reposWithPRs);
                setLoading(false);

                // Fetch PRs for each repository
                await Promise.all(
                    repositories.map(async (repo, index) => {
                        try {
                            const prResponse = await fetch(`/api/github/pull-requests?repo=${encodeURIComponent(repo.full_name)}`);
                            if (prResponse.ok) {
                                const prData = await prResponse.json();
                                setRepos(prev => {
                                    const updated = [...prev];
                                    updated[index] = {
                                        ...updated[index],
                                        pullRequests: (prData.pullRequests || []).map((pr: any) => ({
                                            ...pr,
                                            repoName: repo.name,
                                        })),
                                        loading: false,
                                    };
                                    return updated;
                                });
                            }
                        } catch (error) {
                            console.error(`Error fetching PRs for ${repo.name}:`, error);
                        }
                    })
                );
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchRepos();
    }, []);

    // Initialize all owners as expanded when repos load
    useEffect(() => {
        if (repos.length > 0) {
            const owners = Object.keys(repos.reduce((acc, repo) => {
                const owner = repo.owner_source || 'Unknown';
                acc[owner] = true;
                return acc;
            }, {} as Record<string, boolean>));
            setExpandedOwners(new Set(owners));
        }
    }, [repos.length]);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading repositories...</p>
                </div>
            </div>
        );
    }

    if (noRepoAssigned) {
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
                            No GitHub Repository Assigned
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Your account doesn't have any GitHub repository mapped yet. Please contact your PM or administrator to assign a repository to your project.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => router.push('/tasklist')}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Go to Task List
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
                </div>
            </div>
        );
    }

    // Calculate stats from filtered repos
    const totalRepos = filteredRepos.length;
    const allPRs = filteredRepos.flatMap(repo => repo.pullRequests);
    const totalOpenPRs = allPRs.filter(pr => pr.state === 'open').length;
    const recentlyUpdated = filteredRepos.filter(repo => {
        const daysSinceUpdate = (Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate <= 7;
    }).length;

    // Group filtered repos by owner
    const groupedRepos = filteredRepos.reduce((acc, repo) => {
        const owner = repo.owner_source || 'Unknown';
        if (!acc[owner]) acc[owner] = [];
        acc[owner].push(repo);
        return acc;
    }, {} as Record<string, RepoWithPRs[]>);

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    GitHub Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Monitor and manage your repositories
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{totalRepos}</div>
                    <div className="text-blue-100 text-sm">Total Repositories</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{totalOpenPRs}</div>
                    <div className="text-green-100 text-sm">Open Pull Requests</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{recentlyUpdated}</div>
                    <div className="text-purple-100 text-sm">Updated This Week</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{Object.keys(groupedRepos).length}</div>
                    <div className="text-orange-100 text-sm">Active Sources</div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Repository Panels - 2 columns */}
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

                    <div className="space-y-6">
                        {Object.keys(groupedRepos).map((owner) => {
                            const isExpanded = expandedOwners.has(owner);
                            return (
                                <div key={owner} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
                                    {/* Panel Header */}
                                    <div
                                        className="p-6 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        onClick={() => {
                                            const newExpanded = new Set(expandedOwners);
                                            if (isExpanded) {
                                                newExpanded.delete(owner);
                                            } else {
                                                newExpanded.add(owner);
                                            }
                                            setExpandedOwners(newExpanded);
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{owner}</h2>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {groupedRepos[owner].length} {groupedRepos[owner].length === 1 ? 'repository' : 'repositories'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors">
                                                <svg
                                                    className={`w-5 h-5 text-gray-600 dark:text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Repo List */}
                                    {isExpanded && (
                                        <div className="p-6 space-y-2">
                                            {
                                                groupedRepos[owner].map((repo) => (
                                                    <div
                                                        key={repo.id}
                                                        onClick={() => router.push(`/github/repo/${repo.name}`)}
                                                        className="group flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 cursor-pointer transition-all border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transform hover:scale-[1.01]"
                                                    >
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div className="p-1.5 bg-white dark:bg-gray-800 rounded group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors flex-shrink-0">
                                                                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                        {repo.name}
                                                                    </h3>
                                                                    {repo.private && (
                                                                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 flex-shrink-0">
                                                                            Private
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                                                                    {repo.language && (
                                                                        <span className="flex items-center gap-1">
                                                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                                            {repo.language}
                                                                        </span>
                                                                    )}
                                                                    <span className="flex items-center gap-1">
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                        {new Date(repo.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                                            {repo.pullRequests.length > 0 && (
                                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                                                                    {repo.pullRequests.length} PR{repo.pullRequests.length > 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Activity Sidebar - 1 column */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
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
                            {allPRs.slice(0, 10).map((pr) => (
                                <div
                                    key={`${pr.repoName}-${pr.id}`}
                                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all"
                                    onClick={() => router.push(`/github/pr/${pr.repoName}/${pr.number}`)}
                                >
                                    <div className="relative">
                                        <img
                                            src={pr.user.avatar_url}
                                            alt={pr.user.login}
                                            className="w-10 h-10 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {pr.title}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            #{pr.number} • {pr.repoName}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            {new Date(pr.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${pr.state === 'open'
                                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                        : 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                                        }`}>
                                        {pr.state}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
