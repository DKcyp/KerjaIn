"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, X, Edit2, Trash2, Check, Download, Upload, Play, CheckCircle, RefreshCw, MessageCircle, RotateCcw } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import Swal from 'sweetalert2';
import { addWorkingHours } from '@/lib/workingHoursCalculator';
import BATypeTabs from "@/components/blueprint-baru/BATypeTabs";
import ImportExcelModal from "@/components/blueprint-baru/ImportExcelModal";
import { UATApprovalModal } from "@/components/blueprint-baru/UATApprovalModal";
import FileUploadModal from "@/components/blueprint-baru/FileUploadModal";
import BlueprintChatModal from "@/components/blueprint-baru/BlueprintChatModal";
import RfcModuleModal from "@/components/blueprint-baru/RfcModuleModal";
import UatRevisiModal from "@/components/blueprint-baru/UatRevisiModal";
import CedModuleModal from "@/components/blueprint-baru/CedModuleModal";
import { downloadExcelTemplate } from "@/utils/excelTemplate";
import { JSX } from "react/jsx-runtime";


type Project = {
  id: number;
  namaProyek: string;
  client: string | null;
  kodeProyek: string;
};

type BA = {
  id: number;
  nama: string;
  version: string;
  deskripsi?: string;
  type?: 'BLUEPRINT' | 'BERITA_ACARA';
  status?: string;
  fileRFC?: string;
  fileCED?: string;
  fileOK?: string;
  isNonaktif?: boolean;
  idBlueprintBaru?: number | null;
  rfcCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

type MainModule = {
  id: string;
  kode: string;
  nama: string;
  ba: string;
  baVersion: string;
  isAppModule?: boolean;
  gambar?: string | null;
  keterangan?: string | null;
};

type SubModule = {
  id: string;
  kode: string;
  nama: string;
  parentId: string;
  isAppModule?: boolean;
  gambar?: string | null;
  keterangan?: string | null;
};

type Task = {
  id: string;
  nama: string;
  deskripsi: string;
  programmer: string;
  programmerId?: number;
  jadwalMulai: string;
  jadwalExternal?: string;
  durasiPengerjaan?: number | null;
  durasiExternal?: number | null;
  kompleksitas: 'EASY' | 'MEDIUM' | 'HARD';
  moduleId: string;
  isApproved?: boolean;
  approvedAt?: string | null;
  tasklistId?: number | null;
  revisiKeterangan?: string | null;
  revisiFileUrl?: string | null;
  revisiAt?: string | null;
};

type BAWithModules = {
  ba: BA;
  mainModules: MainModule[];
  subModules: SubModule[];
  tasks: Task[];
  note: string;
};

type ProjectModule = {
  id: number;
  nama: string;
  parentId: number | null;
  baVersion?: string | null;
};

interface RawTask {
  id: string;
  namaTask: string;
  deskripsi: string;
  programmer: string;
  programmerId?: number;
  jadwalMulai?: string;
  jadwalExternal?: string;
  durasiPengerjaan?: number | null;
  durasiExternal?: number | null;
  kompleksitas: 'EASY' | 'MEDIUM' | 'HARD';
  isApproved?: boolean;
  approvedAt?: string | null;
  tasklistId?: number | null;
  revisiKeterangan?: string | null;
  revisiFileUrl?: string | null;
  revisiAt?: string | null;
}

interface RawModule {
  id: string;
  kode: string;
  modul: string;
  level: number;
  parentId: string;
  isAppModule?: boolean;
  gambar?: string | null;
  keterangan?: string | null;
  tasklist: RawTask[];
}

interface RawBA {
  id: number;
  ba: string;
  baVersion: string;
  deskripsi?: string;
  type?: 'BLUEPRINT' | 'BERITA_ACARA';
  status?: string;
  fileRFC?: string;
  fileCED?: string;
  fileOK?: string;
  isNonaktif?: boolean;
  idBlueprintBaru?: number | null;
  rfcCount?: number;
  createdAt?: string;
  updatedAt?: string;
  modules: RawModule[];
}


export default function BlueprintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.id as string);
  const { success, error: showError } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [baList, setBaList] = useState<BAWithModules[]>([]);
  const [expandedBA, setExpandedBA] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddBAForm, setShowAddBAForm] = useState(false);
  const [editingBAId, setEditingBAId] = useState<number | null>(null);
  const [isApproveMode, setIsApproveMode] = useState(false);
  const [resubmitFromBAId, setResubmitFromBAId] = useState<number | null>(null);
  const [showAddModuleForm, setShowAddModuleForm] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [programmers, setProgrammers] = useState<Array<{ id: number; namaLengkap: string }>>([]);
  const [projectModules, setProjectModules] = useState<ProjectModule[]>([]);
  const [baFlatRows, setBaFlatRows] = useState<Record<number, any[]>>({});
  const [taskComplexities, setTaskComplexities] = useState<Array<{ complexity: string; hours: number }>>([]);
  const [lastApprovedBAVersion, setLastApprovedBAVersion] = useState<string | null>(null);
  const [rfcNotes, setRfcNotes] = useState<Record<string, { keterangan: string; gambar: string }>>({});
  const [approveStartDate, setApproveStartDate] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<'RFC' | 'CED'>('RFC');

  // const handleFileUpload = async (file: File) => {
  //   console.log('Uploading file:', file.name);
  //   await new Promise(resolve => setTimeout(resolve, 1000));
  //   alert(`File ${file.name} uploaded successfully!`);
  // };

  // Tab state for Blueprint vs Berita Acara
  const [activeTab, setActiveTab] = useState<'BLUEPRINT' | 'BERITA_ACARA'>('BLUEPRINT');
  
  // Import Excel state
  const [showImportModal, setShowImportModal] = useState(false);
  
  // UAT Modal state
  const [showUATModal, setShowUATModal] = useState(false);
  const [selectedBAForUAT, setSelectedBAForUAT] = useState<{ id: number; nama: string } | null>(null);
  const [uatApprovalMode, setUatApprovalMode] = useState<'internal' | 'external'>('internal');
  
  // File Upload Modal state
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [fileUploadType, setFileUploadType] = useState<'OK'>('OK');
  const [selectedBAForFile, setSelectedBAForFile] = useState<number | null>(null);

  // Chat Modal state
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedBAForChat, setSelectedBAForChat] = useState<{ id: number; nama: string; version: string } | null>(null);

  // RFC Module Modal state
  const [showRfcModuleModal, setShowRfcModuleModal] = useState(false);
  const [showUatRevisiModal, setShowUatRevisiModal] = useState(false);
  const [uatRevisiBA, setUatRevisiBA] = useState<BAWithModules | null>(null);
  const [rfcModuleBAda, setRfcModuleBAda] = useState<BAWithModules | null>(null);
  const [rfcModalMode, setRfcModalMode] = useState<'submit' | 'view'>('submit');

  // CED Module Modal state
  const [showCedModuleModal, setShowCedModuleModal] = useState(false);
  const [cedModuleBAda, setCedModuleBAda] = useState<BAWithModules | null>(null);
  const [cedModalMode, setCedModalMode] = useState<'submit' | 'view'>('submit');

  // Image Preview Modal state
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('');
  
  const [newBAForm, setNewBAForm] = useState({
    nama: '',
    version: '0.0.1',
    deskripsi: '',
    type: 'BLUEPRINT' as 'BLUEPRINT' | 'BERITA_ACARA',
  });

  const [newModuleForm, setNewModuleForm] = useState({
    mainModuleId: '',
    mainModuleName: '',
    subModuleName: '',
    taskName: '',
    programmerId: '',
    jadwalMulai: '',
    kompleksitas: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD',
  });

  // State untuk BA Module Rows dalam modal
  const [baModuleRows, setBAModuleRows] = useState<BAModuleRow[]>([]);

  type BAModuleRow = {
    id: string;
    moduleValue: string;
    moduleId?: number;
    taskName: string;
    programmerId: string;
    jadwalMulai: string;
    kompleksitas: 'EASY' | 'MEDIUM' | 'HARD';
    durasi?: number;
    isApproved?: boolean;
    approvedAt?: string | null;
    tasklistId?: number | null;
    gambar?: string;
    gambarFile?: File;
    keterangan?: string;
    revisiKeterangan?: string | null;
    revisiFileUrl?: string | null;
    revisiAt?: string | null;
  };

  useEffect(() => {
    fetchProjectData();
    fetchProgrammers();
    fetchTaskComplexities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, activeTab]); // Re-fetch when tab changes

  const fetchTaskComplexities = async () => {
    try {
      const response = await fetch('/api/task-complexity');
      const result = await response.json();
      if (result.success) {
        setTaskComplexities(result.data.map((tc: { complexity: string; hours: number }) => ({
          complexity: tc.complexity,
          hours: tc.hours
        })));
      }
    } catch (error) {
      console.error('Error fetching task complexities:', error);
    }
  };

  const fetchProgrammers = async () => {
    try {
      const response = await fetch(`/api/blueprint-baru/${projectId}/programmers`);
      const result = await response.json();
      if (result.success) {
        setProgrammers(result.data);
      }
    } catch (error) {
      console.error('Error fetching programmers:', error);
    }
  };

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      console.log('[Frontend] Fetching data for project:', projectId, 'type:', activeTab);
      const response = await fetch(`/api/blueprint-baru/${projectId}?type=${activeTab}&view=logbook`);
      console.log('[Frontend] Response status:', response.status);
      const result = await response.json();
      console.log('[Frontend] Response result:', result);

      if (result.success) {
        setProject(result.data.project);
        
        console.log('[Frontend] Raw API response:', result.data.businessAnalysts);
        
        // Transform API data to match component structure
        const transformedBaList: BAWithModules[] = result.data.businessAnalysts.map((ba: RawBA) => {
          console.log('[Frontend] Processing BA:', ba);
          
          // Separate main modules (level 1) and sub modules (level 2)
          const mainModules = ba.modules.filter((m: RawModule) => m.level === 1);
          const subModules = ba.modules.filter((m: RawModule) => m.level === 2);
          
          console.log('[Frontend] Main modules:', mainModules);
          console.log('[Frontend] Sub modules:', subModules);
          
          // Collect all tasks
          const allTasks: Task[] = [];
          ba.modules.forEach((module: RawModule) => {
            console.log(`Processing module ${module.modul} with ${module.tasklist.length} tasks`);
            module.tasklist.forEach((task: RawTask) => {
              allTasks.push({
                id: task.id,
                nama: task.namaTask,
                deskripsi: task.deskripsi,
                programmer: task.programmer,
                programmerId: task.programmerId,
                jadwalMulai: task.jadwalMulai || '',
                jadwalExternal: task.jadwalExternal,
                durasiPengerjaan: task.durasiPengerjaan,
                kompleksitas: task.kompleksitas,
                moduleId: module.id,
                isApproved: task.isApproved || false,
                approvedAt: task.approvedAt || null,
                tasklistId: task.tasklistId || null,
                revisiKeterangan: task.revisiKeterangan || null,
                revisiFileUrl: task.revisiFileUrl || null,
                revisiAt: task.revisiAt || null,
              });
            });
          });

          console.log('All tasks:', allTasks);

          return {
            ba: {
              id: ba.id,
              nama: ba.ba,
              version: ba.baVersion,
              deskripsi: ba.deskripsi || '',
              type: ba.type || 'BERITA_ACARA',
              status: ba.status || 'DRAFT',
              fileRFC: ba.fileRFC || undefined,
              fileCED: ba.fileCED || undefined,
              fileOK: ba.fileOK || undefined,
              isNonaktif: ba.isNonaktif || false,
              idBlueprintBaru: ba.idBlueprintBaru ?? null,
              rfcCount: ba.rfcCount ?? 0,
              createdAt: ba.createdAt,
              updatedAt: ba.updatedAt,
            },
            mainModules: mainModules.map((m: RawModule) => ({
              id: m.id,
              kode: m.kode,
              nama: m.modul,
              ba: ba.ba,
              baVersion: ba.baVersion,
              isAppModule: m.isAppModule || false,
              gambar: m.gambar || null,
              keterangan: m.keterangan || null,
            })),
            subModules: subModules.map((m: RawModule) => ({
              id: m.id,
              kode: m.kode,
              nama: m.modul,
              parentId: m.parentId,
              isAppModule: m.isAppModule || false,
              gambar: m.gambar || null,
              keterangan: m.keterangan || null,
            })),
            tasks: allTasks,
            note: '',
          };
        });

        // Sort by createdAt descending (newest first)
        transformedBaList.sort((a, b) => {
          const dateA = new Date(a.ba.createdAt || 0).getTime();
          const dateB = new Date(b.ba.createdAt || 0).getTime();
          return dateB - dateA;
        });

        setBaList(transformedBaList);
        setExpandedBA(transformedBaList.length > 0 ? `${transformedBaList[0].ba.id}` : null);
        if (result.data.projectModules) {
          setProjectModules(result.data.projectModules);
        }
        if (result.data.baFlatRows) {
          const flatMap: Record<number, any[]> = {};
          result.data.baFlatRows.forEach((item: any) => {
            flatMap[item.baId] = item.rows;
          });
          setBaFlatRows(flatMap);
        }
        
        // Get last approved BA version
        fetchLastApprovedBAVersion();
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLastApprovedBAVersion = async () => {
    try {
      const response = await fetch(`/api/blueprint-baru/${projectId}/last-approved-version?type=${activeTab}`);
      const result = await response.json();
      if (result.success && result.data?.version) {
        setLastApprovedBAVersion(result.data.version);
        setNewBAForm(prev => ({ ...prev, version: result.data.version }));
      } else {
        setLastApprovedBAVersion(null);
        setNewBAForm(prev => ({ ...prev, version: '0.0.1' }));
      }
    } catch (error) {
      console.error('Error fetching last approved BA version:', error);
      setLastApprovedBAVersion(null);
      setNewBAForm(prev => ({ ...prev, version: '0.0.1' }));
    }
  };

  const incrementVersion = (version: string): string => {
    const parts = version.split('.');
    if (parts.length === 3) {
      const [major, minor, patch] = parts.map(Number);
      // Increment patch version
      return `${major}.${minor}.${patch + 1}`;
    }
    return '0.0.1';
  };

  const getKompleksitasBadge = (kompleksitas: string) => {
    const colors = {
      'EASY': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'MEDIUM': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'HARD': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[kompleksitas as keyof typeof colors] || colors.MEDIUM;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'DRAFT': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      'PENGAJUAN': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'REVIEW': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'RFC': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'CED': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'DEVELOPMENT': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'PROSES_DEVELOPMENT': 'bg-indigo-200 text-indigo-900 dark:bg-indigo-800 dark:text-indigo-100',
      'UAT_INTERNAL': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      'UAT_INTERNAL_SELESAI': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
      'UAT_EXTERNAL': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      'UAT_EXTERNAL_SELESAI': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      'SELESAI': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
    };
    return colors[status as keyof typeof colors] || colors.DRAFT;
  };

  const getStatusDisplayName = (status: string) => {
    const names = {
      'DRAFT': 'Draft',
      'PENGAJUAN': 'Menunggu Review',
      'REVIEW': 'Review',
      'RFC': 'RFC',
      'CED': 'CED',
      'DEVELOPMENT': 'Development',
      'PROSES_DEVELOPMENT': 'Proses Development',
      'UAT_INTERNAL': 'UAT Internal',
      'UAT_INTERNAL_SELESAI': 'UAT Internal Selesai',
      'UAT_EXTERNAL': 'UAT External',
      'UAT_EXTERNAL_SELESAI': 'UAT External Selesai',
      'SELESAI': 'Selesai',
    };
    return names[status as keyof typeof names] || 'Draft';
  };

  const toggleBA = (baKey: string) => {
    setExpandedBA(expandedBA === baKey ? null : baKey);
  };

  const handleAddBA = async () => {
    if (!newBAForm.nama.trim()) {
      showError('Nama BA wajib diisi');
      return;
    }

    try {
      const response = await fetch(`/api/blueprint-baru/${projectId}/ba`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: newBAForm.nama,
          version: newBAForm.version,
          deskripsi: newBAForm.deskripsi,
          type: newBAForm.type,
          sumber: 'LOGBOOK',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowAddBAForm(false);
        setResubmitFromBAId(null);
        setRfcNotes({});
        setApproveStartDate('');
        setNewBAForm({ nama: '', version: '0.0.1', deskripsi: '', type: activeTab });
        await fetchProjectData();
        success('BA berhasil ditambahkan');
      } else {
        showError(result.error || 'Gagal menambah BA');
      }
    } catch (error) {
      console.error('Error adding BA:', error);
      showError('Error menambah BA');
    }
  };

  const handleDeleteBA = async (baId: number) => {
    const result = await Swal.fire({
      title: 'Hapus BA?',
      text: 'Apakah Anda yakin ingin menghapus BA ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      customClass: {
        container: 'swal-high-zindex'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/blueprint-baru/${projectId}/ba?baId=${baId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await fetchProjectData();
        success('BA berhasil dihapus');
      } else {
        showError(result.error || 'Gagal menghapus BA');
      }
    } catch (error) {
      console.error('Error deleting BA:', error);
      showError('Error menghapus BA');
    }
  };

  const handleUpdateStatus = async (baId: number, status: string) => {
    try {
      // For RFC, open module RFC modal
      if (status === 'RFC') {
        const ba = baList.find(b => b.ba.id === baId);
        if (ba) {
          setRfcModalMode('submit');
          setRfcModuleBAda(ba);
          setShowRfcModuleModal(true);
        }
        return;
      }

      // For CED, open module CED modal
      if (status === 'CED') {
        const ba = baList.find(b => b.ba.id === baId);
        if (ba) {
          setCedModalMode('submit');
          setCedModuleBAda(ba);
          setShowCedModuleModal(true);
        }
        return;
      }

      // For OK, open file upload modal
      if (status === 'OK') {
        setSelectedBAForFile(baId);
        setFileUploadType('OK');
        setShowFileUploadModal(true);
        return;
      }

      // For SIAP_UAT, open the UAT approval modal instead
      if (status === 'SIAP_UAT') {
        const ba = baList.find(b => b.ba.id === baId);
        if (ba) {
          setSelectedBAForUAT({ id: baId, nama: ba.ba.nama });
          setShowUATModal(true);
        }
        return;
      }

      // Get display name for status
      const statusDisplayName = getStatusDisplayName(status);

      // For other statuses, show confirmation
      const result = await Swal.fire({
        title: 'Konfirmasi',
        text: `Ubah status ke ${statusDisplayName}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Ubah',
        cancelButtonText: 'Batal'
      });

      if (result.isConfirmed) {
        setLoading(true);
        const response = await fetch(`/api/blueprint-baru/${projectId}/ba/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baId, status })
        });

        const data = await response.json();
        if (data.success) {
          Swal.fire({
            title: 'Berhasil!',
            text: `Status berhasil diubah menjadi ${statusDisplayName}`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
          fetchProjectData();
        } else {
          Swal.fire('Gagal!', data.error || 'Terjadi kesalahan', 'error');
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Swal.fire('Error!', 'Internal server error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedBAForFile) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('baId', selectedBAForFile.toString());
    formData.append('type', fileUploadType);

    const response = await fetch(`/api/blueprint-baru/${projectId}/upload-file`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      await Swal.fire({
        title: 'Berhasil!',
        text: `File ${fileUploadType} berhasil diupload`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      const newStatus = fileUploadType === 'OK' ? 'KIRIM_OK' : fileUploadType;
      const statusResponse = await fetch(`/api/blueprint-baru/${projectId}/ba/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baId: selectedBAForFile, status: newStatus })
      });

      if (statusResponse.ok) {
        await fetchProjectData();
      }
    } else {
      throw new Error(data.error || 'Failed to upload file');
    }
  };

  const handleEditBA = async (ba: { id: number; nama: string; version: string; deskripsi?: string; type?: 'BLUEPRINT' | 'BERITA_ACARA' }) => {
    setIsApproveMode(false);
    setEditingBAId(ba.id);
    setNewBAForm({
      nama: ba.nama,
      version: ba.version,
      deskripsi: ba.deskripsi || '',
      type: ba.type || 'BLUEPRINT',
    });

    // Load flat rows from cached API data
    try {
      const cachedRows = baFlatRows[ba.id];
      if (cachedRows && cachedRows.length > 0) {
        const moduleRows: BAModuleRow[] = cachedRows.map((r: any, i: number) => ({
          id: `edit_row_${i}_${ba.id}`,
          moduleValue: r.moduleValue || '',
          taskName: r.taskName || '',
          programmerId: r.programmerId || '',
          jadwalMulai: r.jadwalMulai || '',
          kompleksitas: r.kompleksitas || 'MEDIUM',
          durasi: r.durasi || 0,
          isApproved: r.isApproved || false,
          approvedAt: r.approvedAt || null,
          tasklistId: r.tasklistId || null,
          gambar: r.gambar || undefined,
          keterangan: r.keterangan || undefined,
        }));
        setBAModuleRows(moduleRows);
      } else {
        setBAModuleRows([]);
      }
    } catch (error) {
      console.error('Error loading BA modules:', error);
    }

    setShowAddBAForm(true);
  };

  const handleOpenApproveModal = (baData: BAWithModules) => {
    handleEditBA(baData.ba);
    setIsApproveMode(true);
  };

  const handleResubmitBA = async (baData: BAWithModules) => {
    setIsApproveMode(false);
    setEditingBAId(baData.ba.id); // edit BA yang ada, bukan buat baru
    setResubmitFromBAId(baData.ba.id); // flag untuk update status ke PENGAJUAN setelah save
    setNewBAForm({
      nama: baData.ba.nama,
      version: baData.ba.version,
      deskripsi: baData.ba.deskripsi || '',
      type: baData.ba.type || 'BLUEPRINT',
    });

    try {
      // Load flat rows from API response
      const cachedRows = baFlatRows[baData.ba.id];
      if (cachedRows && cachedRows.length > 0) {
        const moduleRows: BAModuleRow[] = cachedRows.map((r: any, i: number) => ({
          id: `resubmit_row_${i}_${baData.ba.id}`,
          moduleValue: r.moduleValue || '',
          taskName: r.taskName || '',
          programmerId: r.programmerId || '',
          jadwalMulai: r.jadwalMulai || '',
          kompleksitas: r.kompleksitas || 'MEDIUM',
          durasi: r.durasi || 0,
          isApproved: false,
          approvedAt: null,
          tasklistId: null,
          gambar: r.gambar || undefined,
          keterangan: r.keterangan || undefined,
        }));
        setBAModuleRows(moduleRows);
      } else {
        setBAModuleRows([]);
      }

      // Fetch latest RFC iteration notes for this BA
      try {
        const rfcRes = await fetch(`/api/blueprint-baru/${projectId}/ba-detail-rfc?baId=${baData.ba.id}`);
        const rfcResult = await rfcRes.json();
        if (rfcResult.success && rfcResult.data.length > 0) {
          const maxIter = Math.max(...rfcResult.data.map((e: any) => e.iteration));
          const latestNotes: Record<string, { keterangan: string; gambar: string }> = {};
          rfcResult.data
            .filter((e: any) => e.iteration === maxIter)
            .forEach((e: any) => {
              latestNotes[String(e.moduleId)] = {
                keterangan: e.keterangan || '',
                gambar: e.gambar || '',
              };
            });
          setRfcNotes(latestNotes);
        }
      } catch (error) {
        console.error('Error fetching RFC entries for resubmit:', error);
      }
    } catch (error) {
      console.error('Error loading BA modules for resubmit:', error);
    }

    setShowAddBAForm(true);
  };

  // Fungsi untuk mengelola BA Module Rows dalam modal
  const generateRowId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Helper function to format date for input type="date"
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    
    try {
      // Handle various date formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // Format to YYYY-MM-DDTHH:mm for input type="datetime-local"
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const chainAllJadwalMulai = (startDate: string) => {
    if (!startDate) return;
    setBAModuleRows(prev => {
      const newRows = prev.map(row => ({ ...row }));
      const nextStartPerProgrammer: Record<string, string> = {};
      
      for (let i = 0; i < newRows.length; i++) {
        const row = newRows[i];
        const progId = row.programmerId || 'unassigned';
        
        let currentStart = startDate;
        if (progId !== 'unassigned' && nextStartPerProgrammer[progId]) {
          currentStart = nextStartPerProgrammer[progId];
        }
        
        newRows[i].jadwalMulai = currentStart;
        
        const durasi = row.durasi;
        if (durasi && durasi > 0 && currentStart) {
          const startDateObj = new Date(currentStart);
          if (!isNaN(startDateObj.getTime())) {
            const nextDate = addWorkingHours(startDateObj, durasi);
            const nextStart = formatDateForInput(nextDate.toISOString());
            if (progId !== 'unassigned') {
              nextStartPerProgrammer[progId] = nextStart;
            }
          }
        }
      }
      return newRows;
    });
  };

  const handleAddRow = () => {
    const defaultComplexity = taskComplexities.find(tc => tc.complexity === 'MEDIUM');
    const newRow: BAModuleRow = {
      id: generateRowId(),
      moduleValue: '',
      taskName: '',
      programmerId: '',
      jadwalMulai: '',
      kompleksitas: 'MEDIUM',
      durasi: defaultComplexity?.hours || 0,
    };
    setBAModuleRows(prev => [...prev, newRow]);
  };

  const updateBAModuleRow = (rowId: string, field: keyof BAModuleRow, value: string | boolean | number | File) => {
    setBAModuleRows(prev => {
      const newRows = prev.map(row => {
        if (row.id === rowId) {
          const updatedRow = { ...row, [field]: value };
          
          if (field === 'kompleksitas' && typeof value === 'string') {
            const complexity = taskComplexities.find(tc => tc.complexity === value);
            if (complexity) {
              updatedRow.durasi = complexity.hours;
            }
          }
          
          return updatedRow;
        }
        return row;
      });

      if ((field === 'jadwalMulai' || field === 'durasi' || field === 'programmerId') && typeof value !== 'boolean') {
        const changedIndex = newRows.findIndex(r => r.id === rowId);
        if (changedIndex >= 0) {
          const changedRow = newRows[changedIndex];
          
          // 1. Recalculate for the current/new programmer of the changed row
          const newProgId = changedRow.programmerId;
          if (newProgId && newProgId.trim() !== '') {
            let prevJadwalMulai = changedRow.jadwalMulai;
            if (prevJadwalMulai) {
              const durasi = changedRow.durasi;
              if (durasi && durasi > 0) {
                const startDate = new Date(prevJadwalMulai);
                if (!isNaN(startDate.getTime())) {
                  const nextDate = addWorkingHours(startDate, durasi);
                  prevJadwalMulai = formatDateForInput(nextDate.toISOString());
                }
              }
              
              for (let i = changedIndex + 1; i < newRows.length; i++) {
                if (newRows[i].programmerId === newProgId) {
                  newRows[i].jadwalMulai = prevJadwalMulai;
                  const rowDurasi = newRows[i].durasi;
                  if (rowDurasi && rowDurasi > 0 && prevJadwalMulai) {
                    const startDate = new Date(prevJadwalMulai);
                    if (!isNaN(startDate.getTime())) {
                      const nextDate = addWorkingHours(startDate, rowDurasi);
                      prevJadwalMulai = formatDateForInput(nextDate.toISOString());
                    }
                  }
                }
              }
            }
          }

          // 2. If programmerId was changed, also recalculate for the old programmer
          if (field === 'programmerId') {
            const oldRow = prev.find(r => r.id === rowId);
            const oldProgId = oldRow?.programmerId;
            if (oldProgId && oldProgId.trim() !== '' && oldProgId !== newProgId) {
              let lastEndForOldProg: string | null = null;
              for (let i = changedIndex - 1; i >= 0; i--) {
                if (newRows[i].programmerId === oldProgId) {
                  const start = newRows[i].jadwalMulai;
                  const dur = newRows[i].durasi;
                  if (start) {
                    if (dur && dur > 0) {
                      const startDate = new Date(start);
                      if (!isNaN(startDate.getTime())) {
                        const nextDate = addWorkingHours(startDate, dur);
                        lastEndForOldProg = formatDateForInput(nextDate.toISOString());
                      }
                    } else {
                      lastEndForOldProg = start;
                    }
                  }
                  break;
                }
              }
              
              if (!lastEndForOldProg) {
                lastEndForOldProg = oldRow?.jadwalMulai || null;
              }

              if (lastEndForOldProg) {
                let prevJadwalMulai = lastEndForOldProg;
                for (let i = changedIndex + 1; i < newRows.length; i++) {
                  if (newRows[i].programmerId === oldProgId) {
                    newRows[i].jadwalMulai = prevJadwalMulai;
                    const rowDurasi = newRows[i].durasi;
                    if (rowDurasi && rowDurasi > 0 && prevJadwalMulai) {
                      const startDate = new Date(prevJadwalMulai);
                      if (!isNaN(startDate.getTime())) {
                        const nextDate = addWorkingHours(startDate, rowDurasi);
                        prevJadwalMulai = formatDateForInput(nextDate.toISOString());
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      return newRows;
    });
  };

  const handleDeleteBAModuleRow = (rowId: string) => {
    setBAModuleRows(prev => prev.filter(row => row.id !== rowId));
  };

  const buildBAFormData = (extra: Record<string, any> = {}): FormData | null => {
    const hasFiles = baModuleRows.some(r => r.gambarFile);
    if (!hasFiles) return null;

    const fd = new FormData();
    fd.append('nama', newBAForm.nama);
    fd.append('version', newBAForm.version);
    fd.append('deskripsi', newBAForm.deskripsi || '');
    fd.append('type', newBAForm.type || 'BERITA_ACARA');
    fd.append('sumber', 'LOGBOOK');

    if (extra.baId) fd.append('baId', String(extra.baId));

    let fileIndex = 0;
    const rows = baModuleRows.map(row => {
      let gambarValue: string | null = row.gambar || null;
      if (row.gambarFile) {
        const fileKey = `gambar_file_${fileIndex}`;
        fd.append(fileKey, row.gambarFile);
        gambarValue = `__file__:${fileKey}`;
        fileIndex++;
      }

      let moduleId: number | undefined;
      let moduleName: string = '';
      if (row.moduleValue.includes(':')) {
        const parts = row.moduleValue.split(':');
        moduleId = parseInt(parts[0]);
        moduleName = parts.slice(1).join(':');
      } else {
        moduleName = row.moduleValue;
      }

      return {
        moduleId: moduleId || null,
        moduleName,
        taskName: row.taskName,
        programmerId: row.programmerId ? parseInt(row.programmerId) : null,
        jadwalMulai: row.jadwalMulai || null,
        kompleksitas: row.kompleksitas,
        isApproved: row.isApproved || false,
        approvedAt: row.approvedAt || null,
        tasklistId: row.tasklistId || null,
        gambar: gambarValue,
        keterangan: row.keterangan || null,
      };
    });

    fd.append('rows', JSON.stringify(rows));
    return fd;
  };

  const handleSaveCompleteBA = async () => {
    if (!newBAForm.nama.trim()) {
      showError('Nama BA wajib diisi');
      return;
    }

    // Validate that we have at least one module (only for new BA)
    if (!editingBAId && baModuleRows.length === 0) {
      showError('Tambahkan minimal satu module');
      return;
    }

    try {
      if (editingBAId) {
        // Update existing BA
        if (baModuleRows.length > 0) {
          const fd = buildBAFormData({ baId: editingBAId });

          if (fd) {
            const response = await fetch(`/api/blueprint-baru/${projectId}/update-complete-ba`, {
              method: 'PUT',
              body: fd,
            });
            const result = await response.json();
            if (!result.success) { showError(result.error || 'Gagal mengupdate BA'); return; }
          } else {
            const baData = {
              baId: editingBAId,
              nama: newBAForm.nama,
              version: newBAForm.version,
              deskripsi: newBAForm.deskripsi,
              type: newBAForm.type,
              rows: baModuleRows.map(row => {
                let moduleId: number | null = null;
                let moduleName = '';
                if (row.moduleValue.includes(':')) {
                  const parts = row.moduleValue.split(':');
                  moduleId = parseInt(parts[0]);
                  moduleName = parts.slice(1).join(':');
                } else {
                  moduleName = row.moduleValue;
                }
                return {
                  moduleId,
                  moduleName,
                  taskName: row.taskName,
                  programmerId: row.programmerId ? parseInt(row.programmerId) : null,
                  jadwalMulai: row.jadwalMulai || null,
                  kompleksitas: row.kompleksitas,
                  isApproved: row.isApproved || false,
                  approvedAt: row.approvedAt || null,
                  tasklistId: row.tasklistId || null,
                  gambar: row.gambar || null,
                  keterangan: row.keterangan || null,
                };
              }),
            };
            const response = await fetch(`/api/blueprint-baru/${projectId}/update-complete-ba`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(baData),
            });
            const result = await response.json();
            if (!result.success) { showError(result.error || 'Gagal mengupdate BA'); return; }
          }

          // Jika ini resubmit, update status BA ke PENGAJUAN
          const isResubmit = !!resubmitFromBAId;
          if (resubmitFromBAId) {
            await fetch(`/api/blueprint-baru/${projectId}/ba/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ baId: editingBAId, status: 'PENGAJUAN' }),
            });
            setResubmitFromBAId(null);
          }

          setShowAddBAForm(false);
          setRfcNotes({});
          setApproveStartDate('');
          setEditingBAId(null);
          setNewBAForm({ nama: '', version: '0.0.1', deskripsi: '', type: activeTab });
          setBAModuleRows([]);
          await fetchProjectData();
          success(isResubmit ? 'BA berhasil diresubmit!' : 'BA berhasil diupdate lengkap!');
        } else {
          // Update BA info only
          const response = await fetch(`/api/blueprint-baru/${projectId}/ba`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              baId: editingBAId,
              nama: newBAForm.nama,
              version: newBAForm.version,
              deskripsi: newBAForm.deskripsi,
              type: newBAForm.type,
            }),
          });

          const result = await response.json();

          if (result.success) {
            // Jika ini resubmit, update status BA ke PENGAJUAN
            const isResubmit2 = !!resubmitFromBAId;
            if (resubmitFromBAId) {
              await fetch(`/api/blueprint-baru/${projectId}/ba/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ baId: editingBAId, status: 'PENGAJUAN' }),
              });
              setResubmitFromBAId(null);
            }
            setShowAddBAForm(false);
            setRfcNotes({});
            setApproveStartDate('');
            setEditingBAId(null);
            setNewBAForm({ nama: '', version: '0.0.1', deskripsi: '', type: activeTab });
            setBAModuleRows([]);
            await fetchProjectData();
            success(isResubmit2 ? 'BA berhasil diresubmit!' : 'BA berhasil diupdate!');
          } else {
            showError(result.error || 'Gagal mengupdate BA');
          }
        }
      } else {
        // Create new BA with modules
        const fd = buildBAFormData();

        if (fd) {
          const response = await fetch(`/api/blueprint-baru/${projectId}/complete-ba`, {
            method: 'POST',
            body: fd,
          });
          const result = await response.json();
          if (result.success) {
            setShowAddBAForm(false);
            setRfcNotes({});
            setApproveStartDate('');
            setNewBAForm({ nama: '', version: '0.0.1', deskripsi: '', type: activeTab });
            setBAModuleRows([]);
            await fetchProjectData();
            success('BA berhasil disimpan lengkap!');
          } else {
            showError(result.error || 'Gagal menyimpan BA');
          }
        } else {
          const baData = {
            nama: newBAForm.nama,
            version: newBAForm.version,
            deskripsi: newBAForm.deskripsi,
            type: newBAForm.type,
            sumber: 'LOGBOOK',
            rows: baModuleRows.map(row => {
              let moduleId: number | null = null;
              let moduleName = '';
              if (row.moduleValue.includes(':')) {
                const parts = row.moduleValue.split(':');
                moduleId = parseInt(parts[0]);
                moduleName = parts.slice(1).join(':');
              } else {
                moduleName = row.moduleValue;
              }
              return {
                moduleId,
                moduleName,
                taskName: row.taskName,
                programmerId: row.programmerId ? parseInt(row.programmerId) : null,
                jadwalMulai: row.jadwalMulai || null,
                kompleksitas: row.kompleksitas,
                gambar: row.gambar || null,
                keterangan: row.keterangan || null,
              };
            }),
          };

          const response = await fetch(`/api/blueprint-baru/${projectId}/complete-ba`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(baData),
          });

          const result = await response.json();

          if (result.success) {
            setShowAddBAForm(false);
            setRfcNotes({});
            setApproveStartDate('');
            setNewBAForm({ nama: '', version: '0.0.1', deskripsi: '', type: activeTab });
            setBAModuleRows([]);
            await fetchProjectData();
            success('BA berhasil disimpan lengkap!');
          } else {
            showError(result.error || 'Gagal menyimpan BA');
          }
        }
      }
    } catch (error) {
      console.error('Error saving BA:', error);
      showError('Error menyimpan BA');
    }
  };

  const handleApproveBA = async (baData: BAWithModules) => {
    // Get all tasks that are not approved yet
    const unapprovedTasks = baData.tasks.filter(task => !task.isApproved);
    
    if (unapprovedTasks.length === 0) {
      showError('Semua task dalam BA ini sudah di-approve.');
      return;
    }

    // Check if all tasks have required data
    const incompleteTasks = unapprovedTasks.filter(task => 
      !task.nama.trim() || !task.programmer || !task.jadwalMulai
    );

    if (incompleteTasks.length > 0) {
      let alertMessage = "⚠️ Ada task yang belum lengkap datanya:\n\n";
      incompleteTasks.forEach(task => {
        alertMessage += `• ${task.nama || 'Unnamed Task'}\n`;
        if (!task.programmer) alertMessage += "  - Programmer belum dipilih\n";
        if (!task.jadwalMulai) alertMessage += "  - Jadwal mulai belum diisi\n";
      });
      alertMessage += "\nSilakan lengkapi data task terlebih dahulu.";
      showError(alertMessage);
      return;
    }

    const confirmMessage = `Approve semua task dalam BA "${baData.ba.nama}"?\n\n` +
      `Total task yang akan di-approve: ${unapprovedTasks.length}\n\n` +
      `Ini akan membuat ${unapprovedTasks.length} tasklist baru yang bisa dikerjakan programmer.`;

    const result = await Swal.fire({
      title: 'Approve BA?',
      html: `
        <div class="text-left">
          <p class="mb-2"><strong>BA:</strong> ${baData.ba.nama}</p>
          <p class="mb-2"><strong>Total Task:</strong> ${unapprovedTasks.length}</p>
          <p class="mt-4 text-sm text-gray-600">Ini akan membuat ${unapprovedTasks.length} tasklist baru yang bisa dikerjakan programmer.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Approve Semua!',
      cancelButtonText: 'Batal',
      customClass: {
        container: 'swal-high-zindex'
      }
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      const lastDueDatePerProgrammer: Record<string, string> = {};

      // Sort tasks by jadwalMulai ascending for auto-chain
      const sortedTasks = [...unapprovedTasks].sort((a, b) => {
        const dateA = new Date(a.jadwalMulai || 0).getTime();
        const dateB = new Date(b.jadwalMulai || 0).getTime();
        return dateA - dateB;
      });

      // Approve each task with auto-chain jadwalMulai per programmer
      for (let i = 0; i < sortedTasks.length; i++) {
        const task = sortedTasks[i];
        const progId = task.programmerId ? String(task.programmerId) : 'unassigned';
        
        try {
          // Find the module for this task (check both main and sub modules)
          const baModule = [...baData.mainModules, ...baData.subModules].find(m => m.id === task.moduleId);
          
          if (baModule) {
            // Auto-chain: set jadwalMulai from previous task's calculatedDueDate of the same programmer
            if (progId !== 'unassigned' && lastDueDatePerProgrammer[progId]) {
              task.jadwalMulai = lastDueDatePerProgrammer[progId];
            }
            
            // Approve and get calculatedDueDate for next task
            const calculatedDueDate = await handleApproveSubModule(baModule as SubModule, task);
            
            if (calculatedDueDate) {
              if (progId !== 'unassigned') {
                lastDueDatePerProgrammer[progId] = calculatedDueDate;
              }
            } else {
              // Fallback: use jadwalMulai + safe offset if no calculatedDueDate returned
              const jadwalDate = new Date(task.jadwalMulai);
              const fallbackDueDate = new Date(jadwalDate.getTime() + 60 * 60 * 1000).toISOString();
              if (progId !== 'unassigned') {
                lastDueDatePerProgrammer[progId] = fallbackDueDate;
              }
            }
            
            successCount++;
          } else {
            errors.push(`Task "${task.nama}": Module tidak ditemukan`);
            errorCount++;
          }
        } catch (error) {
          console.error(`Error approving task ${task.nama}:`, error);
          errors.push(`Task "${task.nama}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          errorCount++;
        }
      }

      // Show result
      let resultMessage = `✅ Approve BA "${baData.ba.nama}" selesai!\n\n`;
      resultMessage += `Berhasil: ${successCount} task\n`;
      
      if (errorCount > 0) {
        resultMessage += `Gagal: ${errorCount} task\n\n`;
        resultMessage += "Error details:\n";
        errors.forEach(error => {
          resultMessage += `• ${error}\n`;
        });
      }

      success(resultMessage);
      
      // Update BA status and proyek_module versions
      try {
        console.log('[Frontend] Calling approve-ba API with:', {
          baId: baData.ba.id,
          baVersion: baData.ba.version,
          baName: baData.ba.nama
        });

        const approveResponse = await fetch(`/api/blueprint-baru/${projectId}/approve-ba`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            baId: baData.ba.id,
            baVersion: baData.ba.version,
            baName: baData.ba.nama
          }),
        });

        const approveResult = await approveResponse.json();
        
        if (approveResult.success) {
          console.log('[Frontend] BA approved successfully:', approveResult.data);
          if (approveResult.data.updatedModules > 0) {
            success(`✅ ${approveResult.data.updatedModules} module version berhasil di-update ke ${baData.ba.version}`);
          }
        } else {
          console.error('[Frontend] Failed to approve BA:', approveResult.error);
          showError(`Gagal update BA status: ${approveResult.error}`);
        }
      } catch (e) {
        console.error('Failed to approve BA:', e);
        showError('Error saat approve BA');
      }

      // Refresh data
      await fetchProjectData();

    } catch (error) {
      console.error('Error approving BA:', error);
      showError('Error saat approve BA');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndApproveBA = async () => {
    if (!editingBAId) {
      showError('BA ID tidak ditemukan');
      return;
    }

    try {
      setLoading(true);

      // Save BA first
      if (baModuleRows.length > 0) {
        const fd = buildBAFormData({ baId: editingBAId });

        let result: any;
        if (fd) {
          const response = await fetch(`/api/blueprint-baru/${projectId}/update-complete-ba`, {
            method: 'PUT',
            body: fd,
          });
          result = await response.json();
        } else {
          const baData = {
            baId: editingBAId,
            nama: newBAForm.nama,
            version: newBAForm.version,
            deskripsi: newBAForm.deskripsi,
            type: newBAForm.type,
            rows: baModuleRows.map(row => {
              let moduleId: number | null = null;
              let moduleName = '';
              if (row.moduleValue.includes(':')) {
                const parts = row.moduleValue.split(':');
                moduleId = parseInt(parts[0]);
                moduleName = parts.slice(1).join(':');
              } else {
                moduleName = row.moduleValue;
              }
              return {
                moduleId,
                moduleName,
                taskName: row.taskName,
                programmerId: row.programmerId ? parseInt(row.programmerId) : null,
                jadwalMulai: row.jadwalMulai || null,
                kompleksitas: row.kompleksitas,
                isApproved: row.isApproved || false,
                approvedAt: row.approvedAt || null,
                tasklistId: row.tasklistId || null,
                gambar: row.gambar || null,
                keterangan: row.keterangan || null,
              };
            }),
          };
          const response = await fetch(`/api/blueprint-baru/${projectId}/update-complete-ba`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(baData),
          });
          result = await response.json();
        }

        if (!result.success) {
          showError(result.error || 'Gagal menyimpan BA');
          setLoading(false);
          return;
        }
      }

      // Fetch fresh BA data
      const freshResponse = await fetch(`/api/blueprint-baru/${projectId}?type=${activeTab}&view=logbook`);
      const freshResult = await freshResponse.json();
      const freshBA: RawBA | undefined = freshResult.data.businessAnalysts.find((ba: RawBA) => ba.id === editingBAId);

      if (!freshBA) {
        showError('BA tidak ditemukan setelah save');
        setLoading(false);
        return;
      }

      // Transform to BAWithModules
      const mainModules = freshBA.modules.filter((m: RawModule) => m.level === 1);
      const subModules = freshBA.modules.filter((m: RawModule) => m.level === 2);
      const allTasks: Task[] = [];
      freshBA.modules.forEach((module: RawModule) => {
        module.tasklist.forEach((task: RawTask) => {
          allTasks.push({
            id: task.id,
            nama: task.namaTask,
            deskripsi: task.deskripsi,
            programmer: task.programmer,
            programmerId: task.programmerId,
            jadwalMulai: task.jadwalMulai || '',
            jadwalExternal: task.jadwalExternal,
                durasiPengerjaan: task.durasiPengerjaan,
            kompleksitas: task.kompleksitas,
            moduleId: module.id,
            isApproved: task.isApproved || false,
            approvedAt: task.approvedAt || null,
            tasklistId: task.tasklistId || null,
          });
        });
      });

      const freshBAWithModules: BAWithModules = {
        ba: { 
          id: freshBA.id, 
          nama: freshBA.ba, 
          version: freshBA.baVersion, 
          deskripsi: freshBA.deskripsi || '' 
        },
        mainModules: mainModules.map((m: RawModule) => ({
          id: m.id, 
          kode: m.kode, 
          nama: m.modul, 
          ba: freshBA.ba, 
          baVersion: freshBA.baVersion, 
          isAppModule: m.isAppModule || false
        })),
        subModules: subModules.map((m: RawModule) => ({
          id: m.id, 
          kode: m.kode, 
          nama: m.modul, 
          parentId: m.parentId, 
          isAppModule: m.isAppModule || false,
          gambar: m.gambar || null,
          keterangan: m.keterangan || null,
        })),
        tasks: allTasks,
        note: '',
      };

      // Approve BA
      await handleApproveBA(freshBAWithModules);

      // Update status to PROSES_DEVELOPMENT
      const statusResponse = await fetch(`/api/blueprint-baru/${projectId}/ba/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baId: editingBAId, status: 'PROSES_DEVELOPMENT' })
      });

      const statusResult = await statusResponse.json();
      if (statusResult.success) {
        success('Status berhasil diubah ke Proses Development');
      }

      setShowAddBAForm(false);
      setRfcNotes({});
      setApproveStartDate('');
      setEditingBAId(null);
      setResubmitFromBAId(null);
      setNewBAForm({ nama: '', version: '0.0.1', deskripsi: '', type: activeTab });
      setBAModuleRows([]);
      setIsApproveMode(false);

      await fetchProjectData();

    } catch (error) {
      console.error('Error saving and approving:', error);
      showError('Terjadi kesalahan saat menyimpan dan approve BA');
      setLoading(false);
    }
  };

  const handleAddModule = async (baId: number) => {
    if (!newModuleForm.mainModuleId && !newModuleForm.mainModuleName.trim()) {
      showError('Pilih atau buat main module');
      return;
    }

    try {
      // Handle edit mode
      if (editingModuleId) {
        const response = await fetch(`/api/blueprint-baru/${projectId}/blueprint-module`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleId: editingModuleId,
            nama: newModuleForm.mainModuleName,
            version: '0.0.1',
          }),
        });

        const result = await response.json();

        if (result.success) {
          setShowAddModuleForm(null);
          setEditingModuleId(null);
          setNewModuleForm({
            mainModuleId: '',
            mainModuleName: '',
            subModuleName: '',
            taskName: '',
            programmerId: '',
            jadwalMulai: '',
            kompleksitas: 'MEDIUM',
          });
          await fetchProjectData();
        } else {
          showError(result.error || 'Gagal mengupdate module');
        }
        return;
      }

      // Handle edit task mode
      if (editingTaskId) {
        const response = await fetch(`/api/blueprint-baru/${projectId}/task-ba-blueprint`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskBAId: editingTaskId,
            nama: newModuleForm.taskName,
            programmerId: newModuleForm.programmerId ? parseInt(newModuleForm.programmerId) : null,
            jadwalMulai: newModuleForm.jadwalMulai || null,
            kompleksitas: newModuleForm.kompleksitas,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setShowAddModuleForm(null);
          setEditingTaskId(null);
          setNewModuleForm({
            mainModuleId: '',
            mainModuleName: '',
            subModuleName: '',
            taskName: '',
            programmerId: '',
            jadwalMulai: '',
            kompleksitas: 'MEDIUM',
          });
          await fetchProjectData();
        } else {
          showError(result.error || 'Gagal mengupdate task');
        }
        return;
      }

      let mainModuleId = newModuleForm.mainModuleId;

      // Step 1: Create main module if it's new
      if (!mainModuleId && newModuleForm.mainModuleName.trim()) {
        const mainModuleResponse = await fetch(`/api/blueprint-baru/${projectId}/blueprint-module`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baId,
            parentId: null,
            nama: newModuleForm.mainModuleName,
            kode: '01',
            level: 1, // Main module
            version: '0.0.1',
          }),
        });

        const mainModuleResult = await mainModuleResponse.json();

        if (!mainModuleResult.success) {
          showError(mainModuleResult.error || 'Gagal membuat main module');
          return;
        }

        mainModuleId = mainModuleResult.data.id.toString();
      }

      // Step 2: Create sub module if provided
      let targetModuleId = mainModuleId;
      if (newModuleForm.subModuleName.trim()) {
        const subModuleResponse = await fetch(`/api/blueprint-baru/${projectId}/blueprint-module`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baId,
            parentId: parseInt(mainModuleId),
            nama: newModuleForm.subModuleName,
            kode: '01.01',
            level: 2, // Sub module
            version: '0.0.1',
          }),
        });

        const subModuleResult = await subModuleResponse.json();

        if (!subModuleResult.success) {
          showError(subModuleResult.error || 'Gagal membuat sub module');
          return;
        }

        targetModuleId = subModuleResult.data.id.toString();
      }

      // Step 3: Create task BA if provided
      if (newModuleForm.taskName.trim()) {
        const taskResponse = await fetch(`/api/blueprint-baru/${projectId}/task-ba-blueprint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleId: parseInt(targetModuleId),
            nama: newModuleForm.taskName,
            deskripsi: newModuleForm.taskName,
            programmerId: newModuleForm.programmerId ? parseInt(newModuleForm.programmerId) : null,
            jadwalMulai: newModuleForm.jadwalMulai || null,
            kompleksitas: newModuleForm.kompleksitas,
          }),
        });

        const taskResult = await taskResponse.json();

        if (!taskResult.success) {
          console.error('Warning: Task creation failed:', taskResult.error);
          showError('Module berhasil dibuat, tapi task gagal: ' + taskResult.error);
        }
      }

      setShowAddModuleForm(null);
      setNewModuleForm({
        mainModuleId: '',
        mainModuleName: '',
        subModuleName: '',
        taskName: '',
        programmerId: '',
        jadwalMulai: '',
        kompleksitas: 'MEDIUM',
      });
      await fetchProjectData();
    } catch (error) {
      console.error('Error adding module:', error);
      showError('Error menambah module');
    }
  };

  const handleEditModule = (moduleId: string, moduleName: string) => {
    setEditingModuleId(moduleId);
    setNewModuleForm({
      ...newModuleForm,
      mainModuleName: moduleName,
    });
    setShowAddModuleForm('edit');
  };

  const handleDeleteModule = async (moduleId: string) => {
    const result = await Swal.fire({
      title: 'Hapus Module?',
      text: 'Apakah Anda yakin ingin menghapus module ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      customClass: {
        container: 'swal-high-zindex'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/blueprint-baru/${projectId}/blueprint-module?moduleId=${moduleId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await fetchProjectData();
        success('Module berhasil dihapus');
      } else {
        showError(result.error || 'Gagal menghapus module');
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      showError('Error menghapus module');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setNewModuleForm({
      ...newModuleForm,
      taskName: task.nama,
      programmerId: task.programmer ? programmers.find(p => p.namaLengkap === task.programmer)?.id.toString() || '' : '',
      jadwalMulai: task.jadwalMulai,
      kompleksitas: task.kompleksitas,
    });
    setShowAddModuleForm('edit-task');
  };

  const handleDeleteTask = async (taskId: string) => {
    const result = await Swal.fire({
      title: 'Hapus Task?',
      text: 'Apakah Anda yakin ingin menghapus task ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      customClass: {
        container: 'swal-high-zindex'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/blueprint-baru/${projectId}/task-ba-blueprint?taskBAId=${taskId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await fetchProjectData();
        success('Task berhasil dihapus');
      } else {
        showError(result.error || 'Gagal menghapus task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      showError('Error menghapus task');
    }
  };

  const handleApproveSubModule = async (subModule: SubModule, task?: Task) => {
    console.log('handleApproveSubModule called with:', { subModule, task });
    
    if (!task) {
      showError('Sub module harus memiliki task untuk di-approve');
      return;
    }

    try {
      console.log('Starting approval process...');

      // Step 1: Check if main and sub modules exist in proyek_module
      console.log('Step 1: Checking modules...');
      const checkResponse = await fetch(`/api/blueprint-baru/${projectId}/check-modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subModuleId: subModule.id,
        }),
      });

      const checkResult = await checkResponse.json();
      console.log('Check modules result:', checkResult);

      if (!checkResult.success) {
        console.error('Check modules failed:', checkResult.error);
        throw new Error(checkResult.error || 'Gagal mengecek module');
      }

      // Step 2: Create tasklist using existing task data
      console.log('Step 2: Creating tasklist...');
      console.log('Available programmers:', programmers);
      console.log('Task programmer name:', task.programmer);
      
      let programmerId = null;
      if (task.programmer && task.programmer !== 'Unknown' && task.programmer.trim() !== '') {
        const foundProgrammer = programmers.find(p => p.namaLengkap === task.programmer);
        programmerId = foundProgrammer?.id || null;
        console.log('Programmer ID found:', programmerId);
        
        if (!foundProgrammer) {
          console.warn('Programmer not found in list:', task.programmer);
          console.log('Available programmer names:', programmers.map(p => p.namaLengkap));
        }
      } else {
        console.log('No programmer assigned to task');
      }
      
      const tasklistPayload = {
        moduleId: checkResult.data.moduleId, // ID from proyek_module
        pegawaiId: programmerId,
        scheduleAt: task.jadwalMulai ? new Date(task.jadwalMulai).toISOString() : new Date().toISOString(),
        keterangan: task.nama,
        taskComplexity: task.kompleksitas,
        tasklistType: 'BLUEPRINT',
        chatMessage: subModule.keterangan || null,
        chatFileUrl: subModule.gambar || null,
      };
      console.log('Tasklist payload:', tasklistPayload);
      
      const tasklistResponse = await fetch(`/api/blueprint-baru/${projectId}/create-tasklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: checkResult.data.moduleId, // ID from proyek_module
          pegawaiId: programmerId,
          scheduleAt: task.jadwalMulai ? new Date(task.jadwalMulai).toISOString() : new Date().toISOString(),
          keterangan: task.nama,
          taskComplexity: task.kompleksitas,
          tasklistType: 'BLUEPRINT',
          taskBAId: task.id, // Add task BA ID for marking as approved
          baVersion: newBAForm.version, // ← TAMBAHKAN INI
          baName: newBAForm.nama, // ← TAMBAHKAN INI
          chatMessage: subModule.keterangan || null,
          chatFileUrl: subModule.gambar || null,
          durasi: task.durasiPengerjaan || null,
        }),
      });

      const tasklistResult = await tasklistResponse.json();
      console.log('Tasklist creation result:', tasklistResult);

      if (!tasklistResult.success) {
        console.error('Tasklist creation failed:', tasklistResult.error);
        throw new Error(tasklistResult.error || 'Gagal membuat tasklist');
      }
      
      // Success - no need to show individual success messages, will be shown in batch
      console.log(`Tasklist created successfully: ${tasklistResult.data.kode}, dueDate: ${tasklistResult.data.calculatedDueDate}`);
      
      return tasklistResult.data.calculatedDueDate || null;
      
    } catch (error) {
      console.error('Error approving sub module:', error);
      throw error; // Re-throw to be caught by handleApproveBA
    }
  };

  const handleExportPDF = async (baId: number, baName: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blueprint-baru/${projectId}/ba/${baId}/export-pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BA_${baName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      success('PDF berhasil didownload!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showError('Gagal export PDF');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 dark:text-white">Memuat Data...</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Mohon tunggu sebentar</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Project tidak ditemukan</p>
          <button
            onClick={() => router.push('/blueprint-baru')}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            ← Kembali ke List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 relative">
      {/* Loading Overlay - shows when operations are in progress */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100000]">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white">Memproses...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Mohon tunggu sebentar</p>
            </div>
          </div>
        </div>
      )}

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
            BA Detail - {project.namaProyek}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Client: {project.client || "-"} | Kode: {project.kodeProyek}
          </p>
        </div>

        {/* Tab untuk Blueprint vs Berita Acara */}
        <BATypeTabs
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          blueprintCount={baList.filter(ba => ba.ba.type === 'BLUEPRINT').length}
          beritaAcaraCount={baList.filter(ba => ba.ba.type === 'BERITA_ACARA').length}
        />

        {/* Production Version Info Panel */}
        <div className="mx-6 mt-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl shadow-sm transition-all duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <CheckCircle size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                  Informasi Versi Aktif
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Versi dasar dari {activeTab === 'BLUEPRINT' ? 'Blueprint' : 'Berita Acara'} ter-approve terakhir yang akan digunakan sebagai referensi versi untuk tasklist baru.
                </p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-right shrink-0 shadow-sm w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">Versi Terakhir</span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono">
                {lastApprovedBAVersion ? `v${lastApprovedBAVersion}` : '0.0.1 (Default)'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Tombol Import Excel & Tambah BA */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mb-4">
            {/* Tombol Download Template */}
            <button
              onClick={() => {
                downloadExcelTemplate();
                success('Template Excel berhasil didownload!');
              }}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors w-full sm:w-auto"
            >
              <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="whitespace-nowrap">Download Template</span>
            </button>

            {/* Tombol Import Excel */}
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
            >
              <Upload size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="whitespace-nowrap">Import Excel</span>
            </button>

            {/* Tombol Tambah BA */}
            <button
              onClick={() => {
                const defaultVersion = lastApprovedBAVersion 
                  ? incrementVersion(lastApprovedBAVersion) 
                  : '0.0.1';
                setNewBAForm({ 
                  nama: '', 
                  version: defaultVersion, 
                  deskripsi: '', 
                  type: activeTab 
                });
                setIsApproveMode(false);
                setShowAddBAForm(true);
              }}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
            >
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="whitespace-nowrap">Tambah {activeTab === 'BLUEPRINT' ? 'Blueprint' : 'Berita Acara'}</span>
            </button>
          </div>

          {/* Modal Tambah BA */}
          {showAddBAForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-[98vw] max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {isApproveMode 
                          ? `Approve ${newBAForm.type === 'BLUEPRINT' ? 'Blueprint' : 'Berita Acara'}` 
                          : (editingBAId 
                            ? `Edit ${newBAForm.type === 'BLUEPRINT' ? 'Blueprint' : 'Berita Acara'}` 
                            : (resubmitFromBAId 
                              ? `Resubmit ${newBAForm.type === 'BLUEPRINT' ? 'Blueprint' : 'Berita Acara'}` 
                              : `Tambah ${newBAForm.type === 'BLUEPRINT' ? 'Blueprint' : 'Berita Acara'} Baru`
                            )
                          )
                        }
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {isApproveMode 
                          ? 'Isi jadwal dan programmer untuk pembuatan Tasklist' 
                          : `Buat struktur modul dan task untuk ${newBAForm.type === 'BLUEPRINT' ? 'Blueprint' : 'Berita Acara'}`
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowAddBAForm(false);
                        setEditingBAId(null);
                        setIsApproveMode(false);
                        setResubmitFromBAId(null);
                        setRfcNotes({});
                        setApproveStartDate('');
                        setNewBAForm({ nama: '', version: '0.0.1', deskripsi: '', type: activeTab });
                        setBAModuleRows([]);
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Step 1: BA Information */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                        Informasi Berita Acara
                      </h5>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Nama Berita Acara <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newBAForm.nama}
                          onChange={(e) => setNewBAForm({ ...newBAForm, nama: e.target.value })}
                          placeholder="Contoh: User Management System"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Versi <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newBAForm.version}
                          onChange={(e) => setNewBAForm({ ...newBAForm, version: e.target.value })}
                          placeholder="Contoh: 0.0.1"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {lastApprovedBAVersion && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            BA terakhir yang di-approve: <span className="font-semibold text-blue-600 dark:text-blue-400">versi {lastApprovedBAVersion}</span>
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Deskripsi Berita Acara
                        </label>
                        <textarea
                          value={newBAForm.deskripsi}
                          onChange={(e) => setNewBAForm({ ...newBAForm, deskripsi: e.target.value })}
                          placeholder="Jelaskan tujuan dan ruang lingkup Berita Acara ini..."
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Opsional: Tambahkan deskripsi untuk memberikan konteks lebih jelas tentang BA ini
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Approval Start Date */}
                  {isApproveMode && (
                    <div className="mb-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center gap-3">
                      <label className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                        Jadwal Mulai <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={approveStartDate}
                        onChange={(e) => {
                          setApproveStartDate(e.target.value);
                          chainAllJadwalMulai(e.target.value);
                        }}
                        className="w-auto px-2 py-1.5 text-xs border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <p className="text-xs text-indigo-500 dark:text-indigo-400">
                        Isi jadwal mulai, maka semua task akan terisi otomatis berdasarkan durasi masing-masing.
                      </p>
                    </div>
                  )}

                  {/* Step 2: Modules & Tasks */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                            Module & Task
                          </h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isApproveMode ? 'Review dan approve task yang sudah dibuat' : 'Pilih module dan isi detail task'}
                          </p>
                        </div>
                      </div>
                      {!isApproveMode && (
                        <button
                          onClick={handleAddRow}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                          <Plus size={18} />
                          Tambah Baris
                        </button>
                      )}
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                            <tr>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[280px]">
                                Module
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[200px]">
                                Nama Task
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                                Gambar
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[200px]">
                                Keterangan
                              </th>
                              {isApproveMode && (
                                <>
                                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[180px]">
                                    Programmer
                                  </th>
                                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                                    Jadwal Mulai
                                  </th>
                                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[140px]">
                                    Kompleksitas
                                  </th>
                                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                                    Durasi (Jam)
                                  </th>
                                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[130px]">
                                    Status Task
                                  </th>
                                </>
                              )}
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[80px]">
                                Aksi
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {baModuleRows.length === 0 ? (
                              <tr>
                                <td colSpan={isApproveMode ? 10 : 5} className="px-6 py-12 text-center">
                                  <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                      <Plus size={24} className="text-gray-400" />
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400 font-medium">Belum ada baris</p>
                                      <p className="text-sm text-gray-400 dark:text-gray-500">Klik &apos;Tambah Baris&apos; untuk memulai</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                            baModuleRows.map((row) => (
                              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-3 py-3 border-r border-gray-100 dark:border-gray-800 last:border-0">
                                  <select
                                    value={row.moduleValue}
                                    onChange={(e) => updateBAModuleRow(row.id, 'moduleValue', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={isApproveMode}
                                  >
                                    <option value="">Pilih module...</option>
                                    {(() => {
                                      const renderModuleOptions = (parentId: number | null = null, depth: number = 0): JSX.Element[] => {
                                        const indent = '\u00A0'.repeat(depth * 4);
                                        const prefix = depth === 0 ? '📦 ' : '└─ ';
                                        return projectModules
                                          .filter(m => m.parentId === parentId)
                                          .flatMap(module => [
                                            <option key={module.id} value={`${module.id}:${module.nama}`}>
                                              {indent}{prefix}{module.nama}{module.baVersion ? ` - (${module.baVersion})` : ''}
                                            </option>,
                                            ...renderModuleOptions(module.id, depth + 1)
                                          ]);
                                      };
                                      return renderModuleOptions();
                                    })()}
                                    {row.moduleValue && !row.moduleValue.includes(':') && !projectModules.some(m => m.nama === row.moduleValue) && (
                                      <option value={row.moduleValue}>{row.moduleValue}</option>
                                    )}
                                  </select>
                                </td>
                                <td className="px-3 py-3 border-r border-gray-100 dark:border-gray-800 last:border-0">
                                  {isApproveMode ? (
                                    <span className="text-sm text-gray-900 dark:text-white px-1">{row.taskName || '-'}</span>
                                  ) : (
                                    <input
                                      type="text"
                                      value={row.taskName}
                                      onChange={(e) => updateBAModuleRow(row.id, 'taskName', e.target.value)}
                                      placeholder="Nama task..."
                                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                  )}
                                </td>
                                <td className="px-3 py-3 border-r border-gray-100 dark:border-gray-800 last:border-0">
                                  <div className="flex flex-col gap-2">
                                    {row.gambar ? (
                                      <div className="relative group">
                                        <img
                                          src={row.gambar}
                                          alt="Preview"
                                          className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => {
                                            setPreviewImageUrl(row.gambar!);
                                            setPreviewImageTitle(row.taskName || 'Gambar');
                                            setShowImagePreview(true);
                                          }}
                                        />
                                        {!isApproveMode && (
                                          <button
                                            onClick={() => updateBAModuleRow(row.id, 'gambar', '')}
                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Hapus gambar"
                                          >
                                            <X size={12} />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      isApproveMode ? (
                                        <span className="text-sm text-gray-400">-</span>
                                      ) : (
                                        <label className="flex flex-col items-center justify-center w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                                          <Upload size={16} className="text-gray-400" />
                                          <span className="text-[10px] text-gray-400 mt-1">Upload</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                const previewUrl = URL.createObjectURL(file);
                                                updateBAModuleRow(row.id, 'gambar', previewUrl);
                                                updateBAModuleRow(row.id, 'gambarFile', file);
                                              }
                                            }}
                                          />
                                        </label>
                                      )
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3 border-r border-gray-100 dark:border-gray-800 last:border-0">
                                  {isApproveMode ? (
                                    <span className="text-sm text-gray-900 dark:text-white px-1">{row.keterangan || '-'}</span>
                                  ) : (
                                    <textarea
                                      value={row.keterangan || ''}
                                      onChange={(e) => updateBAModuleRow(row.id, 'keterangan', e.target.value)}
                                      placeholder="Keterangan..."
                                      rows={2}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    />
                                  )}
                                </td>
                                {isApproveMode && (
                                  <>
                                    <td className="px-3 py-3 border-r border-gray-100 dark:border-gray-800 last:border-0">
                                      <select
                                        value={row.programmerId}
                                        onChange={(e) => updateBAModuleRow(row.id, 'programmerId', e.target.value)}
                                        disabled
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                                      >
                                        <option value="">Pilih programmer...</option>
                                        {programmers.map(p => (
                                          <option key={p.id} value={p.id}>{p.namaLengkap}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-3 py-3 border-r border-gray-100 dark:border-gray-800 last:border-0">
                                      <input
                                        type="datetime-local"
                                        value={row.jadwalMulai}
                                        disabled
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                                      />
                                    </td>
                                    <td className="px-3 py-3 border-r border-gray-100 dark:border-gray-800 last:border-0">
                                      <select
                                        value={row.kompleksitas}
                                        disabled
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                                      >
                                        <option value="EASY">EASY</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HARD">HARD</option>
                                      </select>
                                    </td>
                                    <td className="px-3 py-3 border-r border-gray-100 dark:border-gray-800 last:border-0">
                                      <span className="text-sm text-gray-900 dark:text-white">
                                        {row.durasi ? `${row.durasi} jam` : '-'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3 border-r border-gray-100 dark:border-gray-800 last:border-0">
                                      <div className="flex items-center">
                                        {row.isApproved ? (
                                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full" title={`Approved at ${row.approvedAt}`}>
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            Approved
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full">
                                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                            Draft
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </>
                                )}
                                <td className="px-3 py-3">
                                  {!isApproveMode && (
                                    <button
                                      onClick={() => handleDeleteBAModuleRow(row.id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                      title="Hapus"
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Action Buttons */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                            Simpan Blueprint
                          </h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Pastikan semua informasi sudah benar sebelum menyimpan
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowAddBAForm(false);
                            setEditingBAId(null);
                            setIsApproveMode(false);
                            setResubmitFromBAId(null);
                            setRfcNotes({});
                            setApproveStartDate('');
                            setNewBAForm({ nama: '', version: '0.0.1', deskripsi: '', type: activeTab });
                            setBAModuleRows([]);
                          }}
                          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                        >
                          Batal
                        </button>
                        <button
                          onClick={isApproveMode ? handleSaveAndApproveBA : handleSaveCompleteBA}
                          disabled={!newBAForm.nama.trim() || !newBAForm.version.trim()}
                          className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isApproveMode ? (activeTab === 'BLUEPRINT' ? 'Approve Blueprint' : 'Approve BA') : (editingBAId ? `Update ${newBAForm.type === 'BLUEPRINT' ? 'Blueprint' : 'Berita Acara'}` : (resubmitFromBAId ? `Resubmit ${newBAForm.type === 'BLUEPRINT' ? 'Blueprint' : 'Berita Acara'}` : `Simpan ${newBAForm.type === 'BLUEPRINT' ? 'Blueprint' : 'Berita Acara'}`))}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Tambah Modul */}
          {showAddModuleForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {editingModuleId ? 'Edit Module' : editingTaskId ? 'Edit Task' : 'Tambah Modul'}
                    </h4>
                    <button
                      onClick={() => setShowAddModuleForm(null)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    {/* Main Module Selection */}
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Main Module <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newModuleForm.mainModuleId}
                        onChange={(e) => setNewModuleForm({ ...newModuleForm, mainModuleId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">-- Pilih atau Buat Baru --</option>
                        {baList.find(ba => `${ba.ba.id}` === showAddModuleForm)?.mainModules.map(m => (
                          <option key={m.id} value={m.id}>{m.nama}</option>
                        ))}
                      </select>
                    </div>

                    {/* Main Module Name (if creating new) */}
                    {!newModuleForm.mainModuleId && (
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Nama Main Module Baru
                        </label>
                        <input
                          type="text"
                          value={newModuleForm.mainModuleName}
                          onChange={(e) => setNewModuleForm({ ...newModuleForm, mainModuleName: e.target.value })}
                          placeholder="Masukkan nama main module..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    )}

                    {/* Sub Module Name */}
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Nama Sub Module
                      </label>
                      <input
                        type="text"
                        value={newModuleForm.subModuleName}
                        onChange={(e) => setNewModuleForm({ ...newModuleForm, subModuleName: e.target.value })}
                        placeholder="Masukkan nama sub module..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Task BA */}
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Task BA
                      </label>
                      <input
                        type="text"
                        value={newModuleForm.taskName}
                        onChange={(e) => setNewModuleForm({ ...newModuleForm, taskName: e.target.value })}
                        placeholder="Masukkan nama task..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Programmer */}
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Programmer
                      </label>
                      <select
                        value={newModuleForm.programmerId}
                        onChange={(e) => setNewModuleForm({ ...newModuleForm, programmerId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">-- Pilih Programmer --</option>
                        {programmers.map(p => (
                          <option key={p.id} value={p.id}>{p.namaLengkap}</option>
                        ))}
                      </select>
                    </div>

                    {/* Jadwal Mulai */}
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Jadwal Mulai
                      </label>
                      <input
                        type="datetime"
                        value={newModuleForm.jadwalMulai}
                        onChange={(e) => setNewModuleForm({ ...newModuleForm, jadwalMulai: e.target.value })}
                        className=""
                      />
                    </div>

                    {/* Kompleksitas */}
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Kompleksitas
                      </label>
                      <select
                        value={newModuleForm.kompleksitas}
                        onChange={(e) => setNewModuleForm({ ...newModuleForm, kompleksitas: e.target.value as 'EASY' | 'MEDIUM' | 'HARD' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="EASY">EASY</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HARD">HARD</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowAddModuleForm(null)}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleAddModule(parseInt(showAddModuleForm))}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      {editingModuleId || editingTaskId ? 'Update' : 'Simpan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BA List */}
          {baList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                Belum ada data
              </p>
            </div>
          ) : (
            baList.map((baData) => {
              const baKey = `${baData.ba.id}`;
              const isExpanded = expandedBA === baKey;
              
              const totalTasks = baData.tasks.length;
              const approvedTasks = baData.tasks.filter(t => t.isApproved).length;
              const isFullyApproved = totalTasks > 0 && approvedTasks === totalTasks;
              const isPartiallyApproved = approvedTasks > 0 && approvedTasks < totalTasks;
              const hasRevisi = baData.tasks.some(t => t.revisiKeterangan);

              return (
                <div key={baKey} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* BA Header */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div
                        onClick={() => toggleBA(baKey)}
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        {isExpanded ? (
                          <ChevronUp size={20} className="text-gray-600 dark:text-gray-400" />
                        ) : (
                          <ChevronDown size={20} className="text-gray-600 dark:text-gray-400" />
                        )}
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {baData.ba.nama} - v{baData.ba.version}
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${baData.ba.status === 'RFC' && baData.ba.isNonaktif ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : getStatusColor(baData.ba.status || 'DRAFT')}`}>
                            {baData.ba.status === 'APPROVED' && <Check size={12} />}
                            {(baData.ba.status === 'SIAP_UAT' || baData.ba.status === 'UAT_INTERNAL' || baData.ba.status === 'UAT_EXTERNAL') && <Play size={12} />}
                            {(baData.ba.status === 'SELESAI_UAT' || baData.ba.status === 'UAT_INTERNAL_SELESAI' || baData.ba.status === 'UAT_EXTERNAL_SELESAI' || baData.ba.status === 'SELESAI') && <CheckCircle size={12} />}
                            {baData.ba.status === 'MENUNGGU_APPROVAL' && <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>}
                            {baData.ba.status === 'DRAFT' && <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>}
                            {baData.ba.status === 'RFC' && baData.ba.isNonaktif
                              ? 'RFC Resubmit'
                              : baData.ba.status === 'RFC'
                                ? `RFC${(baData.ba.rfcCount ?? 0) > 1 ? ` #${baData.ba.rfcCount}` : ''}`
                                : getStatusDisplayName(baData.ba.status || 'DRAFT')}
                          </span>
                          {baData.ba.isNonaktif && baData.ba.idBlueprintBaru && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                              → {baList.find(b => b.ba.id === baData.ba.idBlueprintBaru)?.ba.nama || `Blueprint #${baData.ba.idBlueprintBaru}`}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-2">
                              {new Date(baData.ba.createdAt).toLocaleDateString('id-ID', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </span>
                          {hasRevisi && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                              Ada Revisi
                            </span>
                          )}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleExportPDF(baData.ba.id, baData.ba.nama)}
                          className="flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors whitespace-nowrap"
                          title="Export PDF"
                        >
                          <Download size={14} />
                          <span className="hidden sm:inline">Export PDF</span>
                          <span className="sm:hidden">PDF</span>
                        </button>
                        {baData.ba.status === 'DRAFT' && (
                          <button
                            onClick={() => handleUpdateStatus(baData.ba.id, 'PENGAJUAN')}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            title="Kirim pengajuan"
                          >
                            <RefreshCw size={14} />
                            Kirim Pengajuan
                          </button>
                        )}
                        {baData.ba.status === 'PENGAJUAN' && (
                          <button
                            onClick={() => handleUpdateStatus(baData.ba.id, 'REVIEW')}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                            title="Kirim ke review"
                          >
                            <Check size={14} />
                            Review
                          </button>
                        )}
                        {baData.ba.status === 'REVIEW' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateStatus(baData.ba.id, 'RFC')}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                              title="Request For Change"
                            >
                              <RefreshCw size={14} />
                              RFC
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(baData.ba.id, 'CED')}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                              title="Change Evaluation Document"
                            >
                              <Check size={14} />
                              CED
                            </button>
                          </div>
                        )}
                        {baData.ba.status === 'RFC' && (
                          <div className="flex gap-2 items-center">
                            {baData.ba.fileRFC && (
                              <a
                                href={`/api/files${baData.ba.fileRFC.replace('/uploads', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                title="Download File RFC"
                              >
                                <Download size={14} />
                                File RFC
                              </a>
                            )}
                            {!baData.ba.isNonaktif && (
                              <button
                                onClick={() => handleResubmitBA(baData)}
                                className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                title="Resubmit Blueprint"
                              >
                                <RefreshCw size={14} />
                                Resubmit
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const ba = baList.find(b => b.ba.id === baData.ba.id);
                                if (ba) {
                                  setRfcModalMode('view');
                                  setRfcModuleBAda(ba);
                                  setShowRfcModuleModal(true);
                                }
                              }}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                              title="Lihat riwayat RFC"
                            >
                              <RefreshCw size={14} />
                              Riwayat RFC
                            </button>
                          </div>
                        )}
                        {hasRevisi && ['DEVELOPMENT', 'PROSES_DEVELOPMENT', 'UAT_INTERNAL', 'UAT_EXTERNAL', 'UAT_INTERNAL_SELESAI', 'UAT_EXTERNAL_SELESAI', 'SELESAI'].includes(baData.ba.status || '') && (
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => {
                                const ba = baList.find(b => b.ba.id === baData.ba.id);
                                if (ba) {
                                  setUatRevisiBA(ba);
                                  setShowUatRevisiModal(true);
                                }
                              }}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                              title="Lihat riwayat revisi UAT"
                            >
                              <RotateCcw size={14} />
                              Riwayat Revisi UAT
                            </button>
                          </div>
                        )}
                        {baData.ba.status === 'CED' && (
                          <div className="flex gap-2 items-center">
                            {baData.ba.fileCED && (
                              <a
                                href={`/api/files${baData.ba.fileCED.replace('/uploads', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                title="Download File CED"
                              >
                                <Download size={14} />
                                File CED
                              </a>
                            )}
                            <button
                              onClick={() => {
                                const ba = baList.find(b => b.ba.id === baData.ba.id);
                                if (ba) {
                                  setCedModalMode('view');
                                  setCedModuleBAda(ba);
                                  setShowCedModuleModal(true);
                                }
                              }}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                              title="Lihat riwayat CED"
                            >
                              <RefreshCw size={14} />
                              Riwayat CED
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(baData.ba.id, 'DEVELOPMENT')}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                              title="Lanjut ke Development"
                            >
                              <Play size={14} />
                              Lanjut Development
                            </button>
                          </div>
                        )}
                        {baData.ba.status === 'DEVELOPMENT' && (
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => handleOpenApproveModal(baData)}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                              title="Mulai development & buat tasklist"
                            >
                              <Play size={14} />
                              Mulai Development
                            </button>
                          </div>
                        )}
                        {baData.ba.status === 'PROSES_DEVELOPMENT' && (
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => handleUpdateStatus(baData.ba.id, 'UAT_INTERNAL')}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
                              title="Mulai UAT Internal"
                            >
                              <Play size={14} />
                              UAT Internal
                            </button>
                          </div>
                        )}
                        {baData.ba.status === 'UAT_INTERNAL' && (
                          <button
                            onClick={() => {
                              setSelectedBAForUAT({ id: baData.ba.id, nama: baData.ba.nama });
                              setUatApprovalMode('internal');
                              setShowUATModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
                            title="Proses UAT Internal"
                          >
                            <Check size={14} />
                            Proses UAT Internal
                          </button>
                        )}
                        {baData.ba.status === 'UAT_INTERNAL_SELESAI' && (
                          <button
                            onClick={() => handleUpdateStatus(baData.ba.id, 'UAT_EXTERNAL')}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
                            title="Kirim ke UAT External"
                          >
                            <Play size={14} />
                            Kirim UAT External
                          </button>
                        )}
                        {baData.ba.status === 'UAT_EXTERNAL' && (
                          <button
                            onClick={() => {
                              setSelectedBAForUAT({ id: baData.ba.id, nama: baData.ba.nama });
                              setUatApprovalMode('external');
                              setShowUATModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
                            title="Proses UAT External"
                          >
                            <Check size={14} />
                            Proses UAT External
                          </button>
                        )}
                        {baData.ba.status === 'SELESAI' && (
                          <div className="flex gap-2 items-center">
                            {baData.ba.fileCED && (
                              <a
                                href={baData.ba.fileCED}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                title="Download File CED"
                              >
                                <Download size={14} />
                                File CED
                              </a>
                            )}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setSelectedBAForChat({ id: baData.ba.id, nama: baData.ba.nama, version: baData.ba.version });
                            setShowChatModal(true);
                          }}
                          className="flex items-center gap-1 p-1.5 sm:p-2 text-teal-600 hover:bg-teal-100 dark:hover:bg-teal-900/20 rounded transition-colors"
                          title="Chat Blueprint"
                        >
                          <MessageCircle size={14} className="sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline text-xs font-medium">Chat</span>
                        </button>
                        <button
                          onClick={() => handleEditBA(baData.ba)}
                          className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="Edit BA"
                        >
                          <Edit2 size={14} className="sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBA(baData.ba.id)}
                          className="p-1.5 sm:p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Hapus BA"
                        >
                          <Trash2 size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* BA Content */}
                  {isExpanded && (
                    <div className="p-4 space-y-4">
                      {/* Module Table */}
                      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full">
                          <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Module
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Task BA
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Programmer
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Jadwal Mulai
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Kompleksitas
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Gambar
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Keterangan
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Revisi
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {(() => {
                              const allBAmodules = [
                                ...baData.mainModules,
                                ...baData.subModules,
                              ];
                              if (allBAmodules.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                      Belum ada module
                                    </td>
                                  </tr>
                                );
                              }
                              return allBAmodules.flatMap(mod => {
                                const tasks = baData.tasks.filter(t => t.moduleId === mod.id);
                                if (tasks.length === 0) {
                                  return (
                                    <tr key={mod.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                        {mod.nama}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                                        -
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                        -
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                        -
                                      </td>
                                      <td className="px-4 py-3 text-sm">
                                        -
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                        {mod.gambar ? (
                                          <img src={mod.gambar} alt="Gambar" className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => {
                                              setPreviewImageUrl(mod.gambar!);
                                              setPreviewImageTitle(mod.nama || 'Gambar');
                                              setShowImagePreview(true);
                                            }}
                                          />
                                        ) : '-'}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                                        {mod.keterangan || '-'}
                                      </td>
                                      <td className="px-4 py-3 text-sm">
                                        -
                                      </td>
                                    </tr>
                                  );
                                }
                                return tasks.map((task, idx) => (
                                  <tr key={`${mod.id}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                      {mod.nama}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                                      {task.nama}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                      {task.programmer}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                      {task.jadwalMulai}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getKompleksitasBadge(task.kompleksitas)}`}>
                                        {task.kompleksitas}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                      {mod.gambar ? (
                                        <img src={mod.gambar} alt="Gambar" className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => {
                                            setPreviewImageUrl(mod.gambar!);
                                            setPreviewImageTitle(mod.nama || 'Gambar');
                                            setShowImagePreview(true);
                                          }}
                                        />
                                      ) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                                      {mod.keterangan || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {task.revisiKeterangan ? (
                                        <div className="flex flex-col gap-1">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                                            Ada Revisi
                                          </span>
                                          {task.revisiFileUrl && (
                                            <a href={task.revisiFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 underline">
                                              Lihat File
                                            </a>
                                          )}
                                        </div>
                                      ) : '-'}
                                    </td>
                                  </tr>
                                ));
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* Deskripsi BA */}
                      {baData.ba.deskripsi && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
                                Deskripsi Berita Acara
                              </h4>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {baData.ba.deskripsi}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Note BA */}
                      {baData.note && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Note BA:</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{baData.note}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Import Preview */}
        {showImportModal && (
          <ImportExcelModal
            projectId={projectId}
            onClose={() => setShowImportModal(false)}
            onSuccess={() => {
              setShowImportModal(false);
              fetchProjectData();
            }}
          />
        )}

      </div>

      {/* Import Excel Modal */}
      {showImportModal && (
        <ImportExcelModal
          onClose={() => setShowImportModal(false)}
          projectId={projectId}
          onSuccess={() => {
            setShowImportModal(false);
            fetchProjectData();
          }}
        />
      )}

      {/* UAT Approval Modal */}
      {showUATModal && selectedBAForUAT && (
        <UATApprovalModal
          isOpen={showUATModal}
          onClose={() => {
            setShowUATModal(false);
            setSelectedBAForUAT(null);
          }}
          baId={selectedBAForUAT.id}
          baName={selectedBAForUAT.nama}
          projectId={projectId}
          mode={uatApprovalMode}
          onSuccess={() => {
            setShowUATModal(false);
            setSelectedBAForUAT(null);
            fetchProjectData();
          }}
        />
      )}

      {/* RFC Module Modal */}
      {showRfcModuleModal && rfcModuleBAda && (
        <RfcModuleModal
          isOpen={showRfcModuleModal}
          onClose={() => {
            setShowRfcModuleModal(false);
            setRfcModuleBAda(null);
          }}
          baData={rfcModuleBAda}
          projectId={projectId}
          mode={rfcModalMode}
          onSuccess={() => {
            setShowRfcModuleModal(false);
            setRfcModuleBAda(null);
            fetchProjectData();
          }}
        />
      )}

      {/* UAT Revisi Modal */}
      {showUatRevisiModal && uatRevisiBA && (
        <UatRevisiModal
          isOpen={showUatRevisiModal}
          onClose={() => {
            setShowUatRevisiModal(false);
            setUatRevisiBA(null);
          }}
          baData={uatRevisiBA}
          projectId={projectId}
        />
      )}

      {/* CED Module Modal */}
      {showCedModuleModal && cedModuleBAda && (
        <CedModuleModal
          isOpen={showCedModuleModal}
          onClose={() => {
            setShowCedModuleModal(false);
            setCedModuleBAda(null);
          }}
          baData={cedModuleBAda}
          programmers={programmers}
          projectId={projectId}
          mode={cedModalMode}
          onSuccess={() => {
            setShowCedModuleModal(false);
            setCedModuleBAda(null);
            fetchProjectData();
          }}
        />
      )}

      {/* File Upload Modal for OK */}
      {showFileUploadModal && selectedBAForFile && (
        <FileUploadModal
          isOpen={showFileUploadModal}
          onClose={() => {
            setShowFileUploadModal(false);
            setSelectedBAForFile(null);
          }}
          type={fileUploadType}
          title={`Upload File ${fileUploadType}`}
          onSubmit={handleFileUpload}
        />
      )}

      {/* Blueprint Chat Modal */}
      {showChatModal && selectedBAForChat && (
        <BlueprintChatModal
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setSelectedBAForChat(null);
          }}
          projectId={projectId}
          baId={selectedBAForChat.id}
          baName={selectedBAForChat.nama}
          baVersion={selectedBAForChat.version}
        />
      )}

      {/* Image Preview Modal */}
      {showImagePreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100000] p-4"
          onClick={() => setShowImagePreview(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {previewImageTitle}
              </h3>
              <button
                onClick={() => setShowImagePreview(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center">
              <img
                src={previewImageUrl}
                alt={previewImageTitle}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
