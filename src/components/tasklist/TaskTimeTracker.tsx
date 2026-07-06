"use client";

import React from 'react';
import { useTaskTimeTracking } from '@/hooks/useTaskTimeTracking';

interface TaskTimeTrackerProps {
  taskId: number;
  currentStatus: string;
  isAssignedToCurrentUser: boolean;
  onStatusChange?: () => void;
  compact?: boolean;
}

export default function TaskTimeTracker({
  taskId,
  currentStatus,
  isAssignedToCurrentUser,
  onStatusChange,
  compact = false
}: TaskTimeTrackerProps) {
  const {
    timeInfo,
    loading,
    error,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    formatDuration,
    getTotalDuration,
    getCurrentSessionDuration,
  } = useTaskTimeTracking(taskId);

  // Only show time tracking for assigned users
  if (!isAssignedToCurrentUser) {
    return null;
  }

  const handleStart = async (e: React.MouseEvent) => {
    console.log('[TaskTimeTracker] 🟢 Start button clicked, taskId:', taskId);
    e.stopPropagation();
    await startTask();
    onStatusChange?.();
  };

  const handlePause = async (e: React.MouseEvent) => {
    console.log('[TaskTimeTracker] ⏸️ Pause button clicked, taskId:', taskId);
    e.stopPropagation();
    await pauseTask();
    onStatusChange?.();
  };

  const handleResume = async (e: React.MouseEvent) => {
    console.log('[TaskTimeTracker] ▶️ Resume button clicked, taskId:', taskId);
    e.stopPropagation();
    await resumeTask();
    onStatusChange?.();
  };

  const handleStop = async (e: React.MouseEvent) => {
    console.log('[TaskTimeTracker] 🛑 Stop button clicked, taskId:', taskId);
    e.stopPropagation();
    try {
      await stopTask();
      onStatusChange?.();
    } catch (error) {
      console.error('[TaskTimeTracker] Error stopping task:', error);
      // Still call onStatusChange to refresh the data even if there was an error
      // The task might have been stopped successfully despite the error
      onStatusChange?.();
    }
  };

  // Simplified button logic based on requirements:
  // - Not processed (MENUNGGU_PROSES_USER) → No button (handled by main "Mulai" button)
  // - Processing (SEDANG_DIPROSES_USER) → Show Start or Stop based on isPaused state
  // - Paused (SEDANG_DIPROSES_USER_PAUSED) → Only Start button (resume)
  const isPaused = timeInfo?.isPaused || false;
  const canStart = currentStatus === 'SEDANG_DIPROSES_USER_PAUSED' || 
                   (currentStatus === 'SEDANG_DIPROSES_USER' && isPaused);
  const canStop = currentStatus === 'SEDANG_DIPROSES_USER' && !isPaused;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {canStart && (
            <button
              onClick={isPaused ? handleResume : handleStart}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-md bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-2 py-1 text-xs"
              title={isPaused ? "Resume Task" : "Start Task"}
            >
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6 4l10 6-10 6V4z"/>
              </svg>
              {isPaused ? 'Resume' : 'Start'}
            </button>
          )}

          {canStop && (
            <button
              onClick={handleStop}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-2 py-1 text-xs"
              title="Stop Task"
            >
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
              </svg>
              Stop
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Time Tracking
        </h4>
        {timeInfo?.isActive && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">Active</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Time Information */}
      {timeInfo && (
        <div className="mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total Time:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatDuration(getTotalDuration())}
            </span>
          </div>
          
          {timeInfo.isActive && getCurrentSessionDuration() > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Current Session:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatDuration(getCurrentSessionDuration())}
              </span>
            </div>
          )}

          {timeInfo.startedAt && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Started:</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(timeInfo.startedAt).toLocaleString()}
              </span>
            </div>
          )}

          {timeInfo.pausedAt && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Paused:</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(timeInfo.pausedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {canStart && (
          <button
            onClick={isPaused ? handleResume : handleStart}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6 4l10 6-10 6V4z"/>
            </svg>
            {isPaused ? 'Resume Task' : 'Start Task'}
          </button>
        )}

        {canStop && (
          <button
            onClick={handleStop}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-2 text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
            </svg>
            Stop Task
          </button>
        )}
      </div>

      {loading && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Processing...
        </div>
      )}
    </div>
  );
}
