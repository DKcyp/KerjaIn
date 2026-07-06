import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Pegawai",
};

export default function PegawaiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
