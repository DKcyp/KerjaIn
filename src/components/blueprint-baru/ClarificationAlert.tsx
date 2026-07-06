import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ClarificationAlertProps {
  deadline?: string;
  message?: string;
}

export const ClarificationAlert: React.FC<ClarificationAlertProps> = ({ 
  deadline = '25 April 2026',
  message 
}) => {
  const defaultMessage = `Tim Logbook meminta klarifikasi untuk blueprint ini sebelum dapat dilanjutkan. Harap selesaikan sebelum ${deadline}.`;
  
  return (
    <div className="mb-6 p-4 rounded-lg border-2 bg-orange-50 border-orange-300 dark:bg-yellow-900/20 dark:border-yellow-500">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-orange-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm font-medium text-orange-800 dark:text-yellow-300">
          {message || defaultMessage}
        </p>
      </div>
    </div>
  );
};
