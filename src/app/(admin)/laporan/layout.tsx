import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Laporan",
};

export default function LaporanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
