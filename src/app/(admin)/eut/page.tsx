'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Select2Field from '@/components/form/Select2Field';
import Badge from '@/components/ui/badge/Badge';

// Types
type TestStatus = 'Pending' | 'Approved';

interface ModulNode {
  id: number;
  nama: string;
  children?: ModulNode[];
  isLeaf?: boolean;
  kode?: string | null;
}

interface FlatRow {
  id: number;
  nama: string;
  depth: number;
  isLeaf: boolean;
  children?: ModulNode[];
}

interface TestItem {
  id: number;
  namaFitur: string;
  kode: string;
  projectId: number;
  moduleId: number;
  testerId: number;
  testerName: string;
  tanggalTest: string;
  status: TestStatus;
  deskripsi?: string;
  approvedBy?: string;
  approvedDate?: string;
}

interface Proyek {
  id: number;
  kodeProyek: string;
  namaProyek: string;
}

// We'll fetch real data from APIs instead of using mock data
function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function EUTDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Proyek[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<TestStatus | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [modulesTree, setModulesTree] = useState<ModulNode[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [testItems, setTestItems] = useState<TestItem[]>([]);
  const [detailsOpen, setDetailsOpen] = useState<Set<number>>(new Set());
  const [uatApprovedModules, setUatApprovedModules] = useState<Set<number>>(new Set());

  // Load projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/proyek?activeOnly=true');
        const data = await response.json();
        if (data.items) {
          setProjects(data.items);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    fetchProjects();
  }, []);

  // Load modules tree when project changes
  useEffect(() => {
    setModulesTree([]);
    setExpanded(new Set());
    setTestItems([]);
    
    if (!selectedProjectId) return;
    
    const fetchModulesAndTests = async () => {
      try {
        // Fetch UAT test items to determine which modules are 100% approved
        const uatResponse = await fetch(`/api/uat?projectId=${selectedProjectId}`);
        const uatData = await uatResponse.json();
        
        // Calculate modules with 100% UAT approval
        const approvedModules = new Set<number>();
        if (uatData.success && uatData.data) {
          const moduleStats = new Map<number, { total: number; approved: number }>();
          
          uatData.data.forEach((item: any) => {
            const stats = moduleStats.get(item.moduleId) || { total: 0, approved: 0 };
            stats.total++;
            if (item.status === 'Approved') stats.approved++;
            moduleStats.set(item.moduleId, stats);
          });
          
          // Only include modules with 100% approval
          moduleStats.forEach((stats, moduleId) => {
            if (stats.total > 0 && stats.approved === stats.total) {
              approvedModules.add(moduleId);
              console.log(`Module ${moduleId} is 100% UAT approved (${stats.approved}/${stats.total})`);
            } else if (stats.total > 0) {
              console.log(`Module ${moduleId} is NOT 100% UAT approved (${stats.approved}/${stats.total})`);
            }
          });
        }
        console.log('Total modules with 100% UAT approval:', approvedModules.size);
        setUatApprovedModules(approvedModules);

        // Fetch modules tree
        const modulesResponse = await fetch(`/api/proyek-modules/${selectedProjectId}/tree`);
        const modulesData = await modulesResponse.json();
        if (modulesData.tree) {
          // Filter tree to only show modules with 100% UAT approval
          const filterTree = (nodes: ModulNode[]): ModulNode[] => {
            const result: ModulNode[] = [];
            
            for (const node of nodes) {
              if (node.isLeaf) {
                // Leaf node: only include if it has 100% UAT approval
                if (approvedModules.has(node.id)) {
                  result.push({ ...node });
                }
              } else {
                // Parent node: recursively filter children
                const filteredChildren = node.children ? filterTree(node.children) : [];
                // Include parent if it has any approved children OR if the parent itself has 100% UAT approval
                if (filteredChildren.length > 0 || approvedModules.has(node.id)) {
                  result.push({
                    ...node,
                    children: filteredChildren
                  });
                }
              }
            }
            
            return result;
          };
          
          setModulesTree(filterTree(modulesData.tree));
        }

        // Fetch EUT test items
        const testsResponse = await fetch(`/api/eut?projectId=${selectedProjectId}`);
        const testsData = await testsResponse.json();
        if (testsData.success) {
          setTestItems(testsData.data);
        }
        
        // Auto-create EUT items for modules with 100% UAT approval but no EUT items
        if (uatData.success && uatData.data && approvedModules.size > 0) {
          const eutItemsByModule = new Map<number, number>();
          if (testsData.success && testsData.data) {
            testsData.data.forEach((item: any) => {
              eutItemsByModule.set(item.moduleId, (eutItemsByModule.get(item.moduleId) || 0) + 1);
            });
          }
          
          // For each approved module without EUT items, create them from UAT items
          for (const moduleId of approvedModules) {
            if (!eutItemsByModule.has(moduleId)) {
              console.log(`Auto-creating EUT items for module ${moduleId}`);
              
              // Get UAT items for this module
              const uatItemsForModule = uatData.data.filter((item: any) => item.moduleId === moduleId);
              
              // Create EUT items from UAT items
              for (const uatItem of uatItemsForModule) {
                try {
                  await fetch('/api/eut', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      namaFitur: uatItem.namaFitur,
                      kode: uatItem.kode,
                      projectId: uatItem.projectId,
                      moduleId: uatItem.moduleId,
                      testerId: uatItem.testerId,
                      tanggalTest: new Date().toISOString(),
                      deskripsi: `Auto-created from UAT item: ${uatItem.kode}`
                    })
                  });
                } catch (error) {
                  console.error(`Failed to create EUT item for ${uatItem.kode}:`, error);
                }
              }
            }
          }
          
          // Refresh EUT items after auto-creation
          const refreshResponse = await fetch(`/api/eut?projectId=${selectedProjectId}`);
          const refreshData = await refreshResponse.json();
          if (refreshData.success) {
            setTestItems(refreshData.data);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchModulesAndTests();
  }, [selectedProjectId]);

  // Statistics
  const stats = useMemo(() => {
    const total = testItems.length;
    const pending = testItems.filter((item) => item.status === 'Pending').length;
    const approved = testItems.filter((item) => item.status === 'Approved').length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    
    return { total, pending, approved, approvalRate };
  }, [testItems]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDetails = (id: number) => {
    setDetailsOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Flatten tree into rows with depth for rendering
  const flattenTree = (nodes: ModulNode[], depth = 0): FlatRow[] => {
    const rows: FlatRow[] = [];
    for (const n of nodes) {
      const kids = Array.isArray(n.children) ? n.children : [];
      const isLeaf = kids.length === 0 || !!n.isLeaf;
      rows.push({ id: n.id, nama: n.nama, depth, isLeaf, children: kids });
      if (!isLeaf && expanded.has(n.id)) {
        rows.push(...flattenTree(kids, depth + 1));
      }
    }
    return rows;
  };

  const flatRows = useMemo(() => flattenTree(modulesTree, 0), [modulesTree, expanded]);

  // Map test items by moduleId
  const testByModule = useMemo(() => {
    const m = new Map<number, TestItem[]>();
    for (const item of testItems) {
      if (selectedStatus !== 'All' && item.status !== selectedStatus) continue;
      const arr = m.get(item.moduleId) || [];
      arr.push(item);
      m.set(item.moduleId, arr);
    }
    return m;
  }, [testItems, selectedStatus]);

  // Aggregate counts per module
  const testTotalCountMap = useMemo(() => {
    const direct = new Map<number, number>();
    for (const [mid, arr] of testByModule.entries()) direct.set(mid, arr.length);
    const countMap = new Map<number, number>();
    const walk = (node: ModulNode): number => {
      const kids = Array.isArray(node.children) ? node.children : [];
      let sum = direct.get(node.id) || 0;
      for (const c of kids) sum += walk(c);
      countMap.set(node.id, sum);
      return sum;
    };
    for (const root of modulesTree) walk(root);
    return countMap;
  }, [modulesTree, testByModule]);

  // Calculate approval percentage per module (including children)
  const moduleApprovalPercentage = useMemo(() => {
    const percentageMap = new Map<number, number>();
    
    // First, calculate direct percentages
    const directApproved = new Map<number, number>();
    const directTotal = new Map<number, number>();
    
    for (const item of testItems) {
      const mid = item.moduleId;
      directTotal.set(mid, (directTotal.get(mid) || 0) + 1);
      if (item.status === 'Approved') {
        directApproved.set(mid, (directApproved.get(mid) || 0) + 1);
      }
    }
    
    // Aggregate including children
    const walk = (node: ModulNode): { total: number; approved: number } => {
      const kids = Array.isArray(node.children) ? node.children : [];
      let total = directTotal.get(node.id) || 0;
      let approved = directApproved.get(node.id) || 0;
      
      for (const c of kids) {
        const childStats = walk(c);
        total += childStats.total;
        approved += childStats.approved;
      }
      
      const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;
      percentageMap.set(node.id, percentage);
      
      return { total, approved };
    };
    
    for (const root of modulesTree) walk(root);
    return percentageMap;
  }, [modulesTree, testItems]);

  const getStatusBadge = (status: TestStatus) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="light" color="warning" size="sm">Pending</Badge>;
      case 'Approved':
        return <Badge variant="light" color="success" size="sm">Approved</Badge>;
    }
  };

  const handleItemClick = (moduleId: number) => {
    router.push(`/eut/module/${moduleId}`);
  };

  const handleModuleClick = (moduleId: number) => {
    router.push(`/eut/module/${moduleId}`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          End User Test (EUT)
        </h1>
      </div>

      {/* Statistics Cards */}
      {selectedProjectId && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Total Items
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Pending
                </p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {stats.pending}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Approved
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.approved}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Approval Rate
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {stats.approvalRate}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1 min-w-[240px] w-[300px]">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Proyek <span className="text-red-500">*</span>
          </label>
          <Select2Field
            value={selectedProjectId === '' ? '' : selectedProjectId}
            onChange={(v) => setSelectedProjectId(v === '' ? '' : Number(v))}
            options={[{ id: '', text: 'Pilih proyek...' }, ...projects.map(p => ({ id: p.id, text: `${p.kodeProyek} - ${p.namaProyek}` }))]}
            placeholder="Pilih proyek"
            className="rounded-md"
          />
        </div>

        <div className="flex flex-col gap-1 min-w-[160px] w-[180px]">
          <label className="text-sm text-gray-600 dark:text-gray-400">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as TestStatus | 'All')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">Semua Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
          </select>
        </div>
      </div>

      {/* Tree View Content */}
      <div className="overflow-hidden rounded-md border border-gray-200 dark:border-white/[0.06]">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-white/[0.02]">
            <tr>
              <th className="px-4 py-2 text-left w-[60%] text-gray-800 dark:text-gray-200">
                Modul Proyek {selectedProject ? `- ${selectedProject.kodeProyek}` : ''}
              </th>
              <th className="px-4 py-2 text-left w-[15%] text-gray-800 dark:text-gray-200">
                Test Items
              </th>
              <th className="px-4 py-2 text-left text-gray-800 dark:text-gray-200">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {!selectedProjectId && (
              <tr>
                <td className="px-4 py-4 text-gray-500 dark:text-gray-400" colSpan={3}>
                  Pilih proyek terlebih dahulu untuk melihat daftar EUT.
                </td>
              </tr>
            )}
            {selectedProjectId && modulesTree.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-gray-500 dark:text-gray-400" colSpan={3}>
                  Tidak ada modul untuk proyek ini.
                </td>
              </tr>
            )}
            {selectedProjectId && modulesTree.length > 0 && (
              <>
                {flatRows.map((row) => {
                  const isOpenParent = !!(row.children && row.children.length > 0);
                  const list = testByModule.get(row.id) || [];
                  const leaf = row.isLeaf;
                  const listLen = list.length;
                  const canToggle = isOpenParent || (leaf && listLen > 0);
                  const isOpen = isOpenParent ? expanded.has(row.id) : detailsOpen.has(row.id);
                  const onClick = () => {
                    if (isOpenParent) return toggleExpand(row.id);
                    if (leaf && listLen > 0) return toggleDetails(row.id);
                  };
                  const totalCount = testTotalCountMap.get(row.id) ?? 0;
                  const approvalPercentage = moduleApprovalPercentage.get(row.id) ?? 0;
                  
                  return (
                    <React.Fragment key={row.id}>
                      <tr 
                        className={`${leaf && totalCount > 0 ? 'hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer' : ''}`}
                        onClick={leaf && totalCount > 0 ? () => handleModuleClick(row.id) : undefined}
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              className={`w-5 text-center select-none text-gray-700 dark:text-gray-200 ${canToggle ? '' : 'text-gray-400 dark:text-gray-500'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canToggle) onClick();
                              }}
                              title={canToggle ? (isOpen ? 'Tutup' : 'Buka') : ''}
                            >
                              {canToggle ? (isOpen ? '▾' : '▸') : '•'}
                            </button>
                            <span style={{ paddingLeft: `${row.depth * 16}px` }} className="truncate text-gray-800 dark:text-gray-200">
                              {row.nama}
                            </span>
                            {leaf && totalCount > 0 && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                (Click to test module)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 align-middle text-gray-700 dark:text-gray-300">
                          {totalCount}
                        </td>
                        <td className="px-4 py-2 align-middle">
                          {totalCount > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-full max-w-[120px] bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all ${
                                    approvalPercentage === 100 ? 'bg-green-500' :
                                    approvalPercentage >= 75 ? 'bg-blue-500' :
                                    approvalPercentage >= 50 ? 'bg-yellow-500' :
                                    approvalPercentage >= 25 ? 'bg-orange-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${approvalPercentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[45px]">
                                {approvalPercentage}%
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                      {/* Show test items when expanded */}
                      {row.isLeaf && detailsOpen.has(row.id) && (
                        <tr>
                          <td colSpan={3} className="px-8 py-2 bg-gray-50 dark:bg-white/[0.02]">
                            {list.length === 0 ? (
                              <div className="text-gray-500 dark:text-gray-400">
                                Tidak ada test item
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {list.map((item) => (
                                  <div 
                                    key={item.id} 
                                    onClick={() => handleItemClick(item.moduleId)}
                                    className="flex items-center justify-between gap-3 rounded bg-white dark:bg-white/[0.04] px-3 py-2 border border-gray-100 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-center gap-3 text-gray-800 dark:text-gray-200 flex-1">
                                      <span className="font-medium">{item.kode}</span>
                                      <span className="flex-1">{item.namaFitur}</span>
                                      <span className="text-gray-600 dark:text-gray-400 text-xs">{item.testerName}</span>
                                      <span className="text-gray-600 dark:text-gray-400 text-xs">{formatDateTime(item.tanggalTest)}</span>
                                      {getStatusBadge(item.status)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                      {/* Show items for non-leaf when expanded */}
                      {!row.isLeaf && isOpen && listLen > 0 && (
                        <tr>
                          <td colSpan={3} className="px-8 py-2 bg-gray-50 dark:bg-white/[0.02]">
                            <div className="flex flex-col gap-1">
                              {list.map((item) => (
                                <div 
                                  key={item.id}
                                  onClick={() => handleItemClick(item.moduleId)}
                                  className="flex items-center justify-between gap-3 rounded bg-white dark:bg-white/[0.04] px-3 py-2 border border-gray-100 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center gap-3 text-gray-800 dark:text-gray-200 flex-1">
                                    <span className="font-medium">{item.kode}</span>
                                    <span className="flex-1">{item.namaFitur}</span>
                                    <span className="text-gray-600 dark:text-gray-400 text-xs">{item.testerName}</span>
                                    <span className="text-gray-600 dark:text-gray-400 text-xs">{formatDateTime(item.tanggalTest)}</span>
                                    {getStatusBadge(item.status)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
