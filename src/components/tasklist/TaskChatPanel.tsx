"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getPusherClient } from '@/lib/pusher-client';
import { ImageLightbox } from '@/components/ui/ImageLightbox';

type ChatMessage = {
  id: number;
  tasklistId: number;
  senderId: number;
  message: string;
  createdAt: string;
  isRead: boolean;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  extraFiles?: Array<{ fileUrl: string; fileName: string; fileType: string; fileSize: number }> | null;
  source?: string | null; // "chat" | "action_note"
  sender: {
    id: number;
    namaLengkap: string;
    username: string | null;
    role: string;
  };
};

type TaskChatPanelProps = {
  tasklistId: number;
  taskStatus?: string;
  readOnly?: boolean;
};

export default function TaskChatPanel({ tasklistId, taskStatus, readOnly }: TaskChatPanelProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [brokenChatFiles, setBrokenChatFiles] = useState<Set<number>>(new Set());
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox states
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string>('');

  // Handle paste event for files (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't handle paste if task is completed
      if (taskStatus === 'SELESAI') return;

      const items = e.clipboardData?.items;
      const files = e.clipboardData?.files;

      if (!items && !files) return;

      let fileProcessed = false; // Flag to prevent duplicate notifications

      // Try to get file from items first (for images from clipboard)
      if (items && !fileProcessed) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const file = item.getAsFile();

          if (file && !fileProcessed) {
            fileProcessed = true;

            // Only validate file size (10MB max for chat)
            if (file.size > 10 * 1024 * 1024) {
              showError(`File ${file.name} terlalu besar. Maksimal 10MB.`);
              return;
            }

            // Set as selected file
            setSelectedFile(file);

            // Show success message
            const isImage = file.type.startsWith('image/');
            if (isImage) {
              success('Gambar dari clipboard berhasil ditambahkan');
            } else {
              success(`File ${file.name} dari clipboard berhasil ditambahkan`);
            }
            return; // Exit after first valid file
          }
        }
      }

      // Try to get file from files (for files copied from file explorer)
      if (files && files.length > 0 && !fileProcessed) {
        fileProcessed = true;
        const file = files[0];

        // Only validate file size (10MB max for chat)
        if (file.size > 10 * 1024 * 1024) {
          showError(`File ${file.name} terlalu besar. Maksimal 10MB.`);
          return;
        }

        // Set as selected file
        setSelectedFile(file);

        // Show success message
        const isImage = file.type.startsWith('image/');
        if (isImage) {
          success('Gambar dari clipboard berhasil ditambahkan');
        } else {
          success(`File ${file.name} dari clipboard berhasil ditambahkan`);
        }
      }
    };

    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [taskStatus, showError, success]);

  // Fetch chat messages
  const fetchChats = async () => {
    try {
      setLoading(true);
      setBrokenChatFiles(new Set());
      const response = await fetch(`/api/tasklist/${tasklistId}/chat`);

      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }

      const data = await response.json();
      setChats(data.chats || []);
      markAllAsRead();
      setTimeout(() => scrollToBottom(), 100);
    } catch (err) {
      console.error('Error fetching chats:', err);
      showError('Gagal memuat pesan chat');
    } finally {
      setLoading(false);
    }
  };

  // Mark all messages as read
  const markAllAsRead = async () => {
    try {
      await fetch(`/api/tasklist/${tasklistId}/chat/unread`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() && !selectedFile) return;

    const messageToSend = message.trim();
    const fileToSend = selectedFile;

    try {
      setSending(true);

      const formData = new FormData();
      formData.append('message', messageToSend);
      if (fileToSend) {
        formData.append('file', fileToSend);
      }

      const response = await fetch(`/api/tasklist/${tasklistId}/chat`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Use error message from API if available
        throw new Error(errorData.error || 'Gagal mengirim pesan');
      }

      setMessage('');
      setSelectedFile(null);
      fetchChats();
      success('Pesan berhasil dikirim');
    } catch (err: any) {
      console.error('Error sending message:', err);
      // Only show error if component is still mounted and user actually tried to send
      if ((messageToSend || fileToSend) && !err.name?.includes('Abort')) {
        // Show the actual error message from API
        showError(err.message || 'Gagal mengirim pesan');
      }
    } finally {
      setSending(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showError('Ukuran file maksimal 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Remove selected file
  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Label dan warna badge per action type
  const getActionBadge = (source?: string | null) => {
    switch (source) {
      case 'reject':        return { label: 'Reject', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' };
      case 'approve':       return { label: 'Approve', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' };
      case 'kirim_review':  return { label: 'Kirim Review', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'mulai':         return { label: 'Mulai Task', color: 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800' };
      case 'pause':         return { label: 'Pause', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' };
      case 'kembalikan':    return { label: 'Kembalikan', color: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' };
      case 'action_note':   return { label: 'Catatan Aksi', color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      default:              return null;
    }
  };

  // Check if file is image
  const isImageFile = (filename: string, fileType?: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    return imageExtensions.includes(ext || '') || (fileType && fileType.startsWith('image/'));
  };

  // Load chats on mount
  useEffect(() => {
    if (tasklistId) {
      fetchChats();
    }
  }, [tasklistId]);

  // Pusher real-time updates
  useEffect(() => {
    if (!tasklistId) return;

    const pusher = getPusherClient();
    
    // Skip Pusher setup if not configured
    if (!pusher) {
      console.log('⚠️ Pusher not configured, real-time chat updates disabled');
      return;
    }
    
    const channelName = `private-task-${tasklistId}`;
    const channel = pusher.subscribe(channelName);

    const handleNewMessage = (data: any) => {
      console.log('📨 New chat message received:', data);
      fetchChats();
    };

    channel.bind('new-message', handleNewMessage);

    return () => {
      console.log(`📤 Cleaning up Pusher channel: ${channelName}`);
      channel.unbind('new-message', handleNewMessage);
      pusher.unsubscribe(channelName);
    };
  }, [tasklistId]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-gray-800">
      {/* Chat Messages - Scrollable Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-3"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Belum ada diskusi
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Mulai diskusi tentang task ini dengan tim Anda. Bagikan progress, tanyakan pertanyaan, atau berikan update.
              </p>
            </div>
          </div>
        ) : (
          chats.map((chat) => {
            const isOwnMessage = user?.id === chat.senderId;
            const messageTime = new Date(chat.createdAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={chat.id}
                className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
              >
                {/* Avatar for other users */}
                {!isOwnMessage && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {chat.sender.namaLengkap.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className={`max-w-[75%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                  {/* Sender info */}
                  {!isOwnMessage && (
                    <div className="flex items-center gap-2 mb-1 px-1 flex-wrap">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {chat.sender.namaLengkap}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium">
                        {chat.sender.role}
                      </span>
                      {(() => {
                        const badge = getActionBadge(chat.source);
                        return badge ? (
                          <span className={`px-2 py-0.5 text-xs rounded-full border font-medium flex items-center gap-1 ${badge.color}`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {badge.label}
                          </span>
                        ) : null;
                      })()}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {messageTime}
                      </span>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                      chat.source && chat.source !== 'chat'
                        ? isOwnMessage
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-br-md'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-gray-900 dark:text-white border border-amber-200 dark:border-amber-800 rounded-bl-md'
                        : isOwnMessage
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-md'
                    }`}
                  >
                    {/* File attachment — primary + extraFiles dalam 1 bubble */}
                    {chat.fileUrl && (
                      <div className="mb-2 space-y-1">
                        {/* Gabungkan primary file + extraFiles jadi 1 list */}
                        {[
                          { fileUrl: chat.fileUrl, fileName: chat.fileName, fileType: chat.fileType },
                          ...(Array.isArray(chat.extraFiles) ? chat.extraFiles : [])
                        ].map((f, idx) => (
                          <div key={idx}>
                            {isImageFile(f.fileName ?? '', f.fileType ?? undefined) ? (
                              <img
                                src={f.fileUrl}
                                alt={f.fileName || 'Image'}
                                className="max-w-full h-auto rounded cursor-pointer"
                                onClick={() => {
                                  setLightboxImage(f.fileUrl ?? '');
                                  setLightboxOpen(true);
                                }}
                                loading="lazy"
                              />
                            ) : (
                              <a
                                href={f.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm underline"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                {f.fileName}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message text */}
                    {chat.message && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {chat.message}
                      </p>
                    )}
                  </div>

                  {/* Timestamp + badge untuk own messages */}
                  {isOwnMessage && (
                    <div className="flex items-center justify-end gap-2 mt-1 px-1 flex-wrap">
                      {(() => {
                        const badge = getActionBadge(chat.source);
                        return badge ? (
                          <span className={`px-2 py-0.5 text-xs rounded-full border font-medium flex items-center gap-1 ${badge.color}`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {badge.label}
                          </span>
                        ) : null;
                      })()}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {messageTime}
                      </span>
                    </div>
                  )}
                </div>

                {/* Avatar for own messages */}
                {isOwnMessage && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {user?.namaLengkap?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Chat Input - Fixed at Bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        {/* Selected file preview */}
        {selectedFile && (
          <div className="mx-3 mt-3 mb-2 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={removeSelectedFile}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Task Completed Warning — only show when not readOnly */}
        {!readOnly && taskStatus === 'SELESAI' && (
          <div className="mx-3 mt-3 mb-2 flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Task sudah selesai. Chat tidak dapat dikirim lagi.
            </p>
          </div>
        )}

        {/* Chat Input Form — hidden in readOnly mode */}
        {!readOnly && (
          <form onSubmit={sendMessage} className="relative">
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                const textarea = e.target;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder={taskStatus === 'SELESAI' ? 'Task sudah selesai' : 'Tulis pesan Anda...'}
              className="w-full px-4 py-4 pr-28 border-0 bg-white dark:bg-gray-800 focus:outline-none focus:ring-0 dark:text-white resize-none text-sm placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              rows={1}
              disabled={sending || taskStatus === 'SELESAI'}
              style={{
                minHeight: '60px',
                maxHeight: '120px',
                overflow: 'hidden'
              }}
            />
            <div className="absolute right-3 bottom-3 flex flex-row flex-nowrap items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || taskStatus === 'SELESAI'}
                className="p-2 bg-gray-600/80 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
                title={taskStatus === 'SELESAI' ? 'Task sudah selesai' : 'Lampirkan file'}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={sending || (!message.trim() && !selectedFile) || taskStatus === 'SELESAI'}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg flex-shrink-0"
                title={taskStatus === 'SELESAI' ? 'Task sudah selesai' : 'Kirim pesan'}
              >
                {sending ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Paste Hint */}
        {taskStatus !== 'SELESAI' && (
          <div className="px-3 pb-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tip: Tekan Ctrl+V untuk paste file dari clipboard (max 10MB)
            </p>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imageSrc={lightboxImage}
        imageAlt="Chat Image Preview"
      />
    </div>
  );
}
