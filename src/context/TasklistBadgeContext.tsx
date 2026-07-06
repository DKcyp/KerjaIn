"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';

type TasklistBadgeContextType = {
  actionCount: number;
  refresh: () => void;
};

const TasklistBadgeContext = createContext<TasklistBadgeContextType>({
  actionCount: 0,
  refresh: () => {},
});

export function TasklistBadgeProvider({ children }: { children: React.ReactNode }) {
  const [actionCount, setActionCount] = useState(0);
  const { socket } = useSocket();
  const { user } = useAuth();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/tasklist/action-count', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setActionCount(Number(data.count ?? 0));
      }
    } catch {
      // silent fail — badge just won't update
    }
  }, []);

  // Debounced refresh to avoid hammering the API on burst notifications
  const refresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(fetchCount, 500);
  }, [fetchCount]);

  // Initial fetch when user is loaded
  useEffect(() => {
    if (!user?.id) return;
    fetchCount();
  }, [user?.id, fetchCount]);

  // Periodic refresh every 60 seconds as fallback
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [user?.id, fetchCount]);

  // Real-time refresh: listen to the same 'task_updated' window event
  // that NotificationDropdown dispatches when a Pusher task-notification arrives.
  // This is the actual mechanism used in this app — not Socket.IO events.
  useEffect(() => {
    if (!user?.id) return;

    const handleTaskUpdated = () => refresh();

    window.addEventListener('task_updated', handleTaskUpdated);
    return () => window.removeEventListener('task_updated', handleTaskUpdated);
  }, [user?.id, refresh]);

  // Socket.IO fallback for any direct socket events (secondary mechanism)
  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleNotification = () => refresh();

    socket.on('task-status-changed', handleNotification);
    socket.on('task-assigned', handleNotification);
    socket.on('notification', handleNotification);
    socket.on('message-received', handleNotification);

    return () => {
      socket.off('task-status-changed', handleNotification);
      socket.off('task-assigned', handleNotification);
      socket.off('notification', handleNotification);
      socket.off('message-received', handleNotification);
    };
  }, [socket, user?.id, refresh]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  return (
    <TasklistBadgeContext.Provider value={{ actionCount, refresh }}>
      {children}
    </TasklistBadgeContext.Provider>
  );
}

export function useTasklistBadge() {
  return useContext(TasklistBadgeContext);
}
