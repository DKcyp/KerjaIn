"use client";

import React, { useState } from 'react';
import { X, Check, AlertCircle, Edit2, Trash2, Plus, ChevronDown, ChevronUp, Upload } from 'lucide-react';

type ValidationError = {
  field: string;
  message: string;
};

type TasklistTemp = {
  id: string;
  nama: string;
  deskripsi: string;
  jadwalMulai: string;
  kompleksitas: 'EASY' | 'MEDIUM' | 'HARD';
  durasi: number;
  originalRowNumber: number;
  validationErrors: ValidationError[];
  isEdited: boolean;
};

type SubmoduleTemp = {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string;
  tasklists: TasklistTemp[];
  originalRowNumber: number;
  validationErrors: ValidationError[];
  isEdited: boolean;
  isExpanded: boolean;
};

type ModuleTemp = {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string;
  submodules: SubmoduleTemp[];
  originalRowNumber: number;
  validationErrors: ValidationError[];
  isEdited: boolean;
  isExpanded: boolean;
};

type ImportPreviewProps = {
  onClose: () => void;
  onConfirm: () => void;
};

// Data dummy untuk preview
const DUMMY_DATA: ModuleTemp[] = [
  {
    id: 'mod_1',
    kode: 'MOD-001',
    nama: 'User Management',
    deskripsi: 'Module untuk mengelola user dan role',
    originalRowNumber: 2,
    validationErrors: [],
    isEdited: false,
    isExpanded: true,
    submodules: [
      {
        id: 'sub_1',
        kode: 'SUB-001',
        nama: 'User CRUD',
        deskripsi: 'Create, Read, Update, Delete user',
        originalRowNumber: 3,
        validationErrors: [],
        isEdited: false,
        isExpanded: true,
        tasklists: [
          {
            id: 'task_1',
            nama: 'Create User API',
            deskripsi: 'API endpoint untuk membuat user baru',
            jadwalMulai: '2026-05-01',
            kompleksitas: 'MEDIUM',
            durasi: 8,
            originalRowNumber: 4,
            validationErrors: [],
            isEdited: false,
          },
          {
            id: 'task_2',
            nama: 'Update User API',
            deskripsi: 'API endpoint untuk update data user',
            jadwalMulai: '2026-05-02',
            kompleksitas: 'EASY',
            durasi: 4,
            originalRowNumber: 5,
            validationErrors: [],
            isEdited: false,
          },
        ],
      },
      {
        id: 'sub_2',
        kode: 'SUB-002',
        nama: 'Role Management',
        deskripsi: 'Mengelola role dan permission',
        originalRowNumber: 6,
        validationErrors: [],
        isEdited: false,
        isExpanded: false,
        tasklists: [
          {
            id: 'task_3',
            nama: 'Create Role API',
            deskripsi: 'API untuk membuat role baru',
            jadwalMulai: '2026-05-03',
            kompleksitas: 'MEDIUM',
            durasi: 8,
            originalRowNumber: 7,
            validationErrors: [],
            isEdited: false,
          },
        ],
      },
    ],
  },
  {
    id: 'mod_2',
    kode: 'MOD-002',
    nama: 'Product Management',
    deskripsi: 'Module untuk mengelola produk',
    originalRowNumber: 8,
    validationErrors: [
      { field: 'kode', message: 'Kode module sudah digunakan' }
    ],
    isEdited: false,
    isExpanded: false,
    submodules: [
      {
        id: 'sub_3',
        kode: 'SUB-003',
        nama: 'Product CRUD',
        deskripsi: 'CRUD operations untuk produk',
        originalRowNumber: 9,
        validationErrors: [],
        isEdited: false,
        isExpanded: false,
        tasklists: [
          {
            id: 'task_4',
            nama: 'List Products API',
            deskripsi: '',
            jadwalMulai: '',
            kompleksitas: 'EASY',
            durasi: 4,
            originalRowNumber: 10,
            validationErrors: [
              { field: 'jadwalMulai', message: 'Jadwal mulai wajib diisi' }
            ],
            isEdited: false,
          },
        ],
      },
    ],
  },
  {
    id: 'mod_3',
    kode: 'MOD-003',
    nama: 'Reporting',
    deskripsi: 'Module untuk laporan dan dashboard',
    originalRowNumber: 11,
    validationErrors: [],
    isEdited: false,
    isExpanded: false,
    submodules: [
      {
        id: 'sub_4',
        kode: 'SUB-004',
        nama: 'Sales Report',
        deskripsi: 'Laporan penjualan',
        originalRowNumber: 12,
        validationErrors: [],
        isEdited: false,
        isExpanded: false,
        tasklists: [
          {
            id: 'task_5',
            nama: 'Generate Sales Report',
            deskripsi: 'Generate laporan penjualan bulanan',
            jadwalMulai: '2026-05-10',
            kompleksitas: 'HARD',
            durasi: 16,
            originalRowNumber: 13,
            validationErrors: [],
            isEdited: false,
          },
        ],
      },
    ],
  },
];

export default function ImportPreview({ onClose, onConfirm }: ImportPreviewProps) {
  const [modules, setModules] = useState<ModuleTemp[]>(DUMMY_DATA);
  const [filterMode, setFilterMode] = useState<'all' | 'errors'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Calculate statistics
  const totalModules = modules.length;
  const totalSubmodules = modules.reduce((sum, m) => sum + m.submodules.length, 0);
  const totalTasklists = modules.reduce((sum, m) => 
    sum + m.submodules.reduce((subSum, s) => subSum + s.tasklists.length, 0), 0
  );
  
  const totalErrors = modules.reduce((sum, m) => {
    let count = m.validationErrors.length;
    m.submodules.forEach(s => {
      count += s.validationErrors.length;
      s.tasklists.forEach(t => {
        count += t.validationErrors.length;
      });
    });
    return sum + count;
  }, 0);

  const hasErrors = totalErrors > 0;

  const toggleModuleExpand = (moduleId: string) => {
    setModules(prev => prev.map(m => 
      m.id === moduleId ? { ...m, isExpanded: !m.isExpanded } : m
    ));
  };

  const toggleSubmoduleExpand = (moduleId: string, submoduleId: string) => {
    setModules(prev => prev.map(m => 
      m.id === moduleId ? {
        ...m,
        submodules: m.submodules.map(s => 
          s.id === submoduleId ? { ...s, isExpanded: !s.isExpanded } : s
        )
      } : m
    ));
  };

  const getKompleksitasBadge = (kompleksitas: string) => {
    const colors = {
      'EASY': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'MEDIUM': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'HARD': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[kompleksitas as keyof typeof colors] || colors.MEDIUM;
  };

  const filteredModules = filterMode === 'errors' 
    ? modules.filter(m => 
        m.validationErrors.length > 0 || 
        m.submodules.some(s => 
          s.validationErrors.length > 0 || 
          s.tasklists.some(t => t.validationErrors.length > 0)
        )
      )
    : modules;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Preview Import Blueprint
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Review dan edit data sebelum import ke database
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Summary Card */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Modules</div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalModules}</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Submodules</div>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totalSubmodules}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-sm text-green-600 dark:text-green-400 font-medium">Total Tasklists</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">{totalTasklists}</div>
            </div>
            <div className={`p-4 rounded-lg ${hasErrors ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-900/20'}`}>
              <div className={`text-sm font-medium ${hasErrors ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {hasErrors ? 'Errors Found' : 'No Errors'}
              </div>
              <div className={`text-2xl font-bold ${hasErrors ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {totalErrors}
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Show All
            </button>
            <button
              onClick={() => setFilterMode('errors')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterMode === 'errors'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Show Errors Only {hasErrors && `(${totalErrors})`}
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {filteredModules.map((module) => (
              <div
                key={module.id}
                className={`border rounded-lg ${
                  module.validationErrors.length > 0
                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                {/* Module Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleModuleExpand(module.id)}
                          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          {module.isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Row {module.originalRowNumber}</span>
                            <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{module.kode}</span>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{module.nama}</h3>
                            {module.isEdited && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                                Edited
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{module.deskripsi}</p>
                          {module.validationErrors.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {module.validationErrors.map((error, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                                  <AlertCircle className="w-4 h-4" />
                                  <span><strong>{error.field}:</strong> {error.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submodules */}
                {module.isExpanded && module.submodules.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {module.submodules.map((submodule) => (
                      <div
                        key={submodule.id}
                        className={`border-b last:border-b-0 border-gray-200 dark:border-gray-700 ${
                          submodule.validationErrors.length > 0 ? 'bg-red-50 dark:bg-red-900/10' : ''
                        }`}
                      >
                        {/* Submodule Header */}
                        <div className="p-4 pl-12">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => toggleSubmoduleExpand(module.id, submodule.id)}
                                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                  {submodule.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Row {submodule.originalRowNumber}</span>
                                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{submodule.kode}</span>
                                    <h4 className="font-medium text-gray-900 dark:text-white">{submodule.nama}</h4>
                                    {submodule.isEdited && (
                                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                                        Edited
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{submodule.deskripsi}</p>
                                  {submodule.validationErrors.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {submodule.validationErrors.map((error, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                                          <AlertCircle className="w-4 h-4" />
                                          <span><strong>{error.field}:</strong> {error.message}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Tasklists */}
                        {submodule.isExpanded && submodule.tasklists.length > 0 && (
                          <div className="bg-white dark:bg-gray-800">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100 dark:bg-gray-900">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">Row</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">Task Name</th>

                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">Jadwal</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">Kompleksitas</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">Durasi</th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {submodule.tasklists.map((task) => (
                                  <tr
                                    key={task.id}
                                    className={`border-t border-gray-200 dark:border-gray-700 ${
                                      task.validationErrors.length > 0 ? 'bg-red-50 dark:bg-red-900/10' : ''
                                    }`}
                                  >
                                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{task.originalRowNumber}</td>
                                    <td className="px-4 py-3">
                                      <div>
                                        <div className="font-medium text-gray-900 dark:text-white">{task.nama}</div>
                                        {task.deskripsi && (
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.deskripsi}</div>
                                        )}
                                        {task.validationErrors.length > 0 && (
                                          <div className="mt-1 space-y-1">
                                            {task.validationErrors.map((error, idx) => (
                                              <div key={idx} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                                <AlertCircle className="w-3 h-3" />
                                                <span>{error.message}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">

                                    </td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                      {task.jadwalMulai || <span className="text-red-500">-</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${getKompleksitasBadge(task.kompleksitas)}`}>
                                        {task.kompleksitas}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{task.durasi}h</td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center justify-center gap-2">
                                        <button className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
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
