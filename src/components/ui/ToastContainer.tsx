"use client";

import React from "react";
import { useToast } from "@/context/ToastContext";

export default function ToastContainer() {
  const { toasts, remove } = useToast();
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[1000000] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            "flex items-start gap-3 rounded-md border px-4 py-3 shadow-md transition-all " +
            (t.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : t.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-sky-200 bg-sky-50 text-sky-800")
          }
          onClick={() => remove(t.id)}
          role="status"
        >
          <span
            className={
              "mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full " +
              (t.type === "success"
                ? "bg-emerald-500"
                : t.type === "error"
                ? "bg-red-500"
                : "bg-sky-500")
            }
          />
          <div className="text-sm leading-5">{t.message}</div>
        </div>
      ))}
    </div>
  );
}
