import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { Modal } from "@/components/ui/modal";
import Select2Field from "@/components/form/Select2Field";
import RichTextEditor from "@/components/editor/RichTextEditor";
import { useToast } from "@/context/ToastContext";
import { validateFile, getAcceptString, formatFileSize, getFileTypeCategory } from "@/lib/fileUploadConfig";

type Proyek = { id: number; namaProyek: string };

interface BacklogModalProps {
  isOpen: boolean;
  onClose: () => void;
  editId: number | null;
  formTitle: string;
  setFormTitle: (value: string) => void;
  formNote: string;
  setFormNote: (value: string) => void;
  formProjectId: number | "";
  setFormProjectId: (value: number | "") => void;
  formModuleId: number | "";
  setFormModuleId: (value: number | "") => void;
  formEstimatedManHour: number | "";
  setFormEstimatedManHour: (value: number | "") => void;
  projects: Proyek[];
  moduleLabelCache: Record<number, string>;
  errors: { project?: string; module?: string; note?: string };
  saving: boolean;
  isValid: boolean;
  onSave: () => Promise<void>;
  formFiles: File[];
  setFormFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const NOTE_MAX = 1000;

const BacklogModal: React.FC<BacklogModalProps> = ({
  isOpen,
  onClose,
  editId,
  formTitle,
  setFormTitle,
  formNote,
  setFormNote,
  formProjectId,
  setFormProjectId,
  formModuleId,
  setFormModuleId,
  formEstimatedManHour,
  setFormEstimatedManHour,
  projects,
  moduleLabelCache,
  errors,
  saving,
  isValid,
  onSave,
  formFiles,
  setFormFiles,
}) => {
  const titleRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  
  // Drag & Drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // Handle save with toast notifications
  const handleSave = async () => {
    try {
      await onSave();
      toast.success(
        editId
          ? 'Catatan backlog berhasil diperbarui!'
          : 'Catatan backlog berhasil disimpan!',
        4000
      );
    } catch (error) {
      console.error('Error saving backlog:', error);
      toast.error(
        editId
          ? 'Gagal memperbarui catatan backlog. Silakan coba lagi.'
          : 'Gagal menyimpan catatan backlog. Silakan coba lagi.',
        6000
      );
    }
  };

  // Focus on title when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isValid && !saving) {
          handleSave();
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isValid, saving, handleSave, onClose]);

  const projectOptions = useMemo(() => projects.map(p => ({ id: p.id, text: p.namaProyek })), [projects]);
  const emptyOptions = useMemo(() => [] as any[], []);

  // Track manually selected label (e.g. from AJAX selection) to avoid showing ID
  const [manualModuleLabel, setManualModuleLabel] = useState<string | null>(null);

  const handleProjectChange = useCallback((v: any) => {
    setFormProjectId(v === "" ? "" : Number(v));
    setFormModuleId("");
    setManualModuleLabel(null);
  }, [setFormProjectId, setFormModuleId]);

  // File handling functions
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    const validFiles: File[] = [];

    for (const file of newFiles) {
      const validation = validateFile(file);
      if (!validation.isValid) {
        toast.error(validation.error || `File ${file.name} tidak valid`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setFormFiles((prev: File[]) => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file berhasil ditambahkan`);
    }
  }, [setFormFiles, toast]);

  const handleRemoveFile = useCallback((index: number) => {
    setFormFiles((prev: File[]) => prev.filter((_, i) => i !== index));
  }, [setFormFiles]);

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect]);

  // Paste handler
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      const files = e.clipboardData?.files;

      if (!items && !files) return;

      let fileProcessed = false;

      // Try to get file from items first (for images from clipboard)
      if (items && !fileProcessed) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const file = item.getAsFile();

          if (file && !fileProcessed) {
            fileProcessed = true;
            const validation = validateFile(file);
            if (!validation.isValid) {
              toast.error(validation.error || `File ${file.name} tidak valid`);
              return;
            }

            setFormFiles((prev: File[]) => [...prev, file]);
            const isImage = file.type.startsWith('image/');
            if (isImage) {
              toast.success('Gambar dari clipboard berhasil ditambahkan');
            } else {
              toast.success(`File ${file.name} dari clipboard berhasil ditambahkan`);
            }
            return;
          }
        }
      }

      // Try to get file from files (for files copied from file explorer)
      if (files && files.length > 0 && !fileProcessed) {
        const file = files[0];
        const validation = validateFile(file);
        if (!validation.isValid) {
          toast.error(validation.error || `File ${file.name} tidak valid`);
          return;
        }

        setFormFiles((prev: File[]) => [...prev, file]);
        toast.success(`File ${file.name} dari clipboard berhasil ditambahkan`);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, setFormFiles, toast]);

  const handleModuleChange = useCallback((v: any, data?: any) => {
    setFormModuleId(v === "" ? "" : Number(v));
    if (data?.text) setManualModuleLabel(data.text);
  }, [setFormModuleId]);

  // Ensure ajaxUrl is stable string or undefined
  const moduleAjaxUrl = formProjectId ? `/api/proyek-modules/${Number(formProjectId)}/leaves?format=select2` : undefined;

  const initialModuleSelected = useMemo(() => {
    if (typeof formModuleId === 'number') {
      return {
        id: formModuleId,
        text: manualModuleLabel || moduleLabelCache[formModuleId as number] || String(formModuleId)
      };
    }
    return { id: formModuleId, text: String(formModuleId) };
  }, [formModuleId, moduleLabelCache, manualModuleLabel]);

  console.log('[BacklogModal] Render', { formModuleId, initialModuleSelected, moduleLabelCacheKeys: Object.keys(moduleLabelCache) });



  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-6xl w-[95vw] sm:w-[90vw] max-h-[95vh] overflow-hidden backlog-modal" showCloseButton={false}>
      <div className="flex flex-col h-full max-h-[95vh] modal-content">
        {/* Enhanced Header - Fixed */}
        <div className="flex-shrink-0 px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                {editId ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {editId ? 'Edit Catatan Backlog' : 'Tambah Catatan Backlog'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {editId ? 'Perbarui informasi catatan backlog' : 'Buat catatan baru untuk melacak ide dan tugas'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200 hover:scale-105"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6">

            {/* Enhanced Form Layout - Responsive */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
              {/* Left Column - Project & Module Selection */}
              <div className="space-y-6">
                {/* Project Selection Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-6 border border-blue-100 dark:border-gray-700 info-card">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 section-header-icon">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-2 4h2M7 7h2v6H7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Informasi Proyek</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Proyek <span className="text-red-500">*</span>
                      </label>
                      <div className={`${errors.project ? 'ring-2 ring-red-500/20 rounded-lg' : ''}`}>
                        <Select2Field
                          value={formProjectId as any}
                          onChange={handleProjectChange}
                          options={projectOptions}
                          placeholder="Pilih proyek untuk catatan ini..."
                          className="w-full"
                        />
                      </div>
                      {errors.project && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {errors.project}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Modul <span className="text-red-500">*</span>
                      </label>
                      <div className={`${errors.module ? 'ring-2 ring-red-500/20 rounded-lg' : ''}`}>
                        <Select2Field
                          key={`module-${formProjectId}-${initialModuleSelected?.id || 'new'}-${initialModuleSelected?.text?.length || 0}`}
                          value={formModuleId as any}
                          onChange={handleModuleChange}
                          options={emptyOptions}
                          placeholder={formProjectId ? 'Ketik untuk mencari modul...' : 'Pilih proyek terlebih dahulu'}
                          disabled={!formProjectId}
                          ajaxUrl={moduleAjaxUrl}
                          minimumInputLength={0}
                          initialSelected={initialModuleSelected}
                          className="w-full"
                        />
                      </div>
                      {errors.module && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {errors.module}
                        </p>
                      )}
                      {!formProjectId && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pilih proyek terlebih dahulu untuk melihat daftar modul
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Title Card */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-6 border border-green-100 dark:border-gray-700 info-card">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3 section-header-icon">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Judul Catatan</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Judul
                    </label>
                    <input
                      ref={titleRef}
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Contoh: Implementasi fitur login dengan OAuth"
                    />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Berikan judul yang deskriptif untuk memudahkan pencarian dan identifikasi
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Note Content */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-6 border border-purple-100 dark:border-gray-700 info-card h-full">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3 section-header-icon">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Detail Catatan</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Catatan <span className="text-red-500">*</span>
                      </label>
                      <RichTextEditor
                        value={formNote}
                        onChange={setFormNote}
                        placeholder="Deskripsikan ide, requirement, atau catatan detail tentang fitur yang akan dikembangkan..."
                        disabled={saving}
                        maxHeight="400px"
                      />
                      {errors.note && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {errors.note}
                        </p>
                      )}
                    </div>

                    {/* Enhanced Tips Section */}
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 border border-purple-200 dark:border-gray-600">
                      <div className="flex items-center mb-2">
                        <svg className="w-4 h-4 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tips untuk catatan yang baik</h4>
                      </div>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <li className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          Jelaskan konteks dan latar belakang
                        </li>
                        <li className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          Sertakan requirement atau acceptance criteria
                        </li>
                        <li className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          Tambahkan referensi atau link jika diperlukan
                        </li>
                        <li className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          Gunakan format yang mudah dibaca
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Estimated Man Hour Section */}
            <div className="mt-6">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-6 border border-cyan-100 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Estimasi Jam Kerja</h3>
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">(opsional)</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estimasi Man Hour
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="999"
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                      value={formEstimatedManHour}
                      onChange={(e) => setFormEstimatedManHour(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="Contoh: 8, 16, 24"
                    />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">jam</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Masukkan estimasi jumlah jam kerja yang diperlukan untuk menyelesaikan backlog ini
                  </p>
                </div>
              </div>
            </div>

            {/* File Upload Section - Full Width */}
            <div className="mt-6">
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-6 border border-orange-100 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Lampiran File</h3>
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">(opsional)</span>
                </div>

                <div 
                  className={`relative transition-all duration-200 ${isDragOver ? 'scale-[1.02]' : ''}`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    multiple
                    accept={getAcceptString()}
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={saving}
                    id="backlog-file-upload"
                  />
                  <label
                    htmlFor="backlog-file-upload"
                    className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                      isDragOver 
                        ? 'border-orange-400 bg-orange-100 dark:bg-orange-900/20 scale-[1.02]' 
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <span className={`text-4xl mb-3 transition-all duration-200 ${isDragOver ? 'animate-bounce' : ''}`}>
                        {isDragOver ? '📥' : '📎'}
                      </span>
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">
                          {isDragOver ? 'Lepaskan file di sini' : 'Klik untuk upload'}
                        </span>
                        {!isDragOver && ' atau drag & drop'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Gambar, Dokumen, Spreadsheet, Video, Audio, dll<br />
                        (Limit berbeda per jenis file)
                      </p>
                    </div>
                  </label>
                </div>

                {/* File List */}
                {formFiles.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        📎 {formFiles.length} file dipilih
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormFiles([])}
                        className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        🗑️ Hapus semua
                      </button>
                    </div>
                    <div className="space-y-3 max-h-40 overflow-y-auto">
                      {formFiles.map((file, index) => {
                        const fileCategory = getFileTypeCategory(file);
                        const isImage = fileCategory === 'images';

                        // File type icons
                        const getFileIcon = (category: string, mimeType: string) => {
                          if (category === 'images') return '🖼️';
                          if (category === 'documents') {
                            if (mimeType.includes('pdf')) return '📄';
                            return '📝';
                          }
                          if (category === 'spreadsheets') return '📊';
                          if (category === 'presentations') return '📽️';
                          if (category === 'archives') return '🗜️';
                          if (category === 'videos') return '🎥';
                          if (category === 'audio') return '🎵';
                          if (category === 'textFiles') return '📄';
                          if (category === 'codeFiles') return '💻';
                          return '📎';
                        };

                        return (
                          <div key={index} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex-shrink-0">
                              {isImage ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-500">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-2xl">
                                  {getFileIcon(fileCategory, file.type)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(file.size)} • {fileCategory}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index)}
                              className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Paste Tip */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    💡 Tip: Tekan Ctrl+V untuk paste file dari clipboard atau drag & drop file langsung ke area upload
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Enhanced Footer - Fixed */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-700/50 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 shadow-sm">
                Ctrl
              </kbd>
              <span className="mx-1">+</span>
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 shadow-sm">
                Enter
              </kbd>
              <span className="ml-2">untuk menyimpan</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 shadow-sm"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isValid}
                className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 border border-transparent rounded-xl hover:from-brand-700 hover:to-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {saving && (
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {saving ? 'Menyimpan...' : (editId ? 'Simpan Perubahan' : 'Simpan Catatan')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BacklogModal;