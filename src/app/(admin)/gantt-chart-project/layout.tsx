import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gantt Chart Project - Module Timeline",
  description: "Visualisasi timeline task per modul dalam project",
};

export default function GanttChartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
