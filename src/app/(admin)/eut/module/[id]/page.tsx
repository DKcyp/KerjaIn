"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal/index";
import { useModal } from "@/hooks/useModal";
import Badge from "@/components/ui/badge/Badge";

// Types
type EUTStatus = "Pending" | "Approved";

interface EUTItem {
  id: number;
  namaFitur: string;
  kode: string;
  projectId: number;
  moduleId: number;
  testerId: number;
  testerName: string;
  testerEmail?: string;
  tanggalTest: string;
  status: EUTStatus;
  deskripsi?: string;
  approvedBy?: string;
  approvedDate?: string;
  project?: {
    id: number;
    kodeProyek: string;
    namaProyek: string;
  };
}

interface EUTModuleData {
  moduleId: number;
  moduleName: string;
  moduleCode: string;
  projectId: number;
  projectName: string;
  items: EUTItem[];
  totalItems: number;
  pendingItems: number;
  approvedItems: number;
}

interface Attachment {
  id: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileUrl?: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
}

export default function EUTModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = Number(params.id);

  const [moduleData, setModuleData] = useState<EUTModuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [approvalNotes, setApprovalNotes] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  
  // Feedback modal
  const { isOpen: isFeedbackModalOpen, openModal: openFeedbackModal, closeModal: closeFeedbackModal } = useModal();
  const [feedbackAction, setFeedbackAction] = useState<"approve" | "reject">("approve");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackFiles, setFeedbackFiles] = useState<File[]>([]);

  // Load EUT module data
  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/eut/module/${moduleId}`);
        const data = await response.json();
        
        if (data.success) {
          setModuleData(data.data);
        } else {
          setError(data.error || 'Failed to fetch module data');
        }
      } catch (error) {
        console.error('Error fetching module data:', error);
        setError('Failed to fetch module data');
      } finally {
        setLoading(false);
      }
    };

    if (moduleId) {
      fetchModuleData();
    }
  }, [moduleId]);

  // Load attachments and approval notes for this module's approval (EUT uses same approval system as UAT)
  useEffect(() => {
    const fetchApprovalData = async () => {
      if (!moduleData) return;
      
      try {
        // First get the approval ID for this module
        const approvalResponse = await fetch(`/api/uat-approval?projectId=${moduleData.projectId}&moduleId=${moduleData.moduleId}`);
        const approvalData = await approvalResponse.json();
        
        if (approvalData.approvals && approvalData.approvals.length > 0) {
          const approval = approvalData.approvals[0];
          
          // Save approval notes and status
          setApprovalNotes(approval.notes);
          setApprovalStatus(approval.status);
          
          // Then get attachments for this approval
          const attachmentsResponse = await fetch(`/api/uat-approval/${approval.id}/attachments`);
          const attachmentsData = await attachmentsResponse.json();
          
          if (attachmentsData.attachments) {
            setAttachments(attachmentsData.attachments);
          }
        }
      } catch (error) {
        console.error('Error fetching approval data:', error);
      }
    };

    fetchApprovalData();
  }, [moduleData]);

  const handleApproveClick = () => {
    setFeedbackAction("approve");
    setFeedbackComment("");
    setFeedbackFiles([]);
    openFeedbackModal();
  };

  const handleRejectClick = () => {
    setFeedbackAction("reject");
    setFeedbackComment("");
    setFeedbackFiles([]);
    openFeedbackModal();
  };

  const handleFeedbackSubmit = async () => {
    if (!moduleData) return;
    
    try {
      const status = feedbackAction === "approve" ? "APPROVED" : "REJECTED";
      
      // Step 1: Create or update UAT approval for this module (EUT uses same approval system)
      const approvalResponse = await fetch('/api/uat-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: moduleData.projectId,
          moduleId: moduleData.moduleId,
          status: status,
          notes: feedbackComment || null,
        }),
      });
      
      if (!approvalResponse.ok) {
        throw new Error('Failed to create approval');
      }
      
      const approvalData = await approvalResponse.json();
      const approvalId = approvalData.approval.id;
      
      // Step 2: Upload all attachments if any
      if (feedbackFiles.length > 0) {
        const formData = new FormData();
        feedbackFiles.forEach(file => {
          formData.append('files', file);
        });
        
        const attachmentResponse = await fetch(`/api/uat-approval/${approvalId}/attachments`, {
          method: 'POST',
          body: formData,
        });
        
        if (!attachmentResponse.ok) {
          console.error('Failed to upload attachments');
        }
      }
      
      // Step 3: Update all EUT items in this module
      const pendingItems = moduleData.items.filter(item => item.status === "Pending");
      const itemStatus = feedbackAction === "approve" ? "Approved" : "Rejected";
      
      for (const item of pendingItems) {
        await fetch(`/api/eut/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: itemStatus,
          }),
        });
      }
      
      closeFeedbackModal();
      setFeedbackComment("");
      setFeedbackFiles([]);
      
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Append new files to existing files instead of replacing
      const newFiles = Array.from(e.target.files);
      setFeedbackFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFeedbackFiles(feedbackFiles.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: EUTStatus) => {
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
          onClick={() => router.push("/eut")}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Kembali ke Daftar EUT
        </button>
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-6xl">🔍</div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Module Tidak Ditemukan</h2>
        <p className="text-gray-600 dark:text-gray-400">EUT module tidak tersedia.</p>
        <button
          onClick={() => router.push("/eut")}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Kembali ke Daftar EUT
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/eut")}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali ke Daftar EUT
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {moduleData.moduleName}
              </h1>
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-mono">
                {moduleData.moduleCode}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-gray-100">{moduleData.projectName}</span>
              <span>•</span>
              <span>{moduleData.totalItems} EUT Items</span>
              <span>•</span>
              <span>{moduleData.pendingItems} Pending</span>
              <span>•</span>
              <span>{moduleData.approvedItems} Approved</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Module Status
            </div>
            {moduleData.pendingItems === 0 && moduleData.totalItems > 0 ? (
              <Badge variant="light" color="success" size="md">
                100%
              </Badge>
            ) : (
              <Badge variant="light" color="warning" size="md">
                {moduleData.totalItems > 0 ? Math.round((moduleData.approvedItems / moduleData.totalItems) * 100) : 0}%
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* EUT Items in Module */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              EUT Items dalam Module ({moduleData.totalItems})
            </h2>
            <div className="space-y-3">
              {moduleData.items.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📝</div>
                  <p className="text-gray-500 dark:text-gray-400">
                    Belum ada EUT items untuk module ini
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    EUT items akan muncul otomatis ketika development tasks selesai
                  </p>
                </div>
              ) : (
                moduleData.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/eut/${item.id}`)}
                    className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                          {item.kode}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {item.namaFitur}
                      </h3>
                      {item.deskripsi && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {item.deskripsi}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Tester: {item.testerName}</span>
                        <span>•</span>
                        <span>Test Date: {formatDate(item.tanggalTest)}</span>
                        {item.approvedBy && (
                          <>
                            <span>•</span>
                            <span>Approved by: {item.approvedBy}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Module Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Module Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {moduleData.totalItems}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total EUT Items</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {moduleData.pendingItems}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pending Review</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {moduleData.approvedItems}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Approved</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Actions & Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/eut')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                View All EUT Items
              </button>
              
              {/* Aksi Testing - Approve Button Only */}
              {moduleData.pendingItems > 0 && (
                <button
                  onClick={handleApproveClick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  ✓ Approve
                </button>
              )}
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Attachments ({attachments.length})
              </h2>
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                  >
                    <div className="flex-shrink-0">
                      {attachment.fileType.startsWith('image/') ? (
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : attachment.fileType.includes('pdf') ? (
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {attachment.originalName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(attachment.fileSize / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Approval Notes */}
          {approvalNotes && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Catatan {approvalStatus === "APPROVED" ? "Approval" : "Rejection"}
              </h2>
              <div className={`p-4 rounded-lg ${
                approvalStatus === "APPROVED" 
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              }`}>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {approvalNotes}
                </p>
              </div>
            </div>
          )}

          {/* Module Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Module Information
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Module ID:</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">{moduleData.moduleId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Project:</span>
                <span className="text-gray-900 dark:text-gray-100">{moduleData.projectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{moduleData.totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Completion:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {moduleData.totalItems > 0 ? Math.round((moduleData.approvedItems / moduleData.totalItems) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
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
                    Bulk Approve Module
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Approve all pending EUT items in this module
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
                    Bulk Reject Module
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Reject all pending EUT items in this module
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
                  : "Jelaskan alasan penolakan untuk semua items..."
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* File Upload - Always shown for both pass and fail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lampirkan File (Multiple) {feedbackAction === "reject" && "- Screenshot / Video / Document"}
              {feedbackFiles.length > 0 && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                  ({feedbackFiles.length} file{feedbackFiles.length > 1 ? 's' : ''} selected)
                </span>
              )}
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
                id="feedback-file-upload"
              />
              <label htmlFor="feedback-file-upload" className="cursor-pointer">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  PNG, JPG, PDF, DOC, XLS, MP4 up to 10MB (Multiple files allowed)
                </p>
              </label>
            </div>
            {feedbackFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {feedbackFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={closeFeedbackModal}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleFeedbackSubmit}
              disabled={feedbackAction === "reject" && !feedbackComment.trim()}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                feedbackAction === "approve"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              Submit {feedbackAction === "approve" ? "Approval" : "Rejection"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
