import React from 'react';
import { formatDueDate } from '@/lib/taskDueDateCalculator';

interface DueDateDisplayProps {
  dueDate: Date | string | null;
  className?: string;
  showIcon?: boolean;
}

export function DueDateDisplay({ dueDate, className = '', showIcon = true }: DueDateDisplayProps) {
  if (!dueDate) {
    return (
      <span className={`text-gray-500 dark:text-gray-400 ${className}`}>
        {showIcon && '📅 '}No due date
      </span>
    );
  }

  const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();
  const diffMs = dueDateObj.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const isUrgent = diffMs > 0 && diffMs < (24 * 60 * 60 * 1000); // Less than 24 hours

  // Format the date
  const formattedDate = dueDateObj.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Get relative time description
  const relativeTime = formatDueDate(dueDateObj);

  // Determine styling based on status
  let statusClass = 'text-gray-700 dark:text-gray-300';
  let bgClass = 'bg-gray-100 dark:bg-gray-700';
  let icon = '📅';

  if (isOverdue) {
    statusClass = 'text-red-700 dark:text-red-300';
    bgClass = 'bg-red-100 dark:bg-red-900/30';
    icon = '🔴';
  } else if (isUrgent) {
    statusClass = 'text-yellow-700 dark:text-yellow-300';
    bgClass = 'bg-yellow-100 dark:bg-yellow-900/30';
    icon = '⚠️';
  } else {
    statusClass = 'text-green-700 dark:text-green-300';
    bgClass = 'bg-green-100 dark:bg-green-900/30';
    icon = '✅';
  }

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bgClass} ${statusClass} ${className}`}>
      {showIcon && <span>{icon}</span>}
      <div className="flex flex-col">
        <span className="font-semibold">{formattedDate}</span>
        <span className="text-xs opacity-75">{relativeTime}</span>
      </div>
    </div>
  );
}

// Compact version for table cells
export function DueDateBadge({ dueDate, className = '' }: DueDateDisplayProps) {
  if (!dueDate) {
    return <span className={`text-gray-400 text-xs ${className}`}>-</span>;
  }

  const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();
  const diffMs = dueDateObj.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const isUrgent = diffMs > 0 && diffMs < (24 * 60 * 60 * 1000);

  const relativeTime = formatDueDate(dueDateObj);

  let badgeClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  
  if (isOverdue) {
    badgeClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  } else if (isUrgent) {
    badgeClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  }

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badgeClass} ${className}`}>
      {relativeTime}
    </span>
  );
}
