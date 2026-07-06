import { useState, useEffect, useCallback } from 'react';
import { fetchOnce } from '@/lib/fetchOnce';
import { useToast } from '@/context/ToastContext';

export interface TaskTimeInfo {
  id: number;
  status: string;
  startedAt: string | null;
  pausedAt: string | null;
  totalDurationMinutes: number;
  isPaused: boolean;
  isActive: boolean;
  currentSessionMinutes: number;
}

export interface UseTaskTimeTrackingResult {
  timeInfo: TaskTimeInfo | null;
  loading: boolean;
  error: string | null;
  startTask: () => Promise<void>;
  pauseTask: () => Promise<void>;
  resumeTask: () => Promise<void>;
  stopTask: () => Promise<void>;
  refreshTimeInfo: () => Promise<void>;
  formatDuration: (minutes: number) => string;
  getTotalDuration: () => number;
  getCurrentSessionDuration: () => number;
}

/**
 * Hook for managing task time tracking
 */
export function useTaskTimeTracking(taskId: number): UseTaskTimeTrackingResult {
  const [timeInfo, setTimeInfo] = useState<TaskTimeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Format duration in minutes to human readable format
  const formatDuration = useCallback((minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }, []);

  // Get total duration including current session
  const getTotalDuration = useCallback((): number => {
    if (!timeInfo) return 0;
    return timeInfo.totalDurationMinutes + timeInfo.currentSessionMinutes;
  }, [timeInfo]);

  // Get current session duration
  const getCurrentSessionDuration = useCallback((): number => {
    return timeInfo?.currentSessionMinutes || 0;
  }, [timeInfo]);

  // Fetch current time tracking info
  const refreshTimeInfo = useCallback(async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchOnce(`/api/tasklist/${taskId}/time-tracking`);
      if (response.ok) {
        const data = await response.json();
        setTimeInfo(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch time info');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Perform time tracking action
  const performAction = useCallback(async (action: string) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[TimeTracking Hook] 🎯 performAction called');
    console.log('[TimeTracking Hook] Action:', action);
    console.log('[TimeTracking Hook] Task ID:', taskId);
    
    if (!taskId) {
      console.warn('[TimeTracking Hook] ❌ No taskId provided');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const url = `/api/tasklist/${taskId}/time-tracking`;
      console.log('[TimeTracking Hook] 📤 Sending POST to:', url);
      console.log('[TimeTracking Hook] Payload:', { action });
      
      const response = await fetchOnce(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      
      console.log('[TimeTracking Hook] 📥 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[TimeTracking Hook] ✅ Success! Time info updated');
        setTimeInfo(data.timeInfo);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || `Failed to ${action} task`;
        console.error('[TimeTracking Hook] ❌ Error response:', errorMessage);
        
        // Check if this is an active task conflict error
        if (errorMessage.startsWith('ACTIVE_TASK_EXISTS:')) {
          const userMessageRaw = errorMessage.replace('ACTIVE_TASK_EXISTS:', '');
          let userMessage = userMessageRaw;
          
          // Translate to Indonesian based on the server error format
          const taskMatch = userMessageRaw.match(/You already have an active task running: "([^"]+)"/);
          const taskName = taskMatch ? taskMatch[1] : 'task lain';
          userMessage = `Anda sudah memiliki task aktif yang sedang berjalan: "${taskName}". Silakan hentikan atau selesaikan task tersebut terlebih dahulu.`;
          
          toast.error(userMessage, 8000); // Show for 8 seconds
          setError(userMessage);
        } else {
          toast.error(errorMessage);
          setError(errorMessage);
        }
      }
    } catch (err) {
      console.error('[TimeTracking Hook] ❌ Exception caught:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }, [taskId, toast]);

  // Action functions
  const startTask = useCallback(() => performAction('start'), [performAction]);
  const pauseTask = useCallback(() => performAction('pause'), [performAction]);
  const resumeTask = useCallback(() => performAction('resume'), [performAction]);
  const stopTask = useCallback(() => performAction('stop'), [performAction]);

  // Load initial time info
  useEffect(() => {
    refreshTimeInfo();
  }, [refreshTimeInfo]);

  // Auto-refresh current session time for active tasks
  useEffect(() => {
    if (!timeInfo?.isActive) return;

    const interval = setInterval(() => {
      if (timeInfo.startedAt) {
        const now = new Date();
        const startTime = new Date(timeInfo.startedAt);
        const sessionMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
        
        setTimeInfo(prev => prev ? {
          ...prev,
          currentSessionMinutes: sessionMinutes
        } : null);
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timeInfo?.isActive, timeInfo?.startedAt]);

  return {
    timeInfo,
    loading,
    error,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    refreshTimeInfo,
    formatDuration,
    getTotalDuration,
    getCurrentSessionDuration,
  };
}

/**
 * Hook for getting all active tasks
 */
export function useActiveTasks(userId?: number) {
  const [activeTasks, setActiveTasks] = useState<TaskTimeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshActiveTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = userId ? `/api/tasklist/active?userId=${userId}` : '/api/tasklist/active';
      const response = await fetchOnce(url);
      
      if (response.ok) {
        const data = await response.json();
        setActiveTasks(data.activeTasks || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch active tasks');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshActiveTasks();
  }, [refreshActiveTasks]);

  return {
    activeTasks,
    loading,
    error,
    refreshActiveTasks,
  };
}
