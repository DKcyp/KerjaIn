"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { usePermission } from "@/hooks/usePermissions";
import { useTasklistBadge } from "@/context/TasklistBadgeContext";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PieChartIcon,
  TableIcon,
} from "../icons/index";

// Blueprint icon component
const BlueprintIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// EUT/SIT icon component
const EUTSITIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

// Go-Live Command Center icon component
const GoLiveIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

// Gantt Chart icon component
const GanttChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
);

// RBAC icon component
const RBACIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

// GitHub icon component
const GitHubIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

// SidebarWidget removed

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/project-dashboard",
  },
  {
    icon: <BoxCubeIcon />,
    name: "Master",
    subItems: [
      { name: "Pegawai", path: "/master/pegawai", pro: false },
      { name: "Proyek", path: "/master/proyek", pro: false },
      { name: "Team", path: "/master/team", pro: false },
      { name: "SLA", path: "/master/sla", pro: false },
      { name: "Task Complexity", path: "/master/task-complexity", pro: false },
      { name: "Master GitHub", path: "/master/github", pro: false },
      { name: "Master Break Time", path: "/master-break-time", pro: false },
    ],
  },
  // {
  //   icon: <BlueprintIcon />,
  //   name: "Blueprint",
  //   path: "/blueprint",
  // },
  {
    icon: <BlueprintIcon />,
    name: "Blueprint",
    path: "/blueprint-baru",
  },
  {
    icon: <ListIcon />,
    name: "Task",
    subItems: [
      { name: "Backlog", path: "/backlog", pro: false },
      { name: "Tasklist", path: "/tasklist", pro: false },
    ],
  },
  {
    icon: <GanttChartIcon />,
    name: "Gantt Chart",
    subItems: [
      { name: "Gantt Chart", path: "/gantt-chart", pro: false },
      { name: "Gantt Chart Project", path: "/gantt-chart-project", pro: false },
      { name: "Gantt Chart Baru", path: "/gantt-chart-baru", pro: false },
    ],
  },
  // {
  //   icon: <EUTSITIcon />,
  //   name: "UAT",
  //   path: "/uat",
  // },
  // {
  //   icon: <EUTSITIcon />,
  //   name: "EUT",
  //   path: "/eut",
  // },
  // {
  //   icon: <GoLiveIcon />,
  //   name: "Go-Live",
  //   path: "/go-live",
  // },
  // {
  //   icon: <PieChartIcon />,
  //   name: "Monitoring",
  //   path: "/monitoring",
  // },
  // {
  //   icon: <PieChartIcon />,
  //   name: "Sistem Monitoring",
  //   path: "/sistem-monitoring",
  // },
  {
    icon: <PieChartIcon />,
    name: "Monitoring Direksi",
    path: "/monitoring-direksi",
  },
  {
    icon: <PieChartIcon />,
    name: "KPI Programmer",
    path: "/kpi-monitoring",
  },
  {
    icon: <PieChartIcon />,
    name: "Monitoring KPI",
    path: "/monitoring-kpi",
  },
  {
    icon: <TableIcon />,
    name: "Laporan",
    subItems: [
      { name: "Reports", path: "/reports", pro: false },
      { name: "Tasklist Report", path: "/tasklist-report", pro: false },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "Kalender",
    path: "/calendar",
  },
  {
    icon: <RBACIcon />,
    name: "RBAC Management",
    path: "/rbac",
  },
  {
    icon: <GitHubIcon />,
    name: "GitHub",
    path: "/github",
  },
];

const othersItems: NavItem[] = [];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, toggleMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const { user } = useAuth();
  const role: 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN' | null = (user?.role as 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN') ?? null;
  const [hoveredSubmenu, setHoveredSubmenu] = useState<{ type: string; index: number } | null>(null);
  const [hoveredMenu, setHoveredMenu] = useState<{ type: string; index: number } | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Permission checks
  const canManageRBAC = usePermission('rbac.manage');
  const canViewUsers = usePermission('user.read');
  const canViewProjects = usePermission('project.read');
  const { actionCount } = useTasklistBadge();

  const visibleNavItems: NavItem[] = (() => {
    if (role === 'SUPER_ADMIN') return navItems;

    let filteredItems = navItems.filter((item) => {
      // Dashboard - accessible to all roles
      if (item.name === 'Dashboard') return true;

      // Tasklist - accessible to all roles
      if (item.name === 'Task') return true;

      // Gantt Chart - accessible to all roles
      if (item.name === 'Gantt Chart') return true;

      // Kalender - accessible to all roles
      if (item.name === 'Kalender') return true;

      // Master - accessible to PM (SUPER_ADMIN handled above)
      if (item.name === 'Master') {
        return role === 'PM';
      }

      // Monitoring - accessible to all (public)
      if (item.name === 'Monitoring') return true;

      // Sistem Monitoring - accessible to all (public)
      if (item.name === 'Sistem Monitoring') return true;

      // Monitoring Direksi - accessible to all (public)
      if (item.name === 'Monitoring Direksi') return true;

      // KPI Programmer - accessible to all (public)
      if (item.name === 'KPI Programmer') return true;

      // Monitoring KPI - accessible to all (public)
      if (item.name === 'Monitoring KPI') return true;

      // Blueprint, UAT, EUT, Go-Live - only accessible to PM, ADMIN (SUPER_ADMIN handled above)
      if (['Blueprint', 'Berita Acara', 'UAT', 'EUT', 'Go-Live'].includes(item.name)) {
        return role === 'PM' || role === 'ADMIN';
      }

      // Laporan - accessible to PM, ADMIN, and PROGRAMMER
      if (item.name === 'Laporan') {
        return role === 'PM' || role === 'ADMIN' || role === 'PROGRAMMER';
      }

      // RBAC Management - check specific permission
      if (item.name === 'RBAC Management') return canManageRBAC;

      // GitHub - accessible to PM and PROGRAMMER (SUPER_ADMIN already handled above)
      if (item.name === 'GitHub') return role === 'PM' || role === 'PROGRAMMER';

      return false;
    });

    // Filter Master subItems based on permissions
    filteredItems = filteredItems.map((item) => {
      if (item.name === 'Master' && item.subItems) {
        const filteredSubItems = item.subItems.filter((subItem) => {
          if (subItem.name === 'Pegawai') return canViewUsers;
          if (subItem.name === 'Proyek') return canViewProjects || role === 'PM'; // PM always has access to Proyek
          if (subItem.name === 'Team') return true; // Team is available to all users who can access Master menu
          if (subItem.name === 'SLA') return true; // SLA is available to all users who can access Master menu
          if (subItem.name === 'Task Complexity') return true; // Task Complexity is available to all users who can access Master menu
          if (subItem.name === 'Master GitHub') return true; // Master GitHub is available to all users who can access Master menu
          if (subItem.name === 'Master Break Time') return true; // Master Break Time is available to all users who can access Master menu
          return false;
        });

        // Only show Master if there are visible subitems
        if (filteredSubItems.length === 0) return null;

        return { ...item, subItems: filteredSubItems };
      }

      // Handle Task menu - for PROGRAMMER, convert to direct link to Tasklist
      if (item.name === 'Task') {
        if (role === 'PROGRAMMER') {
          // Convert to direct link for PROGRAMMER
          return {
            ...item,
            path: '/tasklist',
            subItems: undefined // Remove dropdown
          };
        } else {
          // For PM/ADMIN/SUPER_ADMIN, keep dropdown with both Backlog and Tasklist
          return item;
        }
      }

      return item;
    }).filter(Boolean) as NavItem[];

    return filteredItems;
  })();

  const handleNavigateClick = useCallback(() => {
    if (isMobileOpen) toggleMobileSidebar();
  }, [isMobileOpen, toggleMobileSidebar]);

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-1.5">
      {navItems.map((nav, index) => (
        <li key={nav.name} className="relative">
          {nav.subItems ? (
            <>
              <button
                data-submenu={`${menuType}-${index}`}
                onClick={() => isExpanded || isMobileOpen ? handleSubmenuToggle(index, menuType) : null}
                onMouseEnter={() => {
                  if (!isExpanded && !isMobileOpen) {
                    if (closeTimeoutRef.current) {
                      clearTimeout(closeTimeoutRef.current);
                      closeTimeoutRef.current = null;
                    }
                    setHoveredSubmenu({ type: menuType, index });
                  }
                }}
                onMouseLeave={() => {
                  if (!isExpanded && !isMobileOpen) {
                    closeTimeoutRef.current = setTimeout(() => {
                      setHoveredSubmenu(null);
                    }, 150);
                  }
                }}
                className={`menu-item group min-w-0 w-full ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
                  } cursor-pointer justify-start`}
                style={{
                  paddingLeft: !isExpanded && !isMobileOpen ? '8px' : undefined,
                  paddingRight: !isExpanded && !isMobileOpen ? '8px' : undefined,
                }}
              >
                <span
                  className={`flex items-center justify-center flex-shrink-0 w-6 h-6 ${openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isMobileOpen) && (
                  <>
                    <span className={`menu-item-text truncate flex-1 text-left`}>{nav.name}</span>
                    {/* Badge on parent Task menu when submenu contains /tasklist */}
                    {nav.subItems?.some(s => s.path === '/tasklist') && actionCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none flex-shrink-0 mr-1">
                        {actionCount > 99 ? '99+' : actionCount}
                      </span>
                    )}
                    <span
                      className={`w-5 h-5 flex-shrink-0 ${openSubmenu?.type === menuType &&
                          openSubmenu?.index === index
                          ? "text-brand-500"
                          : ""
                        }`}
                      style={{
                        transform: (openSubmenu?.type === menuType && openSubmenu?.index === index) ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        willChange: 'transform',
                      }}
                    >
                      <ChevronDownIcon />
                    </span>
                  </>
                )}
                {/* Badge on icon when sidebar is collapsed */}
                {!isExpanded && !isMobileOpen && nav.subItems?.some(s => s.path === '/tasklist') && actionCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                    {actionCount > 99 ? '99+' : actionCount}
                  </span>
                )}
              </button>

              {/* Tooltip dropdown for minimized sidebar */}
              {!isExpanded && !isMobileOpen && hoveredSubmenu?.type === menuType && hoveredSubmenu?.index === index && (
                <div
                  className="fixed left-[70px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl py-3 px-4 min-w-[200px] z-[9999]"
                  style={{
                    top: `${(document.querySelector(`[data-submenu="${menuType}-${index}"]`) as HTMLElement)?.getBoundingClientRect().top}px`,
                    pointerEvents: 'auto',
                  }}
                  onMouseEnter={() => {
                    if (closeTimeoutRef.current) {
                      clearTimeout(closeTimeoutRef.current);
                      closeTimeoutRef.current = null;
                    }
                    setHoveredSubmenu({ type: menuType, index });
                  }}
                  onMouseLeave={() => {
                    closeTimeoutRef.current = setTimeout(() => {
                      setHoveredSubmenu(null);
                    }, 150);
                  }}
                >
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                    {nav.name}
                  </div>
                  <ul className="space-y-1">
                    {nav.subItems.map((subItem) => (
                      <li key={subItem.name}>
                        <Link
                          href={subItem.path}
                          className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${isActive(subItem.path)
                              ? "bg-brand-50 text-brand-600 dark:bg-brand-500/[0.15] dark:text-brand-400 font-medium"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white"
                            }`}
                          onClick={handleNavigateClick}
                        >
                          <span>{subItem.name}</span>
                          {subItem.path === '/tasklist' && actionCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                              {actionCount > 99 ? '99+' : actionCount}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            nav.path && (
              <>
                <Link
                  data-menu={`${menuType}-${index}`}
                  href={nav.path}
                  className={`menu-item group min-w-0 ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                    } justify-start`}
                  style={{
                    paddingLeft: !isExpanded && !isMobileOpen ? '8px' : undefined,
                    paddingRight: !isExpanded && !isMobileOpen ? '8px' : undefined,
                  }}
                  onClick={handleNavigateClick}
                  onMouseEnter={() => {
                    if (!isExpanded && !isMobileOpen) {
                      setHoveredMenu({ type: menuType, index });
                    }
                  }}
                  onMouseLeave={() => {
                    if (!isExpanded && !isMobileOpen) {
                      setHoveredMenu(null);
                    }
                  }}
                >
                  <span
                    className={`flex items-center justify-center flex-shrink-0 w-6 h-6 ${isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                      }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isMobileOpen) && (
                    <>
                      <span className={`menu-item-text truncate flex-1 text-left`}>{nav.name}</span>
                      {nav.path === '/tasklist' && actionCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none flex-shrink-0">
                          {actionCount > 99 ? '99+' : actionCount}
                        </span>
                      )}
                    </>
                  )}
                  {/* Badge on icon when sidebar is collapsed */}
                  {!isExpanded && !isMobileOpen && nav.path === '/tasklist' && actionCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                      {actionCount > 99 ? '99+' : actionCount}
                    </span>
                  )}
                </Link>

                {/* Tooltip for single menu items */}
                {!isExpanded && !isMobileOpen && hoveredMenu?.type === menuType && hoveredMenu?.index === index && (
                  <div
                    className="fixed left-[70px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl py-2 px-3 z-[9999] whitespace-nowrap"
                    style={{
                      top: `${(document.querySelector(`[data-menu="${menuType}-${index}"]`) as HTMLElement)?.getBoundingClientRect().top}px`,
                      pointerEvents: 'none',
                    }}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {nav.name}
                    </div>
                  </div>
                )}
              </>
            )
          )}
          {nav.subItems && (isExpanded || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden"
              style={{
                transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'height',
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-1 space-y-0.5 ml-8 py-1">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                        ? "menu-dropdown-item-active"
                        : "menu-dropdown-item-inactive"
                        }`}
                      onClick={handleNavigateClick}
                    >
                      <span className="flex-1">{subItem.name}</span>
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.path === '/tasklist' && actionCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                            {actionCount > 99 ? '99+' : actionCount}
                          </span>
                        )}
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => path === pathname;
  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed flex flex-col px-4 left-0 bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 z-50 border-r border-slate-200 dark:border-slate-800 
        ${isExpanded || isMobileOpen ? "w-[240px]" : "w-[70px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:top-0 lg:h-screen`}
      style={{
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'width, transform',
        top: '64px',
        height: 'calc(100vh - 64px)',
      }}
    >
      {/* Logo and branding removed */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden duration-300 ease-linear pb-4 no-scrollbar" style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}>
        <nav className="mt-4 flex-1">
          <div className="flex flex-col gap-4">
            <div>
              {renderMenuItems(visibleNavItems, "main")}
            </div>

            {othersItems.length > 0 && (
              <div className="">
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded ? "lg:justify-center" : "justify-start"}`}
                >
                  {isExpanded || isMobileOpen ? "Others" : <HorizontaLDots />}
                </h2>
                {renderMenuItems(othersItems, "others")}
              </div>
            )}
          </div>
        </nav>
        {/* Sidebar widget removed as requested */}
      </div>
    </aside>
  );
};

export default AppSidebar;
