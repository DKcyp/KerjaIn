"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NotificationEvent } from '@/lib/pusher-server';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: NotificationEvent[];
  unreadCount: number;
  addNotification: (notification: NotificationEvent) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  deleteAll: () => void;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Load notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('📥 [NotificationContext] Loading notifications from database for user:', user.id);

      // ✅ FIX: Clear localStorage if user changed to prevent showing notifications from previous user
      const storedUserId = localStorage.getItem('notif-userId');
      if (storedUserId && storedUserId !== String(user.id)) {
        console.log(`🔄 [NotificationContext] User changed from ${storedUserId} to ${user.id}, clearing localStorage`);
        localStorage.removeItem('notifications');
        localStorage.removeItem('notif-userId');
        sessionStorage.removeItem('markedAsRead'); // ✅ Clear session storage too
        setNotifications([]);
      }
      // Store current user ID
      localStorage.setItem('notif-userId', String(user.id));

      const response = await fetch('/api/notifications?unreadOnly=true&limit=50', {
        credentials: 'include',
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        const dbNotifications = data.notifications || [];

        console.log('✅ [NotificationContext] Loaded', dbNotifications.length, 'notifications from database');

        if (dbNotifications.length > 0) {
          // Get list of notifications that were marked as read in this session
          const markedAsReadIds = JSON.parse(sessionStorage.getItem('markedAsRead') || '[]');
          console.log('📝 [NotificationContext] Marked as read IDs:', markedAsReadIds);

          const formattedNotifications = dbNotifications
            .filter((n: any) => {
              // Frontend filter: Check if notification is in session storage as read
              const isMarkedRead = markedAsReadIds.some((id: string | number) =>
                String(id) === String(n.id) ||
                (n.notificationId && String(id) === String(n.notificationId))
              );
              if (isMarkedRead) {
                console.log('🗑️ [NotificationContext] Filtering out read notification:', n.id);
              }
              return !isMarkedRead;
            })
            .map((n: any) => ({
              id: n.id || `db-${n.id}`,
              title: n.title,
              message: n.message,
              type: n.type || 'info',
              timestamp: n.createdAt,
              read: false,
              priority: 'medium',
              taskId: n.taskId,
              projectName: n.projectName
            }));

          setNotifications(formattedNotifications);

          // Calculate count
          const count = formattedNotifications.length;
          setUnreadCount(count);
          console.log('🔔 [NotificationContext] Set notifications:', formattedNotifications.length);
        } else {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    } catch (error) {
      console.error('❌ [NotificationContext] Failed to load notifications:', error);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user?.id) { // Only fetch if user is logged in
      fetchNotifications();
    }
  }, [fetchNotifications, user?.id]); // Re-fetch if user.id changes (login/logout) or fetchNotifications changes

  // Load notifications from localStorage on mount (for offline persistence)
  useEffect(() => {
    const stored = localStorage.getItem('notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as NotificationEvent[];
        setNotifications(parsed);
        setUnreadCount(parsed.length);
      } catch (e) {
        console.error('Failed to parse stored notifications:', e);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    } else {
      localStorage.removeItem('notifications');
    }
  }, [notifications]);

  // Pusher subscription moved to NotificationDropdown to persist across navigation
  // NotificationDropdown will call addNotification() when events are received

  // Request notification permission on mount (desktop only)
  useEffect(() => {
    // Skip on mobile - browser notification permission request can cause issues
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );
    if (isMobile) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const markAsRead = useCallback(async (id: string): Promise<void> => {
    console.log('🔔 [NotificationContext] markAsRead called with ID:', id);

    // Remove notification from list immediately for better UX
    const updatedNotifications = notifications.filter(n => n.id !== id);
    setNotifications(updatedNotifications);
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Update localStorage immediately
    if (updatedNotifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    } else {
      localStorage.removeItem('notifications');
    }

    // Save to sessionStorage so we don't show this notification again in this session
    const markedAsReadIds = JSON.parse(sessionStorage.getItem('markedAsRead') || '[]');
    markedAsReadIds.push(id);
    // Also save numeric ID for database notifications
    if (id.startsWith('db-')) {
      markedAsReadIds.push(parseInt(id.replace('db-', '')));
    }
    sessionStorage.setItem('markedAsRead', JSON.stringify(markedAsReadIds));
    console.log('📝 [NotificationContext] Saved to markedAsRead list:', id);

    // ✅ FIX: Persist to database - Update isRead = true
    try {
      let apiNotificationId: number | string | undefined = undefined;
      let apiRequestId: string | undefined = undefined;

      // Determine ID type
      if (id.startsWith('notif-')) {
        // Optimistic ID, use as requestId
        apiRequestId = id;
      } else if (id.startsWith('db-')) {
        // Legacy format db-123 or db-cuid
        const stripped = id.replace('db-', '');
        // Check if pure number
        if (/^\d+$/.test(stripped)) {
          apiNotificationId = parseInt(stripped, 10);
        } else {
          apiNotificationId = stripped; // CUID
        }
      } else {
        // Plain ID
        if (/^\d+$/.test(id)) {
          apiNotificationId = parseInt(id, 10);
        } else {
          apiNotificationId = id; // CUID or other string ID
        }
      }

      console.log('🔔 [NotificationContext] Calling API to mark as read in DB:', { apiNotificationId, apiRequestId });

      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: apiNotificationId,
          requestId: apiRequestId
        }),
        credentials: 'include'
      });

      if (response.ok) {
        console.log('✅ [NotificationContext] Notification marked as read in DATABASE (isRead = true)');
      } else {
        const errorText = await response.text();
        console.warn('⚠️ [NotificationContext] Failed to mark as read in DB:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ [NotificationContext] Failed to mark notification as read in DB:', error);
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    const currentNotifications = [...notifications];

    // Clear UI and localStorage immediately for better UX
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('notifications'); // ✅ Clear localStorage

    // Persist to server
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();

        // If there are orphaned notifications that couldn't be marked as read,
        // they will be returned by the API and we'll show them again
        if (data.orphaned && data.orphaned.length > 0) {
          console.log(`⚠️ Found ${data.orphaned.length} orphaned notifications`);
          setNotifications(data.orphaned);
          // Save orphaned notifications back to localStorage
          localStorage.setItem('notifications', JSON.stringify(data.orphaned));
        }
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Revert on error
      setNotifications(currentNotifications);
      setUnreadCount(currentNotifications.length);
      localStorage.setItem('notifications', JSON.stringify(currentNotifications));
    }
  }, [notifications]);

  const deleteAll = useCallback(async () => {
    // Clear UI and localStorage immediately
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('notifications'); // ✅ Clear localStorage

    // Call cleanup API to delete orphaned notifications
    try {
      await fetch('/api/notifications/cleanup', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
    }
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    // Always decrement unread count when clearing a notification
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('notifications');
  }, []);

  // Add notification programmatically (called from NotificationDropdown)
  const addNotification = useCallback((data: NotificationEvent) => {
    console.log('🔔 [NotificationContext] addNotification called:', {
      id: data.id,
      type: data.type,
      taskId: data.taskId,
      taskCode: data.taskCode
    });

    let wasAdded = false;

    setNotifications(prev => {
      // ✅ IMPROVED DEDUPLICATION LOGIC
      // Remove any existing notifications with same taskId + type
      const filteredPrev = prev.filter(existing => {
        // Check for exact ID match
        if (existing.id === data.id) {
          console.log('⚠️ [NotificationContext] Removing duplicate by ID:', data.id);
          return false; // Remove this one
        }

        // Check for same task + type (regardless of time)
        if (existing.taskId === data.taskId && existing.type === data.type) {
          console.log('⚠️ [NotificationContext] Removing old notification (same task+type):', {
            oldId: existing.id,
            newId: data.id,
            taskId: data.taskId,
            type: data.type
          });
          return false; // Remove this one, we'll add the new one
        }

        return true; // Keep this one
      });

      // Check if we actually removed anything
      const removedCount = prev.length - filteredPrev.length;
      if (removedCount > 0) {
        console.log(`🔄 [NotificationContext] Removed ${removedCount} old notification(s), adding new one`);
      } else {
        console.log('✅ [NotificationContext] Adding new notification (no duplicates found)');
      }

      wasAdded = true;
      const newNotification = { ...data };

      // Add new notification at the beginning
      return [newNotification, ...filteredPrev];
    });

    // Show browser notification OUTSIDE of state setter to avoid side effects in React updater
    // Also skip on mobile where Notification API may not be available or causes issues
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );
    if (!isMobile && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(data.title, {
          body: data.message,
          icon: '/favicon.png',
          tag: `notif-${data.taskId}-${data.type}`,
          requireInteraction: false,
          silent: false
        });
      } catch (e) {
        console.warn('Browser notification failed:', e);
      }
    }

    // Only increment count if we actually added a notification
    if (wasAdded) {
      setUnreadCount(prev => prev + 1);
      console.log('✅ [NotificationContext] Notification added and count incremented');
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    deleteAll,
    fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
