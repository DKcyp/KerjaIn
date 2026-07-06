"use client";
import React, { useState, useEffect } from "react";
import { X, Send, ChevronUp, ChevronDown } from "lucide-react";

type CedFormData = {
  taskBAId: string;
  programmerId: string;
  jadwalMulai: string;
  jadwalExternal: string;
  durasiPengerjaan: string;
  durasiExternal: string;
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
  programmer: string;
  programmerId?: number;
  jadwalMulai: string;
  jadwalExternal?: string;
  durasiPengerjaan?: number | null;
  durasiExternal?: number | null;
  kompleksitas: string;
  moduleId: string;
  isApproved?: boolean;
};

type BAWithModules = {
  ba: { id: number; nama: string; version: string };
  mainModules: MainModule[];
  subModules: SubModule[];
  tasks: Task[];
};

type CedModuleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  baData: BAWithModules;
  programmers: Array<{ id: number; namaLengkap: string }>;
  projectId: number;
  mode?: 'submit' | 'view';
  onSuccess?: () => void;
};

export default function CedModuleModal({ isOpen, onClose, baData, programmers, projectId, mode = 'submit', onSuccess }: CedModuleModalProps) {
  const [formData, setFormData] = useState<Record<string, CedFormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [flatModules, setFlatModules] = useState<(MainModule | SubModule)[]>([]);

  useEffect(() => {
    if (isOpen) {
      initFormData();
      setFlatModules([...baData.mainModules, ...baData.subModules]);
    }
  }, [isOpen, baData]);

  const moveModule = (index: number, direction: 'up' | 'down') => {
    const newModules = [...flatModules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newModules.length) return;
    const temp = newModules[index];
    newModules[index] = newModules[targetIndex];
    newModules[targetIndex] = temp;
    setFlatModules(newModules);
  };

  const initFormData = () => {
    const initial: Record<string, CedFormData> = {};
    const allModules = [...baData.mainModules, ...baData.subModules];
    allModules.forEach(mod => {
      const task = baData.tasks.find(t => t.moduleId === mod.id);
      const durasi = task?.durasiPengerjaan?.toString() || '';
      const durasiExt = task?.durasiExternal?.toString() || (durasi ? Math.ceil(parseFloat(durasi) * 1.5).toString() : '');
      initial[mod.id] = {
        taskBAId: task?.id || '',
        programmerId: task?.programmerId?.toString() || '',
        jadwalMulai: task?.jadwalMulai || '',
        jadwalExternal: task?.jadwalExternal || '',
        durasiPengerjaan: durasi,
        durasiExternal: durasiExt,
      };
    });
    setFormData(initial);
  };

  const saveModule = async (moduleId: string, data: CedFormData) => {
    if (!data.taskBAId) {
      const mod = flatModules.find(m => m.id === moduleId);
      const createRes = await fetch(`/api/blueprint-baru/${projectId}/task-ba-blueprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: parseInt(moduleId),
          nama: mod?.nama || 'Task',
          programmerId: data.programmerId,
          jadwalMulai: data.jadwalMulai || null,
          jadwalExternal: data.jadwalExternal || null,
          durasiPengerjaan: data.durasiPengerjaan || null,
          durasiExternal: data.durasiExternal || null,
          deskripsi: '',
        }),
      });
      const createResult = await createRes.json();
      if (createResult.success) {
        await fetch(`/api/blueprint-baru/${projectId}/task-ba-blueprint`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskBAId: createResult.data.id,
            programmerId: data.programmerId,
            jadwalMulai: data.jadwalMulai || null,
            jadwalExternal: data.jadwalExternal || null,
            durasiPengerjaan: data.durasiPengerjaan || null,
            durasiExternal: data.durasiExternal || null,
          }),
        });
      }
    } else {
      await fetch(`/api/blueprint-baru/${projectId}/task-ba-blueprint`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskBAId: parseInt(data.taskBAId),
          programmerId: data.programmerId,
          jadwalMulai: data.jadwalMulai || null,
          jadwalExternal: data.jadwalExternal || null,
          durasiPengerjaan: data.durasiPengerjaan || null,
          durasiExternal: data.durasiExternal || null,
        }),
      });
    }
  };


  const handleSubmitCed = async () => {
    setSubmitting(true);
    try {
      for (let i = 0; i < flatModules.length; i++) {
        await fetch(`/api/blueprint-baru/${projectId}/blueprint-module`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleId: parseInt(flatModules[i].id),
            order: i
          }),
        });
      }

      const modulesToSave = Object.entries(formData).filter(
        ([_, v]) => v.programmerId
      );
      for (const [moduleId, data] of modulesToSave) {
        await saveModule(moduleId, data);
      }

      const statusRes = await fetch(`/api/blueprint-baru/${projectId}/ba/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baId: baData.ba.id, status: 'CED' }),
      });
      const statusResult = await statusRes.json();
      if (statusResult.success) {
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Error submitting CED:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-[75%] max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {mode === 'view' ? 'Riwayat CED' : 'CED'} - {baData.ba.nama}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {mode === 'view'
                  ? 'Riwayat programmer dan jadwal yang telah ditentukan untuk setiap modul'
                  : 'Tentukan programmer dan jadwal untuk setiap modul'}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {/* Module List - Flat Table */}
          <div className="mb-6">
            {flatModules.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Tidak ada modul</p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Module</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Task BA</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Programmer</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Man Hour Internal</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Man Hour External</th>
                      {mode === 'submit' && (
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-20">Urutan</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {flatModules.map((mod, idx) => {
                      const moduleId = mod.id;
                      const data = formData[moduleId] || { taskBAId: '', programmerId: '', jadwalMulai: '', jadwalExternal: '', durasiPengerjaan: '', durasiExternal: '' };
                      const task = baData.tasks.find(t => t.moduleId === moduleId);

                      return (
                        <tr key={moduleId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-3 py-2 text-gray-900 dark:text-white font-medium align-top">{mod.nama}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300 align-top">
                            {task?.nama || '-'}
                          </td>
                          {mode === 'submit' ? (
                            <>
                              <td className="px-3 py-2">
                                <select
                                  value={data.programmerId}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    [moduleId]: { ...prev[moduleId], programmerId: e.target.value }
                                  }))}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="">Pilih</option>
                                  {programmers.map(p => (
                                    <option key={p.id} value={p.id.toString()}>{p.namaLengkap}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={data.durasiPengerjaan}
                                  onChange={(e) => {
                                    const internal = e.target.value;
                                    const external = internal ? Math.ceil(parseFloat(internal) * 1.5).toString() : '';
                                    setFormData(prev => ({
                                      ...prev,
                                      [moduleId]: { ...prev[moduleId], durasiPengerjaan: internal, durasiExternal: external }
                                    }));
                                  }}
                                  placeholder="0"
                                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={data.durasiExternal}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    [moduleId]: { ...prev[moduleId], durasiExternal: e.target.value }
                                  }))}
                                  placeholder="0"
                                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </td>
                              <td className="px-3 py-2 align-middle">
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => moveModule(idx, 'up')}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30 text-gray-600 dark:text-gray-400"
                                    title="Naikkan"
                                  >
                                    <ChevronUp size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === flatModules.length - 1}
                                    onClick={() => moveModule(idx, 'down')}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30 text-gray-600 dark:text-gray-400"
                                    title="Turunkan"
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300 align-top">
                                {data.programmerId ? programmers.find(p => p.id.toString() === data.programmerId)?.namaLengkap || '-' : '-'}
                              </td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300 align-top">
                                {data.durasiPengerjaan || '-'}
                              </td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300 align-top">
                                {data.durasiExternal || '-'}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-between">
            {mode === 'submit' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Semua perubahan akan disimpan saat kirim CED
              </p>
            )}
            <div className="flex gap-3 ml-auto">
              {mode === 'submit' ? (
                <>
                  <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm">
                    Batal
                  </button>
                  <button
                    onClick={handleSubmitCed}
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-sm font-medium shadow-lg disabled:opacity-50"
                  >
                    <Send size={16} />
                    {submitting ? 'Memproses...' : 'Konfirmasi & Kirim CED'}
                  </button>
                </>
              ) : (
                <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
