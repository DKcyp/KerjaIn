import React from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
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

interface BacklogTableViewProps {
  notes: BacklogNote[];
  projects: Proyek[];
  moduleLabelCache: Record<number, string>;
  loading: boolean;
  page: number;
  pageSize: number;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const BacklogTableView: React.FC<BacklogTableViewProps> = ({
  notes,
  projects,
  moduleLabelCache,
  loading,
  page,
  pageSize,
  onView,
  onEdit,
  onDelete,
}) => {
  const getPriorityColor = (updatedAt: string) => {
    const daysDiff = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 7) return 'bg-red-50 border-l-4 border-l-red-400 dark:bg-red-900/10';
    if (daysDiff > 3) return 'bg-yellow-50 border-l-4 border-l-yellow-400 dark:bg-yellow-900/10';
    return 'bg-green-50 border-l-4 border-l-green-400 dark:bg-green-900/10';
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[900px] lg:min-w-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="font-semibold w-[60px] bg-gray-50 dark:bg-white/[0.02] py-3 px-4 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  #
                </TableCell>
                <TableCell className="font-semibold bg-gray-50 dark:bg-white/[0.02] py-3 px-4 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 min-w-[200px]">
                  Judul & Catatan
                </TableCell>
                <TableCell className="font-semibold bg-gray-50 dark:bg-white/[0.02] py-3 px-4 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 min-w-[180px]">
                  Proyek & Modul
                </TableCell>
                <TableCell className="font-semibold bg-gray-50 dark:bg-white/[0.02] py-3 px-4 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 w-[100px]">
                  Man Hour
                </TableCell>
                <TableCell className="font-semibold bg-gray-50 dark:bg-white/[0.02] py-3 px-4 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 w-[120px]">
                  Status
                </TableCell>
                <TableCell className="font-semibold bg-gray-50 dark:bg-white/[0.02] py-3 px-4 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 w-[140px]">
                  Diperbarui
                </TableCell>
                <TableCell className="font-semibold text-right bg-gray-50 dark:bg-white/[0.02] py-3 px-4 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 w-[120px]">
                  Aksi
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
                      <span className="text-gray-500">Memuat data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              
              {!loading && notes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="text-gray-500">
                        <p className="font-medium">Belum ada catatan backlog</p>
                        <p className="text-sm">Mulai dengan menambahkan catatan pertama Anda</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              
              {notes.map((note, i) => {
                const project = projects.find(p => p.id === note.projectId);

                const daysSinceUpdate = Math.floor((Date.now() - new Date(note.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <TableRow
                    key={note.id}
                    className={`group hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors ${getPriorityColor(note.updatedAt)}`}
                    onClick={() => onView(note.id)}
                  >
                    <TableCell className="py-4 px-4 text-sm font-medium text-gray-500">
                      {(page - 1) * pageSize + i + 1}
                    </TableCell>
                    
                    <TableCell className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                          {note.title || 'Tanpa judul'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                          {getTextPreview(note.note, 100)}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {project?.namaProyek || '-'}
                        </div>
                        <ModuleDisplay 
                          moduleId={note.moduleId}
                          moduleLabelCache={moduleLabelCache}
                          className="text-xs text-gray-500 dark:text-gray-400 truncate block"
                        />
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4 px-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {note.estimatedManHour ? `${note.estimatedManHour}h` : '-'}
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            daysSinceUpdate > 7 ? 'bg-red-400' : 
                            daysSinceUpdate > 3 ? 'bg-yellow-400' : 'bg-green-400'
                          }`}></div>
                          <span className="text-xs text-gray-500">
                            {daysSinceUpdate === 0 ? 'Hari ini' : 
                             daysSinceUpdate === 1 ? '1 hari lalu' : 
                             `${daysSinceUpdate} hari lalu`}
                          </span>
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
                    </TableCell>
                    
                    <TableCell className="py-4 px-4 text-sm text-gray-500">
                      <div className="space-y-1">
                        <div>{new Date(note.updatedAt).toLocaleDateString('id-ID')}</div>
                        <div className="text-xs">{new Date(note.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4 px-4">
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          onClick={(e) => { e.stopPropagation(); onView(note.id); }}
                          title="Lihat detail"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                          onClick={(e) => { e.stopPropagation(); onEdit(note.id); }}
                          title="Edit catatan"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                          title="Hapus catatan"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default BacklogTableView;