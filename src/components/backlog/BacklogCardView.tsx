import React from 'react';
import ModuleDisplay from "./ModuleDisplay";
import { getTextPreview } from "@/lib/htmlUtils";

type BacklogNote = {
  id: number;
  title: string;
  note: string;
  projectId: number | null;
  moduleId: number | null;
  assignedTo: number | null;
  tasklistId: number | null;
  estimatedManHour: number | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type Proyek = { id: number; namaProyek: string };

interface BacklogCardViewProps {
  notes: BacklogNote[];
  projects: Proyek[];
  moduleLabelCache: Record<number, string>;
  loading: boolean;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const BacklogCardView: React.FC<BacklogCardViewProps> = ({
  notes,
  projects,
  moduleLabelCache,
  loading,
  onView,
  onEdit,
  onDelete,
}) => {
  const getPriorityInfo = (updatedAt: string) => {
    const daysDiff = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 7) return { 
      color: 'border-l-red-400 bg-red-50/50 dark:bg-red-900/10', 
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      text: 'Urgent'
    };
    if (daysDiff > 3) return { 
      color: 'border-l-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10', 
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      text: 'Medium'
    };
    return { 
      color: 'border-l-green-400 bg-green-50/50 dark:bg-green-900/10', 
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      text: 'Recent'
    };
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Baru saja';
    if (diffInHours < 24) return `${diffInHours} jam lalu`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Kemarin';
    if (diffInDays < 7) return `${diffInDays} hari lalu`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks === 1) return '1 minggu lalu';
    if (diffInWeeks < 4) return `${diffInWeeks} minggu lalu`;
    
    return date.toLocaleDateString('id-ID');
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Belum ada catatan backlog</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          Mulai dengan menambahkan catatan pertama Anda untuk melacak ide dan tugas yang perlu dikerjakan.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {notes.map((note) => {
        const project = projects.find(p => p.id === note.projectId);

        const priorityInfo = getPriorityInfo(note.updatedAt);
        
        return (
          <div
            key={note.id}
            className={`group relative rounded-xl border-l-4 border-r border-t border-b border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer dark:border-white/[0.05] dark:bg-white/[0.03] hover:scale-[1.02] ${priorityInfo.color}`}
            onClick={() => onView(note.id)}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 text-sm leading-5">
                    {note.title || 'Tanpa judul'}
                  </h3>
                </div>
                <div className="ml-3 flex-shrink-0">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.badge}`}>
                    {priorityInfo.text}
                  </span>
                </div>
              </div>

              {/* Project & Module Info */}
              <div className="mb-4 space-y-1">
                <div className="flex items-center text-sm">
                  <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
                    {project?.namaProyek || 'Tidak ada proyek'}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <ModuleDisplay 
                    moduleId={note.moduleId}
                    moduleLabelCache={moduleLabelCache}
                    className="text-gray-600 dark:text-gray-400 text-xs truncate"
                  />
                </div>
                {note.estimatedManHour && (
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {note.estimatedManHour}h
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-4 leading-relaxed">
                  {getTextPreview(note.note, 150)}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/[0.05]">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {getRelativeTime(note.updatedAt)}
                  </div>
                  {note.assignedTo && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Assigned
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    onClick={(e) => { e.stopPropagation(); onView(note.id); }}
                    title="Lihat detail"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    onClick={(e) => { e.stopPropagation(); onEdit(note.id); }}
                    title="Edit catatan"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                    title="Hapus catatan"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BacklogCardView;