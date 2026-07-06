'use client';

import React, { useState } from 'react';

interface CreateTestPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TestPlanFormData) => void;
}

export interface TestPlanFormData {
  namaFitur: string;
  kode: string;
  moduleId: number | '';
  testerId: number | '';
  tanggalTest: string;
  deskripsi: string;
}

export const CreateTestPlanModal: React.FC<CreateTestPlanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<TestPlanFormData>({
    namaFitur: '',
    kode: '',
    moduleId: '',
    testerId: '',
    tanggalTest: '',
    deskripsi: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      namaFitur: '',
      kode: '',
      moduleId: '',
      testerId: '',
      tanggalTest: '',
      deskripsi: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Buat Rencana Tes Baru
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Feature Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nama Fitur <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.namaFitur}
                onChange={(e) => setFormData({ ...formData, namaFitur: e.target.value })}
                placeholder="e.g., Login User"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Test Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kode Test <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.kode}
                onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                placeholder="e.g., UAT-001"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Module Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Modul <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.moduleId}
                onChange={(e) => setFormData({ ...formData, moduleId: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Pilih modul...</option>
                <option value="1">Authentication Module</option>
                <option value="2">Dashboard Module</option>
              </select>
            </div>

            {/* Tester Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tester <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.testerId}
                onChange={(e) => setFormData({ ...formData, testerId: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Pilih tester...</option>
                <option value="1">John Doe</option>
                <option value="2">Jane Smith</option>
              </select>
            </div>

            {/* Test Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tanggal Test <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.tanggalTest}
                onChange={(e) => setFormData({ ...formData, tanggalTest: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deskripsi
              </label>
              <textarea
                value={formData.deskripsi}
                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                rows={3}
                placeholder="Deskripsi test case..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Buat UAT Test
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
