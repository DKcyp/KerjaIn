'use client';

import React, { useState } from 'react';
import { Modal } from "@/components/ui/modal";
import { useToast } from '@/context/ToastContext';

interface BacklogImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  projects: Array<{ id: number; namaProyek: string }>;
}

interface ImportRow {
  title: string;
  note: string;
  projectId?: number;
  projectName?: string;
  moduleId?: number;
  estimatedManHour?: number;
}

export default function BacklogImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  projects
}: BacklogImportModalProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Format file harus .xlsx, .xls, atau .csv', 4000);
      return;
    }

    setFile(selectedFile);
    await parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    try {
      const text = await file.text();
      const rows: ImportRow[] = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: ImportRow = {
            title: values[headers.indexOf('title')] || '',
            note: values[headers.indexOf('note')] || '',
          };

          const projectName = values[headers.indexOf('project')] || values[headers.indexOf('projectname')];
          if (projectName) {
            const project = projects.find(p => p.namaProyek.toLowerCase() === projectName.toLowerCase());
            if (project) row.projectId = project.id;
          }

          const manHourStr = values[headers.indexOf('estimatedmanhour')] || values[headers.indexOf('man_hour')];
          if (manHourStr) {
            const manHour = parseFloat(manHourStr);
            if (!isNaN(manHour)) row.estimatedManHour = manHour;
          }

          if (row.title || row.note) {
            rows.push(row);
          }
        }
      } else {
        // Parse Excel
        try {
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, any>>;

          for (const item of data) {
            // Helper function untuk mencari value dengan case-insensitive
            const findValue = (obj: Record<string, any>, ...keys: string[]): string => {
              for (const key of keys) {
                const value = obj[key];
                if (value !== undefined && value !== null && value !== '') {
                  return String(value).trim();
                }
              }
              // Jika tidak ketemu, cari dengan case-insensitive
              const objKeys = Object.keys(obj);
              for (const objKey of objKeys) {
                for (const key of keys) {
                  if (objKey.toLowerCase() === key.toLowerCase()) {
                    const value = obj[objKey];
                    if (value !== undefined && value !== null && value !== '') {
                      return String(value).trim();
                    }
                  }
                }
              }
              return '';
            };

            const title = findValue(item, 'Title', 'title', 'TITLE');
            const note = findValue(item, 'Note', 'note', 'NOTE');
            const projectName = findValue(item, 'Project', 'project', 'PROJECT');
            const manHourStr = findValue(item, 'EstimatedManHour', 'estimated_man_hour', 'Man Hour', 'man_hour', 'ESTIMATEDMANHOUR');

            const row: ImportRow = {
              title: title,
              note: note,
            };

            if (projectName) {
              const project = projects.find(p => p.namaProyek.toLowerCase() === projectName.toLowerCase());
              if (project) {
                row.projectId = project.id;
                row.projectName = project.namaProyek;
              } else {
                // Jika project tidak ditemukan di database, tetap simpan nama project dari file
                row.projectName = projectName;
              }
            }

            if (manHourStr) {
              const manHour = parseFloat(manHourStr);
              if (!isNaN(manHour)) row.estimatedManHour = manHour;
            }

            if (row.title || row.note) {
              rows.push(row);
            }
          }
        } catch (e) {
          console.error('Excel parsing error:', e);
          toast.error('Gagal membaca file Excel. Pastikan format benar.', 4000);
          return;
        }
      }

      if (rows.length === 0) {
        toast.error('Tidak ada data valid ditemukan di file', 4000);
        return;
      }

      setPreview(rows);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Gagal membaca file', 4000);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    setStep('importing');
    setImporting(true);

    try {
      const response = await fetch('/api/backlog/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: preview })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal mengimpor backlog');
      }

      const result = await response.json();
      toast.success(`Berhasil mengimpor ${result.imported} backlog item`, 4000);
      
      // Reset state setelah import berhasil
      setFile(null);
      setPreview([]);
      setStep('upload');
      onImportSuccess();
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal mengimpor backlog', 4000);
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = () => {
    // Batal = reset ke upload step untuk import ulang
    setFile(null);
    setPreview([]);
    setStep('upload');
  };

  const handleClose = () => {
    // Close = tutup modal tapi tetap simpan state (jika buka lagi, masih di preview)
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-[95vw] sm:w-[90vw] max-h-[95vh] overflow-hidden" showCloseButton={false}>
      <div className="flex flex-col h-full max-h-[95vh]">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Import Backlog
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Impor catatan backlog dari file Excel atau CSV
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200 hover:scale-105"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Format File</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  Gunakan file Excel (.xlsx, .xls) atau CSV dengan kolom berikut:
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-4">
                  <li>• <strong>Title</strong> - Judul backlog (wajib)</li>
                  <li>• <strong>Note</strong> - Catatan/deskripsi</li>
                  <li>• <strong>Project</strong> - Nama proyek (opsional)</li>
                  <li>• <strong>EstimatedManHour</strong> - Estimasi jam kerja (opsional)</li>
                </ul>
              </div>

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <div className="text-gray-600 dark:text-gray-400">
                    <p className="text-lg font-semibold mb-2">Pilih file untuk diimpor</p>
                    <p className="text-sm">atau drag and drop di sini</p>
                    {file && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        ✓ {file.name}
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Preview ({preview.length} item)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Title</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Note</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Project</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Man Hour</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-200 dark:border-gray-600">
                          <td className="py-2 px-3 text-gray-900 dark:text-gray-100">{row.title}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400 truncate">{row.note}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                            {row.projectName || '-'}
                          </td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                            {row.estimatedManHour ? `${row.estimatedManHour}h` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 5 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      ... dan {preview.length - 5} item lainnya
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-8">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Mengimpor backlog...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 p-6 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            disabled={importing}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 transition-colors"
          >
            Batal
          </button>
          {step === 'preview' && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {importing ? 'Mengimpor...' : 'Impor'}
            </button>
          )}
          {step === 'upload' && file && (
            <button
              onClick={() => setStep('preview')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Lanjut
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
