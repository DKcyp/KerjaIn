"use client";

import { usePathname } from 'next/navigation';
import AppHeader from "@/layout/AppHeader";

export default function ConditionalHeader() {
  const pathname = usePathname();
  
  // Hide header for monitoring page (like signin/portal pages)
  if (pathname === '/monitoring') {
    return null;
  }
  
  // Show header for all other admin pages
  return <AppHeader />;
}