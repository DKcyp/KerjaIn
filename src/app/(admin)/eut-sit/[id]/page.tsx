'use client';

import React, { useState } from 'react';
import { StatusBadge } from '@/components/eutSit/StatusBadge';
import { ProgressBar } from '@/components/eutSit/ProgressBar';
import { SeverityIndicator } from '@/components/eutSit/SeverityIndicator';

// Mock data
const mockTestPlan = {
  id: 'TP-001',
  name: 'SIT Rilis Q4 2025',
  description: 'Pengujian integrasi sistem untuk rilis kuartal 4 tahun 2025, mencakup modul penjualan, inventory, dan logistik.',
  progress: 75,
  status: 'in-progress' as const,
  startDate: '2025-09-15',
  endDate: '2025-10-30',
  createdBy: 'Ahmad Fauzi',
  approvedBy: null,
};

const mockScenarios = [
  {
    id: 'SC-001',
    title: 'Proses Order hingga Pengiriman',
    modules: ['Penjualan', 'Gudang', 'Logistik'],
    tester: 'Budi Santoso',
    status: 'passed' as const,
    totalSteps: 8,
    passedSteps: 8,
    bugs: 1,
  },
  {
    id: 'SC-002',
    title: 'Integrasi Payment Gateway',
    modules: ['Penjualan', 'Finance'],
    tester: 'Siti Nurhaliza',
    status: 'in-progress' as const,
    totalSteps: 12,
    passedSteps: 7,
    bugs: 3,
  },
  {
    id: 'SC-003',
    title: 'Sinkronisasi Stok Multi-Gudang',
    modules: ['Gudang', 'Inventory'],
    tester: 'Andi Wijaya',
    status: 'failed' as const,
    totalSteps: 10,
    passedSteps: 6,
    bugs: 4,
  },
  {
    id: 'SC-004',
    title: 'Laporan Penjualan Real-time',
    modules: ['Penjualan', 'Reporting'],
    tester: 'Dewi Lestari',
    status: 'not-started' as const,
    totalSteps: 6,
    passedSteps: 0,
    bugs: 0,
  },
];

const mockBugs = [
  {
    id: 'BUG-001',
    title: 'Harga produk tidak terupdate setelah diskon',
    scenario: 'SC-001',
    scenarioTitle: 'Proses Order hingga Pengiriman',
    severity: 'major' as const,
    status: 'open' as const,
    reportedBy: 'Budi Santoso',
    reportedDate: '2025-09-20',
  },
  {
    id: 'BUG-002',
    title: 'Payment gateway timeout pada transaksi > 10jt',
    scenario: 'SC-002',
    scenarioTitle: 'Integrasi Payment Gateway',
    severity: 'critical' as const,
    status: 'in-progress' as const,
    reportedBy: 'Siti Nurhaliza',
    reportedDate: '2025-09-22',
  },
  {
    id: 'BUG-003',
    title: 'Stok tidak tersinkronisasi antar gudang',
    scenario: 'SC-003',
    scenarioTitle: 'Sinkronisasi Stok Multi-Gudang',
    severity: 'critical' as const,
    status: 'open' as const,
    reportedBy: 'Andi Wijaya',
    reportedDate: '2025-09-23',
  },
  {
    id: 'BUG-004',
    title: 'Notifikasi email tidak terkirim',
    scenario: 'SC-002',
    scenarioTitle: 'Integrasi Payment Gateway',
    severity: 'minor' as const,
    status: 'fixed' as const,
    reportedBy: 'Siti Nurhaliza',
    reportedDate: '2025-09-21',
  },
  {
    id: 'BUG-005',
    title: 'UI tidak responsif pada mobile',
    scenario: 'SC-003',
    scenarioTitle: 'Sinkronisasi Stok Multi-Gudang',
    severity: 'minor' as const,
    status: 'closed' as const,
    reportedBy: 'Andi Wijaya',
    reportedDate: '2025-09-19',
  },
];

const statusLabels = {
  'passed': 'Passed',
  'failed': 'Failed',
  'in-progress': 'In Progress',
  'not-started': 'Not Started',
};

const bugStatusLabels = {
  'open': 'Open',
  'in-progress': 'In Progress',
  'fixed': 'Fixed',
  'closed': 'Closed',
};

export default function TestPlanDetail() {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'bugs'>('scenarios');
  
  const allStepsPassed = mockScenarios.every(s => s.status === 'passed');
  const canApprove = allStepsPassed && mockTestPlan.progress === 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <a href="/eut-sit" className="text-blue-600 hover:text-blue-700 font-medium">
              Manajemen EUT/SIT
            </a>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-600">{mockTestPlan.name}</li>
        </ol>
      </nav>

      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{mockTestPlan.name}</h1>
              <StatusBadge status={mockTestPlan.status} label="In Progress" />
            </div>
            <p className="text-gray-600 mb-4">{mockTestPlan.description}</p>
            
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Tanggal Mulai</p>
                <p className="text-sm font-medium text-gray-900">{mockTestPlan.startDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Tanggal Selesai</p>
                <p className="text-sm font-medium text-gray-900">{mockTestPlan.endDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Dibuat Oleh</p>
                <p className="text-sm font-medium text-gray-900">{mockTestPlan.createdBy}</p>
              </div>
            </div>
          </div>

          <div className="ml-6">
            <button
              disabled={!canApprove}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                canApprove
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Approve Test Plan
            </button>
            {!canApprove && (
              <p className="text-xs text-gray-500 mt-2 text-right">
                Semua skenario harus passed
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Progress Keseluruhan</p>
            <p className="text-sm font-medium text-gray-900">{mockTestPlan.progress}%</p>
          </div>
          <ProgressBar percentage={mockTestPlan.progress} showLabel={false} size="lg" />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === 'scenarios'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Skenario Tes
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                {mockScenarios.length}
              </span>
              {activeTab === 'scenarios' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('bugs')}
              className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === 'bugs'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Daftar Bug
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                {mockBugs.filter(b => b.status === 'open').length}
              </span>
              {activeTab === 'bugs' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content: Scenarios */}
        {activeTab === 'scenarios' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      ID Skenario
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Judul Skenario
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Modul Terkait
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tester
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Bug
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockScenarios.map((scenario) => (
                    <tr
                      key={scenario.id}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/eut-sit/${mockTestPlan.id}/scenario/${scenario.id}`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{scenario.id}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900">{scenario.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {scenario.modules.map((module) => (
                            <span
                              key={module}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700"
                            >
                              {module}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-700">
                              {scenario.tester.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="text-sm text-gray-900">{scenario.tester}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="w-24">
                          <ProgressBar 
                            percentage={(scenario.passedSteps / scenario.totalSteps) * 100} 
                            size="sm" 
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge status={scenario.status} label={statusLabels[scenario.status]} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                          scenario.bugs > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {scenario.bugs}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Bugs */}
        {activeTab === 'bugs' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Bug ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Judul Bug
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Skenario Terkait
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status Bug
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Dilaporkan Oleh
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tanggal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockBugs.map((bug) => (
                    <tr key={bug.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{bug.id}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-sm text-gray-900">{bug.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{bug.scenario}</p>
                          <p className="text-gray-500">{bug.scenarioTitle}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <SeverityIndicator severity={bug.severity} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge 
                          status={bug.status} 
                          label={bugStatusLabels[bug.status]} 
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{bug.reportedBy}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{bug.reportedDate}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
