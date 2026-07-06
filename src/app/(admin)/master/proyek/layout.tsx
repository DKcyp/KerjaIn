import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Proyek",
};

export default function ProyekLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
