"use client";
import React, { useState, useEffect, useRef } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useNotifications } from "@/context/NotificationContext";
import { getPusherClient } from "@/lib/pusher-client";
import { useAuth } from "@/context/AuthContext";
import { NotificationEvent } from "@/lib/pusher-server";
import { useToast } from "@/context/ToastContext";
import TaskDetailModal from "@/components/tasklist/TaskDetailModal";
import { useRouter } from "next/navigation";

type ChatNotification = {
  id: string;
  taskId: number;
  taskCode: string;
  taskTitle: string;
  projectName: string;
  unreadCount: number;
  type: string;
  createdAt: string;
};

// Generate unique instance ID for debugging
let instanceCounter = 0;

export default function NotificationDropdown() {
  const [instanceId] = useState(() => ++instanceCounter);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [chatNotifications, setChatNotifications] = useState<ChatNotification[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskData, setSelectedTaskData] = useState<any>(null);

  const [loadingTask, setLoadingTask] = useState(false);
  const [openChatDirectly, setOpenChatDirectly] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  console.log(`🔔 [NotificationDropdown #${instanceId}] Component rendered`);
  const { user } = useAuth();
  const router = useRouter();

  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteAll,
    fetchNotifications
  } = useNotifications();
  const toast = useToast();

  useEffect(() => {
    // Skip Audio initialization on mobile to prevent client-side exceptions
    // Mobile browsers (especially Chrome Android) restrict Audio API usage
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );
    if (isMobile) return;

    try {
      const audio = new Audio('/sounds/notify.ogg');
      audio.preload = 'auto';
      audioRef.current = audio;
    } catch (e) {
      console.warn('Audio initialization failed:', e);
    }
    return () => {
      audioRef.current = null;
    };
  }, []);

  console.log('🔔 [NotificationDropdown] Context loaded:', {
    notificationsCount: notifications.length,
    unreadCount,
    notifications: notifications.slice(0, 3) // Log first 3 for debugging
  });

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    return then.toLocaleDateString('id-ID');
  };

  function toggleDropdown() {
    // Check if we're navigating from a notification click
    const isNavigating = sessionStorage.getItem('notification-navigating');
    if (isNavigating === 'true') {
      sessionStorage.removeItem('notification-navigating');
      return; // Don't open dropdown
    }
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    console.log('🔔 [NotificationDropdown] Dropdown clicked, current state:', {
      isOpen,
      notificationsCount: notifications.length,
      unreadCount,
      chatNotificationsCount: chatNotifications.length
    });
    toggleDropdown();
  };

  const handleNotificationClick = async (notification: any) => {
    console.log('🔔 [NotificationDropdown] Notification clicked:', notification);
    
    // Mark as read
    await markAsRead(notification.id);
    console.log('✅ [NotificationDropdown] Notification marked as read');

    // Handle PR notifications
    if (notification.type === 'github.pr.created' || notification.type === 'github.pr.merged' || notification.type === 'github.pr.closed') {
      const prData = notification.data;
      
      if (notification.type === 'github.pr.created') {
        // PM clicks PR created notification → go to PR detail
        if (prData?.repo && prData?.prNumber) {
          router.push(`/github/pr/${prData.repo}/${prData.prNumber}`);
        }
      } else if (notification.type === 'github.pr.merged' || notification.type === 'github.pr.closed') {
        // Programmer clicks PR merged/closed notification → refresh ProgrammerGuide
        if (prData?.repo) {
          router.push(`/github/repo/${prData.repo}`);
          // Trigger refresh after navigation
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }
    }
  };

  const handleCleanup = async () => {
    try {
      const response = await fetch('/api/notifications/cleanup', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.deleted > 0) {
          console.log(`✅ Cleaned up ${data.deleted} orphaned notifications`);
          // Refresh notifications to reflect changes
          window.location.reload();
        } else {
          console.log('ℹ️ No orphaned notifications found');
        }
      }
    } catch (err) {
      console.error('Failed to cleanup notifications:', err);
    }
  };

  // Fetch chat unread summary
  const fetchChatUnread = async () => {
    try {
      const response = await fetch('/api/chat/unread-summary', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setChatNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch chat unread:', err);
    }
  };

  // Fetch task detail for modal
  const fetchTaskDetail = async (taskId: number) => {
    setLoadingTask(true);
    try {
      const response = await fetch(`/api/tasklist/${taskId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [NotificationDropdown] Task data received:', data);

        // API returns { item: TaskItem }, not TaskItem directly
        if (data?.item) {
          const taskItem = data.item;

          // Ensure we have all required fields
          const completeTask = {
            ...taskItem,
            proyekNama: taskItem.proyekNama || 'Unknown Project',
            moduleNama: taskItem.moduleNama || 'Unknown Module',
            pegawaiNama: taskItem.pegawaiNama || 'Unknown User'
          };

          console.log('📊 [NotificationDropdown] Complete task data:', completeTask);
          console.log('🔍 [NotificationDropdown] availableActions:', completeTask.availableActions);
          setSelectedTaskData(completeTask);
          setIsTaskModalOpen(true);
        } else {
          console.error('❌ [NotificationDropdown] Invalid task data - missing item:', data);
          toast.error('Data task tidak valid');
        }
      } else if (response.status === 404) {
        toast.error('Task sudah dihapus dan tidak dapat dibuka');
      } else {
        toast.error('Gagal memuat detail task');
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
      toast.error('Terjadi kesalahan saat memuat task');
    } finally {
      setLoadingTask(false);
    }
  };

  // Fetch on mount and when dropdown opens
  useEffect(() => {
    fetchChatUnread();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchChatUnread();
    }
  }, [isOpen]);

  // Store addNotification in ref to prevent re-binding on every render
  const addNotificationRef = useRef(addNotification);
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);

  // Listen for real-time chat messages and task notifications via Pusher
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher || !user) return;

    // Subscribe to user-specific channel for chat and task notifications
    const channelName = `private-user-${user.id}`;

    // Check if already subscribed to avoid duplicate subscriptions
    let channel = pusher.channel(channelName);
    if (!channel) {
      console.log(`🔔 [NotificationDropdown #${instanceId}] Subscribing to ${channelName}`);
      channel = pusher.subscribe(channelName);
    } else {
      console.log(`🔔 [NotificationDropdown #${instanceId}] Already subscribed to ${channelName}`);
    }

    let callCounter = 0; // Track how many times handler is called

    const handleChatNotification = () => {
      fetchChatUnread();
      try { audioRef.current?.play(); } catch (e) { }
      // Dispatch task_updated to refresh tasklist if chat is open or list has unread counts
      window.dispatchEvent(new CustomEvent('task_updated'));
    };

    const handleTaskNotification = (data: NotificationEvent) => {
      callCounter++;
      console.log(`🔔 [NotificationDropdown #${instanceId}] Task notification received (call #${callCounter}):`, {
        type: data.type,
        title: data.title,
        message: data.message,
        taskId: data.taskId,
        taskCode: data.taskCode,
        notificationId: data.id,
        timestamp: new Date().toISOString()
      });

      // Use ref to get latest addNotification function
      console.log(`🔔 [NotificationDropdown #${instanceId}] Calling addNotification (call #${callCounter})...`);
      addNotificationRef.current(data);
      try { audioRef.current?.play(); } catch (e) { }
      
      // Dispatch window event so tasklist page can reload data in real-time
      console.log(`🔔 [NotificationDropdown #${instanceId}] Dispatching task_updated window event`);
      window.dispatchEvent(new CustomEvent('task_updated'));
      
      console.log(`🔔 [NotificationDropdown #${instanceId}] addNotification call completed (call #${callCounter})`);
    };

    // CRITICAL: Unbind existing handlers first to prevent duplicates in React Strict Mode
    console.log(`🔔 [NotificationDropdown #${instanceId}] Unbinding existing handlers on ${channelName}`);
    channel.unbind('chat-notification');
    channel.unbind('task-notification');

    // Now bind new handlers
    console.log(`🔔 [NotificationDropdown #${instanceId}] Binding handlers on ${channelName}`);
    channel.bind('chat-notification', handleChatNotification);
    channel.bind('task-notification', handleTaskNotification);

    return () => {
      console.log(`🔔 [NotificationDropdown #${instanceId}] Cleaning up ${channelName}`);
      channel.unbind('chat-notification', handleChatNotification);
      channel.unbind('task-notification', handleTaskNotification);
      // Don't unsubscribe - keep channel alive for next mount
      // pusher.unsubscribe(channelName);
    };
  }, [user, instanceId]);

  const getNotificationIcon = (notification: any) => {
    // Check for GitHub PR notification
    if (notification.type === 'github.pr.created' ||
      notification.type === 'github.pr.merged' ||
      notification.type === 'github.pr.closed' ||
      (notification.type === 'task.created' && notification.data?.prNumber)) {
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-gray-900 dark:text-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      );
    }

    switch (notification.type) {
      case 'task.created':
      case 'task.assigned':
        return '📋';
      case 'task.status.changed':
        return '🔄';
      case 'task.submitted':
        return '📤';
      case 'task.approved':
        return '✅';
      case 'task.rejected':
        return '❌';
      case 'task.comment':
        return '💬';
      case 'task.file.uploaded':
        return '📎';
      case 'task.overdue':
        return '⏰';
      case 'task.updated':
        return '✏️';
      case 'task.deleted':
        return '🗑️';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-orange-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };
  // Calculate unique notifications (exclude chat duplicates)
  const uniqueNotifications = notifications.filter(notification => {
    // Filter out notifications that might be duplicated as chat notifications
    const isChatRelated = notification.type === 'task.comment' ||
      notification.message?.includes('pesan') ||
      notification.message?.includes('chat');

    // If it's chat-related and we have a chat notification for the same task, skip it
    if (isChatRelated) {
      return !chatNotifications.some(chat => chat.taskId === notification.taskId);
    }
    return true;
  });

  // Calculate total unique notifications to avoid duplicates
  const totalNotifications = uniqueNotifications.length + chatNotifications.length;

  useEffect(() => {
    console.log('🔢 [NotificationDropdown] Counts updated:', {
      total: totalNotifications,
      uniqueRegular: uniqueNotifications.length,
      chat: chatNotifications.length,
      rawRegular: notifications.length
    });
  }, [totalNotifications, uniqueNotifications.length, chatNotifications.length, notifications.length]);

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        {totalNotifications > 0 && (
          <>
            <span className="absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 flex">
              <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
            </span>
            <span className="absolute -top-1 -right-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {totalNotifications > 9 ? '9+' : totalNotifications}
            </span>
          </>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifikasi {totalNotifications > 0 && `(${totalNotifications})`}
          </h5>
          <div className="flex items-center gap-2">
            {totalNotifications > 0 ? (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Tandai Semua Dibaca
              </button>
            ) : null}
            <button
              onClick={toggleDropdown}
              className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg
                className="fill-current"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {/* Chat Notifications - One per task */}
          {chatNotifications.map((chatNotif) => (
            <li key={`chat-${chatNotif.id}`}>
              <DropdownItem
                tag="button"
                onItemClick={async () => {
                  // Check if task still exists before navigating
                  try {
                    const taskCheckResponse = await fetch(`/api/tasklist/${chatNotif.taskId}`, {
                      credentials: 'include'
                    });

                    if (!taskCheckResponse.ok) {
                      // Task doesn't exist or error occurred
                      if (taskCheckResponse.status === 404) {
                        toast.error('Task sudah dihapus dan tidak dapat dibuka', 5000);
                        // Remove this notification from list
                        setChatNotifications(prev => prev.filter(c => c.id !== chatNotif.id));
                        closeDropdown();
                        return;
                      }
                      throw new Error('Failed to check task');
                    }

                    // Task exists, mark chat as read
                    await fetch(`/api/tasklist/${chatNotif.taskId}/chat/unread`, {
                      method: 'POST',
                      credentials: 'include'
                    });

                    // Remove this chat notification from list
                    setChatNotifications(prev => prev.filter(c => c.id !== chatNotif.id));

                    // Use soft refresh/modal instead of full page reload
                    setOpenChatDirectly(true);
                    await fetchTaskDetail(chatNotif.taskId);
                  } catch (error) {
                    console.error('Failed to handle chat notification click:', error);
                    toast.error('Terjadi kesalahan saat membuka task. Silakan coba lagi.', 5000);
                  }
                  closeDropdown();
                }}
                className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 bg-blue-50 dark:bg-blue-900/10"
              >
                <span className="relative flex items-center justify-center w-10 h-10 text-2xl rounded-full bg-blue-100 dark:bg-blue-800">
                  💬
                  <span className="absolute bottom-0 right-0 z-10 h-2.5 w-2.5 rounded-full border-[1.5px] border-white dark:border-gray-900 bg-blue-500"></span>
                </span>

                <span className="flex-1 block">
                  <span className="block mb-1 font-medium text-gray-900 dark:text-white">
                    {chatNotif.taskCode} - {chatNotif.unreadCount}+ Pesan Baru
                  </span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">
                    {chatNotif.taskTitle}
                  </span>
                  <span className="block mt-1 text-xs text-gray-500 dark:text-gray-500">
                    {formatRelativeTime(chatNotif.createdAt)}
                  </span>
                </span>
              </DropdownItem>
            </li>
          ))}

          {/* Regular Notifications - Filter out chat-related ones to avoid duplicates */}
          {uniqueNotifications
            .map((notification) => (
              <li key={`notif-${notification.id}`}>
                <DropdownItem
                  tag="button"
                  onItemClick={async () => {
                    console.log('🔔 [NotificationDropdown] Notification clicked:', notification.id, notification.type);

                    // Mark as read
                    try {
                      console.log('🔔 [NotificationDropdown] Marking as read...');
                      await markAsRead(notification.id);
                      console.log('✅ [NotificationDropdown] Mark as read completed');
                    } catch (error) {
                      console.error('❌ [NotificationDropdown] Failed to mark as read:', error);
                    }

                    // Close dropdown
                    closeDropdown();

                    // Handle different notification types
                    // Handle different notification types
                    const isPRNotification = notification.type === 'github.pr.created' ||
                      notification.type === 'github.pr.merged' ||
                      notification.type === 'github.pr.closed' ||
                      (notification.type === 'task.created' && notification.data?.prNumber);

                    if (isPRNotification) {
                      // Check for PR status update (merge/close)
                      const isStatusUpdate = notification.type === 'github.pr.merged' ||
                        notification.type === 'github.pr.closed' ||
                        (notification.data && (notification.data.action === 'merged' || notification.data.action === 'closed'));

                      const isProgrammer = user?.role === 'PROGRAMMER';

                      if (isProgrammer && isStatusUpdate) {
                        // Programmer clicks merged/closed notification → refresh ProgrammerGuide
                        const repoName = notification.data?.repo || notification.data?.repoName;
                        if (repoName) {
                          const shortRepoName = repoName.includes('/')
                            ? repoName.split('/')[1]
                            : repoName;
                          console.log('🔔 [NotificationDropdown] PR status update for Programmer - Refreshing dashboard');
                          window.location.href = `/github/repo/${shortRepoName}`;
                        } else {
                          // Fallback to github dashboard
                          window.location.href = '/github';
                        }
                      } else {
                        // Navigate to PR detail page
                        // Format: /github/pr/[repo_name]/[pr_number]
                        const fullRepoName = notification.data?.repo || notification.data?.repoName;
                        const prNumber = notification.data?.prNumber;

                        if (fullRepoName && prNumber) {
                          // Extract short repo name (e.g. "JSON-basic" from "khoirularyan/JSON-basic")
                          const shortRepoName = fullRepoName.includes('/')
                            ? fullRepoName.split('/')[1]
                            : fullRepoName;

                          console.log('🔔 [NotificationDropdown] Redirecting to PR detail:', { shortRepoName, prNumber });
                          window.location.href = `/github/pr/${shortRepoName}/${prNumber}`;
                        } else {
                          // Fallback
                          console.warn('⚠️ [NotificationDropdown] Missing repo or PR number, redirecting to dashboard');
                          window.location.href = '/github';
                        }
                      }
                    } else if (notification.taskId) {
                      // Task notification - show task detail
                      setOpenChatDirectly(false);
                      await fetchTaskDetail(notification.taskId);
                    }
                  }}
                  className={`flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 ${!('read' in notification && notification.read) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                >
                  <span className="relative flex items-center justify-center w-10 h-10 text-2xl rounded-full bg-gray-100 dark:bg-gray-800">
                    {getNotificationIcon(notification)}
                    <span className={`absolute bottom-0 right-0 z-10 h-2.5 w-2.5 rounded-full border-[1.5px] border-white dark:border-gray-900 ${getPriorityColor(notification.priority)}`}></span>
                  </span>

                  <span className="flex-1 block">
                    <span className="mb-1.5 block text-theme-sm">
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {notification.title}
                      </span>
                    </span>
                    <span className="block mb-2 text-gray-500 text-theme-xs dark:text-gray-400">
                      {notification.message}
                    </span>
                    <span className="flex items-center gap-2 text-gray-500 text-theme-xs dark:text-gray-400">
                      {notification.projectName && (
                        <>
                          <span>{notification.projectName}</span>
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        </>
                      )}
                      <span>
                        {formatRelativeTime(notification.timestamp)}
                      </span>
                    </span>
                  </span>

                  {!('read' in notification && notification.read) && (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    </span>
                  )}
                </DropdownItem>
              </li>
            ))}

          {/* Show empty state only if both lists are empty */}
          {notifications.filter(n => {
            const isChatRelated = n.type === 'task.comment' || n.message?.includes('pesan') || n.message?.includes('chat');
            return !isChatRelated || !chatNotifications.some(chat => chat.taskId === n.taskId);
          }).length === 0 && chatNotifications.length === 0 && (
              <li className="py-8 text-center text-gray-500 dark:text-gray-400">
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p>Tidak ada notifikasi</p>
                </div>
              </li>
            )}
        </ul>
      </Dropdown>

      {/* Task Detail Modal */}
      <TaskDetailModal
        key={selectedTaskData?.id ? `task-modal-${selectedTaskData.id}` : 'task-modal-empty'}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setOpenChatDirectly(false);
          setSelectedTaskData(null);

          // Refresh notification data (both regular and chat)
          fetchNotifications().catch(err => console.error('Failed to refresh notifications:', err));
          fetchChatUnread().catch(err => console.error('Failed to refresh chat unread:', err));

          // Soft refresh - refresh server components without full page reload
          // router.refresh(); // Removed to prevent "reload" feel, rely on client event
          // Also dispatch custom event so client components can listen and refetch
          window.dispatchEvent(new CustomEvent('task_updated'));
        }}
        task={selectedTaskData}
        initialShowChat={openChatDirectly}
        onStartTask={async (task) => {
          // Handle start task action
          try {
            const response = await fetch(`/api/tasklist/${task.id}/time-tracking`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'start' }),
              credentials: 'include'
            });
            
            if (response.ok) {
              toast.success('Task dimulai');
              setIsTaskModalOpen(false);
              fetchNotifications();
              window.dispatchEvent(new CustomEvent('task_updated'));
            } else {
              const error = await response.json();
              toast.error(error.error || 'Gagal memulai task');
            }
          } catch (error) {
            console.error('Failed to start task:', error);
            toast.error('Terjadi kesalahan');
          }
        }}
        onCompleteTask={async (task) => {
          // Handle complete task action
          try {
            const response = await fetch(`/api/tasklist/${task.id}/time-tracking`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'submit' }),
              credentials: 'include'
            });
            
            if (response.ok) {
              toast.success('Task dikirim untuk review');
              setIsTaskModalOpen(false);
              fetchNotifications();
              window.dispatchEvent(new CustomEvent('task_updated'));
            } else {
              const error = await response.json();
              toast.error(error.error || 'Gagal menyelesaikan task');
            }
          } catch (error) {
            console.error('Failed to complete task:', error);
            toast.error('Terjadi kesalahan');
          }
        }}
        onStatusChange={async (task, newStatus) => {
          // Handle status change (approve/reject/pause/resume)
          try {
            let endpoint = `/api/tasklist/${task.id}`;
            let body: any = { status: newStatus };
            
            // For pause/resume, use time-tracking endpoint
            if (newStatus === 'SEDANG_DIPROSES_USER_PAUSED') {
              endpoint = `/api/tasklist/${task.id}/time-tracking`;
              body = { action: 'pause' };
            } else if (task.status === 'SEDANG_DIPROSES_USER_PAUSED' && newStatus === 'SEDANG_DIPROSES_USER') {
              endpoint = `/api/tasklist/${task.id}/time-tracking`;
              body = { action: 'resume' };
            }
            
            const response = await fetch(endpoint, {
              method: endpoint.includes('time-tracking') ? 'POST' : 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
              credentials: 'include'
            });
            
            if (response.ok) {
              const statusMessages: Record<string, string> = {
                'SELESAI': 'Task disetujui',
                'MENUNGGU_PROSES_USER': 'Task ditolak',
                'SEDANG_DIPROSES_USER_PAUSED': 'Task dijeda',
                'SEDANG_DIPROSES_USER': 'Task dilanjutkan'
              };
              toast.success(statusMessages[newStatus] || 'Status berhasil diubah');
              setIsTaskModalOpen(false);
              fetchNotifications();
              window.dispatchEvent(new CustomEvent('task_updated'));
            } else {
              const error = await response.json();
              toast.error(error.error || 'Gagal mengubah status');
            }
          } catch (error) {
            console.error('Failed to change status:', error);
            toast.error('Terjadi kesalahan');
          }
        }}
      />
    </div>
  );
}
