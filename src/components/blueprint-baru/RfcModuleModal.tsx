"use client";
import React, { useState, useEffect } from "react";
import { X, Upload, Check, Send, File, FileText, FileSpreadsheet, FileImage, Archive, Download } from "lucide-react";

type RfcEntry = {
  id: number;
  moduleId: number;
  iteration: number;
  keterangan: string | null;
  gambar: string | null;
  fileName: string | null;
  createdAt: string;
};

type SubModule = {
  id: string;
  nama: string;
  parentId: string;
};

type MainModule = {
  id: string;
  nama: string;
};

type Task = {
  id: string;
  nama: string;
  moduleId: string;
};

type BAWithModules = {
  ba: { id: number; nama: string; version: string };
  mainModules: MainModule[];
  subModules: SubModule[];
  tasks: Task[];
};

type RfcModuleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  baData: BAWithModules;
  projectId: number;
  mode: 'submit' | 'view';
  onSuccess?: () => void;
};

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) return 'image';
  if (['pdf'].includes(ext || '')) return 'pdf';
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return 'spreadsheet';
  if (['doc', 'docx'].includes(ext || '')) return 'document';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return 'archive';
  return 'file';
}

function FilePreview({ fileName, fileData }: { fileName: string; fileData: string }) {
  const type = getFileIcon(fileName);

  if (type === 'image') {
    return <img src={fileData} alt={fileName} className="w-full h-full object-cover" />;
  }

  const IconMap: Record<string, React.ElementType> = {
    pdf: FileText,
    spreadsheet: FileSpreadsheet,
    document: FileText,
    archive: Archive,
    file: File,
  };
  const Icon = IconMap[type] || File;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      <Icon size={20} className="text-gray-500" />
      <span className="text-[8px] text-gray-500 mt-0.5 truncate max-w-full px-1">{fileName.split('.').pop()?.toUpperCase()}</span>
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function RfcModuleModal({ isOpen, onClose, baData, projectId, mode = 'submit', onSuccess }: RfcModuleModalProps) {
  const [entries, setEntries] = useState<Record<string, RfcEntry[]>>({});
  const [formData, setFormData] = useState<Record<string, {
    keterangan: string;
    fileName: string;
    fileData: string;
  }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeIteration, setActiveIteration] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      fetchAllEntries();
      setActiveIteration(0);
    }
  }, [isOpen, baData.ba.id]);

  const fetchAllEntries = async () => {
    try {
      const res = await fetch(`/api/blueprint-baru/${projectId}/ba-detail-rfc?baId=${baData.ba.id}`);
      const result = await res.json();
      if (result.success) {
        const grouped: Record<string, RfcEntry[]> = {};
        result.data.forEach((entry: RfcEntry) => {
          const key = String(entry.moduleId);
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(entry);
        });
        setEntries(grouped);
      }
    } catch (error) {
      console.error('Error fetching RFC entries:', error);
    }
  };

  const handleSaveModule = async (moduleId: string) => {
    const data = formData[moduleId];
    if (!data?.keterangan?.trim() && !data?.fileData) return;

    setSaving(prev => ({ ...prev, [moduleId]: true }));
    try {
      const res = await fetch(`/api/blueprint-baru/${projectId}/ba-detail-rfc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baId: baData.ba.id,
          moduleId: parseInt(moduleId),
          keterangan: data.keterangan || null,
          gambar: data.fileData || null,
          fileName: data.fileName || null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setFormData(prev => ({ ...prev, [moduleId]: { keterangan: '', fileName: '', fileData: '' } }));
        await fetchAllEntries();
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(prev => ({ ...prev, [moduleId]: false }));
    }
  };

  const handleSubmitRfc = async () => {
    setSubmitting(true);
    try {
      const unsavedModules = Object.entries(formData).filter(
        ([_, v]) => v.keterangan?.trim() || v.fileData
      );
      for (const [moduleId, data] of unsavedModules) {
        await fetch(`/api/blueprint-baru/${projectId}/ba-detail-rfc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baId: baData.ba.id,
            moduleId: parseInt(moduleId),
            keterangan: data.keterangan || null,
            gambar: data.fileData || null,
            fileName: data.fileName || null,
          }),
        });
      }

      const statusRes = await fetch(`/api/blueprint-baru/${projectId}/ba/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baId: baData.ba.id, status: 'RFC' }),
      });
      const statusResult = await statusRes.json();
      if (statusResult.success) {
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Error submitting RFC:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = async (moduleId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/blueprint-baru/${projectId}/upload-gambar`, { method: 'POST', body: fd });
      const result = await res.json();
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          [moduleId]: {
            ...prev[moduleId],
            fileName: result.data.fileName,
            fileData: result.data.fileUrl,
          },
        }));
      }
    } catch (error) {
      console.error('Error uploading RFC file:', error);
    }

    e.target.value = '';
  };

  const getEntryCount = (moduleId: string) => {
    return entries[moduleId]?.length || 0;
  };

  const hasFile = (moduleId: string) => {
    return !!(formData[moduleId]?.fileData);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-[75vw] max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {mode === 'view' ? 'Riwayat RFC' : 'RFC'} - {baData.ba.nama}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {mode === 'view'
                  ? 'Riwayat komentar dan file RFC yang telah dikirim untuk setiap sub modul'
                  : 'Isi komentar dan upload file untuk setiap sub modul yang memerlukan perubahan'}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {/* RFC Iteration Tabs */}
          {mode === 'view' && (
            <div className="mb-4">
              <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
                {(() => {
                  const iterations = [...new Set(Object.values(entries).flatMap(e => e.map(entry => entry.iteration)))].sort((a, b) => a - b);
                  if (iterations.length === 0) return null;
                  return iterations.map(iter => (
                    <button
                      key={iter}
                      onClick={() => setActiveIteration(iter)}
                      className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                        activeIteration === iter
                          ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 border border-b-white dark:border-b-gray-800 border-gray-200 dark:border-gray-700 -mb-px'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      RFC {iter}
                    </button>
                  ));
                })()}
                <button
                  onClick={() => setActiveIteration(0)}
                  className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                    activeIteration === 0
                      ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 border border-b-white dark:border-b-gray-800 border-gray-200 dark:border-gray-700 -mb-px'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Semua
                </button>
              </div>
            </div>
          )}

          {/* Module List - Flat Table */}
          <div className="mb-6">
            {(() => {
              const allModules = [...baData.mainModules, ...baData.subModules];
              if (allModules.length === 0) {
                return <p className="text-center text-gray-500 py-8">Tidak ada modul</p>;
              }
              return (
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Module</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Task BA</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Komentar</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">File</th>
                        {mode === 'submit' && (
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-20">Aksi</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {allModules.flatMap(mod => {
                        const moduleId = mod.id;
                        const data = formData[moduleId] || { keterangan: '', fileName: '', fileData: '' };
                        const moduleEntries = (entries[moduleId] || []).filter(
                          entry => activeIteration === 0 || entry.iteration === activeIteration
                        );
                        const taskName = baData.tasks.find(t => t.moduleId === moduleId)?.nama || '-';
                        const rows: React.ReactNode[] = [];

                        moduleEntries.forEach(entry => {
                          rows.push(
                            <tr key={`entry-${entry.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                              <td className="px-3 py-2 text-gray-900 dark:text-white font-medium align-top">
                                <div className="flex items-center gap-2">
                                  <span>{mod.nama}</span>
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200 rounded">RFC #{entry.iteration}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300 align-top">{taskName}</td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300 align-top text-sm whitespace-pre-wrap">
                                {entry.keterangan || '-'}
                              </td>
                              <td className="px-3 py-2 align-top">
                                {entry.gambar && (
                                  entry.fileName && getFileIcon(entry.fileName) === 'image' ? (
                                    <img
                                      src={entry.gambar}
                                      alt={entry.fileName || 'RFC'}
                                      className="w-10 h-10 object-cover rounded cursor-pointer border border-gray-200 dark:border-gray-700"
                                      onClick={() => window.open(entry.gambar!, '_blank')}
                                    />
                                  ) : (
                                    <a
                                      href={entry.gambar}
                                      download={entry.fileName || 'file'}
                                      target="_blank"
                                      className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                                      title={entry.fileName || 'File'}
                                    >
                                      {getFileIcon(entry.fileName || 'file') === 'pdf' ? <FileText size={14} className="text-red-500" /> :
                                       getFileIcon(entry.fileName || 'file') === 'spreadsheet' ? <FileSpreadsheet size={14} className="text-green-600" /> :
                                       <File size={14} className="text-gray-500" />}
                                    </a>
                                  )
                                )}
                              </td>
                              {mode === 'submit' && <td className="px-3 py-2"></td>}
                            </tr>
                          );
                        });

                        if (mode === 'submit') {
                          rows.push(
                            <tr key={`input-${moduleId}`} className="bg-blue-50/30 dark:bg-blue-900/5">
                              {moduleEntries.length > 0 ? (
                                <>
                                  <td className="px-3 py-2 text-gray-400 text-xs italic align-top" colSpan={2}>+ Tambah komentar baru</td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2 text-gray-900 dark:text-white font-medium align-top">{mod.nama}</td>
                                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300 align-top">{taskName}</td>
                                </>
                              )}
                              <td className="px-3 py-2 align-top" colSpan={2}>
                                <textarea
                                  value={data.keterangan}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    [moduleId]: { ...prev[moduleId], keterangan: e.target.value }
                                  }))}
                                  placeholder="Komentar RFC..."
                                  rows={2}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                                <div className="mt-2">
                                  {hasFile(moduleId) ? (
                                    <div className="relative group inline-block">
                                      <div className="w-12 h-12 rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <FilePreview fileName={data.fileName} fileData={data.fileData} />
                                      </div>
                                      <button
                                        onClick={() => setFormData(prev => ({ ...prev, [moduleId]: { keterangan: prev[moduleId]?.keterangan || '', fileName: '', fileData: '' } }))}
                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-xs text-gray-500">
                                      <Upload size={14} />
                                      Upload file
                                      <input type="file" className="hidden" onChange={(e) => handleFileSelect(moduleId, e)} />
                                    </label>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => handleSaveModule(moduleId)}
                                  disabled={(!data.keterangan?.trim() && !data.fileData) || saving[moduleId]}
                                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                  <Check size={10} />
                                  {saving[moduleId] ? '...' : 'Simpan'}
                                </button>
                              </td>
                            </tr>
                          );
                        }

                        return rows;
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {mode === 'view' ? 'Mode baca - riwayat komentar RFC' : 'Simpan komentar per sub modul terlebih dahulu, lalu kirim RFC'}
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm">
                Tutup
              </button>
              {mode === 'submit' && (
                <button
                  onClick={handleSubmitRfc}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all text-sm font-medium shadow-lg disabled:opacity-50"
                >
                  <Send size={16} />
                  {submitting ? 'Memproses...' : 'Konfirmasi & Kirim RFC'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
