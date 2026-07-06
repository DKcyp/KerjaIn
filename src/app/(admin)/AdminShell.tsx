"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { useRouteAuthCheck } from "@/hooks/useRouteAuthCheck";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import SSOGuard from "@/components/auth/SSOGuard";
import { TasklistBadgeProvider } from "@/context/TasklistBadgeContext";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const { user, loading } = useAuth();

  // Enable route-based authentication checking
  useRouteAuthCheck();

  useEffect(() => {
    if (loading) return;

    // Allow public access to monitoring
    if (pathname === '/monitoring') {
      setChecked(true);
      return;
    }

    if (!user) {
      router.replace('/signin');
      return;
    }
    setChecked(true);
  }, [user, loading, router, pathname]);

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[271px]"
      : "lg:ml-[80px]";

  // Ensure title format: 'KerjaIn | <Page Title>' for admin area
  useEffect(() => {
    try {
      const t = document.title || '';
      if (t && !t.startsWith('KerjaIn | ')) {
        document.title = `KerjaIn | ${t}`;
      }
    } catch { }
  }, [pathname]);

  if (!checked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // For monitoring page, bypass SSOGuard and remove sidebar/header
  if (pathname === '/monitoring') {
    return (
      <div className="min-h-screen w-full">
        {/* No sidebar, no header - clean monitoring view */}
        <div className="w-full overflow-x-visible">
          {children}
        </div>
      </div>
    );
  }

  return (
    <SSOGuard>
      <TasklistBadgeProvider>
        <div className="min-h-screen xl:flex">
          {/* Sidebar and Backdrop */}
          <AppSidebar />
          <Backdrop />
          {/* Main Content Area */}
          <div
            className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out pt-[56px] lg:pt-[64px] ${mainContentMargin}`}
          >
            {/* Page Content */}
            <div className="p-4 md:p-6 w-full h-full overflow-hidden">{children}</div>
          </div>
        </div>
      </TasklistBadgeProvider>
    </SSOGuard>
  );
}
