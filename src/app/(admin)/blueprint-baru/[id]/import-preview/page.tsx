"use client";

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import ImportPreview from '@/components/blueprint-baru/ImportPreview';
import { useToast } from '@/context/ToastContext';

export default function ImportPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { success } = useToast();

  const handleClose = () => {
    router.push(`/blueprint-baru/${projectId}`);
  };

  const handleConfirm = () => {
    // TODO: Implement actual import logic
    success('Blueprint berhasil diimport ke database!');
    router.push(`/blueprint-baru/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <ImportPreview onClose={handleClose} onConfirm={handleConfirm} />
    </div>
  );
}
