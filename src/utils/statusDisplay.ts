// Helper function to map database status values to display names

export type BAStatus =
  | 'DRAFT'
  | 'MENUNGGU_APPROVAL'
  | 'APPROVED'
  | 'SIAP_UAT'
  | 'SELESAI_UAT'
  | 'PENGAJUAN'
  | 'REVIEW'
  | 'RFC'
  | 'CED'
  | 'KIRIM_OK'
  | 'DEVELOPMENT'
  | 'UAT_INTERNAL'
  | 'UAT_INTERNAL_SELESAI'
  | 'UAT_EXTERNAL'
  | 'UAT_EXTERNAL_SELESAI'
  | 'SELESAI';

export const getStatusDisplayName = (status: string): string => {
  const statusMap: Record<string, string> = {
    'DRAFT': 'Draft',
    'MENUNGGU_APPROVAL': 'Menunggu Approval',
    'APPROVED': 'Approved',
    'SIAP_UAT': 'UAT',
    'SELESAI_UAT': 'Finish',
    'PENGAJUAN': 'Menunggu Review',
    'REVIEW': 'Review',
    'RFC': 'RFC',
    'CED': 'CED',
    'KIRIM_OK': 'OK Terkirim',
    'DEVELOPMENT': 'Development',
    'UAT_INTERNAL': 'UAT Internal',
    'UAT_INTERNAL_SELESAI': 'UAT Internal Selesai',
    'UAT_EXTERNAL': 'UAT External',
    'UAT_EXTERNAL_SELESAI': 'UAT External Selesai',
    'SELESAI': 'Selesai',
  };

  return statusMap[status] || status;
};

export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    'DRAFT': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
    'MENUNGGU_APPROVAL': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
    'APPROVED': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
    'SIAP_UAT': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    'SELESAI_UAT': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    'PENGAJUAN': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    'REVIEW': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
    'RFC': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
    'CED': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
    'KIRIM_OK': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    'DEVELOPMENT': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
    'UAT_INTERNAL': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800',
    'UAT_INTERNAL_SELESAI': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800',
    'UAT_EXTERNAL': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200 dark:border-teal-800',
    'UAT_EXTERNAL_SELESAI': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    'SELESAI': 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400 border border-lime-200 dark:border-lime-800',
  };

  return colorMap[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
};
