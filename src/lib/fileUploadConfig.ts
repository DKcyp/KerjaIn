// File upload configuration for different file types
export interface FileTypeConfig {
  extensions: string[];
  mimeTypes: string[];
  maxSize: number; // in bytes
  description: string;
}

export interface FileUploadConfig {
  [key: string]: FileTypeConfig;
}

// File size constants (in bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024,      // 5MB for images
  DOCUMENT: 10 * 1024 * 1024,  // 10MB for documents
  SPREADSHEET: 15 * 1024 * 1024, // 15MB for spreadsheets
  PRESENTATION: 20 * 1024 * 1024, // 20MB for presentations
  ARCHIVE: 25 * 1024 * 1024,   // 25MB for archives
  VIDEO: 50 * 1024 * 1024,     // 50MB for videos
  AUDIO: 10 * 1024 * 1024,     // 10MB for audio
  TEXT: 2 * 1024 * 1024,       // 2MB for text files
  CODE: 5 * 1024 * 1024,       // 5MB for code files
} as const;

export const FILE_UPLOAD_CONFIG: FileUploadConfig = {
  // Images
  images: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
    mimeTypes: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml'
    ],
    maxSize: FILE_SIZE_LIMITS.IMAGE,
    description: 'Gambar (JPG, PNG, GIF, WebP, BMP, SVG) - Maksimal 5MB'
  },

  // Documents
  documents: {
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text'
    ],
    maxSize: FILE_SIZE_LIMITS.DOCUMENT,
    description: 'Dokumen (PDF, DOC, DOCX, TXT, RTF, ODT) - Maksimal 10MB'
  },

  // Spreadsheets
  spreadsheets: {
    extensions: ['.xls', '.xlsx', '.csv', '.ods'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/vnd.oasis.opendocument.spreadsheet'
    ],
    maxSize: FILE_SIZE_LIMITS.SPREADSHEET,
    description: 'Spreadsheet (XLS, XLSX, CSV, ODS) - Maksimal 15MB'
  },

  // Presentations
  presentations: {
    extensions: ['.ppt', '.pptx', '.odp'],
    mimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation'
    ],
    maxSize: FILE_SIZE_LIMITS.PRESENTATION,
    description: 'Presentasi (PPT, PPTX, ODP) - Maksimal 20MB'
  },

  // Archives
  archives: {
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.tar.gz'],
    mimeTypes: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
      'application/x-gzip'
    ],
    maxSize: FILE_SIZE_LIMITS.ARCHIVE,
    description: 'Arsip (ZIP, RAR, 7Z, TAR, GZ) - Maksimal 25MB'
  },

  // Videos
  videos: {
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
    mimeTypes: [
      'video/mp4',
      'video/x-msvideo',
      'video/quicktime',
      'video/x-ms-wmv',
      'video/x-flv',
      'video/webm',
      'video/x-matroska'
    ],
    maxSize: FILE_SIZE_LIMITS.VIDEO,
    description: 'Video (MP4, AVI, MOV, WMV, FLV, WebM, MKV) - Maksimal 50MB'
  },

  // Audio
  audio: {
    extensions: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'],
    mimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/flac',
      'audio/aac',
      'audio/ogg',
      'audio/x-ms-wma',
      'audio/mp4'
    ],
    maxSize: FILE_SIZE_LIMITS.AUDIO,
    description: 'Audio (MP3, WAV, FLAC, AAC, OGG, WMA, M4A) - Maksimal 10MB'
  },

  // Text files
  textFiles: {
    extensions: ['.txt', '.md', '.json', '.xml', '.yaml', '.yml', '.log'],
    mimeTypes: [
      'text/plain',
      'text/markdown',
      'application/json',
      'application/xml',
      'text/xml',
      'application/x-yaml',
      'text/yaml'
    ],
    maxSize: FILE_SIZE_LIMITS.TEXT,
    description: 'File Teks (TXT, MD, JSON, XML, YAML, LOG) - Maksimal 2MB'
  },

  // Code files
  codeFiles: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.sass', '.less', '.php', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rb', '.swift', '.kt'],
    mimeTypes: [
      'text/javascript',
      'application/typescript',
      'text/html',
      'text/css',
      'application/x-php',
      'text/x-python',
      'text/x-java-source',
      'text/x-c',
      'text/x-c++src',
      'text/x-csharp',
      'text/x-go',
      'text/x-ruby',
      'text/x-swift',
      'text/x-kotlin'
    ],
    maxSize: FILE_SIZE_LIMITS.CODE,
    description: 'File Kode (JS, TS, HTML, CSS, PHP, Python, Java, dll) - Maksimal 5MB'
  }
};

// Helper functions
export function getAllowedExtensions(): string[] {
  const extensions: string[] = [];
  Object.values(FILE_UPLOAD_CONFIG).forEach(config => {
    extensions.push(...config.extensions);
  });
  return [...new Set(extensions)]; // Remove duplicates
}

export function getAllowedMimeTypes(): string[] {
  const mimeTypes: string[] = [];
  Object.values(FILE_UPLOAD_CONFIG).forEach(config => {
    mimeTypes.push(...config.mimeTypes);
  });
  return [...new Set(mimeTypes)]; // Remove duplicates
}

export function getAcceptString(): string {
  return getAllowedMimeTypes().join(',') + ',' + getAllowedExtensions().join(',');
}

export function validateFile(file: File): { isValid: boolean; error?: string; maxSize?: number } {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  
  // Find matching configuration
  let matchedConfig: FileTypeConfig | null = null;
  let configKey = '';
  
  for (const [key, config] of Object.entries(FILE_UPLOAD_CONFIG)) {
    const extensionMatch = config.extensions.some(ext => fileName.endsWith(ext.toLowerCase()));
    const mimeTypeMatch = config.mimeTypes.some(mime => fileType === mime.toLowerCase());
    
    if (extensionMatch || mimeTypeMatch) {
      matchedConfig = config;
      configKey = key;
      break;
    }
  }
  
  if (!matchedConfig) {
    return {
      isValid: false,
      error: `Jenis file tidak didukung. File yang diizinkan: ${Object.values(FILE_UPLOAD_CONFIG).map(c => c.description).join(', ')}`
    };
  }
  
  if (file.size > matchedConfig.maxSize) {
    const maxSizeMB = (matchedConfig.maxSize / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File terlalu besar. Maksimal ${maxSizeMB}MB untuk ${matchedConfig.description}`,
      maxSize: matchedConfig.maxSize
    };
  }
  
  return { isValid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileTypeCategory(file: File): string {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  
  for (const [key, config] of Object.entries(FILE_UPLOAD_CONFIG)) {
    const extensionMatch = config.extensions.some(ext => fileName.endsWith(ext.toLowerCase()));
    const mimeTypeMatch = config.mimeTypes.some(mime => fileType === mime.toLowerCase());
    
    if (extensionMatch || mimeTypeMatch) {
      return key;
    }
  }
  
  return 'unknown';
}