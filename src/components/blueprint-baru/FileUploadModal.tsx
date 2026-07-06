"use client";
import React, { useState } from "react";
import { X, Upload } from "lucide-react";

type FileUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File) => Promise<void>;
  title: string;
  type: 'RFC' | 'CED' | 'OK';
};

export default function FileUploadModal({ isOpen, onClose, onSubmit, title, type }: FileUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      alert('Pilih file terlebih dahulu');
      return;
    }

    setUploading(true);
    try {
      await onSubmit(file);
      setFile(null);
      onClose();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Gagal upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
              Upload File {type}
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {file ? file.name : 'Klik untuk upload file'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  PDF, DOC, DOCX, XLS, XLSX
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
