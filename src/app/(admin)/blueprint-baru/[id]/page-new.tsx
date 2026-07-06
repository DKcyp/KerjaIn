"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Edit2, Plus } from "lucide-react";

type Project = {
  id: number;
  namaProyek: string;
  client: string | null;
  kodeProyek: string;
};

type ModulItem = {
  id: string;
  kode: string;
  modul: string;
  version: number;
  ba: string;
  baVersion: number;
  tasklist: TaskItem[];
  parentId?: string;
  depth: number;
};

type TaskItem = {
  id: string;
  namaTask: string;
  kompleksitas: 'EASY' | 'MEDIUM' | 'HARD';
  estimasi: number;
  programmerId: number;
  programmer: string;
  deskripsi: string;
  lampiran?: string;
};

type Programmer = {
  id: number;
  namaLengkap: string;
};

type NewModulForm = {
  parentModule: string;
  namaModule: string;
  isNewModule: boolean;
  ba: string;
  isNewBA: boolean;
};

type NewTaskForm = {
  namaTask: string;
  kompleksitas: 'EASY' | 'MEDIUM' | 'HARD';
  estimasi: number;
  programmerId: string;
  deskripsi: string;
};

const availableModules = ["Dashboard", "User Management", "Report", "Settings", "Profile"];
const availableBAs = ["User Management BA", "Dashboard BA", "Report BA"];

export default function BlueprintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.id as string);
  
  const [project, setProject] = useState<Project | null>(null);
  const [moduls, setModuls] = useState<ModulItem[]>([]);
  const [programmers, setProgrammers] = useState<Programmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModulForm, setShowAddModulForm] = useState(false);
  const [newModulForm, setNewModulForm] = useState<NewModulForm>({
    parentModule: "",
    namaModule: "",
    isNewModule: false,
    ba: "",
    isNewBA: false,
  });
  const [addingTaskToModul, setAddingTaskToModul] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState<NewTaskForm>({
    namaTask: "",
    kompleksitas: 'MEDIUM',
    estimasi: 8,
    programmerId: "",
    deskripsi: "",
  });

  // Fetch project data
  useEffect(() => {
    fetchProjectData();
    fetchProgrammers();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blueprint-baru/${projectId}`);
      const result = await response.json();
      
      if (result.success) {
        setProject(result.data.project);
        setModuls(result.data.modules);
      } else {
        alert("Failed to load project data");
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      alert("Error loading project data");
    } finally {
      setLoading(false);
    }
  };

  const fetchProgrammers = async () => {
    try {
      const response = await fetch("/api/blueprint-baru/programmers");
      const result = await response.json();
      
      if (result.success) {
        setProgrammers(result.data);
      }
    } catch (error) {
      console.error("Error fetching programmers:", error);
    }
  };

  const generateModuleCode = (parentId: string) => {
    if (!parentId) {
      const rootModuls = moduls.filter(m => !m.parentId);
      const maxCode = rootModuls.reduce((max, modul) => {
        const codeNum = parseInt(modul.kode);
        return isNaN(codeNum) ? max : Math.max(max, codeNum);
      }, 0);
      return String(maxCode + 1).padStart(2, '0');
    } else {
      const parentModule = moduls.find(m => m.id === parentId);
      if (!parentModule) return "01";
      
      const siblings = moduls.filter(m => m.parentId === parentId);
      const maxSubCode = siblings.reduce((max, modul) => {
        const parts = modul.kode.split('.');
        const lastPart = parts[parts.length - 1];
        const subNum = parseInt(lastPart);
        return isNaN(subNum) ? max : Math.max(max, subNum);
      }, 0);
      
      return `${parentModule.kode}.${String(maxSubCode + 1).padStart(2, '0')}`;
    }
  };

  const handleAddModul = async () => {
    if (newModulForm.namaModule.trim() === "" || newModulForm.ba.trim() === "") {
      alert("Module name and BA are required");
      return;
    }

    try {
      const generatedCode = generateModuleCode(newModulForm.parentModule);
      
      const response = await fetch(`/api/blueprint-baru/${projectId}/module`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentModule: newModulForm.parentModule || null,
          namaModule: newModulForm.namaModule,
          ba: newModulForm.ba,
          kode: generatedCode,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchProjectData();
        setShowAddModulForm(false);
        setNewModulForm({
          parentModule: "",
          namaModule: "",
          isNewModule: false,
          ba: "",
          isNewBA: false,
        });
      } else {
        alert(result.error || "Failed to add module");
      }
    } catch (error) {
      console.error("Error adding module:", error);
      alert("Error adding module");
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Are you sure you want to delete this module?")) return;

    try {
      const response = await fetch(`/api/blueprint-baru/${projectId}/module?moduleId=${moduleId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchProjectData();
      } else {
        alert(result.error || "Failed to delete module");
      }
    } catch (error) {
      console.error("Error deleting module:", error);
      alert("Error deleting module");
    }
  };

  const handleAddTask = async (modulId: string) => {
    if (newTaskForm.namaTask.trim() === "" || !newTaskForm.programmerId) {
      alert("Task name and programmer are required");
      return;
    }

    try {
      const response = await fetch(`/api/blueprint-baru/${projectId}/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: modulId,
          namaTask: newTaskForm.namaTask,
          kompleksitas: newTaskForm.kompleksitas,
          estimasi: newTaskForm.estimasi,
          programmerId: newTaskForm.programmerId,
          deskripsi: newTaskForm.deskripsi,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchProjectData();
        setNewTaskForm({
          namaTask: "",
          kompleksitas: 'MEDIUM',
          estimasi: 8,
          programmerId: "",
          deskripsi: "",
        });
        setAddingTaskToModul(null);
      } else {
        alert(result.error || "Failed to add task");
      }
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Error adding task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const response = await fetch(`/api/blueprint-baru/${projectId}/task?taskId=${taskId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchProjectData();
      } else {
        alert(result.error || "Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Error deleting task");
    }
  };

  const getKompleksitasBadge = (kompleksitas: string) => {
    const colors = {
      'EASY': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'MEDIUM': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'HARD': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    };
    return colors[kompleksitas as keyof typeof colors] || colors.MEDIUM;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Project tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => router.push('/blueprint-baru')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Kembali ke List</span>
          </button>
          
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Blueprint - {project.namaProyek}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Client: {project.client} | Kode: {project.kodeProyek}
          </p>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Modul</h3>
            <button
              onClick={() => setShowAddModulForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              Tambah Modul
            </button>
          </div>

          {/* Add Module Form */}
          {showAddModulForm && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Tambah Modul Baru</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Parent Module
                  </label>
                  <select
                    value={newModulForm.parentModule}
                    onChange={(e) => setNewModulForm({...newModulForm, parentModule: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">-- Root Module --</option>
                    {moduls.map((modul) => (
                      <option key={modul.id} value={modul.id}>
                        {modul.kode} - {modul.modul}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Nama Module <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <select
                      value={newModulForm.isNewModule ? "new" : newModulForm.namaModule}
                      onChange={(e) => {
                        if (e.target.value === "new") {
                          setNewModulForm({...newModulForm, isNewModule: true, namaModule: ""});
                        } else {
                          setNewModulForm({...newModulForm, isNewModule: false, namaModule: e.target.value});
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="">-- Pilih Module --</option>
                      {availableModules.map((module) => (
                        <option key={module} value={module}>
                          {module}
                        </option>
                      ))}
                      <option value="new">+ Module Baru</option>
                    </select>
                    
                    {newModulForm.isNewModule && (
                      <input
                        type="text"
                        value={newModulForm.namaModule}
                        onChange={(e) => setNewModulForm({...newModulForm, namaModule: e.target.value})}
                        placeholder="Nama module baru..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    BA <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <select
                      value={newModulForm.isNewBA ? "new" : newModulForm.ba}
                      onChange={(e) => {
                        if (e.target.value === "new") {
                          setNewModulForm({...newModulForm, isNewBA: true, ba: ""});
                        } else {
                          setNewModulForm({...newModulForm, isNewBA: false, ba: e.target.value});
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="">-- Pilih BA --</option>
                      {availableBAs.map((ba) => (
                        <option key={ba} value={ba}>
                          {ba}
                        </option>
                      ))}
                      <option value="new">+ BA Baru</option>
                    </select>
                    
                    {newModulForm.isNewBA && (
                      <input
                        type="text"
                        value={newModulForm.ba}
                        onChange={(e) => setNewModulForm({...newModulForm, ba: e.target.value})}
                        placeholder="Nama BA baru..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Kode yang akan digenerate:</strong> {generateModuleCode(newModulForm.parentModule)}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleAddModul}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Simpan
                </button>
                <button
                  onClick={() => {
                    setShowAddModulForm(false);
                    setNewModulForm({
                      parentModule: "",
                      namaModule: "",
                      isNewModule: false,
                      ba: "",
                      isNewBA: false,
                    });
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Module Table */}
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Kode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    BA
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Versi BA
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Modul
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Tasklist
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Versi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {moduls.map((modul) => (
                  <tr key={modul.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {modul.kode}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {modul.ba}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      v{modul.baVersion}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      <div style={{ paddingLeft: `${modul.depth * 20}px` }}>
                        {modul.modul}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        {modul.tasklist.map((task) => (
                          <div key={task.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded border relative group">
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="absolute top-1 right-1 p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete task"
                            >
                              <Trash2 size={14} />
                            </button>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {task.namaTask}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getKompleksitasBadge(task.kompleksitas)}`}>
                                {task.kompleksitas}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                              <div>Estimasi: {task.estimasi} jam</div>
                              <div>Programmer: {task.programmer}</div>
                              {task.deskripsi && <div>Deskripsi: {task.deskripsi}</div>}
                            </div>
                          </div>
                        ))}
                        
                        {addingTaskToModul === modul.id ? (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 space-y-3">
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Nama Task <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={newTaskForm.namaTask}
                                onChange={(e) => setNewTaskForm({...newTaskForm, namaTask: e.target.value})}
                                placeholder="Nama task..."
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                  Kompleksitas
                                </label>
                                <select
                                  value={newTaskForm.kompleksitas}
                                  onChange={(e) => setNewTaskForm({...newTaskForm, kompleksitas: e.target.value as 'EASY' | 'MEDIUM' | 'HARD'})}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                >
                                  <option value="EASY">Easy</option>
                                  <option value="MEDIUM">Medium</option>
                                  <option value="HARD">Hard</option>
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                  Estimasi (jam)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={newTaskForm.estimasi}
                                  onChange={(e) => setNewTaskForm({...newTaskForm, estimasi: parseInt(e.target.value) || 8})}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Programmer <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={newTaskForm.programmerId}
                                onChange={(e) => setNewTaskForm({...newTaskForm, programmerId: e.target.value})}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                              >
                                <option value="">-- Pilih Programmer --</option>
                                {programmers.map((programmer) => (
                                  <option key={programmer.id} value={programmer.id}>{programmer.namaLengkap}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Deskripsi
                              </label>
                              <textarea
                                value={newTaskForm.deskripsi}
                                onChange={(e) => setNewTaskForm({...newTaskForm, deskripsi: e.target.value})}
                                placeholder="Deskripsi task..."
                                rows={2}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAddTask(modul.id)}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Simpan
                              </button>
                              <button
                                onClick={() => {
                                  setAddingTaskToModul(null);
                                  setNewTaskForm({
                                    namaTask: "",
                                    kompleksitas: 'MEDIUM',
                                    estimasi: 8,
                                    programmerId: "",
                                    deskripsi: "",
                                  });
                                }}
                                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingTaskToModul(modul.id)}
                            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                          >
                            <Plus size={14} />
                            Tambah Task
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      v{modul.version}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteModule(modul.id)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete module"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
