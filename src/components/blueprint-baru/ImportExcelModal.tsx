"use client";

import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { validateFileType, readFileAsArrayBuffer, parseExcelContent } from '@/utils/excelParser';
import ImportPreviewTable from './ImportPreviewTable';

type ImportExcelModalProps = {
  projectId: number;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ImportExcelModal({ projectId, onClose, onSuccess }: ImportExcelModalProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: showError } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validation = validateFileType(file);
    if (!validation.valid) {
      showError(validation.error || 'File tidak valid');
      return;
    }

    setUploading(true);

    try {
      // Read file content as ArrayBuffer
      const arrayBuffer = await readFileAsArrayBuffer(file);
      
      // Parse Excel content
      const parsed = parseExcelContent(arrayBuffer);
      
      if (parsed.errors.length > 0) {
        showError(`Error parsing file: ${parsed.errors.join(', ')}`);
        setUploading(false);
        return;
      }

      // Send to backend for processing
      const response = await fetch(`/api/blueprint-baru/${projectId}/import-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baInfo: parsed.baInfo,
          rows: parsed.rows
        })
      });

      const result = await response.json();

      if (result.success) {
        setSessionId(result.data.sessionId);
        setPreviewData(result.data);
        setStep('preview');
        success('File berhasil diupload! Silakan review data.');
      } else {
        showError(result.error || 'Gagal memproses file');
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      showError('Terjadi kesalahan saat upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/blueprint-baru/${projectId}/import-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      const result = await response.json();

      if (result.success) {
        success('Blueprint berhasil diimport ke database!');
        onSuccess();
        onClose();
      } else {
        showError(result.error || 'Gagal mengimport blueprint');
      }

    } catch (error) {
      console.error('Error confirming import:', error);
      showError('Terjadi kesalahan saat import');
    }
  };

  const handleCancel = async () => {
    if (sessionId) {
      // Cleanup temp data
      try {
        await fetch(`/api/blueprint-baru/${projectId}/import-confirm?sessionId=${sessionId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Error cleaning up temp data:', error);
      }
    }
    onClose();
  };

  if (step === 'preview' && previewData) {
    return (
      <ImportPreviewTable
        projectId={projectId}
        sessionId={sessionId!}
        initialData={previewData}
        onClose={handleCancel}
        onConfirm={handleConfirmImport}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Import Blueprint dari Excel
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Upload file CSV atau Excel untuk import blueprint
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            
            <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            
            {uploading ? (
              <div>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Memproses file...
                </p>
              </div>
            ) : (
              <div>
                <p className="text-gray-900 dark:text-white font-medium mb-2">
                  Klik untuk upload file atau drag & drop
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Format: XLS, XLSX (Max 5MB)
                </p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-2">Format File Excel:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                  <li>Baris 1: Header BA (Nama Berita Acara | Versi | Deskripsi)</li>
                  <li>Baris 2: Data BA</li>
                  <li>Baris 3: Kosong</li>
                  <li>Baris 4: Header Tabel (Modul Utama | Sub Modul | Nama Task)</li>
                  <li>Baris 5+: Data modul dan task</li>
                </ul>
                <p className="mt-2 text-xs">
                  💡 Tip: Download template untuk melihat format yang benar
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
