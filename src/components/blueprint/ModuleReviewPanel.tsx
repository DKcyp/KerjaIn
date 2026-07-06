'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/context/ToastContext';

interface ModuleReviewPanelProps {
  blueprintId: number;
  userId?: number;
}

export default function ModuleReviewPanel({
  blueprintId,
  userId,
}: ModuleReviewPanelProps) {
  const { success, error: showError } = useToast();
  
  // State management
  const [reviewSessions, setReviewSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [sessionModules, setSessionModules] = useState<any[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [moduleComments, setModuleComments] = useState<Record<number, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [allModulesComplete, setAllModulesComplete] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [tabPage, setTabPage] = useState(1);
  const tabsPerPage = 5;

  // =========================================================
  // API CALLS
  // =========================================================

  // ✅ Cek semua modul sudah complete atau belum
  const checkAllModulesComplete = async () => {
    if (!blueprintId) {
      console.log('[ModuleReview] No blueprintId, skipping check');
      return;
    }

    try {
      console.log('[ModuleReview] Fetching status for blueprint:', blueprintId);
      const res = await fetch(`/api/blueprint/${blueprintId}/status`);
      const data = await res.json();

      console.log('[ModuleReview] Status response:', JSON.stringify(data, null, 2));

      if (data?.success && typeof data.data?.allModulesComplete === 'boolean') {
        console.log('[ModuleReview] Setting allModulesComplete to:', data.data.allModulesComplete);
        setAllModulesComplete(data.data.allModulesComplete);
      } else {
        console.log('[ModuleReview] Invalid response, setting to false');
        setAllModulesComplete(false);
      }
    } catch (error) {
      console.error('[ModuleReview] Error checking blueprint completion:', error);
      setAllModulesComplete(false);
    }
  };

  // ✅ Fetch daftar review session (tab di kiri)
  const fetchReviewSessions = async () => {
    if (!blueprintId) return;

    try {
      const response = await fetch(`/api/blueprint/${blueprintId}/review-sessions`);
      const data = await response.json();

      if (data.success) {
        const sessions = data.data.sessions || [];
        setReviewSessions(sessions);

        // Select the latest HISTORY session (not active) to display by default
        const historySessions = sessions.filter((s: any) => !s.isActive);
        if (historySessions.length > 0) {
          // Get the most recent history session
          const latestHistory = historySessions[0]; // Already sorted by createdAt desc
          setSelectedSessionId(latestHistory.id);
          console.log('[ModuleReview] Auto-selected latest history session:', latestHistory.id);
        } else {
          // No history yet, select active session if exists
          const activeSess = sessions.find((s: any) => s.isActive);
          if (activeSess) {
            setSelectedSessionId(activeSess.id);
            console.log('[ModuleReview] Auto-selected active session:', activeSess.id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching review sessions:', error);
    }
  };

  // ✅ Fetch detail satu session + modules-nya
  const fetchSessionDetail = async (sessionId: number) => {
    if (!blueprintId || !sessionId) return;

    try {
      setSessionLoading(true);
      const response = await fetch(
        `/api/blueprint/${blueprintId}/review-sessions/${sessionId}`
      );
      const data = await response.json();

      if (data.success) {
        setCurrentSession(data.data.session);
        setSessionModules(data.data.modules || []);

        const comments: Record<number, string> = {};
        (data.data.modules || []).forEach((m: any) => {
          if (m.reviewComment) {
            comments[m.id] = m.reviewComment;
          }
        });
        setModuleComments(comments);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error fetching session detail:', error);
    } finally {
      setSessionLoading(false);
    }
  };

  // =========================================================
  // HANDLERS
  // =========================================================

  const handleTabClick = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setIsModalOpen(true);
    fetchSessionDetail(sessionId);
  };

  const handleOpenReviewModal = () => {
    const activeSess = reviewSessions.find((s: any) => s.isActive);
    if (activeSess) {
      setIsModalOpen(true);
      fetchSessionDetail(activeSess.id);
    }
  };

  const handleSaveReview = async () => {
    const activeSess = reviewSessions.find((s: any) => s.isActive);
    if (!activeSess) return;

    try {
      setSubmitting(true);

      // Ambil semua review (termasuk yang kosong untuk menandai modul sudah OK)
      const reviews = sessionModules.map((module: any) => ({
        moduleId: module.id,
        reviewComment: moduleComments[module.id] || null, // null = sudah OK (100%)
      }));

      const response = await fetch(
        `/api/blueprint/${blueprintId}/review-sessions/${activeSess.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviews,
            createSnapshot: true,
            createdBy: userId || null,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Langsung tutup modal
        setIsModalOpen(false);
        setModuleComments({});
        
        // Refresh data
        await fetchReviewSessions();
        await checkAllModulesComplete();
        
        // Show notification
        success(`Review berhasil disimpan. ${reviews.length} modul telah direview.`);
      } else {
        showError(data.error || 'Gagal menyimpan review');
      }
    } catch (error) {
      console.error('Error saving review session:', error);
      showError('Terjadi kesalahan saat menyimpan review');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // EFFECTS
  // =========================================================

  useEffect(() => {
    if (blueprintId) {
      fetchReviewSessions();
      checkAllModulesComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprintId]);

  // Auto-load session detail when selectedSessionId changes
  useEffect(() => {
    if (selectedSessionId) {
      console.log('[ModuleReview] Auto-loading session detail:', selectedSessionId);
      fetchSessionDetail(selectedSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId]);

  // =========================================================
  // DERIVED VALUES (PAGINATION & FILTERING)
  // =========================================================

  const totalPages = Math.ceil(sessionModules.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedModules = sessionModules.slice(startIndex, endIndex);

  const historySessions = reviewSessions.filter((s: any) => !s.isActive);
  const totalTabPages = Math.ceil(historySessions.length / tabsPerPage);
  const tabStartIndex = (tabPage - 1) * tabsPerPage;
  const tabEndIndex = tabStartIndex + tabsPerPage;
  const paginatedTabs = historySessions.slice(tabStartIndex, tabEndIndex);

  const hasActiveSession = reviewSessions.some((s: any) => s.isActive);

  // Debug log
  console.log('[ModuleReview] Render state:', {
    allModulesComplete,
    hasActiveSession,
    reviewSessionsCount: reviewSessions.length,
    blueprintId
  });

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>📋</span>
            Review Modul
          </h2>
          {!allModulesComplete && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Review semua modul tanpa komentar untuk menyelesaikan blueprint
            </p>
          )}
        </div>

        {/* Completion Badge or Review Button */}
        {allModulesComplete ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex-shrink-0 bg-green-500 w-3 h-3 rounded-full"></div>
            <span className="font-medium text-sm text-green-700 dark:text-green-400">
              Review Selesai - Semua modul sudah 100%
            </span>
          </div>
        ) : (
          <button
            onClick={handleOpenReviewModal}
            disabled={!hasActiveSession}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            Review Modul
          </button>
        )}
      </div>

      {/* History Sessions List */}
      {historySessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
          <p className="text-lg font-medium mb-2">Belum ada review history</p>
          <p className="text-sm">History akan dibuat setelah review pertama disimpan</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {paginatedTabs.map((session: any) => (
              <div
                key={session.id}
                onClick={() => handleTabClick(session.id)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedSessionId === session.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-1 h-8 rounded-full ${
                      selectedSessionId === session.id ? 'bg-brand-600' : 'bg-transparent'
                    }`}
                  />
                  <div>
                    <p
                      className={`font-medium ${
                        selectedSessionId === session.id
                          ? 'text-brand-600 dark:text-brand-400'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {session.sessionName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(session.createdAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.reviewCount > 0 && (
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      {session.reviewCount} review
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tab Pagination */}
          {totalTabPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Menampilkan {tabStartIndex + 1}-
                {Math.min(tabEndIndex, historySessions.length)} dari{' '}
                {historySessions.length} history
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTabPage((prev) => Math.max(1, prev - 1))}
                  disabled={tabPage === 1}
                  className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {tabPage} / {totalTabPages}
                </span>
                <button
                  onClick={() => setTabPage((prev) => Math.min(totalTabPages, prev + 1))}
                  disabled={tabPage === totalTabPages}
                  className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-6xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {currentSession?.sessionName || 'Review Modul'}
            </h3>
            {currentSession?.isActive && (
              <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                Active
              </span>
            )}
          </div>

          {sessionLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
            </div>
          ) : sessionModules.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Tidak ada modul untuk direview
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100 w-[20%]">
                        Nama Modul
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100 w-[15%]">
                        Riwayat Review
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100 w-[45%]">
                        Komentar
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100 w-[20%]">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedModules.map((module: any) => (
                      <tr
                        key={module.id}
                        className="border-b border-gray-200 dark:border-gray-700"
                      >
                        <td className="py-4 px-4 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {module.isLeaf ? '📄' : '📁'} {module.nama}
                            </span>
                            {module.kode && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {module.kode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 align-top">
                          {module.previousReviewComment ? (
                            <div className="text-sm">
                              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Review sebelumnya:</p>
                              <p className="text-gray-700 dark:text-gray-300 italic">"{module.previousReviewComment}"</p>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Belum ada review
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 align-top">
                          <textarea
                            value={moduleComments[module.id] || ''}
                            onChange={(e) =>
                              setModuleComments((prev) => ({
                                ...prev,
                                [module.id]: e.target.value,
                              }))
                            }
                            disabled={!module.canEdit}
                            placeholder={
                              module.canEdit
                                ? 'Tulis review atau komentar...'
                                : 'Modul sudah 100% - tidak bisa direview'
                            }
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="py-4 px-4 align-top">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="h-full bg-brand-600 dark:bg-brand-500 rounded-full transition-all"
                                  style={{
                                    width: `${module.progress?.percentage || 0}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-right">
                                {module.progress?.percentage || 0}%
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Module Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Menampilkan {startIndex + 1}-
                    {Math.min(endIndex, sessionModules.length)} dari{' '}
                    {sessionModules.length} modul
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {currentSession?.isActive && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveReview}
                    disabled={submitting}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan Review'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
