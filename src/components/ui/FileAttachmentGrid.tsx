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

interface FileAttachmentGridProps {
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

export default function FileAttachmentGrid({
  fileName,
  originalName,
  filePath,
  fileType,
  fileSize,
  uploadedAt,
  className = "",
  showPreview = true,
  onImageClick
}: FileAttachmentGridProps) {
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
      return <FaFilePdf className="w-12 h-12 text-red-600" />;
    }
    
    // Word documents
    if (['doc', 'docx'].includes(ext)) {
      return <FaFileWord className="w-12 h-12 text-blue-600" />;
    }
    
    // Excel files
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FaFileExcel className="w-12 h-12 text-green-600" />;
    }
    
    // PowerPoint files
    if (['ppt', 'pptx'].includes(ext)) {
      return <FaFilePowerpoint className="w-12 h-12 text-orange-600" />;
    }
    
    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FaFileArchive className="w-12 h-12 text-purple-600" />;
    }
    
    // Video files
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) {
      return <FaFileVideo className="w-12 h-12 text-red-600" />;
    }
    
    // Audio files
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'].includes(ext)) {
      return <FaFileAudio className="w-12 h-12 text-green-600" />;
    }
    
    // Image files (fallback for broken images)
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
      return <FaFileImage className="w-12 h-12 text-blue-500" />;
    }
    
    // Code files
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'php', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rb', 'swift', 'kt'].includes(ext)) {
      return <FaFileCode className="w-12 h-12 text-gray-700" />;
    }
    
    // Text files
    if (['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'log'].includes(ext)) {
      return <FaFileAlt className="w-12 h-12 text-gray-600" />;
    }
    
    // Default file icon
    return <FaFile className="w-12 h-12 text-gray-500" />;
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
    <div className={`group relative ${className}`}>
      {isImage && showPreview ? (
        // Image Preview Thumbnail
        <div
          className={`cursor-pointer ${onImageClick ? 'hover:scale-105' : ''} transition-transform duration-200`}
          onClick={() => onImageClick && onImageClick(filePath)}
        >
          <img
            src={filePath}
            alt={originalName}
            className="w-full h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-400 transition-all duration-200 hover:shadow-lg"
            onError={(e) => {
              // Fallback to icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallbackDiv = document.createElement('div');
                fallbackDiv.className = 'w-full h-32 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600';
                
                // Create React icon element
                const iconContainer = document.createElement('div');
                iconContainer.className = 'mb-2';
                
                // Add SVG for broken image
                iconContainer.innerHTML = `
                  <svg class="w-12 h-12 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                  </svg>
                `;
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'text-xs text-gray-500 dark:text-gray-400 text-center px-2';
                nameSpan.textContent = originalName;
                
                fallbackDiv.appendChild(iconContainer);
                fallbackDiv.appendChild(nameSpan);
                parent.appendChild(fallbackDiv);
              }
            }}
            loading="lazy"
          />
        </div>
      ) : (
        // File Icon for Non-Images
        <div className="relative">
          <a
            href={filePath}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 group"
            style={{ aspectRatio: '1', minHeight: '120px' }}
          >
            <div className="mb-2 group-hover:scale-110 transition-transform duration-200">
              {getFileIcon(getFileExtension(originalName), fileCategory)}
            </div>
            <span className="text-xs text-center text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-200 line-clamp-2 font-medium px-1">
              {originalName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {formatFileSize(fileSize)}
            </span>
          </a>
        </div>
      )}
      
      {/* File Info Tooltip - Only show for images */}
      {isImage && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <p className="truncate font-medium">{originalName}</p>
          <p className="text-gray-300">{formatFileSize(fileSize)}</p>
        </div>
      )}
    </div>
  );
}