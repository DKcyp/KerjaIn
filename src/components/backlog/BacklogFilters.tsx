import React from 'react';
import Select2Field from "@/components/form/Select2Field";

type Proyek = { id: number; namaProyek: string };

interface BacklogFiltersProps {
  projects: Proyek[];
  filterProjectId: number | "";
  setFilterProjectId: (value: number | "") => void;
  q: string;
  setQ: (value: string) => void;
  assignmentFilter: 'all' | 'assigned' | 'unassigned';
  setAssignmentFilter: (value: 'all' | 'assigned' | 'unassigned') => void;
  viewMode: 'table' | 'card';
  setViewMode: (mode: 'table' | 'card') => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  total: number;
  onReset: () => void;
  onAddNew: () => void;
  onImport: () => void;
}

const BacklogFilters: React.FC<BacklogFiltersProps> = ({
  projects,
  filterProjectId,
  setFilterProjectId,
  q,
  setQ,
  assignmentFilter,
  setAssignmentFilter,
  viewMode,
  setViewMode,
  pageSize,
  setPageSize,
  total,
  onReset,
  onAddNew,
  onImport,
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Backlog</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Kelola catatan dan ide untuk pengembangan proyek
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onAddNew}
            className="inline-flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Tambah Catatan
          </button>
          <button 
            onClick={onImport}
            className="inline-flex items-center justify-center p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            title="Import backlog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-white/[0.06] p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Project Filter */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter Proyek
            </label>
            <Select2Field
              value={typeof filterProjectId === 'number' ? filterProjectId : ''}
              onChange={(v: any) => setFilterProjectId(v === '' ? '' : Number(v))}
              options={projects.map(p => ({ id: p.id, text: p.namaProyek }))}
              placeholder="Semua Proyek"
              className="w-full"
              dropdownToBody={false}
            />
          </div>

          {/* Assignment Filter */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status Assignment
            </label>
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value as 'all' | 'assigned' | 'unassigned')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="all">Semua Status</option>
              <option value="unassigned">Belum Assigned</option>
              <option value="assigned">Sudah Assigned</option>
            </select>
          </div>

          {/* Search */}
          <div className="md:col-span-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pencarian
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="Cari judul atau catatan..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q && (
                <button
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setQ('')}
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Reset Button */}
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={onReset}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: View Toggle & Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              onClick={() => setViewMode('table')}
            >
              <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18m-9 8h9" />
              </svg>
              Tabel
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'card' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              onClick={() => setViewMode('card')}
            >
              <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
              </svg>
              Kartu
            </button>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">{total}</span> catatan ditemukan
            </div>
            {assignmentFilter === 'all' && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                  <span className="text-xs">Assigned</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
                  <span className="text-xs">Unassigned</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Page Size */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 dark:text-gray-400">Tampilkan:</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>{n} item</option>
            ))}
          </select>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Tips Penggunaan Backlog</p>
            <p>Klik pada item untuk melihat detail. Gunakan filter assignment untuk melihat backlog berdasarkan status. Item dengan badge "Assigned" sudah di-assign ke anggota tim.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BacklogFilters;