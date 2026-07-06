'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Badge from '@/components/ui/badge/Badge';
import { TestStepsModal } from '@/components/eut/TestStepsModal';

// Types
type TestStatus = 'Pending' | 'Approved';

interface TestItem {
  id: number;
  namaFitur: string;
  kode: string;
  projectId: number;
  projectName: string;
  moduleId: number;
  moduleName: string;
  testerId: number;
  testerName: string;
  tanggalTest: string;
  status: TestStatus;
  deskripsi?: string;
  testSteps?: string[];
  expectedResults?: string[];
  actualResults?: string[];
  notes?: string;
  approvedBy?: string;
  approvedDate?: string;
  approvalDocument?: string;
}

// Mock data
const MOCK_TEST_ITEM: TestItem = {
  id: 1,
  namaFitur: 'Login dengan SSO',
  kode: 'EUT-001',
  projectId: 1,
  projectName: 'Sistem Informasi Akademik',
  moduleId: 11,
  moduleName: 'Login Features',
  testerId: 1,
  testerName: 'Ahmad Rizki',
  tanggalTest: '2025-09-25',
  status: 'Pending',
  deskripsi: 'Test login functionality using Single Sign-On integration with external authentication provider.',
  testSteps: [
    'Navigate to login page',
    'Click SSO login button',
    'Enter valid credentials in SSO provider page',
    'Verify redirect back to application',
    'Check user session is created',
    'Verify user dashboard loads correctly',
  ],
  expectedResults: [
    'Login page loads within 2 seconds',
    'SSO button is visible and clickable',
    'SSO provider page opens in new window',
    'User is redirected back after successful authentication',
    'Session token is stored correctly',
    'Dashboard displays user information',
  ],
  actualResults: [
    'Login page loaded in 1.5 seconds',
    'SSO button visible and functional',
    'SSO provider page opened correctly',
    'Redirect successful',
    'Session created successfully',
    'Dashboard loaded with correct user data',
  ],
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const testId = Number(params.testId);

  const [testItem, setTestItem] = useState<TestItem | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalFile, setApprovalFile] = useState<File | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Modals for editing steps and results
  const [isTestStepsModalOpen, setIsTestStepsModalOpen] = useState(false);
  const [isExpectedResultsModalOpen, setIsExpectedResultsModalOpen] = useState(false);
  const [isActualResultsModalOpen, setIsActualResultsModalOpen] = useState(false);

  useEffect(() => {
    // Load test item
    setTestItem(MOCK_TEST_ITEM);
  }, [testId]);

  const handleApprove = () => {
    setIsApprovalModalOpen(true);
  };

  const handleApprovalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Approval submitted:', {
      testId: testItem?.id,
      file: approvalFile?.name,
      notes: approvalNotes,
    });

    // TODO: Implement API call to save approval
    
    // Update test status
    if (testItem) {
      setTestItem({
        ...testItem,
        status: 'Approved',
        approvedBy: 'Current User',
        approvedDate: new Date().toISOString(),
        approvalDocument: approvalFile?.name,
        notes: approvalNotes,
      });
    }

    setIsApprovalModalOpen(false);
    setApprovalFile(null);
    setApprovalNotes('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setApprovalFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setApprovalFile(e.dataTransfer.files[0]);
    }
  };

  const handleSaveTestSteps = (steps: string[]) => {
    if (testItem) {
      setTestItem({
        ...testItem,
        testSteps: steps,
      });
    }
    console.log('Test steps saved:', steps);
    // TODO: Implement API call
  };

  const handleSaveExpectedResults = (results: string[]) => {
    if (testItem) {
      setTestItem({
        ...testItem,
        expectedResults: results,
      });
    }
    console.log('Expected results saved:', results);
    // TODO: Implement API call
  };

  const handleSaveActualResults = (results: string[]) => {
    if (testItem) {
      setTestItem({
        ...testItem,
        actualResults: results,
      });
    }
    console.log('Actual results saved:', results);
    // TODO: Implement API call
  };

  if (!testItem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  const getStatusBadge = (status: TestStatus) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="light" color="warning" size="md">Pending</Badge>;
      case 'Approved':
        return <Badge variant="light" color="success" size="md">Approved</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <a href="/eut" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
              End User Test
            </a>
          </li>
          <li className="text-gray-400 dark:text-gray-500">/</li>
          <li className="text-gray-600 dark:text-gray-400">{testItem.kode}</li>
        </ol>
      </nav>

      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{testItem.namaFitur}</h1>
              {getStatusBadge(testItem.status)}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{testItem.deskripsi}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Kode Test</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{testItem.kode}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Proyek</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{testItem.projectName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Modul</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{testItem.moduleName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tester</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{testItem.testerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tanggal Test</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDateTime(testItem.tanggalTest)}</p>
              </div>
              {testItem.approvedBy && (
                <>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Approved By</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{testItem.approvedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Approved Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {testItem.approvedDate ? formatDateTime(testItem.approvedDate) : '-'}
                    </p>
                  </div>
                  {testItem.approvalDocument && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Approval Document</p>
                      <a 
                        href="#" 
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {testItem.approvalDocument}
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {testItem.status === 'Pending' && (
            <button
              onClick={handleApprove}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm ml-6"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Approve Test
            </button>
          )}
        </div>
      </div>

      {/* Test Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Test Steps</h2>
          {testItem.status === 'Pending' && (
            <button
              onClick={() => setIsTestStepsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Steps
            </button>
          )}
        </div>
        {testItem.testSteps && testItem.testSteps.length > 0 ? (
          <div className="space-y-3">
            {testItem.testSteps.map((step, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-gray-100">{step}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 mb-3">No test steps added yet</p>
            {testItem.status === 'Pending' && (
              <button
                onClick={() => setIsTestStepsModalOpen(true)}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Add test steps
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expected vs Actual Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expected Results */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Expected Results</h2>
            {testItem.status === 'Pending' && (
              <button
                onClick={() => setIsExpectedResultsModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
          </div>
          {testItem.expectedResults && testItem.expectedResults.length > 0 ? (
            <div className="space-y-2">
              {testItem.expectedResults.map((result, index) => (
                <div key={index} className="flex gap-2">
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{result}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 mb-3">No expected results added yet</p>
              {testItem.status === 'Pending' && (
                <button
                  onClick={() => setIsExpectedResultsModalOpen(true)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  Add expected results
                </button>
              )}
            </div>
          )}
        </div>

        {/* Actual Results */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Actual Results</h2>
            {testItem.status === 'Pending' && (
              <button
                onClick={() => setIsActualResultsModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
          </div>
          {testItem.actualResults && testItem.actualResults.length > 0 ? (
            <div className="space-y-2">
              {testItem.actualResults.map((result, index) => (
                <div key={index} className="flex gap-2">
                  <svg className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{result}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-green-400 dark:text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 mb-3">No actual results added yet</p>
              {testItem.status === 'Pending' && (
                <button
                  onClick={() => setIsActualResultsModalOpen(true)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  Add actual results
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {testItem.notes && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notes</h2>
          <p className="text-gray-700 dark:text-gray-300">{testItem.notes}</p>
        </div>
      )}

      {/* Approval Modal */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsApprovalModalOpen(false)}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Approve Test - {testItem.kode}
                </h2>
                <button
                  onClick={() => setIsApprovalModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleApprovalSubmit} className="p-6 space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Approval Document <span className="text-red-500">*</span>
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                    }`}
                  >
                    <input
                      type="file"
                      id="approval-file"
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <label htmlFor="approval-file" className="cursor-pointer">
                      <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {approvalFile ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                            {approvalFile.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(approvalFile.size / 1024).toFixed(2)} KB
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                            Click to change file
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Drag & drop file atau <span className="text-blue-600 dark:text-blue-400 font-medium">browse</span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            PDF, DOC, DOCX, JPG, PNG hingga 10MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Approval Notes
                  </label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    rows={4}
                    placeholder="Add any notes or comments about the approval..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setIsApprovalModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!approvalFile}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Approve Test
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Test Steps Modal */}
      <TestStepsModal
        isOpen={isTestStepsModalOpen}
        onClose={() => setIsTestStepsModalOpen(false)}
        onSubmit={handleSaveTestSteps}
        initialSteps={testItem.testSteps}
        title="Edit Test Steps"
        placeholder="Enter test step"
      />

      {/* Expected Results Modal */}
      <TestStepsModal
        isOpen={isExpectedResultsModalOpen}
        onClose={() => setIsExpectedResultsModalOpen(false)}
        onSubmit={handleSaveExpectedResults}
        initialSteps={testItem.expectedResults}
        title="Edit Expected Results"
        placeholder="Enter expected result"
      />

      {/* Actual Results Modal */}
      <TestStepsModal
        isOpen={isActualResultsModalOpen}
        onClose={() => setIsActualResultsModalOpen(false)}
        onSubmit={handleSaveActualResults}
        initialSteps={testItem.actualResults}
        title="Edit Actual Results"
        placeholder="Enter actual result"
      />
    </div>
  );
}
