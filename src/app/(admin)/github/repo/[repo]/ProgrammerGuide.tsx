"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { WebhookHistoryPanel } from "@/components/programmer/WebhookHistoryPanel";

interface CreatePRFormProps {
    repoName: string;
    fullRepo: string;
    hideRepoSelection?: boolean;
    allowAllTargetBranches?: boolean;
    hideHeader?: boolean;
}

interface Branch {
    name: string;
    commit: {
        sha: string;
        url: string;
    };
    protected: boolean;
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
}

export default function CreatePRForm({
    repoName,
    fullRepo,
    hideRepoSelection = false,
    allowAllTargetBranches = false,
    hideHeader = false
}: CreatePRFormProps) {
    const router = useRouter();
    const toast = useToast();
    const { user } = useAuth();

    const [branches, setBranches] = useState<Branch[]>([]);
    const [accessibleRepos, setAccessibleRepos] = useState<{ name: string; full_name: string }[]>([]);

    const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
    const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
    const [loadingBranches, setLoadingBranches] = useState(true);
    const [loadingPRs, setLoadingPRs] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Searchable dropdown states
    const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
    const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);
    const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
    const [sourceSearchQuery, setSourceSearchQuery] = useState('');
    const [targetSearchQuery, setTargetSearchQuery] = useState('');
    const [repoSearchQuery, setRepoSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        head: '',
        base: 'main',
        title: '',
        body: '',
    });

    useEffect(() => {
        fetchAccessibleRepos();
    }, []);

    useEffect(() => {
        if (fullRepo) {
            // Reset form when switching repos (Standard behavior)
            setFormData({
                head: '',
                base: 'main', // Will be updated by fetchBranches priority logic
                title: '',
                body: '',
            });
            fetchBranches();
            fetchPullRequests();
        }
    }, [fullRepo]);


    // Click outside handler to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Close source dropdown if click is outside
            if (isSourceDropdownOpen && !target.closest('.source-dropdown-container')) {
                setIsSourceDropdownOpen(false);
                setSourceSearchQuery('');
            }
            // Close target dropdown if click is outside
            if (isTargetDropdownOpen && !target.closest('.target-dropdown-container')) {
                setIsTargetDropdownOpen(false);
            }
            // Close repo dropdown if click is outside
            if (isRepoDropdownOpen && !target.closest('.repo-dropdown-container')) {
                setIsRepoDropdownOpen(false);
                setRepoSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSourceDropdownOpen, isTargetDropdownOpen, isRepoDropdownOpen]);

    const fetchAccessibleRepos = async () => {
        try {
            const res = await fetch('/api/github/repositories');
            if (res.ok) {
                const data = await res.json();
                setAccessibleRepos(data.repositories.map((r: any) => ({
                    name: r.name,
                    full_name: r.full_name
                })));
            }
        } catch (error) {
            console.error('Failed to fetch accessible repos:', error);
        }
    };


    const fetchBranches = async () => {
        try {
            setLoadingBranches(true);
            const response = await fetch(`/api/github/branches?repo=${encodeURIComponent(fullRepo)}`);

            if (!response.ok) {
                throw new Error('Failed to fetch branches');
            }

            const data = await response.json();
            const branchList = data.branches || [];
            console.log('[ProgrammerGuide] Fetched branches for', fullRepo, ':', branchList);
            setBranches(branchList);

            // Only show info if repo is truly empty (no error, just no branches)
            if (branchList.length === 0) {
                console.info('Repository has no branches yet');
                return; // Don't show error toast for empty repos
            }

            // Set default base with priority: staging > trial > main
            const stagingBranch = branchList.find((b: Branch) => b.name === 'staging');
            const trialBranch = branchList.find((b: Branch) => b.name === 'trial');
            const mainBranch = branchList.find((b: Branch) => b.name === 'main');

            // Logic: staging -> trial -> main
            // Only defaults to one of these allowed branches
            let defaultBranch = stagingBranch || trialBranch || mainBranch;

            // If in Admin Mode (allowAllTargetBranches), default to main or first branch if no strict priorities found
            if (allowAllTargetBranches && !defaultBranch) {
                defaultBranch = mainBranch || branchList[0];
            }

            if (defaultBranch) {
                setFormData(prev => ({ ...prev, base: defaultBranch.name }));
            } else if (mainBranch) {
                setFormData(prev => ({ ...prev, base: 'main' }));
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
            // Only show error for actual API failures, not empty repos
            toast.error('Failed to load branches');
        } finally {
            setLoadingBranches(false);
        }
    };

    const fetchPullRequests = async () => {
        try {
            setLoadingPRs(true);
            const response = await fetch(`/api/github/pull-requests?repo=${encodeURIComponent(fullRepo)}`);

            if (!response.ok) {
                throw new Error('Failed to fetch pull requests');
            }

            const data = await response.json();
            const allPRs = data.pullRequests || [];

            // Filter to show only PRs created by current user
            const userPRs = allPRs.filter((pr: PullRequest) =>
                pr.user.login === user?.username || pr.state === 'open'
            );
            setPullRequests(userPRs);

            // Don't show error for empty PR list (normal for new repos)
            if (allPRs.length === 0) {
                console.info('No pull requests found');
            }
        } catch (error) {
            console.error('Error fetching PRs:', error);
            // Only show error for actual API failures
            toast.error('Failed to load pull requests');
        } finally {
            setLoadingPRs(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.head || !formData.base || !formData.title) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (formData.head === formData.base) {
            toast.error('Source and target branches cannot be the same');
            return;
        }

        try {
            setSubmitting(true);

            const response = await fetch('/api/github/create-pr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    repo: fullRepo,
                    head: formData.head,
                    base: formData.base,
                    title: formData.title,
                    body: formData.body,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create pull request');
            }

            toast.success(`✅ Pull Request #${data.pullRequest.number} created successfully!`);

            // Refresh PR list
            fetchPullRequests();

            // Reset form
            setFormData({
                head: '',
                base: formData.base,
                title: '',
                body: '',
            });

        } catch (error: any) {
            console.error('Error creating PR:', error);
            toast.error(error.message || 'Failed to create pull request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const getStatusBadge = (pr: PullRequest) => {
        if (pr.draft) {
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Draft</span>;
        }
        if (pr.state === "open") {
            if (pr.mergeable === false) {
                return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Conflicts</span>;
            }
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Open</span>;
        }
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">Merged</span>;
    };

    return (
        <div className={hideHeader ? "" : "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 p-6"}>
            <div className={hideHeader ? "" : "max-w-7xl mx-auto"}>
                {/* Header */}
                {!hideHeader && (
                    <div className="mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md shadow-green-500/20">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                    Programmer Workspace
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 text-[10px] mt-0 flex items-center gap-1">
                                    <span>Repository:</span>
                                    <span className="font-mono text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                                        {repoName}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2 Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Create PR Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4 shadow-xl shadow-blue-500/5">
                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md">
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Create Pull Request</h2>
                                </div>
                                {/* Repo Selector or Label */}
                                {hideRepoSelection ? (
                                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                            {repoName}
                                        </span>
                                    </div>
                                ) : (
                                    accessibleRepos.length > 1 && (
                                        <div className="repo-dropdown-container relative">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={isRepoDropdownOpen ? repoSearchQuery : repoName}
                                                    onChange={(e) => {
                                                        setRepoSearchQuery(e.target.value);
                                                        if (!isRepoDropdownOpen) setIsRepoDropdownOpen(true);
                                                    }}
                                                    onFocus={() => {
                                                        setIsRepoDropdownOpen(true);
                                                        setRepoSearchQuery('');
                                                    }}
                                                    placeholder="Select repository..."
                                                    className="w-48 px-3 py-1.5 pr-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white placeholder-white/60 rounded-lg transition-all shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                                                />
                                                <svg className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none transition-transform ${isRepoDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                            {isRepoDropdownOpen && (
                                                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                                                    {accessibleRepos
                                                        .filter(repo => repo.name.toLowerCase().includes(repoSearchQuery.toLowerCase()))
                                                        .map((repo) => (
                                                            <button
                                                                key={repo.name}
                                                                type="button"
                                                                onClick={() => {
                                                                    router.push(`/github/repo/${repo.name}`);
                                                                    setIsRepoDropdownOpen(false);
                                                                    setRepoSearchQuery('');
                                                                }}
                                                                className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${repo.name === repoName ? 'bg-blue-100 dark:bg-blue-900/30 font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                                                                    </svg>
                                                                    <span className="truncate">{repo.name}</span>
                                                                    {repo.name === repoName && (
                                                                        <svg className="w-3 h-3 ml-auto text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Source Branch - Searchable */}
                                <div className="space-y-3 relative">
                                    <label className="block text-sm font-bold text-gray-900 dark:text-white">
                                        Source Branch <span className="text-red-500">*</span>
                                    </label>
                                    {loadingBranches ? (
                                        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Loading branches...</span>
                                        </div>
                                    ) : (
                                        <div className="relative source-dropdown-container">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={isSourceDropdownOpen ? sourceSearchQuery : (formData.head || '')}
                                                    onChange={(e) => {
                                                        setSourceSearchQuery(e.target.value);
                                                        if (!isSourceDropdownOpen) {
                                                            setIsSourceDropdownOpen(true);
                                                        }
                                                    }}
                                                    onFocus={() => {
                                                        setIsSourceDropdownOpen(true);
                                                        setSourceSearchQuery('');
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && isSourceDropdownOpen) {
                                                            e.preventDefault();
                                                            const filteredBranches = branches.filter(b =>
                                                                b.name !== formData.base &&
                                                                b.name.toLowerCase().includes(sourceSearchQuery.toLowerCase())
                                                            );
                                                            if (filteredBranches.length > 0) {
                                                                handleChange('head', filteredBranches[0].name);
                                                                setIsSourceDropdownOpen(false);
                                                                setSourceSearchQuery('');
                                                            }
                                                        }
                                                        if (e.key === 'Escape') {
                                                            setIsSourceDropdownOpen(false);
                                                            setSourceSearchQuery('');
                                                        }
                                                    }}
                                                    placeholder={branches.length <= 1 ? "No source branches available..." : "Select source branch..."}
                                                    disabled={branches.length <= 1}
                                                    className="w-full px-4 py-2 pr-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 dark:text-white transition-all hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                                                    disabled={branches.length <= 1}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 disabled:opacity-30"
                                                >
                                                    <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isSourceDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Helper text for single branch repo */}
                                            {branches.length === 1 && (
                                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                                                    ⚠️ Only 'main' branch exists. Please push a new branch to create a Pull Request.
                                                </p>
                                            )}

                                            {isSourceDropdownOpen && branches.length > 1 && (
                                                <div className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-hidden animate-slideDown">
                                                    <div className="max-h-64 overflow-y-auto">
                                                        {branches
                                                            .filter(b => b.name !== formData.base && b.name.toLowerCase().includes(sourceSearchQuery.toLowerCase()))
                                                            .map((branch) => (
                                                                <button
                                                                    key={branch.name}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleChange('head', branch.name);
                                                                        setIsSourceDropdownOpen(false);
                                                                        setSourceSearchQuery('');
                                                                    }}
                                                                    className="w-full px-4 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-gray-900 dark:text-white flex items-center justify-between group"
                                                                >
                                                                    <span>{branch.name}</span>
                                                                    {formData.head === branch.name && (
                                                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        {branches.filter(b => b.name !== formData.base).length === 0 && (
                                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                                No other branches found
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Target Branch - Auto Selected with Manual Override */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-gray-900 dark:text-white">
                                        Target Branch <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative target-dropdown-container">
                                        <button
                                            type="button"
                                            onClick={() => setIsTargetDropdownOpen(!isTargetDropdownOpen)}
                                            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold flex items-center justify-between text-sm shadow-md hover:shadow-lg transition-all"
                                        >
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>{formData.base}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Target</span>
                                                <svg className={`w-4 h-4 text-white/80 transition-transform duration-200 ${isTargetDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </button>

                                        {isTargetDropdownOpen && (
                                            <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-hidden animate-slideDown">
                                                <div className="max-h-64 overflow-y-auto">
                                                    {branches
                                                        .filter(b => allowAllTargetBranches ? true : ['main', 'staging', 'trial'].includes(b.name))
                                                        .map((branch) => (
                                                            <button
                                                                key={branch.name}
                                                                type="button"
                                                                onClick={() => {
                                                                    handleChange('base', branch.name);
                                                                    setIsTargetDropdownOpen(false);
                                                                }}
                                                                className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-gray-900 dark:text-white flex items-center justify-between group border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                                                            >
                                                                <span className="font-medium">{branch.name}</span>
                                                                {formData.base === branch.name && (
                                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* PR Title */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-gray-900 dark:text-white">
                                        Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => handleChange('title', e.target.value)}
                                        placeholder="e.g., Add user authentication"
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 dark:text-white transition-all hover:border-blue-300 dark:hover:border-blue-600"
                                        required
                                    />
                                </div>

                                {/* PR Description */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-gray-900 dark:text-white">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.body}
                                        onChange={(e) => handleChange('body', e.target.value)}
                                        placeholder="Describe your changes..."
                                        rows={5}
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 dark:text-white transition-all hover:border-blue-300 dark:hover:border-blue-600 resize-none"
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={submitting || loadingBranches || !formData.head || !formData.base || !formData.title}
                                    className="w-full px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-bold text-sm disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-[1.01]"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Create Pull Request
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: My Pull Requests */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3 shadow-xl shadow-purple-500/5 sticky top-3">
                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                <div className="p-1 bg-gradient-to-br from-purple-500 to-pink-600 rounded-md">
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">My Pull Requests</h2>
                            </div>

                            {loadingPRs ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                                </div>
                            ) : pullRequests.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl inline-block mb-3">
                                        <svg className="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">No pull requests yet</p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Create your first PR to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pullRequests.slice(0, 5).map((pr) => (
                                        <div
                                            key={pr.id}
                                            onClick={() => setSelectedPR(pr)}
                                            className="group p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 cursor-pointer transition-all border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h3 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 flex-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    #{pr.number} {pr.title}
                                                </h3>
                                                {getStatusBadge(pr)}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
                                                <span className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{pr.head.ref}</span>
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                                <span className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{pr.base.ref}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                                {new Date(pr.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                    ))}

                                    {/* View All / Total Count Indicator */}
                                    {pullRequests.length > 5 && (
                                        <div className="pt-2 text-center border-t border-gray-100 dark:border-gray-700">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                Showing recent 5 of {pullRequests.length} pull requests
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Repository Clone Info */}
                        <div className="mt-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3 shadow-xl shadow-purple-500/5">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1 bg-gradient-to-br from-purple-500 to-pink-600 rounded-md">
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">Clone Repository</h2>
                            </div>

                            <div className="space-y-3">
                                {/* HTTPS URL */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">HTTPS</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={`https://github.com/${fullRepo}.git`}
                                            readOnly
                                            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white"
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`https://github.com/${fullRepo}.git`);
                                                toast.success('HTTPS URL copied!');
                                            }}
                                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 font-medium text-xs"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                {/* SSH URL */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">SSH</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={`git@github.com:${fullRepo}.git`}
                                            readOnly
                                            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white"
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`git@github.com:${fullRepo}.git`);
                                                toast.success('SSH URL copied!');
                                            }}
                                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 font-medium text-xs"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Setup Guide */}
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1.5">Quick Setup:</p>
                                    <code className="block text-[10px] font-mono text-blue-800 dark:text-blue-200 bg-white/50 dark:bg-gray-900/50 p-2 rounded border border-blue-200 dark:border-blue-700">
                                        git clone https://github.com/{fullRepo}.git<br />
                                        cd {repoName}<br />
                                    </code>
                                </div>
                            </div>
                        </div>

                        {/* Webhook History Panel */}
                        {user && fullRepo && (
                            <div className="mt-3">
                                <WebhookHistoryPanel
                                    programmerId={user.id}
                                    programmerName={user.namaLengkap || user.username || 'Programmer'}
                                    currentRepo={fullRepo}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PR Detail Modal */}
            {
                selectedPR && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setSelectedPR(null)}>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-2xl">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-3xl font-bold text-white">
                                                #{selectedPR.number}
                                            </h2>
                                            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                                <span className="text-white text-xs font-bold">{selectedPR.state.toUpperCase()}</span>
                                            </div>
                                        </div>
                                        <h3 className="text-xl text-white font-semibold mb-3">
                                            {selectedPR.title}
                                        </h3>
                                        <div className="flex items-center gap-3 text-sm text-white/90">
                                            <span className="font-mono bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                                                {selectedPR.head.ref}
                                            </span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                            <span className="font-mono bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                                                {selectedPR.base.ref}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedPR(null)}
                                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-6">
                                {/* Created Info */}
                                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                    <img src={selectedPR.user.avatar_url} alt={selectedPR.user.login} className="w-10 h-10 rounded-full ring-2 ring-purple-500" />
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-bold text-gray-900 dark:text-white">{selectedPR.user.login}</span>
                                            {' '}created this pull request
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500">
                                            {new Date(selectedPR.created_at).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>

                                {/* Status Info */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                    <p className="text-sm text-blue-900 dark:text-blue-200">
                                        <strong className="flex items-center gap-2 mb-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Read-Only View
                                        </strong>
                                        You can view the pull request details here. Your PM will review and approve this PR.
                                    </p>
                                </div>

                                {/* View on GitHub Button */}
                                <a
                                    href={selectedPR.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-700 dark:to-gray-600 text-white rounded-xl hover:from-black hover:to-gray-900 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all text-center font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                                >
                                    <div className="flex items-center justify-center gap-3">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                        </svg>
                                        View on GitHub
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                )
            }

            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
        </div >
    );
}
