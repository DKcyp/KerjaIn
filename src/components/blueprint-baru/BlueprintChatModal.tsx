"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, MessageCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type ChatMessage = {
  id: number;
  baId: number;
  senderId: number;
  senderName: string;
  message: string;
  createdAt: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  baId: number;
  baName: string;
  baVersion: string;
};

const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500",
];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function getInitial(name: string) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function BlueprintChatModal({ isOpen, onClose, projectId, baId, baName, baVersion }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blueprint-baru/${projectId}/chat?baId=${baId}`);
      const data = await res.json();
      if (data.success) setMessages(data.data);
    } catch (e) {
      console.error("Gagal fetch chat:", e);
    } finally {
      setLoading(false);
    }
  }, [projectId, baId]);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!user) {
      console.error("User belum login / session belum load");
      return;
    }

    setSending(true);
    setInputValue("");

    try {
      const res = await fetch(`/api/blueprint-baru/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baId,
          senderId: user.id,
          senderName: user.namaLengkap || user.username || "User",
          message: trimmed,
        }),
      });
      const data = await res.json();
      if (data.success) setMessages((prev) => [...prev, data.data]);
    } catch (e) {
      console.error("Gagal kirim pesan:", e);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl h-[600px] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageCircle size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight line-clamp-1">{baName}</h3>
              <p className="text-blue-100 text-xs">v{baVersion} · {messages.length} pesan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50 dark:bg-gray-950">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada pesan</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">Percakapan</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {messages.map((msg) => {
                const isOwn = user?.id === msg.senderId;
                const color = getAvatarColor(msg.senderId);
                const initial = getInitial(msg.senderName);

                return isOwn ? (
                  <div key={msg.id} className="flex justify-end gap-2">
                    <div className="max-w-[75%]">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 text-right mr-1">
                        {msg.senderName || "Anda"}
                      </p>
                      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 text-right mt-1">
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                    <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 self-end`}>
                      {initial}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex gap-2">
                    <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 self-end`}>
                      {initial}
                    </div>
                    <div className="max-w-[75%]">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                        {msg.senderName}
                      </p>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 ml-1">
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shrink-0">
          {!user ? (
            <p className="text-xs text-center text-red-400 py-2">Session tidak ditemukan, coba refresh halaman</p>
          ) : (
            <div className="flex items-end gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tulis pesan... (Enter untuk kirim)"
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none max-h-28 overflow-y-auto py-1"
                style={{ scrollbarWidth: "thin" }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || sending}
                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 self-end"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          )}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">
            Shift + Enter untuk baris baru
          </p>
        </div>

      </div>
    </div>
  );
}
