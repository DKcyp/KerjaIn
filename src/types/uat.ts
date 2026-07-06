/**
 * UAT (User Acceptance Test) Type Definitions
 * 
 * This file contains all TypeScript interfaces and types related to the UAT module.
 */

export type UATStatus = "Pending" | "Passed" | "Failed";
export type UATPriority = "High" | "Medium" | "Low";

/**
 * Main UAT Item interface
 */
export interface UATItem {
  id: number;
  namaFitur: string;
  projectId: number;
  projectName?: string;
  moduleId?: number;
  moduleName?: string;
  developerId: number;
  developerName?: string;
  tanggalSelesaiDev: string;
  status: UATStatus;
  deskripsi?: string;
  requirement?: string;
  linkTerkait?: string;
  testerId?: number;
  testerName?: string;
  priority?: UATPriority;
  attachments?: UATAttachment[];
  activityLog?: UATActivityLog[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * UAT Attachment interface
 */
export interface UATAttachment {
  id: number;
  uatItemId: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  uploadedBy: string;
  uploadedById?: number;
  uploadedAt: string;
}

/**
 * UAT Activity Log interface
 */
export interface UATActivityLog {
  id: number;
  uatItemId: number;
  userId: number;
  user: string;
  action: string;
  timestamp: string;
  status?: UATStatus;
  comment?: string;
  attachments?: string[];
}

/**
 * UAT Feedback interface (for Pass/Fail actions)
 */
export interface UATFeedback {
  uatItemId: number;
  action: "pass" | "fail";
  testerId: number;
  testerName: string;
  comment?: string;
  attachments?: File[] | UATAttachment[];
  timestamp: string;
}

/**
 * UAT Statistics interface
 */
export interface UATStatistics {
  total: number;
  pending: number;
  passed: number;
  failed: number;
  passRate: number;
  avgTestingTime?: number;
  byProject?: Record<number, {
    projectId: number;
    projectName: string;
    total: number;
    pending: number;
    passed: number;
    failed: number;
  }>;
  byPriority?: Record<UATPriority, number>;
}

/**
 * UAT Filter options
 */
export interface UATFilters {
  projectId?: number;
  testerId?: number;
  developerId?: number;
  status?: UATStatus | "All";
  priority?: UATPriority | "All";
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * UAT List Response (API)
 */
export interface UATListResponse {
  items: UATItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statistics?: UATStatistics;
}

/**
 * UAT Detail Response (API)
 */
export interface UATDetailResponse {
  item: UATItem;
  relatedItems?: UATItem[];
}

/**
 * UAT Create/Update Request
 */
export interface UATItemRequest {
  namaFitur: string;
  projectId: number;
  moduleId?: number;
  developerId: number;
  tanggalSelesaiDev: string;
  deskripsi?: string;
  requirement?: string;
  linkTerkait?: string;
  priority?: UATPriority;
  attachments?: File[];
}

/**
 * UAT Feedback Request (API)
 */
export interface UATFeedbackRequest {
  action: "pass" | "fail";
  comment?: string;
  attachments?: File[];
}

/**
 * Project interface (for UAT context)
 */
export interface UATProject {
  id: number;
  kodeProyek: string;
  namaProyek: string;
}

/**
 * User/Pegawai interface (for UAT context)
 */
export interface UATPegawai {
  id: number;
  namaLengkap: string;
  email?: string;
  role?: string;
}

/**
 * UAT View Mode
 */
export type UATViewMode = "table" | "kanban";

/**
 * UAT Kanban Board Data
 */
export interface UATKanbanData {
  Pending: UATItem[];
  Passed: UATItem[];
  Failed: UATItem[];
}
