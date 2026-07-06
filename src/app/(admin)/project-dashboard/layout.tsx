import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Dashboard | Richz-Log",
  description: "High-level overview of all project activities and management",
};

export default function ProjectDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
