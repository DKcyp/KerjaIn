"use client";

import React, { useState, useEffect } from "react";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface CrmDepartmentProjectDropdownProps {
  onDepartmentSelect?: (depId: string, depName: string) => void;
  onProjectSelect?: (projectId: string, projectName: string) => void;
  defaultDepId?: string;
  defaultProjectId?: string;
}

interface Department {
  dep_id: string;
  dep_nama: string;
}

interface Project {
  project_id: string;
  project_nama: string;
}

export default function CrmDepartmentProjectDropdown({
  onDepartmentSelect,
  onProjectSelect,
  defaultDepId,
  defaultProjectId,
}: CrmDepartmentProjectDropdownProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDepId, setSelectedDepId] = useState(defaultDepId || "");
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || "");
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch departments on mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Fetch projects when department changes
  useEffect(() => {
    if (selectedDepId) {
      fetchProjects(selectedDepId);
    } else {
      setProjects([]);
      setSelectedProjectId("");
    }
  }, [selectedDepId]);

  const fetchDepartments = async () => {
    try {
      setLoadingDeps(true);
      setError(null);

      const response = await fetch('/api/external/crm/departments', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to fetch departments');
      }

      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (err: any) {
      console.error('Error fetching departments:', err);
      setError(err.message || 'Gagal memuat departemen');
    } finally {
      setLoadingDeps(false);
    }
  };

  const fetchProjects = async (depId: string) => {
    try {
      setLoadingProjects(true);
      setError(null);

      const response = await fetch('/api/external/crm/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idDep: depId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError(err.message || 'Gagal memuat project');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleDepartmentChange = (depId: string) => {
    setSelectedDepId(depId);
    setSelectedProjectId(""); // Reset project selection
    
    if (depId && onDepartmentSelect) {
      const dept = departments.find(d => d.dep_id === depId);
      if (dept) {
        onDepartmentSelect(depId, dept.dep_nama);
      }
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    
    if (projectId && onProjectSelect) {
      const project = projects.find(p => p.project_id === projectId);
      if (project) {
        onProjectSelect(projectId, project.project_nama);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Department Dropdown */}
      <SearchableSelect
        label="Departemen CRM (Opsional)"
        value={selectedDepId}
        onChange={handleDepartmentChange}
        options={[
          { value: '', label: loadingDeps ? 'Loading...' : 'Pilih Departemen' },
          ...departments.map(dept => ({
            value: dept.dep_id,
            label: dept.dep_nama
          }))
        ]}
        placeholder="Cari departemen..."
        disabled={loadingDeps}
      />

      {/* Project Dropdown */}
      <SearchableSelect
        label="Project CRM (Opsional)"
        value={selectedProjectId}
        onChange={handleProjectChange}
        options={[
          { 
            value: '', 
            label: !selectedDepId ? 'Pilih departemen dulu' : loadingProjects ? 'Loading...' : 'Pilih Project' 
          },
          ...projects.map(project => ({
            value: project.project_id,
            label: project.project_nama
          }))
        ]}
        placeholder="Cari project..."
        disabled={loadingProjects || !selectedDepId}
      />

      {/* Error Message */}
      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
