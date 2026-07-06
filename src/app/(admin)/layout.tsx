import type { Metadata } from "next";
import React from "react";
import AdminShell from "./AdminShell";
import ConditionalHeader from "./ConditionalHeader";

export const metadata: Metadata = {
  title: {
    template: "KerjaIn | %s",
    default: "KerjaIn",
  },
};

// Avoid caching the admin layout across users; always render per request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server layout wraps client AdminShell
  return (
    <div id="admin-root">
      <ConditionalHeader />
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
