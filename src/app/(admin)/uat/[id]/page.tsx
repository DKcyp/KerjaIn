"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal/index";
import { useModal } from "@/hooks/useModal";
import Badge from "@/components/ui/badge/Badge";

// Types
type UATStatus = "Pending" | "Approved" | "Rejected";

interface UATItem {
  id: number;
  namaFitur: string;
  kode: string;
  projectId: number;
  moduleId: number;
  testerId: number;
  testerName: string;
  testerEmail?: string;
  tanggalTest: string;
  status: UATStatus;
  deskripsi?: string;
  approvedBy?: string;
  approvedDate?: string;
  project?: {
    id: number;
    kodeProyek: string;
    namaProyek: string;
  };
}

export default function UATDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = Number(params.id);

  const [uatItem, setUatItem] = useState<UATItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Feedback modal
  const { isOpen: isFeedbackModalOpen, openModal: openFeedbackModal, closeModal: closeFeedbackModal } = useModal();
  const [feedbackAction, setFeedbackAction] = useState<"approve" | "reject">("approve");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load UAT item
  useEffect(() => {
    const fetchUATItem = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/uat/${itemId}`);
        const data = await response.json();
        
        if (data.success) {
          setUatItem(data.data);
        } else {
          setError(data.error || 'Failed to fetch UAT item');
        }
      } catch (error) {
        console.error('Error fetching UAT item:', error);
        setError('Failed to fetch UAT item');
      } finally {
        setLoading(false);
      }
    };

    if (itemId) {
      fetchUATItem();
    }
  }, [itemId]);

  const handleApproveClick = () => {
    setFeedbackAction("approve");
    openFeedbackModal();
  };

  const handleRejectClick = () => {
    setFeedbackAction("reject");
    openFeedbackModal();
  };

  const handleFeedbackSubmit = async () => {
    if (!uatItem) return;
    
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('status', feedbackAction === "approve" ? "Approved" : "Rejected");
      
      if (feedbackAction === "approve") {
        formData.append('approvedBy', "Current User");
        formData.append('approvedDate', new Date().toISOString());
      } else {
        formData.append('rejectedBy', "Current User");
      }
      
      formData.append('comment', feedbackComment);
      
      if (feedbackFile) {
        formData.append('file', feedbackFile);
      }

      const response = await fetch(`/api/uat/${itemId}`, {
        method: 'PUT',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        setUatItem(result.data);
        closeFeedbackModal();
        setFeedbackComment("");
        setFeedbackFile(null);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating UAT status:', error);
      alert('Terjadi kesalahan saat mengupdate status UAT');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: UATStatus) => {
    switch (status) {
      case "Pending":
        return (
          <Badge variant="light" color="warning" size="md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending
          </Badge>
        );
      case "Approved":
        return (
          <Badge variant="light" color="success" size="md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Approved
          </Badge>
        );
      case "Rejected":
        return (
          <Badge variant="light" color="error" size="md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Rejected
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileType === "application/pdf") {
      return (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-6xl">❌</div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Error</h2>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Kembali
        </button>
      </div>
    );
  }

  if (!uatItem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-6xl">🔍</div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Item Tidak Ditemukan</h2>
        <p className="text-gray-600 dark:text-gray-400">UAT item tidak tersedia.</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push(`/uat/module/${uatItem.moduleId}`)}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali ke Module
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {uatItem.namaFitur}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {uatItem.project?.namaProyek || `Project ID: ${uatItem.projectId}`}
              </span>
              <span>•</span>
              <span>Code: {uatItem.kode}</span>
              <span>•</span>
              <span>Tester: {uatItem.testerName}</span>
            </div>
          </div>
          <div>
            {getStatusBadge(uatItem.status)}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Deskripsi Fitur
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {uatItem.deskripsi || 'No description available'}
            </p>
          </div>

          {/* Test Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Detail Testing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Tanggal Test</label>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(uatItem.tanggalTest)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Tester</label>
                <p className="text-gray-900 dark:text-gray-100">{uatItem.testerName}</p>
              </div>
              {uatItem.approvedBy && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved By</label>
                  <p className="text-gray-900 dark:text-gray-100">{uatItem.approvedBy}</p>
                </div>
              )}
              {uatItem.approvedDate && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved Date</label>
                  <p className="text-gray-900 dark:text-gray-100">{formatDate(uatItem.approvedDate)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Actions & Activity */}
        <div className="space-y-6">
          {/* Status Saat Ini Card - Removed */}
          {/* Action Buttons - Removed, now available in module list page */}
        </div>
      </div>

      {/* Feedback Modal */}
      <Modal isOpen={isFeedbackModalOpen} onClose={closeFeedbackModal} className="max-w-2xl p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            {feedbackAction === "approve" ? (
              <>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Konfirmasi Approval
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    UAT test ini akan disetujui
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Reject UAT Test
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    UAT test ini akan dikembalikan ke status pending
                  </p>
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Catatan {feedbackAction === "reject" && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              rows={4}
              placeholder={
                feedbackAction === "approve"
                  ? "Tambahkan catatan approval (opsional)..."
                  : "Jelaskan alasan penolakan..."
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lampiran File (opsional)
            </label>
            <div className="relative">
              <input
                type="file"
                onChange={(e) => setFeedbackFile(e.target.files?.[0] || null)}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400 dark:hover:file:bg-blue-900/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {feedbackFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate">{feedbackFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setFeedbackFile(null)}
                    className="ml-auto text-red-500 hover:text-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={closeFeedbackModal}
              disabled={submitting}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleFeedbackSubmit}
              disabled={submitting || (feedbackAction === "reject" && !feedbackComment.trim())}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                feedbackAction === "approve"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {submitting ? 'Processing...' : (feedbackAction === "approve" ? "Approve" : "Reject")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
