"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";

// API data types
interface Project {
  id: number;
  projectId: string;
  projectName: string;
  client: string;
  pic: string;
  blueprintStatus: "DRAFT" | "APPROVED" | "REJECTED";
  blueprintId: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    documents: number;
    requirements: number;
  };
}

// Status mapping for display
const STATUS_DISPLAY = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  NO_BLUEPRINT: "No Blueprint"
} as const;

// Status badge component
const StatusBadge: React.FC<{ status: Project["blueprintStatus"] }> = ({ status }) => {
  const statusConfig = {
    DRAFT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[status]}`}>
      {STATUS_DISPLAY[status]}
    </span>
  );
};

export default function BlueprintManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "DRAFT" | "APPROVED" | "REJECTED">("All");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (statusFilter !== 'All') params.append('status', statusFilter!);
        
        const response = await fetch(`/api/blueprint?${params}`);
        const data = await response.json();
        
        if (data.success) {
          setProjects(data.data);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch projects');
        }
      } catch (err) {
        setError('Network error occurred');
        console.error('Error fetching projects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [searchQuery, statusFilter]);

  // Filter and search logic
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.projectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.client.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "All" || project.blueprintStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Manajemen Blueprint Proyek
        </h1>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari proyek berdasarkan ID, nama, atau client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="All">Semua Status</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {loading ? (
          "Loading..."
        ) : error ? (
          <span className="text-red-600 dark:text-red-400">Error: {error}</span>
        ) : (
          `Menampilkan ${filteredProjects.length} dari ${projects.length} proyek`
        )}
      </div>

      {/* Project Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
              <TableRow>
                <TableCell isHeader className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Project ID
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Nama Proyek
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Client
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Blueprint Status
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Loading projects...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={4} className="px-6 py-12 text-center text-red-500 dark:text-red-400">
                    Error: {error}
                  </TableCell>
                </TableRow>
              ) : filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Tidak ada proyek yang ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  >
                    <TableCell className="px-6 py-4">
                      <Link
                        href={`/blueprint/${project.blueprintId}`}
                        className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
                      >
                        {project.projectId}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Link
                        href={`/blueprint/${project.blueprintId}`}
                        className="text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        {project.projectName}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {project.client}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <StatusBadge status={project.blueprintStatus} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
