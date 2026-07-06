"use client";

import { useParams, useRouter } from "next/navigation";
import CollaboratorsPanel from "@/components/github/CollaboratorsPanel";

export default function CollaboratorsPage() {
  const params = useParams();
  const router = useRouter();
  const repoParam = params.repo as string;
  
  // Decode repo name (handle both "repo-name" and "owner/repo-name")
  const repoFullName = decodeURIComponent(repoParam);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/github/repo/${encodeURIComponent(repoParam)}`)}
          className="group inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all shadow-sm hover:shadow-md mb-6 border border-gray-200 dark:border-gray-700"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Repository</span>
        </button>

        {/* Page Header */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Collaborators Management
                </h1>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white text-sm">{repoFullName}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Control who has access to your repository and manage their permissions
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden lg:flex gap-3">
              <div className="text-center px-5 py-2.5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">🔐</div>
                <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5 font-medium">Secure</div>
              </div>
              <div className="text-center px-5 py-2.5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">⚡</div>
                <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5 font-medium">Fast</div>
              </div>
            </div>
          </div>
        </div>

        {/* Collaborators Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <CollaboratorsPanel repoFullName={repoFullName} />
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Permission Levels</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Choose from Read, Triage, Write, Maintain, or Admin access levels
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <svg className="w-4 h-4 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Secure Access</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              All invitations are sent through GitHub's secure system
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Real-time Updates</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Changes are reflected immediately across your team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
