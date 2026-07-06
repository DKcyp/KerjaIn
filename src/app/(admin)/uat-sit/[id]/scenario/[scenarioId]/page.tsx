'use client';

import React, { useState } from 'react';
import { StatusBadge } from '@/components/eutSit/StatusBadge';
import { SeverityIndicator } from '@/components/eutSit/SeverityIndicator';

// Mock data
const mockScenario = {
  id: 'SC-002',
  title: 'Integrasi Payment Gateway',
  description: 'Menguji integrasi payment gateway dengan sistem penjualan, termasuk proses pembayaran, validasi, dan notifikasi.',
  modules: ['Penjualan', 'Finance'],
  tester: 'Siti Nurhaliza',
  status: 'in-progress' as const,
};

const mockSteps = [
  {
    id: 1,
    action: 'Login ke sistem sebagai user dengan role "Kasir"',
    expectedResult: 'User berhasil login dan diarahkan ke dashboard kasir',
    status: 'passed' as const,
  },
  {
    id: 2,
    action: 'Buat transaksi penjualan baru dengan total Rp 5.000.000',
    expectedResult: 'Transaksi berhasil dibuat dan menampilkan ringkasan order',
    status: 'passed' as const,
  },
  {
    id: 3,
    action: 'Pilih metode pembayaran "Credit Card" dan klik tombol "Bayar"',
    expectedResult: 'Sistem menampilkan form payment gateway untuk input kartu kredit',
    status: 'passed' as const,
  },
  {
    id: 4,
    action: 'Input data kartu kredit yang valid dan submit',
    expectedResult: 'Payment gateway memproses pembayaran dan mengembalikan status sukses',
    status: 'passed' as const,
  },
  {
    id: 5,
    action: 'Verifikasi notifikasi email dikirim ke customer',
    expectedResult: 'Email konfirmasi pembayaran terkirim dalam 1 menit',
    status: 'failed' as const,
  },
  {
    id: 6,
    action: 'Cek status transaksi di database',
    expectedResult: 'Status transaksi berubah menjadi "Paid" dengan timestamp yang benar',
    status: 'not-started' as const,
  },
  {
    id: 7,
    action: 'Test dengan transaksi > Rp 10.000.000',
    expectedResult: 'Pembayaran berhasil diproses tanpa timeout',
    status: 'not-started' as const,
  },
];

const mockBugs = [
  {
    id: 'BUG-002',
    title: 'Payment gateway timeout pada transaksi > 10jt',
    step: 7,
    severity: 'critical' as const,
    status: 'open' as const,
    description: 'Ketika melakukan transaksi dengan nominal di atas 10 juta rupiah, payment gateway mengalami timeout setelah 30 detik.',
    reportedDate: '2025-09-22',
  },
  {
    id: 'BUG-004',
    title: 'Notifikasi email tidak terkirim',
    step: 5,
    severity: 'minor' as const,
    status: 'fixed' as const,
    description: 'Email konfirmasi pembayaran tidak terkirim ke customer setelah pembayaran berhasil.',
    reportedDate: '2025-09-21',
  },
];

export default function TestExecution() {
  const [showBugForm, setShowBugForm] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [bugForm, setBugForm] = useState({
    title: '',
    step: '',
    description: '',
    severity: 'minor' as const,
    attachments: [] as File[],
  });

  const handleStepAction = (stepId: number, action: 'pass' | 'fail') => {
    if (action === 'fail') {
      setSelectedStep(stepId);
      setShowBugForm(true);
      setBugForm({ ...bugForm, step: stepId.toString() });
    } else {
      // Handle pass action
      console.log(`Step ${stepId} marked as passed`);
    }
  };

  const handleBugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Bug reported:', bugForm);
    setShowBugForm(false);
    setBugForm({
      title: '',
      step: '',
      description: '',
      severity: 'minor',
      attachments: [],
    });
  };

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
          <li>
            <a href="/eut-sit/TP-001" className="text-blue-600 hover:text-blue-700 font-medium">
              SIT Rilis Q4 2025
            </a>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-600">{mockScenario.title}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Execution Steps */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{mockScenario.title}</h1>
                  <p className="text-gray-600 text-sm">{mockScenario.description}</p>
                </div>
                <StatusBadge status={mockScenario.status} label="In Progress" />
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-gray-700">Tester: <span className="font-medium">{mockScenario.tester}</span></span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {mockScenario.modules.map((module) => (
                    <span
                      key={module}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700"
                    >
                      {module}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Steps List */}
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Langkah-langkah Pengujian</h2>
              
              <div className="space-y-4">
                {mockSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`border rounded-lg p-4 transition-all ${
                      step.status === 'passed'
                        ? 'border-green-200 bg-green-50'
                        : step.status === 'failed'
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Step Number */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        step.status === 'passed'
                          ? 'bg-green-500 text-white'
                          : step.status === 'failed'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {step.status === 'passed' ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : step.status === 'failed' ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          step.id
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1">
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-500 mb-1">Aksi:</p>
                          <p className="text-sm text-gray-900">{step.action}</p>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-500 mb-1">Hasil yang Diharapkan:</p>
                          <p className="text-sm text-gray-900">{step.expectedResult}</p>
                        </div>

                        {/* Action Buttons */}
                        {step.status === 'not-started' && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleStepAction(step.id, 'pass')}
                              className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Pass
                            </button>
                            <button
                              onClick={() => handleStepAction(step.id, 'fail')}
                              className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Fail
                            </button>
                          </div>
                        )}

                        {/* Status Badge */}
                        {step.status !== 'not-started' && (
                          <div className="mt-3">
                            <StatusBadge 
                              status={step.status} 
                              label={step.status === 'passed' ? 'Passed' : 'Failed'} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Bug Logging & Information */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            {/* Overall Status Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Skenario</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Langkah</span>
                  <span className="text-sm font-medium text-gray-900">{mockSteps.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Passed</span>
                  <span className="text-sm font-medium text-green-600">
                    {mockSteps.filter(s => s.status === 'passed').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Failed</span>
                  <span className="text-sm font-medium text-red-600">
                    {mockSteps.filter(s => s.status === 'failed').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Not Started</span>
                  <span className="text-sm font-medium text-gray-600">
                    {mockSteps.filter(s => s.status === 'not-started').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Bug Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowBugForm(!showBugForm)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-red-50 to-white hover:from-red-100 hover:to-red-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">Catat Bug/Error</h3>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${showBugForm ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showBugForm && (
                <form onSubmit={handleBugSubmit} className="p-6 border-t border-gray-200">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Judul Bug <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={bugForm.title}
                        onChange={(e) => setBugForm({ ...bugForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Deskripsi singkat bug"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Langkah Terkait <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={bugForm.step}
                        onChange={(e) => setBugForm({ ...bugForm, step: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Pilih langkah</option>
                        {mockSteps.map((step) => (
                          <option key={step.id} value={step.id}>
                            Langkah {step.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Severity <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={bugForm.severity}
                        onChange={(e) => setBugForm({ ...bugForm, severity: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="trivial">Trivial</option>
                        <option value="minor">Minor</option>
                        <option value="major">Major</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deskripsi Bug <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        value={bugForm.description}
                        onChange={(e) => setBugForm({ ...bugForm, description: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Jelaskan bug secara detail, termasuk langkah reproduksi dan hasil yang didapat"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lampirkan Bukti
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-gray-600">
                          Drag & drop file atau <span className="text-blue-600 font-medium">browse</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF hingga 10MB</p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Laporkan Bug
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Associated Bugs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bug Terkait Skenario</h3>
              
              {mockBugs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Belum ada bug yang dilaporkan</p>
              ) : (
                <div className="space-y-3">
                  {mockBugs.map((bug) => (
                    <div key={bug.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">{bug.id}</span>
                        <StatusBadge 
                          status={bug.status} 
                          label={bug.status === 'open' ? 'Open' : 'Fixed'} 
                        />
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">{bug.title}</h4>
                      <div className="flex items-center justify-between">
                        <SeverityIndicator severity={bug.severity} />
                        <span className="text-xs text-gray-500">Langkah {bug.step}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
