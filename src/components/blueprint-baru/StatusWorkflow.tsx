"use client";
import React from "react";
import { ChevronRight } from "lucide-react";

type StatusWorkflowProps = {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  loading?: boolean;
};

const STATUS_FLOW = {
  DRAFT: { next: 'PENGAJUAN', label: 'Draft' },
  PENGAJUAN: { next: 'REVIEW', label: 'Pengajuan' },
  REVIEW: { next: ['RFC', 'CED'], label: 'Review' },
  RFC: { next: 'PENGAJUAN', label: 'RFC (Revisi)' },
  CED: { next: 'KIRIM_OK', label: 'CED' },
  KIRIM_OK: { next: 'DEVELOPMENT', label: 'Kirim OK' },
  DEVELOPMENT: { next: 'UAT_INTERNAL', label: 'Development' },
  UAT_INTERNAL: { next: null, label: 'UAT Internal' },
  UAT_INTERNAL_SELESAI: { next: null, label: 'UAT Internal Selesai' },
  UAT_EXTERNAL: { next: null, label: 'UAT External' },
  UAT_EXTERNAL_SELESAI: { next: 'SELESAI', label: 'UAT External Selesai' },
  SELESAI: { next: null, label: 'Selesai' }
};

export default function StatusWorkflow({ currentStatus, onStatusChange, loading }: StatusWorkflowProps) {
  const current = STATUS_FLOW[currentStatus as keyof typeof STATUS_FLOW];
  const nextStatuses = current?.next ? (Array.isArray(current.next) ? current.next : [current.next]) : [];

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600">Status:</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {current?.label || currentStatus}
          </span>
        </div>

        {nextStatuses.length > 0 && (
          <>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className="flex gap-2">
              {nextStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => onStatusChange(status)}
                  disabled={loading}
                  className="px-3 py-1 bg-green-100 text-green-800 hover:bg-green-200 rounded-full text-sm font-medium disabled:opacity-50"
                >
                  {STATUS_FLOW[status as keyof typeof STATUS_FLOW]?.label || status}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
