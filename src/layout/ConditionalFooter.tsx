"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AppFooter from "@/layout/AppFooter";
import { useSidebar } from "@/context/SidebarContext";

export default function ConditionalFooter() {
  const pathname = usePathname();
  const { isMobileOpen, isExpanded, isHovered } = useSidebar();
  
  // Detect admin area after mount to avoid SSR/CSR mismatch
  // MUST be called before any conditional returns (Rules of Hooks)
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    setIsAdmin(!!document.getElementById('admin-root'));
  }, []);

  // Hide footer on signin and monitoring pages
  if (pathname === "/signin" || pathname?.startsWith('/monitoring')) return null;

  let marginClass = "";
  if (isAdmin) {
    // mirror AdminShell logic
    marginClass = isMobileOpen ? "ml-0" : (isExpanded || isHovered) ? "lg:ml-[290px]" : "lg:ml-[90px]";
  }

  return (
    <div className={`${marginClass} transition-all duration-300 ease-in-out`}>
      <AppFooter />
    </div>
  );
}
