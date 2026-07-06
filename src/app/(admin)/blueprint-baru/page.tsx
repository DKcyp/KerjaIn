"use client";

import React, { useEffect, useState } from "react";
import Select2Field from "@/components/form/Select2Field";
import { useRouter } from "next/navigation";

type Project = {
  id: number;
  namaProyek: string;
  client: string | null;
  kodeProyek: string;
  blueprintCount: number;
  latestBlueprintDate: string | null;
};

export default function BlueprintBaruPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [filterProjectId, setFilterProjectId] = useState<number | "">("");

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/blueprint-baru", { credentials: "include" });
      const result = await response.json();
      
      if (result.success) {
        setProjects(result.data);
        setFilteredProjects(result.data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...projects];

    if (filterProjectId !== "") {
      filtered = filtered.filter((p) => p.id === filterProjectId);
    }

    setFilteredProjects(filtered);
  }, [filterProjectId, projects]);

  const handleReset = () => {
    setFilterProjectId("");
  };

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Berita Acara
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Kelola berita acara proyek
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filter Nama Proyek */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Nama Proyek
              </label>
              <Select2Field
                value={filterProjectId}
                onChange={(v) => setFilterProjectId(v === "" ? "" : Number(v))}
                options={[
                  { id: "", text: "-- Semua Project --" },
                  ...projects.map((p) => ({ id: p.id, text: p.namaProyek })),
                ]}
                placeholder="-- Semua Project --"
              />
            </div>
          </div>

          {/* Reset Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nama Proyek
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kode Proyek
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tanggal Blueprint Terbaru
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Blueprint
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Tidak ada data proyek
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project) => (
                    <tr
                      key={project.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white cursor-pointer"
                        onClick={() => router.push(`/blueprint-baru/${project.id}`)}
                      >
                        {project.id}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white cursor-pointer"
                        onClick={() => router.push(`/blueprint-baru/${project.id}`)}
                      >
                        {project.namaProyek}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer"
                        onClick={() => router.push(`/blueprint-baru/${project.id}`)}
                      >
                        {project.client || "-"}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white cursor-pointer"
                        onClick={() => router.push(`/blueprint-baru/${project.id}`)}
                      >
                        {project.kodeProyek}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer"
                        onClick={() => router.push(`/blueprint-baru/${project.id}`)}
                      >
                        {project.latestBlueprintDate 
                          ? new Date(project.latestBlueprintDate).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "-"}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm cursor-pointer"
                        onClick={() => router.push(`/blueprint-baru/${project.id}`)}
                      >
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.blueprintCount > 0
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {project.blueprintCount}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with count */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Menampilkan {filteredProjects.length} dari {projects.length} proyek
          </p>
        </div>
      </div>
    </div>
  );
}
