'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Types
type ProjectStatus = 'READY' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';

interface Proyek {
  id: number;
  kodeProyek: string;
  namaProyek: string;
  client?: string;
  pic?: string;
}

interface GoLiveProject {
  id: number;
  projectId: number;
  kodeProyek: string;
  projectName: string;
  status: ProjectStatus;
  eutCompletionRate: number;
  totalEutItems: number;
  approvedEutItems: number;
  client?: string;
  pic?: string;
  hasGoLiveRecord?: boolean;
  completedChecklists?: number;
  totalChecklists?: number;
  checklistCompletionRate?: number;
}

export default function GoLiveListPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<GoLiveProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'ALL'>('ALL');

  // Load go-live projects from database
  useEffect(() => {
    const fetchGoLiveProjects = async () => {
      try {
        setLoading(true);
        
        // Fetch all projects
        const projectsResponse = await fetch('/api/proyek?activeOnly=true');
        const projectsData = await projectsResponse.json();
        
        if (!projectsData.items) {
          setProjects([]);
          setLoading(false);
          return;
        }
        
        // Fetch EUT data for all projects
        const projectsWithEut = await Promise.all(
          projectsData.items.map(async (project: Proyek) => {
            try {
              const eutResponse = await fetch(`/api/eut?projectId=${project.id}`);
              const eutData = await eutResponse.json();
              
              if (eutData.success && eutData.data) {
                const totalEut = eutData.data.length;
                const approvedEut = eutData.data.filter((item: any) => item.status === 'Approved').length;
                const completionRate = totalEut > 0 ? Math.round((approvedEut / totalEut) * 100) : 0;
                
                // Only include projects with 100% EUT completion
                if (completionRate === 100 && totalEut > 0) {
                  // Check if Go Live record exists
                  const goLiveResponse = await fetch(`/api/go-live?projectId=${project.id}`);
                  const goLiveData = await goLiveResponse.json();
                  
                  let goLiveStatus: ProjectStatus = 'READY';
                  let goLiveId = null;
                  let completedChecklists = 0;
                  let totalChecklists = 0;
                  let checklistCompletionRate = 0;
                  
                  if (goLiveData.success && goLiveData.data && goLiveData.data.length > 0) {
                    goLiveStatus = goLiveData.data[0].status;
                    goLiveId = goLiveData.data[0].id;
                    completedChecklists = goLiveData.data[0].completedChecklists || 0;
                    totalChecklists = goLiveData.data[0].totalChecklists || 0;
                    checklistCompletionRate = totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0;
                  }
                  
                  return {
                    id: goLiveId || project.id,
                    projectId: project.id,
                    kodeProyek: project.kodeProyek,
                    projectName: project.namaProyek,
                    status: goLiveStatus,
                    eutCompletionRate: completionRate,
                    totalEutItems: totalEut,
                    approvedEutItems: approvedEut,
                    client: project.client,
                    pic: project.pic,
                    hasGoLiveRecord: !!goLiveId,
                    completedChecklists,
                    totalChecklists,
                    checklistCompletionRate,
                  };
                }
              }
              return null;
            } catch (error) {
              console.error(`Error fetching EUT for project ${project.id}:`, error);
              return null;
            }
          })
        );
        
        // Filter out null values and set projects
        const validProjects = projectsWithEut.filter(p => p !== null) as GoLiveProject[];
        setProjects(validProjects);
        console.log(`Found ${validProjects.length} projects with 100% EUT completion`);
        
      } catch (error) {
        console.error('Error fetching Go-Live projects:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGoLiveProjects();
  }, []);

  const getStatusBadge = (status: ProjectStatus) => {
    const styles = {
      READY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      PLANNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      IN_PROGRESS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      COMPLETED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };

    const labels = {
      READY: 'Ready for Go-Live',
      PLANNED: 'Planned',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const filteredProjects = filterStatus === 'ALL' 
    ? projects 
    : projects.filter(p => p.status === filterStatus);

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleCreateGoLive = async (projectId: number) => {
    try {
      const confirmed = confirm('Create Go-Live record for this project? This will initialize the deployment checklist.');
      if (!confirmed) return;

      const response = await fetch('/api/go-live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          scheduledDate: null,
          notes: 'Go-Live record created - ready for deployment',
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Go-Live record created successfully!');
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating Go-Live:', error);
      alert('Failed to create Go-Live record');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Go-Live Command Center
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Kelola dan monitor proses deployment proyek
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-gray-100">{projects.length}</span> project(s) ready for Go-Live
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-mono">
                      {project.kodeProyek}
                    </span>
                    {getStatusBadge(project.status)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {project.projectName}
                  </h3>
                </div>
              </div>

              {/* Client */}
              {project.client && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>Client: {project.client}</span>
                  </div>
                </div>
              )}

              {/* EUT Completion */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">EUT Completion</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {project.approvedEutItems}/{project.totalEutItems} Items (100%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: '100%' }}></div>
                </div>
              </div>

              {/* Checklist Progress */}
              {project.hasGoLiveRecord && project.totalChecklists && project.totalChecklists > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Checklist Progress</span>
                    <span className={`font-semibold ${
                      project.checklistCompletionRate === 100 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      {project.completedChecklists}/{project.totalChecklists} Items ({project.checklistCompletionRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        project.checklistCompletionRate === 100 
                          ? 'bg-green-600' 
                          : 'bg-orange-600'
                      }`}
                      style={{ width: `${project.checklistCompletionRate}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* PIC */}
              {project.pic && (
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                    {getInitials(project.pic)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PIC</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{project.pic}</p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {project.hasGoLiveRecord ? (
                  <Link
                    href={`/go-live/${project.id}`}
                    className="block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    View Go-Live Details
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCreateGoLive(project.projectId)}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Create Go-Live Record
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Tidak ada proyek siap Go-Live
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Proyek akan muncul di sini setelah menyelesaikan 100% EUT (End User Testing)
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Workflow: Blueprint → Development → UAT → EUT → Go-Live
          </p>
        </div>
      )}

    </div>
  );
}
