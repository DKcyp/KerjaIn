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
  approvedBy?: number;
  approvedByName?: string;
  approvedDate?: string;
  uatFilePath?: string;
  userGuideFiles?: string[];
  project?: {
    id: number;
    kodeProyek: string;
    namaProyek: string;
  };
}

export default function EUTDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = Number(params.id);

  const [eutItem, setEutItem] = useState<EUTItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Approval modal
  const { isOpen: isApprovalModalOpen, openModal: openApprovalModal, closeModal: closeApprovalModal } = useModal();
  const [submitting, setSubmitting] = useState(false);
  const [uatFile, setUatFile] = useState<File | null>(null);
  const [userGuideFiles, setUserGuideFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  // Load EUT item
  useEffect(() => {
    const fetchEUTItem = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/eut/${itemId}`);
        const data = await response.json();
        
        if (data.success) {
          setEutItem(data.data);
        } else {
          setError(data.error || 'Failed to fetch EUT item');
        }
      } catch (error) {
        console.error('Error fetching EUT item:', error);
        setError('Failed to fetch EUT item');
      } finally {
        setLoading(false);
      }
    };

    if (itemId) {
      fetchEUTItem();
    }
  }, [itemId]);

  // Approval functions moved to module page
  /* 
  const handleApproveClick = () => {
    openApprovalModal();
  };

  const handleUatFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUatFile(e.target.files[0]);
    }
  };

  const handleUserGuideFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUserGuideFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveUserGuideFile = (index: number) => {
    setUserGuideFiles(prev => prev.filter((_, i) => i !== index));
  };
  */

  const handleApprovalSubmit = async () => {
    if (!eutItem) return;
    
    // Validate that UAT file is provided
    if (!uatFile) {
      alert('UAT file is required for approval');
      return;
    }

    setSubmitting(true);
    setUploadProgress("Uploading files...");
    
    try {
      // Upload UAT file
      const uatFormData = new FormData();
      uatFormData.append('files', uatFile);
      uatFormData.append('type', 'uat');

      const uatUploadResponse = await fetch('/api/eut/upload', {
        method: 'POST',
        body: uatFormData,
      });

      const uatUploadResult = await uatUploadResponse.json();
      if (!uatUploadResult.success) {
        throw new Error('Failed to upload UAT file');
      }

      // Upload user guide files if any
      let userGuideFilePaths: string[] = [];
      if (userGuideFiles.length > 0) {
        setUploadProgress(`Uploading user guides (${userGuideFiles.length} files)...`);
        const guideFormData = new FormData();
        userGuideFiles.forEach(file => {
          guideFormData.append('files', file);
        });
        guideFormData.append('type', 'userguide');

        const guideUploadResponse = await fetch('/api/eut/upload', {
          method: 'POST',
          body: guideFormData,
        });

        const guideUploadResult = await guideUploadResponse.json();
        if (!guideUploadResult.success) {
          throw new Error('Failed to upload user guide files');
        }
        userGuideFilePaths = guideUploadResult.files;
      }

      // Update EUT status with file paths
      setUploadProgress("Updating status...");
      const response = await fetch(`/api/eut/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: "Approved",
          uatFilePath: uatUploadResult.files[0],
          userGuideFiles: userGuideFilePaths,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setEutItem(result.data);
        closeApprovalModal();
        setUatFile(null);
        setUserGuideFiles([]);
        setUploadProgress("");
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error approving EUT:', error);
      alert('Terjadi kesalahan saat approve EUT');
    } finally {
      setSubmitting(false);
      setUploadProgress("");
    }
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
          onClick={() => router.back()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Kembali
        </button>
      </div>
    );
  }

  if (!eutItem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-6xl">🔍</div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Item Tidak Ditemukan</h2>
        <p className="text-gray-600 dark:text-gray-400">EUT item tidak tersedia.</p>
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
        onClick={() => router.push(`/eut/module/${eutItem.moduleId}`)}
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
              {eutItem.namaFitur}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {eutItem.project?.namaProyek || `Project ID: ${eutItem.projectId}`}
              </span>
              <span>•</span>
              <span>Code: {eutItem.kode}</span>
              <span>•</span>
              <span>Tester: {eutItem.testerName}</span>
            </div>
          </div>
          <div>
            {getStatusBadge(eutItem.status)}
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
              {eutItem.deskripsi || 'No description available'}
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
                <p className="text-gray-900 dark:text-gray-100">{formatDate(eutItem.tanggalTest)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Tester</label>
                <p className="text-gray-900 dark:text-gray-100">{eutItem.testerName}</p>
              </div>
              {eutItem.approvedByName && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved By</label>
                  <p className="text-gray-900 dark:text-gray-100">{eutItem.approvedByName}</p>
                </div>
              )}
              {eutItem.approvedDate && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved Date</label>
                  <p className="text-gray-900 dark:text-gray-100">{formatDate(eutItem.approvedDate)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Actions & Activity */}
        <div className="space-y-6">
          {/* Status Saat Ini and Aksi Testing removed - moved to module page */}
        </div>
      </div>
    </div>
  );
}
