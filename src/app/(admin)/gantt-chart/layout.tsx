import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gantt Chart - Task Management",
  description: "Visualisasi timeline task dalam bentuk Gantt Chart",
};

export default function GanttChartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
