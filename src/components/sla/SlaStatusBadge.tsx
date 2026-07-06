"use client";

import React from 'react';

interface SlaStatusBadgeProps {
  task: {
    status: string;
    assigneeStartTaskDeadline?: string | null;
    assigneeWorkDeadline?: string | null;
    pmReviewDeadline?: string | null;
  };
  currentTime?: Date;
}

export function SlaStatusBadge({ task, currentTime = new Date() }: SlaStatusBadgeProps) {
  const slaStatus = checkSlaStatus(task, currentTime);
  
  if (!slaStatus.isOverdue && slaStatus.timeRemaining === null) {
    return null; // No SLA data available
  }
  
  const getStatusColor = () => {
    if (slaStatus.isOverdue) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    } else if (slaStatus.timeRemaining !== null && slaStatus.timeRemaining < 60) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    } else {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };
  
  const getStatusText = () => {
    if (slaStatus.isOverdue) {
      const overdueMinutes = Math.abs(slaStatus.timeRemaining || 0);
      return `Overdue ${formatDuration(overdueMinutes)}`;
    } else if (slaStatus.timeRemaining !== null) {
      return `${formatDuration(slaStatus.timeRemaining)} left`;
    }
    return 'On track';
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
      {getStatusText()}
    </span>
  );
}

function checkSlaStatus(
  task: {
    status: string;
    assigneeStartTaskDeadline?: string | null;
    assigneeWorkDeadline?: string | null;
    pmReviewDeadline?: string | null;
  },
  currentTime: Date = new Date()
): {
  isOverdue: boolean;
  overdueType: 'start' | 'work' | 'review' | null;
  timeRemaining: number | null; // minutes remaining (negative if overdue)
} {
  const now = currentTime.getTime();
  
  switch (task.status) {
    case 'MENUNGGU_PROSES_USER':
      if (task.assigneeStartTaskDeadline) {
        const deadline = new Date(task.assigneeStartTaskDeadline).getTime();
        const timeRemaining = Math.floor((deadline - now) / (1000 * 60));
        return {
          isOverdue: now > deadline,
          overdueType: now > deadline ? 'start' : null,
          timeRemaining
        };
      }
      break;
      
    case 'SEDANG_DIPROSES_USER':
      if (task.assigneeWorkDeadline) {
        const deadline = new Date(task.assigneeWorkDeadline).getTime();
        const timeRemaining = Math.floor((deadline - now) / (1000 * 60));
        return {
          isOverdue: now > deadline,
          overdueType: now > deadline ? 'work' : null,
          timeRemaining
        };
      }
      break;
      
    case 'MENUNGGU_REVIEW_PM':
      if (task.pmReviewDeadline) {
        const deadline = new Date(task.pmReviewDeadline).getTime();
        const timeRemaining = Math.floor((deadline - now) / (1000 * 60));
        return {
          isOverdue: now > deadline,
          overdueType: now > deadline ? 'review' : null,
          timeRemaining
        };
      }
      break;
  }
  
  return {
    isOverdue: false,
    overdueType: null,
    timeRemaining: null
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
}
