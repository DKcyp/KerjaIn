"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Repository {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    updated_at: string;
    owner_source?: string;
    is_organization?: boolean;
}

interface PullRequest {
    id: number;
    number: number;
    title: string;
    state: string;
    created_at: string;
    updated_at: string;
    user: {
        login: string;
        avatar_url: string;
    };
    mergeable: boolean | null;
    repoName: string;
}

interface RepoWithPRs extends Repository {
    pullRequests: PullRequest[];
    loading: boolean;
}

interface OwnerPanelProps {
    owner: string;
    repos: RepoWithPRs[];
    ownerIndex: number;
    stillLoadingPRs: boolean;
}

export function OwnerPanel({ owner, repos, ownerIndex, stillLoadingPRs }: OwnerPanelProps) {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
            style={{ animationDelay: `${ownerIndex * 100}ms` }}
        >
            {/* Panel Header */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            {owner}
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                {repos.length} {repos.length === 1 ? 'repo' : 'repos'}
                            </span>
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {repos.filter(r => r.pullRequests.length > 0).length} active PRs
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {stillLoadingPRs && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            <span className="text-sm">Loading...</span>
                        </div>
                    )}
                    <svg
                        className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Panel Content */}
            <div
                className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                    } overflow-hidden`}
            >
                <div className="px-6 pb-6 space-y-2">
                    {repos.map((repo, index) => (
                        <div
                            key={repo.id}
                            onClick={() => router.push(`/github/repo/${repo.name}`)}
                            className="group flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 cursor-pointer transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transform hover:scale-[1.01]"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="p-1.5 bg-white dark:bg-gray-800 rounded group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors duration-300 flex-shrink-0">
                                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                                    </svg>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
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
                                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
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
                                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
