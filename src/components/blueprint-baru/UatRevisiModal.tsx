"use client";

import React, { useState, useEffect } from "react";
import { X, File, FileText, FileSpreadsheet, FileImage, Archive, Download, RotateCcw } from "lucide-react";

type UatRevisiEntry = {
  id: number;
  moduleId: number;
  nama: string;
  revisiKeterangan: string | null;
  revisiFileUrl: string | null;
  revisiAt: string | null;
  revisiBy: number | null;
  programmer: { namaLengkap: string } | null;
  module: {
    id: number;
    nama: string;
    level: number;
    parentId: number | null;
  };
};

type SubModule = {
  id: string;
  nama: string;
  parentId: string;
};

type MainModule = {
  id: string;
  nama: string;
};

type Task = {
  id: string;
  nama: string;
  moduleId: string;
};

type BAWithModules = {
  ba: { id: number; nama: string; version: string };
  mainModules: MainModule[];
  subModules: SubModule[];
  tasks: Task[];
};

type UatRevisiModalProps = {
  isOpen: boolean;
  onClose: () => void;
  baData: BAWithModules;
  projectId: number;
};

function getFileIcon(fileName: string | null) {
  if (!fileName) return 'file';
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) return 'image';
  if (['pdf'].includes(ext || '')) return 'pdf';
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return 'spreadsheet';
  if (['doc', 'docx'].includes(ext || '')) return 'document';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return 'archive';
  return 'file';
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function UatRevisiModal({ isOpen, onClose, baData, projectId }: UatRevisiModalProps) {
  const [entries, setEntries] = useState<Record<string, UatRevisiEntry[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAllEntries();
    }
  }, [isOpen, baData.ba.id]);

  const fetchAllEntries = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/blueprint-baru/${projectId}/uat-revisi?baId=${baData.ba.id}`);
      const result = await res.json();
      if (result.success) {
        const grouped: Record<string, UatRevisiEntry[]> = {};
        result.data.forEach((entry: UatRevisiEntry) => {
          const key = String(entry.module.id);
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(entry);
        });
        setEntries(grouped);
      }
    } catch (error) {
      console.error('Error fetching UAT revisi entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubModulesForMain = (mainId: string) => {
    return baData.subModules.filter(sm => sm.parentId === mainId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <RotateCcw size={20} className="text-orange-500" />
                Riwayat Revisi UAT - {baData.ba.nama}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Riwayat komentar dan file revisi UAT yang dikembalikan ke programmer
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">Memuat riwayat revisi...</div>
            </div>
          ) : baData.mainModules.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Tidak ada modul</p>
          ) : (
            <div className="space-y-6">
              {baData.mainModules.map(main => {
                const subModules = getSubModulesForMain(main.id);

                return (
                  <div key={main.id}>
                    <div className="font-semibold text-gray-900 dark:text-white text-base px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg border border-gray-200 dark:border-gray-700">
                      {main.nama}
                    </div>
                    {subModules.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-400 text-center border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg">
                        Tidak ada sub modul
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sub Module</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Task BA</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Komentar Revisi</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">File</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tanggal</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Oleh</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {(() => {
                              const rows: React.ReactNode[] = [];
                              subModules.forEach(sub => {
                                const moduleId = sub.id;
                                const moduleEntries = entries[moduleId] || [];
                                const taskName = baData.tasks.find(t => t.moduleId === moduleId)?.nama || '-';

                                if (moduleEntries.length === 0) {
                                  rows.push(
                                    <tr key={`empty-${moduleId}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                      <td className="px-3 py-2 text-gray-900 dark:text-white font-medium align-top">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 bg-gray-400 rounded-full shrink-0"></div>
                                          <span>{sub.nama}</span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 align-top">{taskName}</td>
                                      <td className="px-3 py-2 text-gray-400 align-top text-sm italic" colSpan={4}>Belum ada revisi</td>
                                    </tr>
                                  );
                                } else {
                                  moduleEntries.forEach(entry => {
                                    const fileName = entry.revisiFileUrl ? entry.revisiFileUrl.split('/').pop() : null;
                                    rows.push(
                                      <tr key={`entry-${entry.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                        <td className="px-3 py-2 text-gray-900 dark:text-white font-medium align-top">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0"></div>
                                            <span>{sub.nama}</span>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300 align-top">{taskName}</td>
                                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300 align-top text-sm whitespace-pre-wrap">
                                          {entry.revisiKeterangan || '-'}
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                          {entry.revisiFileUrl && (
                                            getFileIcon(fileName) === 'image' ? (
                                              <img
                                                src={entry.revisiFileUrl}
                                                alt={fileName || 'Revisi'}
                                                className="w-10 h-10 object-cover rounded cursor-pointer border border-gray-200 dark:border-gray-700"
                                                onClick={() => window.open(entry.revisiFileUrl!, '_blank')}
                                              />
                                            ) : (
                                              <a
                                                href={entry.revisiFileUrl}
                                                download={fileName || 'file'}
                                                target="_blank"
                                                className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                title={fileName || 'File'}
                                              >
                                                {getFileIcon(fileName) === 'pdf' ? <FileText size={14} className="text-red-500" /> :
                                                 getFileIcon(fileName) === 'spreadsheet' ? <FileSpreadsheet size={14} className="text-green-600" /> :
                                                 <File size={14} className="text-gray-500" />}
                                              </a>
                                            )
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-gray-400 align-top text-xs whitespace-nowrap">{formatDate(entry.revisiAt)}</td>
                                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 align-top text-xs">{entry.programmer?.namaLengkap || '-'}</td>
                                      </tr>
                                    );
                                  });
                                }
                              });
                              return rows;
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}