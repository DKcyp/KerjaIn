"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  };
}

interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export default function BranchReviewPage() {
  const params = useParams();
  const router = useRouter();
  // Decode the URL parameter since router.push uses encodeURIComponent
  const repoParam = decodeURIComponent(params.repo as string);
  // Handle catch-all segment for branch names with slashes (e.g., feat/menu)
  const rawBranch = params.branch;
  const branch = Array.isArray(rawBranch)
    ? rawBranch.map(segment => decodeURIComponent(segment)).join('/')
    : decodeURIComponent(rawBranch as string);

  const [commits, setCommits] = useState<Commit[]>([]);
  const [branchInfo, setBranchInfo] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const perPage = 20;

  // The repoParam should already be in "owner/repo" format from the URL
  const fullRepo = repoParam;
  const repoName = fullRepo.split('/').pop() || repoParam;

  useEffect(() => {
    fetchBranchData();
  }, [currentPage]);

  const fetchBranchData = async () => {
    try {
      setLoading(true);

      console.log('[Branch Page] Fetching:', fullRepo, branch, 'page:', currentPage);

      const response = await fetch(
        `/api/github/branch?repo=${fullRepo}&branch=${branch}&page=${currentPage}&per_page=${perPage}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch branch data");
      }

      const data = await response.json();
      console.log('[Branch Page] Data received:', data);

      setBranchInfo(data.branch);
      setCommits(data.commits || []);
      setHasMore(data.pagination?.hasMore || false);
    } catch (err: any) {
      console.error('[Branch Page] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading branch...</p>
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
            onClick={() => router.push(`/github/repo/${repoName}`)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Repository
          </button>
        </div>
      </div>
    );
  }

  const getBranchColor = (branchName: string) => {
    if (branchName === "main") return "green";
    if (branchName === "staging") return "yellow";
    return "blue";
  };

  const color = getBranchColor(branch);
  const colorClasses = {
    green: {
      bg: "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
      border: "border-green-300 dark:border-green-700",
      text: "text-green-700 dark:text-green-300",
      dot: "bg-green-500",
    },
    yellow: {
      bg: "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20",
      border: "border-yellow-300 dark:border-yellow-700",
      text: "text-yellow-700 dark:text-yellow-300",
      dot: "bg-yellow-500",
    },
    blue: {
      bg: "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
      border: "border-blue-300 dark:border-blue-700",
      text: "text-blue-700 dark:text-blue-300",
      dot: "bg-blue-500",
    },
  };

  const classes = colorClasses[color];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button
        onClick={() => {
          console.log('[Branch Page] Back button clicked');
          console.log('[Branch Page] fullRepo:', fullRepo);
          console.log('[Branch Page] repoName:', repoName);
          console.log('[Branch Page] Navigating to:', `/github/repo/${repoName}`);
          router.push(`/github/repo/${repoName}`);
        }}
        className="group flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mb-4"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="font-medium">Back to Repository</span>
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
          <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          {fullRepo}
        </h1>

        <div className={`inline-flex items-center gap-3 px-6 py-3 ${classes.bg} border-2 ${classes.border} rounded-xl shadow-sm`}>
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          <span className={`w-2.5 h-2.5 rounded-full ${classes.dot} animate-pulse`}></span>
          <span className={`${classes.text} font-bold text-lg`}>{branch}</span>
          {branchInfo?.protected && (
            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs rounded-full font-semibold flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Protected
            </span>
          )}
          {branchInfo && (
            <span className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-mono border border-gray-200 dark:border-gray-600">
              {branchInfo.commit.sha.substring(0, 7)}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Commits
          </h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {commits.length > 0 ? (
            commits.map((commit, index) => (
              <div
                key={commit.sha}
                className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <img
                    src={commit.author?.avatar_url || "/default-avatar.png"}
                    alt={commit.author?.login || "Unknown"}
                    className="w-10 h-10 rounded-full ring-2 ring-gray-200 dark:ring-gray-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-white font-medium mb-1">
                      {commit.commit.message.split("\n")[0]}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">{commit.author?.login || commit.commit.author.name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(commit.commit.author.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-mono">
                      {commit.sha.substring(0, 7)}
                    </span>
                    <a
                      href={`https://github.com/${fullRepo}/commit/${commit.sha}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="View on GitHub"
                    >
                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 text-lg">No commits found</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {commits.length > 0 && (
          <div className="mt-6 flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="group flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 dark:disabled:hover:border-gray-600 disabled:hover:shadow-none transition-all"
            >
              <svg className="w-4 h-4 text-gray-700 dark:text-gray-200 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Previous</span>
            </button>

            <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Page</span>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md font-bold text-sm">
                  {currentPage}
                </span>
              </div>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{commits.length}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">commits</span>
              </div>
            </div>

            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!hasMore || loading}
              className="group flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 dark:disabled:hover:border-gray-600 disabled:hover:shadow-none transition-all"
            >
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Next</span>
              <svg className="w-4 h-4 text-gray-700 dark:text-gray-200 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
