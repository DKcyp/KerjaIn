"use client";

import React from "react";

export default function LoadingOverlay({ show, label }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-lg dark:bg-gray-800">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
        <span className="text-sm text-gray-700 dark:text-gray-200">{label || "Memproses..."}</span>
      </div>
    </div>
  );
}
