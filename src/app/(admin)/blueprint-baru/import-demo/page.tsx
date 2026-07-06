"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import ImportPreviewTable from '@/components/blueprint-baru/ImportPreviewTable';
import { useToast } from '@/context/ToastContext';

export default function ImportDemoPage() {
  const router = useRouter();
  const { success } = useToast();

  const handleClose = () => {
    router.back();
  };

  const handleConfirm = () => {
    success('Blueprint berhasil diimport ke database!');
    setTimeout(() => {
      router.back();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <ImportPreviewTable onClose={handleClose} onConfirm={handleConfirm} />
    </div>
  );
}
