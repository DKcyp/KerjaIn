"use client";
import React, { useState, useEffect } from "react";
import { X, Download, Clock, User } from "lucide-react";

type BAFile = {
  id: number;
  type: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  isLatest: boolean;
  uploadedAt: string;
  uploader?: {
    id: number;
    namaLengkap: string;
  };
};

type BAFileHistoryProps = {
  isOpen: boolean;
  onClose: () => void;
  baId: number;
  projectId: number;
  type: 'RFC' | 'CED' | 'OK';
};

export default function BAFileHistory({ isOpen, onClose, baId, projectId, type }: BAFileHistoryProps) {
  const [files, setFiles] = useState<BAFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, baId, type]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/blueprint-baru/${projectId}/ba/files?baId=${baId}&type=${type}`);
      const result = await response.json();
      if (result.success) {
        setFiles(result.data);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            History File {type}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Belum ada file yang diupload</div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className={`border rounded-lg p-4 ${
                  file.isLatest
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {file.fileName}
                      </span>
                      {file.isLatest && (
                        <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded">
                          Terbaru
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{formatDate(file.uploadedAt)}</span>
                      </div>
                      
                      {file.uploader && (
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          <span>{file.uploader.namaLengkap}</span>
                        </div>
                      )}
                      
                      <span>{formatFileSize(file.fileSize)}</span>
                    </div>
                  </div>

                  <a
                    href={file.filePath}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                  >
                    <Download size={20} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
