"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { useAuth } from "@/context/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// API Types
interface BlueprintDocument {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  version: string;
  uploadedBy: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: number;
  namaLengkap: string;
  role: string;
}

interface ModuleNode {
  id: number;
  nama: string;
  kode?: string;
  isLeaf: boolean;
  children: ModuleNode[];
  expanded?: boolean;
}

interface BlueprintRequirement {
  id: number;
  description: string;
  assignedTo: number;
  status: "PENDING" | "DONE" | "REVISI";
  createdAt: string;
  updatedAt: string;
}

interface PIC {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface ActivityLog {
  id: number;
  user: string;
  action: string;
  timestamp: string;
  comment?: string;
}

interface DocumentGroup {
  id: number;
  groupName: string;
  uploadDate: string;
  version: string;
  documents: {
    id: number;
    fileName: string;
    uploader: string;
    uploadDate: string;
  }[];
}

interface Requirement {
  id: number;
  description: string;
  moduleName: string;
  assignedTo: string;
  assignedToId?: number; // Store the user ID for name resolution
  status: "Pending" | "Done" | "Revisi";
}

interface ProjectBlueprint {
  id: number;
  projectId: string;
  projectName: string;
  client: string;
  pic: string;
  blueprintStatus: "Draft" | "Approved" | "Rejected";
  documentGroups: DocumentGroup[];
  requirements: Requirement[];
  pics: PIC[];
  activityLog: ActivityLog[];
  proyek?: {
    id: number;
    kodeProyek: string;
    namaProyek: string;
    client?: string;
    pic?: string;
  };
}

// Dummy data
const DUMMY_BLUEPRINTS: Record<number, ProjectBlueprint> = {
  1: {
    id: 1,
    projectId: "PRJ-2024-001",
    projectName: "Sistem Informasi Akademik",
    client: "Universitas Indonesia",
    pic: "Budi Santoso",
    blueprintStatus: "Approved",
    documentGroups: [
      {
        id: 1,
        groupName: "Requirements & Specifications",
        uploadDate: "2024-09-15",
        version: "1.0",
        documents: [
          {
            id: 1,
            fileName: "business_requirements.docx",
            uploader: "Budi Santoso",
            uploadDate: "2024-09-15",
          },
          {
            id: 2,
            fileName: "functional_specs.docx",
            uploader: "Budi Santoso",
            uploadDate: "2024-09-15",
          },
        ],
      },
      {
        id: 2,
        groupName: "System Architecture",
        uploadDate: "2024-09-20",
        version: "2.1",
        documents: [
          {
            id: 3,
            fileName: "system_architecture.pdf",
            uploader: "Siti Nurhaliza",
            uploadDate: "2024-09-20",
          },
          {
            id: 4,
            fileName: "component_diagram.pdf",
            uploader: "Siti Nurhaliza",
            uploadDate: "2024-09-20",
          },
        ],
      },
      {
        id: 3,
        groupName: "Database Design",
        uploadDate: "2024-09-22",
        version: "1.5",
        documents: [
          {
            id: 5,
            fileName: "database_schema.xlsx",
            uploader: "Ahmad Rizki",
            uploadDate: "2024-09-22",
          },
          {
            id: 6,
            fileName: "erd_diagram.pdf",
            uploader: "Ahmad Rizki",
            uploadDate: "2024-09-22",
          },
        ],
      },
    ],
    requirements: [
      {
        id: 1,
        description: "Implementasi sistem login dengan SSO",
        moduleName: "Authentication Module",
        assignedTo: "Ahmad Rizki",
        status: "Done",
      },
      {
        id: 2,
        description: "Desain database untuk modul akademik",
        moduleName: "Academic Module",
        assignedTo: "Dewi Lestari",
        status: "Done",
      },
      {
        id: 3,
        description: "Integrasi dengan sistem pembayaran",
        moduleName: "Payment Module",
        assignedTo: "Rudi Hartono",
        status: "Revisi",
      },
      {
        id: 4,
        description: "API documentation dan testing",
        moduleName: "API Module",
        assignedTo: "Linda Wijaya",
        status: "Pending",
      },
    ],
    pics: [
      {
        id: 1,
        name: "Budi Santoso",
        
        email: "budi.santoso@ui.ac.id",
        phone: "+62 812-3456-7890",
      },
      {
        id: 2,
        name: "Siti Nurhaliza",
        
        email: "siti.nurhaliza@ui.ac.id",
        phone: "+62 813-4567-8901",
      },
    ],
    activityLog: [
      {
        id: 1,
        user: "Budi Santoso",
        action: "menyetujui blueprint ini dengan catatan: 'Sudah lengkap, siap untuk development.'",
        timestamp: "2024-09-25 14:30",
      },
      {
        id: 2,
        user: "Ahmad Rizki",
        action: "mengunggah versi baru dari system_architecture.pdf",
        timestamp: "2024-09-20 10:15",
      },
      {
        id: 3,
        user: "Dewi Lestari",
        action: "menyelesaikan requirement: Desain database untuk modul akademik",
        timestamp: "2024-09-18 16:45",
      },
    ],
  },
  2: {
    id: 2,
    projectId: "PRJ-2024-002",
    projectName: "E-Commerce Platform",
    client: "PT Maju Jaya",
    pic: "Siti Nurhaliza",
    blueprintStatus: "Draft",
    documentGroups: [
      {
        id: 4,
        groupName: "Initial Requirements",
        uploadDate: "2024-09-10",
        version: "1.0",
        documents: [
          {
            id: 7,
            fileName: "business_requirements.docx",
            uploader: "Siti Nurhaliza",
            uploadDate: "2024-09-10",
          },
        ],
      },
    ],
    requirements: [
      {
        id: 5,
        description: "Setup payment gateway integration",
        moduleName: "Payment Gateway Module",
        assignedTo: "Andi Prasetyo",
        status: "Pending",
      },
      {
        id: 6,
        description: "Design product catalog system",
        moduleName: "Product Catalog Module",
        assignedTo: "Maya Kusuma",
        status: "Pending",
      },
    ],
    pics: [
      {
        id: 3,
        name: "Siti Nurhaliza",
        
        email: "siti@majujaya.com",
        phone: "+62 821-5678-9012",
      },
    ],
    activityLog: [
      {
        id: 4,
        user: "Siti Nurhaliza",
        action: "membuat blueprint baru untuk proyek ini",
        timestamp: "2024-09-10 09:00",
      },
    ],
  },
};

// Status badge component
const StatusBadge: React.FC<{ status: ProjectBlueprint["blueprintStatus"] }> = ({ status }) => {
  const statusConfig = {
    Draft: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-300 dark:border-orange-700",
    Approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700",
    Rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-700",
  };

  return (
    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${statusConfig[status]}`}>
      {status.toUpperCase()}
    </span>
  );
};

// Requirement status badge
const RequirementStatusBadge: React.FC<{ status: Requirement["status"] }> = ({ status }) => {
  const statusConfig = {
    Pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    Done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Revisi: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <span className={`px-3 py-1 rounded-md text-xs font-medium ${statusConfig[status]}`}>
      {status}
    </span>
  );
};

// File icon component
const FileIcon: React.FC<{ fileName: string }> = ({ fileName }) => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  
  const iconConfig: Record<string, { color: string; icon: string }> = {
    pdf: { color: "text-red-500", icon: "📄" },
    docx: { color: "text-blue-500", icon: "📝" },
    doc: { color: "text-blue-500", icon: "📝" },
    xlsx: { color: "text-green-500", icon: "📊" },
    xls: { color: "text-green-500", icon: "📊" },
    pptx: { color: "text-orange-500", icon: "📊" },
    default: { color: "text-gray-500", icon: "📎" },
  };

  const config = iconConfig[extension || "default"] || iconConfig.default;

  return <span className={`text-2xl ${config.color}`}>{config.icon}</span>;
};

export default function BlueprintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = Number(params.id);

  // State for project data
  const [project, setProject] = useState<ProjectBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Helper function to get user name by ID
  const getUserNameById = (userId: number | string): string => {
    const user = users.find(u => u.id === Number(userId));
    return user ? user.namaLengkap : `User #${userId}`;
  };

  // Fetch project data from API
  useEffect(() => {
    const fetchBlueprint = async () => {
      try {
        setLoading(true);
        console.log('[Blueprint Detail] Fetching blueprint ID:', projectId);
        const response = await fetch(`/api/blueprint/${projectId}`);
        console.log('[Blueprint Detail] Response status:', response.status);
        const data = await response.json();
        console.log('[Blueprint Detail] Response data:', data);
        
        if (data.success && data.data) {
          // Transform API data to match frontend structure
          const blueprintData = data.data;
          
          // Group documents by groupName and version
          const documentGroups: DocumentGroup[] = [];
          if (blueprintData.documents && blueprintData.documents.length > 0) {
            const groupMap = new Map<string, any[]>();
            
            blueprintData.documents.forEach((doc: any) => {
              const version = doc.version || '1.0';
              const groupName = doc.groupName || 'Document';
              const groupKey = `${groupName}|${version}`;
              
              if (!groupMap.has(groupKey)) {
                groupMap.set(groupKey, []);
              }
              groupMap.get(groupKey)?.push({
                id: doc.id,
                fileName: doc.originalName || doc.fileName,
                uploader: doc.uploadedBy?.toString() || "Unknown",
                uploadDate: new Date(doc.createdAt).toLocaleDateString('id-ID')
              });
            });
            
            groupMap.forEach((docs, groupKey) => {
              const [groupName, version] = groupKey.split('|');
              documentGroups.push({
                id: documentGroups.length + 1,
                groupName: `${groupName} Version ${version}`,
                uploadDate: docs[0]?.uploadDate || new Date().toLocaleDateString('id-ID'),
                version: version,
                documents: docs
              });
            });
          }
          
          const transformedProject: ProjectBlueprint = {
            id: blueprintData.id,
            projectId: blueprintData.projectId,
            projectName: blueprintData.projectName,
            client: blueprintData.client,
            pic: blueprintData.pic,
            blueprintStatus: blueprintData.blueprintStatus === "DRAFT" ? "Draft" : 
                           blueprintData.blueprintStatus === "APPROVED" ? "Approved" : "Rejected",
            documentGroups: documentGroups,
            requirements: (blueprintData.requirements || []).map((req: any) => ({
              id: req.id,
              description: req.description,
              moduleName: "System Module",
              assignedTo: req.assignedTo?.toString() || "Unassigned", // Will be updated when users are loaded
              assignedToId: req.assignedTo, // Store the ID for later resolution
              status: req.status === "DONE" ? "Done" : req.status === "REVISI" ? "Revisi" : "Pending"
            })),
            pics: (blueprintData.picsData as any[]) || [],
            activityLog: (blueprintData.activityLog || []).map((log: any) => ({
              id: log.id,
              user: `User ${log.userId}`,
              action: log.description,
              timestamp: new Date(log.createdAt).toLocaleString('id-ID', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }),
              comment: log.notes
            })),
            proyek: blueprintData.proyek // Add the proyek object to preserve project data
          };
          setProject(transformedProject);
        } else {
          setError(data.error || "Failed to fetch blueprint");
        }
      } catch (err) {
        console.error("Error fetching blueprint:", err);
        setError("Failed to fetch blueprint data");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchBlueprint();
    }
  }, [projectId]);

  // Modals
  const { isOpen: isUploadModalOpen, openModal: openUploadModal, closeModal: closeUploadModal } = useModal();
  const { isOpen: isApprovalModalOpen, openModal: openApprovalModal, closeModal: closeApprovalModal } = useModal();
  const { isOpen: isRequirementModalOpen, openModal: openRequirementModal, closeModal: closeRequirementModal } = useModal();
  const { isOpen: isPICModalOpen, openModal: openPICModal, closeModal: closePICModal } = useModal();
  
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [approvalComment, setApprovalComment] = useState("");
  
  // Upload modal state
  const [uploadGroupName, setUploadGroupName] = useState("");
  const [uploadVersion, setUploadVersion] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  
  // Requirement modal state
  const [reqModuleName, setReqModuleName] = useState("");
  const [reqDescription, setReqDescription] = useState("");
  const [reqAssignedTo, setReqAssignedTo] = useState("");
  const [reqImages, setReqImages] = useState<File[]>([]);
  const [reqSelectedUserId, setReqSelectedUserId] = useState<number | null>(null);
  const [reqSelectedParentId, setReqSelectedParentId] = useState<number | null>(null);
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<number>>(new Set());
  
  // Data for dropdowns
  const [users, setUsers] = useState<User[]>([]);
  const [moduleTree, setModuleTree] = useState<ModuleNode[]>([]);
  const [flatModules, setFlatModules] = useState<ModuleNode[]>([]);
  const [displayedModules, setDisplayedModules] = useState<ModuleNode[]>([]);
  const [tasklists, setTasklists] = useState<any[]>([]);
  
  // PIC modal state
  const [picName, setPicName] = useState("");
  
  const [picEmail, setPicEmail] = useState("");
  const [picPhone, setPicPhone] = useState("");
  const [editingPICId, setEditingPICId] = useState<number | null>(null);
  
  // Local state for PICs
  const [localPICs, setLocalPICs] = useState<PIC[]>([]);

  // Update local PICs when project loads
  useEffect(() => {
    if (project?.pics) {
      setLocalPICs(project.pics);
    } else {
      // Set default PICs if none exist
      setLocalPICs([
        {
          id: 1,
          name: "Project Manager",
          email: "pm@company.com",
          phone: "+62 812-3456-7890"
        },
        {
          id: 2,
          name: "Technical Lead",
          email: "tech@company.com",
          phone: "+62 813-4567-8901"
        }
      ]);
    }
  }, [project]);

  // Fetch users and modules when project loads
  useEffect(() => {
    const fetchUsersAndModules = async () => {
      try {
        // Fetch team members for this project only
        if (project?.proyek?.id && users.length === 0) {
          const teamResponse = await fetch(`/api/proyek-team/${project.proyek.id}`);
          const teamData = await teamResponse.json();
          if (teamData.items) {
            // Transform team data to match User interface
            const teamUsers = teamData.items
              .filter((member: any) => member.pegawai) // Only include members with valid pegawai data
              .map((member: any) => ({
                id: member.pegawai.id,
                namaLengkap: member.pegawai.namaLengkap}));
            setUsers(teamUsers);
          }
        }

        // Fetch project modules if we have a project
        // The blueprint now includes proyek data directly
        if (project?.proyek?.id) {
          const proyekId = project.proyek.id;
          
          // Fetch modules
          const modulesResponse = await fetch(`/api/proyek-modules/${proyekId}/tree`);
          const modulesData = await modulesResponse.json();
          if (modulesData.tree) {
            setModuleTree(modulesData.tree);
            // Flatten the tree for easier selection
            const flattenTree = (nodes: ModuleNode[], prefix = ''): ModuleNode[] => {
              let result: ModuleNode[] = [];
              nodes.forEach(node => {
                const displayName = prefix ? `${prefix} > ${node.nama}` : node.nama;
                result.push({ ...node, nama: displayName });
                if (node.children && node.children.length > 0) {
                  result = result.concat(flattenTree(node.children, displayName));
                }
              });
              return result;
            };
            setFlatModules(flattenTree(modulesData.tree));
            // Initialize expanded state for root modules only if not already set
            if (expandedModuleIds.size === 0) {
              const rootIds = modulesData.tree.map((node: ModuleNode) => node.id);
              setExpandedModuleIds(new Set(rootIds));
            }
          }
          
          // Fetch tasklists for this project with BLUEPRINT type
          try {
            const tasklistResponse = await fetch(`/api/tasklist?projectId=${proyekId}&tasklistType=BLUEPRINT`);
            const tasklistData = await tasklistResponse.json();
            if (tasklistData.items) {
              setTasklists(tasklistData.items);
            }
          } catch (error) {
            console.error('Error fetching tasklists:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching users and modules:', error);
      }
    };

    if (project?.proyek?.id) {
      fetchUsersAndModules();
    }
  }, [project?.proyek?.id]); // Only depend on the specific project ID


  // Toggle expand/collapse for module tree
  const toggleModuleExpand = (id: number) => {
    setExpandedModuleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Render module tree recursively
  const renderModuleTree = (nodes: ModuleNode[], depth: number): React.ReactNode => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedModuleIds.has(node.id);
      const paddingLeft = depth * 20;
      
      return (
        <div key={node.id}>
          <label className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
            <div className="flex items-center" style={{ paddingLeft }}>
              {hasChildren && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleModuleExpand(node.id);
                  }}
                  className="w-4 h-4 flex items-center justify-center mr-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                >
                  {isExpanded ? '▾' : '▸'}
                </button>
              )}
              {!hasChildren && <div className="w-4 mr-1" />}
              <input
                type="radio"
                name="parentModule"
                value={node.id}
                checked={reqSelectedParentId === node.id}
                onChange={() => setReqSelectedParentId(node.id)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {hasChildren ? '📁' : '📄'} {node.nama} {node.kode ? `(${node.kode})` : ''}
              </span>
            </div>
          </label>
          {hasChildren && isExpanded && (
            <div>
              {renderModuleTree(node.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading blueprint data...</p>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-6xl">🔍</div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Proyek Tidak Ditemukan</h2>
        <p className="text-gray-600 dark:text-gray-400">{error || "Blueprint untuk proyek ini tidak tersedia."}</p>
        <button
          onClick={() => router.push("/blueprint")}
          className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
        >
          Kembali ke Daftar Proyek
        </button>
      </div>
    );
  }

  // Calculate progress based on tasklist completion
  const getTasklistForRequirement = (requirementId: number) => {
    return tasklists.find(task => 
      task.keterangan === project.requirements.find(req => req.id === requirementId)?.description
    );
  };

  const completedRequirements = project.requirements.filter((req) => {
    const tasklist = getTasklistForRequirement(req.id);
    // Consider completed if tasklist status is SELESAI or SELESAI_DISETUJUI_PM
    return tasklist && (tasklist.status === 'SELESAI_DISETUJUI_PM' || tasklist.status === 'SELESAI');
  }).length;
  
  const totalRequirements = project.requirements.length;
  const progressPercentage = totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 0;

  const handleApprovalSubmit = async () => {
    if (approvalAction === 'reject' && !approvalComment.trim()) {
      alert('Alasan penolakan wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = approvalAction === 'approve' ? 'approve' : 'reject';
      const response = await fetch(`/api/blueprint/${projectId}/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 1,
          notes: approvalComment
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Blueprint berhasil di${approvalAction === 'approve' ? 'approve' : 'reject'}`);
        // Refresh the page data
        window.location.reload();
      } else {
        alert(`Gagal: ${data.error}`);
      }
    } catch (err) {
      console.error('Error submitting approval:', err);
      alert('Terjadi kesalahan saat memproses approval');
    } finally {
      setSubmitting(false);
      closeApprovalModal();
      setApprovalComment("");
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadGroupName || !uploadVersion) {
      alert('Nama grup dan versi dokumen wajib diisi');
      return;
    }

    // Get file input element
    const fileInput = document.getElementById('document-upload') as HTMLInputElement;
    const files = fileInput?.files;
    
    if (!files || files.length === 0) {
      alert('Silakan pilih file untuk diupload');
      return;
    }

    try {
      setSubmitting(true);
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('uploadedBy', (user?.id || 1).toString());
          formData.append('groupName', uploadGroupName);
          formData.append('version', uploadVersion);
          formData.append('notes', uploadNotes);

          const response = await fetch(`/api/blueprint/${projectId}/documents`, {
            method: 'POST',
            body: formData
          });

          const data = await response.json();
          
          if (data.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`${file.name}: ${data.error}`);
          }
        } catch (err) {
          errorCount++;
          errors.push(`${file.name}: Upload failed`);
        }
      }

      // Show results
      if (successCount > 0 && errorCount === 0) {
        alert(`${successCount} dokumen berhasil diupload`);
        window.location.reload();
      } else if (successCount > 0 && errorCount > 0) {
        alert(`${successCount} dokumen berhasil diupload, ${errorCount} gagal:\n${errors.join('\n')}`);
        window.location.reload();
      } else {
        alert(`Semua upload gagal:\n${errors.join('\n')}`);
      }
    } catch (err) {
      console.error('Error uploading documents:', err);
      alert('Terjadi kesalahan saat upload dokumen');
    } finally {
      setSubmitting(false);
      closeUploadModal();
      setUploadGroupName("");
      setUploadVersion("");
      setUploadNotes("");
      setSelectedFiles(null);
    }
  };

  const handleRequirementSubmit = async () => {
    if (!reqDescription) {
      alert('Deskripsi requirement wajib diisi');
      return;
    }
    
    if (!reqSelectedUserId) {
      alert('User yang akan ditugaskan wajib dipilih');
      return;
    }

    if (!reqModuleName.trim()) {
      alert('Nama modul baru wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      let moduleId: number | null = null;
      
      // Always create new module
      if (reqModuleName.trim()) {
        if (!project?.proyek?.id) {
          throw new Error('Project tidak ditemukan');
        }
        
        const proyekId = project.proyek.id;
        
        // Create the new module with proper tree structure
        const createModuleInTree = (tree: ModuleNode[], newModule: any): ModuleNode[] => {
          if (reqSelectedParentId === null) {
            // Add to root level
            return [...tree, newModule];
          } else {
            // Add as child to selected parent
            return tree.map(node => {
              if (node.id === reqSelectedParentId) {
                return {
                  ...node,
                  children: [...(node.children || []), newModule]
                };
              } else if (node.children) {
                return {
                  ...node,
                  children: createModuleInTree(node.children, newModule)
                };
              }
              return node;
            });
          }
        };

        const newModule = {
          nama: reqModuleName.trim(),
          parentId: reqSelectedParentId,
          isLeaf: true, // Explicitly mark as leaf module so UAT items will show
          children: []
        };

        const updatedTree = createModuleInTree(moduleTree, newModule);

        const moduleResponse = await fetch(`/api/proyek-modules/${proyekId}/tree`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tree: updatedTree
          })
        });
        
        if (!moduleResponse.ok) {
          const moduleError = await moduleResponse.json();
          throw new Error(`Failed to create module: ${moduleError.error}`);
        }
        
        // Fetch updated modules to get the new module ID
        const updatedModulesResponse = await fetch(`/api/proyek-modules/${proyekId}/tree`);
        const updatedModulesData = await updatedModulesResponse.json();
        if (updatedModulesData.tree) {
          // Find the newly created module
          const findModuleByName = (nodes: ModuleNode[], name: string): ModuleNode | null => {
            for (const node of nodes) {
              if (node.nama === name) return node;
              if (node.children) {
                const found = findModuleByName(node.children, name);
                if (found) return found;
              }
            }
            return null;
          };
          const newModule = findModuleByName(updatedModulesData.tree, reqModuleName.trim());
          if (newModule) {
            moduleId = newModule.id;
          }
        }
      }

      if (!moduleId) {
        throw new Error('Module ID tidak ditemukan');
      }

      // Create the blueprint requirement
      const response = await fetch(`/api/blueprint/${projectId}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: reqDescription,
          assignedTo: reqSelectedUserId,
          moduleId: moduleId // Include moduleId so UAT can be created
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create requirement');
      }

      // Create the tasklist with BLUEPRINT type
      if (!project?.proyek?.id) {
        throw new Error('Project tidak ditemukan untuk tasklist');
      }
      
      const proyekId = project.proyek.id;
      
      // Create tasklist with images using FormData
      const formData = new FormData();
      formData.append('projectId', String(proyekId));
      formData.append('moduleId', String(moduleId));
      formData.append('pegawaiId', String(reqSelectedUserId));
      formData.append('scheduleAt', new Date().toISOString());
      formData.append('keterangan', reqDescription);
      formData.append('tasklistType', 'BLUEPRINT');
      formData.append('status', 'MENUNGGU_PROSES_USER');
      
      // Add images to FormData
      if (reqImages.length > 0) {
        reqImages.forEach((file) => {
          formData.append('images', file);
        });
      }
      
      const tasklistResponse = await fetch('/api/tasklist', {
        method: 'POST',
        body: formData // Send as multipart/form-data
      });

      const tasklistData = await tasklistResponse.json();
      
      if (!tasklistData.item) {
        console.warn('Tasklist creation failed:', tasklistData.error);
        // Don't fail the whole operation if tasklist creation fails
      }

      alert('Requirement dan tasklist berhasil ditambahkan');
      
      // Update local state instead of reloading the page
      if (project) {
        // Add the new requirement to the local state
        let moduleName = reqModuleName;
        
        const newRequirement: Requirement = {
          id: data.data?.id || Date.now(), // Use returned ID or fallback
          description: reqDescription,
          moduleName: moduleName,
          assignedTo: users.find(u => u.id === reqSelectedUserId)?.namaLengkap || "Unknown User",
          status: "Pending"
        };
        
        setProject(prev => prev ? {
          ...prev,
          requirements: [...prev.requirements, newRequirement]
        } : prev);
        
        // Refresh modules since we created a new one
        if (project?.proyek?.id) {
          // Re-fetch modules to update the dropdown
          const proyekId = project.proyek.id;
          const modulesResponse = await fetch(`/api/proyek-modules/${proyekId}/tree`);
          const modulesData = await modulesResponse.json();
          if (modulesData.tree) {
            setModuleTree(modulesData.tree);
            const flattenTree = (nodes: ModuleNode[], prefix = ''): ModuleNode[] => {
              let result: ModuleNode[] = [];
              nodes.forEach(node => {
                const displayName = prefix ? `${prefix} > ${node.nama}` : node.nama;
                result.push({ ...node, nama: displayName });
                if (node.children && node.children.length > 0) {
                  result = result.concat(flattenTree(node.children, displayName));
                }
              });
              return result;
            };
            setFlatModules(flattenTree(modulesData.tree));
          }
        }
      }
    } catch (err) {
      console.error('Error creating requirement:', err);
      alert(`Terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
      closeRequirementModal();
      setReqModuleName("");
      setReqDescription("");
      setReqAssignedTo("");
      setReqSelectedUserId(null);
      setReqSelectedParentId(null);
      setReqImages([]);
    }
  };

  const handlePICSubmit = async () => {
    if (!picName || !picEmail || !picPhone) {
      alert('Nama, email, dan phone wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      let updatedPICs: PIC[];

      if (editingPICId) {
        // Update existing PIC
        updatedPICs = localPICs.map(p => p.id === editingPICId ? { ...p, name: picName, email: picEmail, phone: picPhone } : p);
      } else {
        // Add new PIC
        const newPIC: PIC = {
          id: Math.max(...localPICs.map(p => p.id), 0) + 1,
          name: picName,
          email: picEmail,
          phone: picPhone,
        };
        updatedPICs = [...localPICs, newPIC];
      }

      // Save to database
      const response = await fetch(`/api/blueprint/${projectId}/pics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pics: updatedPICs,
          userId: user?.id || 1
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setLocalPICs(updatedPICs);
        alert(editingPICId ? 'PIC berhasil diupdate' : 'PIC berhasil ditambahkan');
      } else {
        alert(`Gagal: ${data.error}`);
      }
    } catch (err) {
      console.error('Error saving PIC:', err);
      alert('Terjadi kesalahan saat menyimpan PIC');
    } finally {
      setSubmitting(false);
      closePICModal();
      setPicName("");
                  setPicEmail("");
      setPicPhone("");
      setEditingPICId(null);
    }
  };

  const handleEditPIC = (pic: PIC) => {
    setPicName(pic.name);
    setPicEmail(pic.email);
    setPicPhone(pic.phone);
    setEditingPICId(pic.id);
    openPICModal();
  };

  const handleDeletePIC = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus PIC ini?")) {
      return;
    }

    try {
      setSubmitting(true);
      const updatedPICs = localPICs.filter(p => p.id !== id);

      // Save to database
      const response = await fetch(`/api/blueprint/${projectId}/pics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pics: updatedPICs,
          userId: user?.id || 1
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setLocalPICs(updatedPICs);
        alert('PIC berhasil dihapus');
      } else {
        alert(`Gagal: ${data.error}`);
      }
    } catch (err) {
      console.error('Error deleting PIC:', err);
      alert('Terjadi kesalahan saat menghapus PIC');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewDocument = (docId: number) => {
    // Open document in new tab for preview (inline, not download)
    const previewUrl = `/api/blueprint/${projectId}/documents/${docId}/preview`;
    window.open(previewUrl, '_blank');
  };

  const handleDownloadDocument = async (docId: number, fileName: string) => {
    try {
      const response = await fetch(`/api/blueprint/${projectId}/documents/${docId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        alert(`Gagal download: ${data.error}`);
      }
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Terjadi kesalahan saat download dokumen');
    }
  };

  const handleRequirementStatusChange = async (reqId: number, currentStatus: string) => {
    // Cycle through statuses: Pending -> Done -> Revisi -> Pending
    let newStatus: string;
    if (currentStatus === "Pending") {
      newStatus = "DONE";
    } else if (currentStatus === "Done") {
      newStatus = "REVISI";
    } else {
      newStatus = "PENDING";
    }

    try {
      const response = await fetch(`/api/blueprint/${projectId}/requirements/${reqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          userId: user?.id || 1
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setProject(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            requirements: prev.requirements.map(req => 
              req.id === reqId 
                ? { ...req, status: newStatus === "DONE" ? "Done" : newStatus === "REVISI" ? "Revisi" : "Pending" }
                : req
            )
          };
        });
      } else {
        alert(`Gagal update status: ${data.error}`);
      }
    } catch (err) {
      console.error('Error updating requirement status:', err);
      alert('Terjadi kesalahan saat update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/blueprint")}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali ke Daftar Proyek
      </button>

      {/* Project Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {project.projectName}
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Project ID:</span>{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">{project.projectId}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Client:</span>{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">{project.client}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">PIC:</span>{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">{project.pic}</span>
              </div>
            </div>
          </div>
          <div>
            <StatusBadge status={project.blueprintStatus} />
          </div>
        </div>
      </div>

      {/* Three-column layout for cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Management Card - GROUPED */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dokumen Requirement</h2>
              <button
                onClick={openUploadModal}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Dokumen
              </button>
            </div>

            <div className="space-y-4">
              {project.documentGroups.map((group) => (
                <div key={group.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* Group Header */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{group.groupName}</h3>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span>Versi: {group.version}</span>
                            <span>•</span>
                            <span>Upload: {group.uploadDate}</span>
                            <span>•</span>
                            <span>{group.documents.length} file(s)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Documents in Group */}
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {group.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                      >
                        <FileIcon fileName={doc.fileName} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{doc.fileName}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span>{doc.uploader}</span>
                            <span>•</span>
                            <span>{doc.uploadDate}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handlePreviewDocument(doc.id)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                            title="Preview"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDownloadDocument(doc.id, doc.fileName)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                            title="Download"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Requirements Tasklist Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Tasklist Kebutuhan Sistem (Modul Aplikasi)
              </h2>
              <button
                onClick={() => {
                  // Reset modal state when opening
                  setReqDescription("");
                  setReqModuleName("");
                  setReqAssignedTo("");
                  setReqSelectedUserId(null);
                  setReqSelectedParentId(null);
                  setExpandedModuleIds(new Set());
                  openRequirementModal();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Tasklist
              </button>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-500 to-brand-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {completedRequirements} dari {totalRequirements} requirement selesai
              </p>
            </div>

            {/* Requirements list */}
            <div className="space-y-3">
              {project.requirements.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-lg font-medium mb-2">Belum ada requirement</p>
                  <p className="text-sm">Klik "Tambah Tasklist" untuk menambahkan requirement pertama</p>
                </div>
              ) : (
                project.requirements.map((req) => {
                  const tasklist = getTasklistForRequirement(req.id);
                  const tasklistStatus = tasklist ? tasklist.status : 'NO_TASKLIST';
                  
                  // Map tasklist status to requirement status for display
                  const getDisplayStatus = (tasklistStatus: string): "Pending" | "Done" | "Revisi" => {
                    switch (tasklistStatus) {
                      case 'SELESAI_DISETUJUI_PM':
                      case 'SELESAI': // Also consider SELESAI as Done
                        return 'Done';
                      case 'DITOLAK_PM':
                      case 'REVISI_USER':
                        return 'Revisi';
                      default:
                        return 'Pending';
                    }
                  };
                  
                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-600 dark:text-brand-400 mb-1">{req.moduleName}</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100 mb-3">{req.description}</p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Assigned to: <span className="text-brand-600 dark:text-brand-400">
                                  {req.assignedToId ? getUserNameById(req.assignedToId) : req.assignedTo}
                                </span>
                              </span>
                            </div>
                            {tasklist && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Tasklist: {tasklist.status.replace(/_/g, ' ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <RequirementStatusBadge status={getDisplayStatus(tasklistStatus)} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* PIC Management Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Daftar PIC (Person In Charge)
              </h2>
              <button
                onClick={() => {
                  setPicName("");
                  
                  setPicEmail("");
                  setPicPhone("");
                  setEditingPICId(null);
                  openPICModal();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah PIC
              </button>
            </div>

            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                  <TableRow>
                    <TableCell isHeader className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Nama
                    </TableCell>
                    
                    <TableCell isHeader className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Email
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Phone
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Aksi
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {localPICs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center">
                          <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <p className="text-lg font-medium mb-2">Belum ada PIC</p>
                          <p className="text-sm">Klik "Tambah PIC" untuk menambahkan PIC pertama</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    localPICs.map((pic) => (
                    <TableRow key={pic.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableCell className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {pic.name}
                      </TableCell>
                      
                      <TableCell className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {pic.email}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {pic.phone}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditPIC(pic)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeletePIC(pic.id)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Approval & History Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Approval & Histori
            </h2>

            {/* Approval buttons (for PM/Manager role) */}
            {project.blueprintStatus === "Draft" && (
              <div className="flex gap-3 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setApprovalAction("approve");
                    openApprovalModal();
                  }}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve
                </button>
                <button
                  onClick={() => {
                    setApprovalAction("reject");
                    openApprovalModal();
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </button>
              </div>
            )}

            {/* Activity timeline */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Activity Log
              </h3>
              <div className="space-y-4">
                {project.activityLog.map((log, index) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                          {log.user.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      {index < project.activityLog.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        <span className="font-semibold">{log.user}</span> {log.action}
                      </p>
                      {log.comment && (
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{log.comment}"</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{log.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={closeUploadModal} className="max-w-lg p-6">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Upload Dokumen</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nama Grup Dokumen <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={uploadGroupName}
              onChange={(e) => setUploadGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Contoh: Requirements & Specifications"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Versi Dokumen <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={uploadVersion}
              onChange={(e) => setUploadVersion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Contoh: 1.0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pilih File <span className="text-red-500">*</span>
            </label>
            <input
              id="document-upload"
              type="file"
              multiple
              accept=".pdf,.docx,.xlsx,.doc,.xls"
              onChange={(e) => setSelectedFiles(e.target.files)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {selectedFiles.length} file(s) dipilih:
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {Array.from(selectedFiles).map((file, index) => (
                    <li key={index} className="flex justify-between">
                      <span className="truncate">{file.name}</span>
                      <span className="ml-2 text-gray-500">
                        ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              PDF, DOCX, XLSX (Max 10MB per file) - Multiple files dapat dipilih
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Catatan (Opsional)
            </label>
            <textarea
              rows={3}
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Tambahkan catatan untuk upload ini..."
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              onClick={closeUploadModal}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleUploadSubmit}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {submitting ? 'Uploading...' : `Upload ${selectedFiles ? `(${selectedFiles.length} files)` : ''}`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Requirement Modal */}
      <Modal isOpen={isRequirementModalOpen} onClose={closeRequirementModal} className="max-w-2xl p-6">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Tambah Tasklist Kebutuhan</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Deskripsi Requirement <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reqDescription}
              onChange={(e) => setReqDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Contoh: Implementasi sistem login dengan SSO"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigned To <span className="text-red-500">*</span>
            </label>
            <select
              value={reqSelectedUserId || ''}
              onChange={(e) => setReqSelectedUserId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Pilih user yang akan ditugaskan</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.namaLengkap} ({user.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nama Modul Baru <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reqModuleName}
              onChange={(e) => setReqModuleName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Nama modul baru (contoh: Authentication Module)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Gambar (Opsional)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = e.target.files;
                if (files) {
                  const newFiles = Array.from(files);
                  // Validate file size (max 5MB per file)
                  const validFiles = newFiles.filter(file => {
                    if (file.size > 5 * 1024 * 1024) {
                      alert(`File ${file.name} terlalu besar. Maksimal 5MB per file.`);
                      return false;
                    }
                    return true;
                  });
                  setReqImages(prev => [...prev, ...validFiles]);
                }
                e.target.value = '';
              }}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
            {reqImages.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {reqImages.length} foto dipilih
                  </span>
                  <button
                    type="button"
                    onClick={() => setReqImages([])}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Hapus semua
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {reqImages.map((file, index) => (
                    <div key={index} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full aspect-square object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => setReqImages(prev => prev.filter((_, i) => i !== index))}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg hover:bg-red-700 transition-colors"
                      >
                        ✕
                      </button>
                      {/* File name tooltip */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 rounded-b-lg truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Format: JPG, PNG, GIF, WebP. Maksimal 5MB per file.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Posisi dalam Struktur Modul
            </label>
            <div className="border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 max-h-48 overflow-y-auto">
              {moduleTree.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  Belum ada struktur modul. Modul baru akan dibuat sebagai modul level 1.
                </div>
              ) : (
                <div className="p-2">
                  <div className="space-y-1">
                    {/* Root level option */}
                    <label className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                      <input
                        type="radio"
                        name="parentModule"
                        value="0"
                        checked={reqSelectedParentId === null}
                        onChange={() => setReqSelectedParentId(null)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        📁 Level 1 (Root)
                      </span>
                    </label>
                    
                    {/* Render tree structure */}
                    {renderModuleTree(moduleTree, 0)}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Pilih posisi dimana modul baru akan ditempatkan dalam struktur
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              onClick={closeRequirementModal}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleRequirementSubmit}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {submitting ? 'Adding...' : 'Tambah Requirement & Tasklist'}
            </button>
          </div>
        </div>
      </Modal>

      {/* PIC Modal */}
      <Modal isOpen={isPICModalOpen} onClose={closePICModal} className="max-w-lg p-6">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {editingPICId ? "Edit PIC" : "Tambah PIC"}
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nama <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={picName}
              onChange={(e) => setPicName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Nama lengkap"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={picEmail}
              onChange={(e) => setPicEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="email@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={picPhone}
              onChange={(e) => setPicPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="+62 812-3456-7890"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              onClick={closePICModal}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handlePICSubmit}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {submitting ? 'Saving...' : (editingPICId ? "Update" : "Tambah")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Approval Modal */}
      <Modal isOpen={isApprovalModalOpen} onClose={closeApprovalModal} className="max-w-lg p-6">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {approvalAction === "approve" ? "Approve Blueprint" : "Reject Blueprint"}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {approvalAction === "approve"
              ? "Anda akan menyetujui blueprint ini. Silakan tambahkan catatan jika diperlukan."
              : "Anda akan menolak blueprint ini. Silakan berikan alasan penolakan."}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Catatan/Komentar {approvalAction === "reject" && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={4}
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder={approvalAction === "approve" ? "Tambahkan catatan..." : "Berikan alasan penolakan..."}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={closeApprovalModal}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleApprovalSubmit}
              disabled={submitting}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:bg-gray-400 ${
                approvalAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {submitting ? 'Processing...' : (approvalAction === "approve" ? "Approve" : "Reject")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
