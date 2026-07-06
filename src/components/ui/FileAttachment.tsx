"use client";

import React from 'react';
import { getFileTypeCategory, formatFileSize } from '@/lib/fileUploadConfig';
import { 
  FaFilePdf, 
  FaFileWord, 
  FaFileExcel, 
  FaFilePowerpoint, 
  FaFileArchive, 
  FaFileVideo, 
  FaFileAudio, 
  FaFileCode, 
  FaFileAlt, 
  FaFile,
  FaFileImage
} from 'react-icons/fa';

interface FileAttachmentProps {
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt?: string;
  className?: string;
  showPreview?: boolean;
  onImageClick?: (imagePath: string) => void;
}

export default function FileAttachment({
  fileName,
  originalName,
  filePath,
  fileType,
  fileSize,
  uploadedAt,
  className = "",
  showPreview = true,
  onImageClick
}: FileAttachmentProps) {
  const fileCategory = getFileTypeCategory({ name: originalName, type: fileType } as File);
  const isImage = fileCategory === 'images';

  // Get file extension
  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  // React Icons for different file types
  const getFileIcon = (extension: string, category: string) => {
    const ext = extension.toLowerCase();
    
    // PDF files
    if (ext === 'pdf') {
      return <FaFilePdf className="w-8 h-8 text-red-600" />;
    }
    
    // Word documents
    if (['doc', 'docx'].includes(ext)) {
      return <FaFileWord className="w-8 h-8 text-blue-600" />;
    }
    
    // Excel files
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FaFileExcel className="w-8 h-8 text-green-600" />;
    }
    
    // PowerPoint files
    if (['ppt', 'pptx'].includes(ext)) {
      return <FaFilePowerpoint className="w-8 h-8 text-orange-600" />;
    }
    
    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FaFileArchive className="w-8 h-8 text-purple-600" />;
    }
    
    // Video files
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) {
      return <FaFileVideo className="w-8 h-8 text-red-600" />;
    }
    
    // Audio files
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'].includes(ext)) {
      return <FaFileAudio className="w-8 h-8 text-green-600" />;
    }
    
    // Image files (fallback for broken images)
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
      return <FaFileImage className="w-8 h-8 text-blue-500" />;
    }
    
    // Code files
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'php', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rb', 'swift', 'kt'].includes(ext)) {
      return <FaFileCode className="w-8 h-8 text-gray-700" />;
    }
    
    // Text files
    if (['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'log'].includes(ext)) {
      return <FaFileAlt className="w-8 h-8 text-gray-600" />;
    }
    
    // Default file icon
    return <FaFile className="w-8 h-8 text-gray-500" />;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = filePath;
    link.download = originalName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
      isImage && onImageClick ? 'hover:border-blue-300 dark:hover:border-blue-500' : ''
    } ${className}`}>
      <div className="flex-shrink-0">
        {isImage && showPreview ? (
          <div 
            className={`w-12 h-12 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-500 ${
              onImageClick ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''
            }`}
            onClick={() => onImageClick && onImageClick(filePath)}
          >
            <img
              src={filePath}
              alt={originalName}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to icon if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallbackDiv = document.createElement('div');
                  fallbackDiv.className = 'w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center';
                  fallbackDiv.innerHTML = `
                    <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#6b7280" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <polyline points="14,2 14,8 20,8" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  `;
                  parent.appendChild(fallbackDiv);
                }
              }}
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-600 flex items-center justify-center">
            {getFileIcon(getFileExtension(originalName), fileCategory)}
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {originalName}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{formatFileSize(fileSize)}</span>
          <span>•</span>
          <span className="capitalize">{fileCategory.replace(/([A-Z])/g, ' $1').trim()}</span>
          {uploadedAt && (
            <>
              <span>•</span>
              <span>{new Date(uploadedAt).toLocaleDateString('id-ID')}</span>
            </>
          )}
        </div>
      </div>
      
      <button
        onClick={handleDownload}
        className="flex-shrink-0 p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        title="Download file"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
    </div>
  );
}