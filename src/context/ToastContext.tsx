"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type Toast = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
  timeout?: number;
};

type Ctx = {
  toasts: Toast[];
  success: (msg: string, timeout?: number) => void;
  error: (msg: string, timeout?: number) => void;
  info: (msg: string, timeout?: number) => void;
  remove: (id: number) => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type: Toast["type"], message: string, timeout = 6000) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, message, timeout }]);
    if (timeout && timeout > 0) {
      setTimeout(() => remove(id), timeout);
    }
  }, [remove]);

  const api = useMemo<Ctx>(() => ({
    toasts,
    success: (m, t) => push("success", m, t),
    error: (m, t) => push("error", m, t),
    info: (m, t) => push("info", m, t),
    remove,
  }), [toasts, push, remove]);

  return (
    <ToastContext.Provider value={api}>{children}</ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
