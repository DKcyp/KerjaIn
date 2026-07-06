"use client";

import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Edit2, Trash2, Plus, ChevronDown, ChevronUp, Upload } from 'lucide-react';

type ValidationError = {
  field: string;
  message: string;
};

type BAModuleRow = {
  id: string;
  type: 'main' | 'sub';
  mainModule: string;
  subModule: string;
  taskName: string;
  jadwalMulai: string;
  kompleksitas: 'EASY' | 'MEDIUM' | 'HARD';
  durasi: number;
  originalRowNumber: number;
  validationErrors: ValidationError[];
  isEdited: boolean;
  parentMainModuleId?: string;
};

type ImportPreviewTableProps = {
  projectId: number;
  sessionId: string;
  initialData: any;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ImportPreviewTable({ projectId, sessionId, initialData, onClose, onConfirm }: ImportPreviewTableProps) {
  const [rows, setRows] = useState<BAModuleRow[]>(initialData.rows || []);
  const [filterMode, setFilterMode] = useState<'all' | 'errors'>('all');
  const [collapsedMainModules, setCollapsedMainModules] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BAModuleRow>>({});
  const [existingMainModules, setExistingMainModules] = useState<Array<{ id: number; nama: string; kode: string }>>([]);
  const [existingSubModules, setExistingSubModules] = useState<Array<{ id: number; nama: string; kode: string; parentId: number }>>([]);
  const [selectedMainModuleId, setSelectedMainModuleId] = useState<number | null>(null);
  const [isCreatingNewModule, setIsCreatingNewModule] = useState(false);
  const [isCreatingNewSubModule, setIsCreatingNewSubModule] = useState(false);
  
  // BA Information from Excel
  const [baInfo, setBAInfo] = useState({
    nama: initialData.baInfo?.nama || '',
    version: initialData.baInfo?.version || '1.0.0',
    deskripsi: initialData.baInfo?.deskripsi || '',
    type: (initialData.baInfo?.type || 'BLUEPRINT') as 'BLUEPRINT' | 'BERITA_ACARA',
  });

  // Fetch existing modules on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch existing modules
        const modulesResponse = await fetch(`/api/blueprint-baru/${projectId}/existing-modules`);
        if (modulesResponse.ok) {
          const modulesData = await modulesResponse.json();
          setExistingMainModules(modulesData.mainModules || []);
          setExistingSubModules(modulesData.subModules || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
    fetchData();
  }, [projectId]);

  // Calculate statistics
  const totalMainModules = rows.filter(r => r.type === 'main').length;
  const totalSubModules = new Set(rows.filter(r => r.type === 'sub' && r.subModule).map(r => r.subModule)).size;
  const totalTasks = rows.filter(r => r.type === 'sub' && r.taskName).length;
  const totalErrors = rows.reduce((sum, r) => sum + r.validationErrors.length, 0);
  const hasErrors = totalErrors > 0;

  const handleEditClick = (row: BAModuleRow) => {
    setEditingRow(row.id);
    setEditForm({
      mainModule: row.mainModule,
      subModule: row.subModule,
      taskName: row.taskName,
    });
    setIsCreatingNewModule(false);
    setIsCreatingNewSubModule(false);
    setSelectedMainModuleId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    
    const currentRow = rows.find(r => r.id === editingRow);
    const validationErrors: ValidationError[] = [];
    
    // Update local state
    setRows(prevRows => prevRows.map(row => {
      if (row.id === editingRow) {
        return {
          ...row,
          ...editForm,
          validationErrors,
          isEdited: true,
        };
      }
      return row;
    }));
    
    // Update temp table in database
    try {
      // Update module if it's a main module row
      if (currentRow?.type === 'main' && editForm.mainModule) {
        const existingModule = existingMainModules.find(m => m.nama === editForm.mainModule);
        await fetch(`/api/blueprint-baru/${projectId}/import-preview/update-module`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            moduleTempId: currentRow.tempId,
            moduleName: editForm.mainModule,
            existingModuleId: existingModule?.id || null,
            isNewModule: !existingModule,
            level: 1,
          }),
        });
      }
      
      // Update sub module if it's a sub module row
      if (currentRow?.type === 'sub' && editForm.subModule && editForm.subModule !== '-----') {
        const existingSubModule = existingSubModules.find(m => m.nama === editForm.subModule);
        await fetch(`/api/blueprint-baru/${projectId}/import-preview/update-module`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            moduleTempId: currentRow.moduleTempId,
            moduleName: editForm.subModule,
            existingModuleId: existingSubModule?.id || null,
            isNewModule: !existingSubModule,
            level: 2,
          }),
        });
      }
    } catch (error) {
      console.error('Error updating temp table:', error);
    }
    
    setEditingRow(null);
    setEditForm({});
    setIsCreatingNewModule(false);
    setIsCreatingNewSubModule(false);
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditForm({});
  };

  const handleDeleteRow = (rowId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus baris ini?')) {
      setRows(prevRows => prevRows.filter(row => row.id !== rowId));
    }
  };

  const getKompleksitasBadge = (kompleksitas: string) => {
    const colors = {
      'EASY': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'MEDIUM': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'HARD': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[kompleksitas as keyof typeof colors] || colors.MEDIUM;
  };

  const toggleMainModule = (mainModuleId: string) => {
    setCollapsedMainModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mainModuleId)) {
        newSet.delete(mainModuleId);
      } else {
        newSet.add(mainModuleId);
      }
      return newSet;
    });
  };

  const filteredRows = filterMode === 'errors'
    ? rows.filter(r => r.validationErrors.length > 0 || (r.type === 'main' && rows.some(sub => sub.parentMainModuleId === r.id && sub.validationErrors.length > 0)))
    : rows;

  // Group rows by main module for display
  const displayRows = filteredRows.filter(row => {
    if (row.type === 'main') return true;
    if (row.parentMainModuleId && collapsedMainModules.has(row.parentMainModuleId)) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-6xl my-8 flex flex-col max-h-[calc(100vh-4rem)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Preview Import Blueprint dari Excel
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Review dan edit data sebelum import ke database
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Summary Card */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          {/* Step 1: BA Information */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <h5 className="text-base font-medium text-gray-900 dark:text-white">
                Informasi Berita Acara
              </h5>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nama Berita Acara <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={baInfo.nama}
                  onChange={(e) => setBAInfo({ ...baInfo, nama: e.target.value })}
                  placeholder="Contoh: User Management System"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Versi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={baInfo.version}
                  onChange={(e) => setBAInfo({ ...baInfo, version: e.target.value })}
                  placeholder="1.0.0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deskripsi Berita Acara
                </label>
                <textarea
                  value={baInfo.deskripsi}
                  onChange={(e) => setBAInfo({ ...baInfo, deskripsi: e.target.value })}
                  placeholder="Jelaskan tujuan dan ruang lingkup Berita Acara ini..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Statistics */}
          <div className="mb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <h5 className="text-base font-medium text-gray-900 dark:text-white">
                Struktur Modul & Task dari Excel
              </h5>
            </div>
          </div>
        </div>

        {/* Table Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[250px]">
                      Modul Utama
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[250px]">
                      Sub Modul
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[300px]">
                      Nama Task
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[100px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {displayRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`${
                        row.validationErrors.length > 0
                          ? 'bg-red-50 dark:bg-red-900/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {/* Modul Utama */}
                      <td className="px-4 py-3">
                        {editingRow === row.id && row.type === 'main' ? (
                          <div className="space-y-2">
                            <select
                              value={isCreatingNewModule ? 'new' : editForm.mainModule || ''}
                              onChange={(e) => {
                                if (e.target.value === 'new') {
                                  setIsCreatingNewModule(true);
                                  setEditForm({ ...editForm, mainModule: '' });
                                } else {
                                  setIsCreatingNewModule(false);
                                  setEditForm({ ...editForm, mainModule: e.target.value });
                                }
                              }}
                              className="w-full px-2 py-1 border border-blue-500 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                            >
                              <option value="">-- Pilih Module --</option>
                              <option value="new">+ Buat Module Baru</option>
                              {existingMainModules.map(m => (
                                <option key={m.id} value={m.nama}>
                                  {m.kode} - {m.nama}
                                </option>
                              ))}
                            </select>
                            {isCreatingNewModule && (
                              <input
                                type="text"
                                value={editForm.mainModule || ''}
                                onChange={(e) => setEditForm({ ...editForm, mainModule: e.target.value })}
                                placeholder="Nama module baru"
                                className="w-full px-2 py-1 border border-blue-500 rounded text-sm focus:ring-2 focus:ring-blue-500"
                              />
                            )}
                          </div>
                        ) : row.type === 'main' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleMainModule(row.id)}
                              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              {collapsedMainModules.has(row.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">{row.mainModule}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Row {row.originalRowNumber}</div>
                              {row.validationErrors.length > 0 && (
                                <div className="mt-1 space-y-1">
                                  {row.validationErrors.map((error, idx) => (
                                    <div key={idx} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                      <AlertCircle className="w-3 h-3" />
                                      <span>{error.message}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">{row.mainModule}</span>
                        )}
                      </td>

                      {/* Sub Modul */}
                      <td className="px-4 py-3">
                        {editingRow === row.id && row.type === 'sub' && row.subModule && row.subModule !== '-----' ? (
                          <div className="space-y-2">
                            <select
                              value={isCreatingNewSubModule ? 'new' : editForm.subModule || ''}
                              onChange={(e) => {
                                if (e.target.value === 'new') {
                                  setIsCreatingNewSubModule(true);
                                  setEditForm({ ...editForm, subModule: '' });
                                } else {
                                  setIsCreatingNewSubModule(false);
                                  setEditForm({ ...editForm, subModule: e.target.value });
                                }
                              }}
                              className="w-full px-2 py-1 border border-blue-500 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                            >
                              <option value="">-- Pilih Sub Module --</option>
                              <option value="new">+ Buat Sub Module Baru</option>
                              {existingSubModules.map(m => (
                                <option key={m.id} value={m.nama}>
                                  {m.kode} - {m.nama}
                                </option>
                              ))}
                            </select>
                            {isCreatingNewSubModule && (
                              <input
                                type="text"
                                value={editForm.subModule || ''}
                                onChange={(e) => setEditForm({ ...editForm, subModule: e.target.value })}
                                placeholder="Nama sub module baru"
                                className="w-full px-2 py-1 border border-blue-500 rounded text-sm focus:ring-2 focus:ring-blue-500"
                              />
                            )}
                          </div>
                        ) : row.subModule && row.subModule !== '-----' ? (
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{row.subModule}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Row {row.originalRowNumber}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">{row.subModule}</span>
                        )}
                      </td>

                      {/* Nama Task */}
                      <td className="px-4 py-3">
                        {editingRow === row.id ? (
                          <input
                            type="text"
                            value={editForm.taskName || ''}
                            onChange={(e) => setEditForm({ ...editForm, taskName: e.target.value })}
                            className="w-full px-2 py-1 border border-blue-500 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="Nama Task"
                          />
                        ) : row.taskName && row.taskName !== '-----' ? (
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{row.taskName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Row {row.originalRowNumber}</div>
                            {row.validationErrors.length > 0 && (
                              <div className="mt-1 space-y-1">
                                {row.validationErrors.map((error, idx) => (
                                  <div key={idx} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>{error.message}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">{row.taskName}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {editingRow === row.id ? (
                            <>
                              <button 
                                onClick={handleSaveEdit}
                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={handleCancelEdit}
                                className="p-1.5 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleEditClick(row)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteRow(row.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              {row.type === 'main' && (
                                <button className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors" title="Add Sub Module">
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {hasErrors && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>Please fix all errors before importing</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel Import
            </button>
            <button
              onClick={onConfirm}
              disabled={hasErrors}
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                hasErrors
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <Check className="w-5 h-5" />
              Confirm & Import to Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
