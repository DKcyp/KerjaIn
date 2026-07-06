"use client";

import React, { useState, useMemo } from "react";
import { TreeView, TreeNode } from "@/components/reports/TreeView";
import { Folder, File, ChevronDown, ChevronRight, BarChart2, Download } from "lucide-react";

// Types
type TabType = "proyek" | "task" | "uat" | "support";

// Dummy data for the tree view
const TREE_DATA: TreeNode[] = [
  {
    id: 1,
    name: "Sistem Informasi Akademik",
    type: "project",
    progress: 75,
    taskCount: 12,
    children: [
      {
        id: 101,
        name: "Authentication Module",
        type: "module",
        progress: 90,
        taskCount: 5,
        children: [
          { 
            id: 1001, 
            name: "Implementasi Login", 
            type: "task", 
            progress: 100,
            data: { status: "Selesai", assignee: "John Doe", dueDate: "2024-09-25" }
          },
          { 
            id: 1002, 
            name: "Reset Password", 
            type: "task", 
            progress: 80,
            data: { status: "On Progress", assignee: "Jane Smith", dueDate: "2024-10-05" }
          },
        ]
      },
      {
        id: 102,
        name: "Academic Module",
        type: "module",
        progress: 60,
        taskCount: 7,
        children: [
          { 
            id: 1003, 
            name: "Manajemen Mata Kuliah", 
            type: "task", 
            progress: 100,
            data: { status: "Selesai", assignee: "Alice Brown", dueDate: "2024-09-20" }
          },
          { 
            id: 1004, 
            name: "Nilai Mahasiswa", 
            type: "task", 
            progress: 20,
            data: { status: "On Progress", assignee: "Bob Johnson", dueDate: "2024-10-15" }
          },
        ]
      },
    ]
  },
  {
    id: 2,
    name: "E-Commerce Platform",
    type: "project",
    progress: 45,
    taskCount: 8,
    children: [
      {
        id: 201,
        name: "Product Module",
        type: "module",
        progress: 30,
        taskCount: 4,
        children: [
          { 
            id: 2001, 
            name: "Product Listing", 
            type: "task", 
            progress: 100,
            data: { status: "Selesai", assignee: "Charlie Wilson", dueDate: "2024-09-15" }
          },
          { 
            id: 2002, 
            name: "Product Details", 
            type: "task", 
            progress: 0,
            data: { status: "Belum Dimulai", assignee: "Diana Lee", dueDate: "2024-10-20" }
          },
        ]
      },
      {
        id: 202,
        name: "Checkout Module",
        type: "module",
        progress: 60,
        taskCount: 4,
        children: [
          { 
            id: 2003, 
            name: "Shopping Cart", 
            type: "task", 
            progress: 60,
            data: { status: "On Progress", assignee: "Eva Green", dueDate: "2024-10-10" }
          },
        ]
      },
    ]
  },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("task");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  // Filter tree data based on search query
  const filteredTreeData = useMemo(() => {
    if (!searchQuery) return TREE_DATA;
    
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map(node => ({ ...node })) // Create a shallow copy
        .filter(node => {
          // Keep if node matches search or has matching children
          const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
          const hasMatchingChildren = node.children && filterNodes(node.children).length > 0;
          return matchesSearch || hasMatchingChildren;
        })
        .map(node => {
          // Filter children recursively
          if (node.children) {
            return {
              ...node,
              children: filterNodes(node.children)
            };
          }
          return node;
        });
    };

    return filterNodes(TREE_DATA);
  }, [searchQuery]);

  // Handle node click
  const handleNodeClick = (node: TreeNode) => {
    if (node.type === 'project') {
      setSelectedProject(selectedProject === node.id ? null : node.id);
    }
    console.log('Node clicked:', node);
  };

  // Render task details for selected node
  const renderTaskDetails = (node: TreeNode) => {
    if (!node.data) return null;
    
    return (
      <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-2">{node.name}</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Status</p>
            <p className="font-medium">{node.data.status}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Ditugaskan Kepada</p>
            <p className="font-medium">{node.data.assignee}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Tenggat Waktu</p>
            <p className="font-medium">{new Date(node.data.dueDate).toLocaleDateString('id-ID')}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Progress</p>
            <div className="flex items-center">
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mr-2">
                <div 
                  className={`h-full ${
                    node.progress! < 30 ? 'bg-red-500' : 
                    node.progress! < 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${node.progress}%` }}
                />
              </div>
              <span className="text-sm">{node.progress}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Laporan</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari proyek atau tugas..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Ekspor
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'proyek' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'}`}
            onClick={() => setActiveTab('proyek')}
          >
            Laporan Proyek
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'task' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'}`}
            onClick={() => setActiveTab('task')}
          >
            Laporan Task
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'uat' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'}`}
            onClick={() => setActiveTab('uat')}
          >
            Laporan UAT/EUT
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'support' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'}`}
            onClick={() => setActiveTab('support')}
          >
            Laporan Support
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        {activeTab === 'task' ? (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Daftar Task</h2>
              <div className="flex space-x-3">
                <select className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <option>Semua Status</option>
                  <option>Selesai</option>
                  <option>On Progress</option>
                  <option>Belum Dimulai</option>
                </select>
                <select className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <option>Urutkan berdasarkan</option>
                  <option>Nama A-Z</option>
                  <option>Deadline Terdekat</option>
                  <option>Progress Terendah</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tree View */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <TreeView 
                    data={filteredTreeData} 
                    onNodeClick={handleNodeClick}
                  />
                </div>
              </div>

              {/* Task Details Panel */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Detail Task</h3>
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <File className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                    <p>Pilih task untuk melihat detail</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <BarChart2 className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p>Halaman Laporan {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} akan segera hadir</p>
          </div>
        )}
      </div>
    </div>
  );
}
