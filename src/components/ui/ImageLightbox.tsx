"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt?: string;
  images?: string[]; // For navigation between multiple images
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  onClose,
  imageSrc,
  imageAlt = 'Preview',
  images = [],
  currentIndex = 0,
  onNavigate
}) => {
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset zoom and pan when image changes
  useEffect(() => {
    if (isOpen) {
      setImageZoom(1);
      setImagePan({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          
          // If zoom is active (not at 1x), reset zoom first
          if (imageZoom !== 1) {
            resetImageView();
          } else {
            // If zoom is at 1x, close lightbox
            onClose();
          }
          break;

        case 'ArrowLeft':
          if (images.length > 1 && onNavigate && currentIndex > 0) {
            event.preventDefault();
            onNavigate(currentIndex - 1);
          }
          break;

        case 'ArrowRight':
          if (images.length > 1 && onNavigate && currentIndex < images.length - 1) {
            event.preventDefault();
            onNavigate(currentIndex + 1);
          }
          break;

        case ' ': // Spacebar
          event.preventDefault();
          if (imageZoom === 1) {
            setImageZoom(2);
          } else {
            resetImageView();
          }
          break;

        case '+':
        case '=':
          event.preventDefault();
          setImageZoom(prev => Math.min(prev * 1.2, 5));
          break;

        case '-':
          event.preventDefault();
          setImageZoom(prev => Math.max(prev * 0.8, 0.5));
          break;

        case '0':
          event.preventDefault();
          resetImageView();
          break;
      }
    };

    // Add event listener with capture to intercept before other handlers
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, imageZoom, images.length, currentIndex, onNavigate, onClose]);

  // Mouse interactions
  const handleImageWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setImageZoom(prev => Math.min(Math.max(prev * delta, 0.5), 5));
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y });
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      setImagePan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  const resetImageView = () => {
    setImageZoom(1);
    setImagePan({ x: 0, y: 0 });
  };

  const nextImage = () => {
    if (images.length > 1 && onNavigate && currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
    }
  };

  const prevImage = () => {
    if (images.length > 1 && onNavigate && currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (imageZoom !== 1) {
            resetImageView();
          } else {
            onClose();
          }
        }
      }}
    >
      <div className="relative flex items-center justify-center p-4">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
          style={{ 
            width: 'auto', 
            height: 'auto',
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: 'calc(100vh - 2rem)',
            transform: `scale(${imageZoom}) translate(${imagePan.x / imageZoom}px, ${imagePan.y / imageZoom}px)`,
            cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
          }}
          onLoad={() => {
            // Image loaded successfully
          }}
          onWheel={handleImageWheel}
          onMouseDown={handleImageMouseDown}
          onMouseMove={handleImageMouseMove}
          onMouseUp={handleImageMouseUp}
          onMouseLeave={handleImageMouseUp}
          onClick={(e) => {
            if (imageZoom === 1) {
              setImageZoom(2);
            } else {
              resetImageView();
            }
          }}
        />
        
        {/* Navigation Controls */}
        {images.length > 1 && onNavigate && (
          <>
            <button
              onClick={prevImage}
              disabled={currentIndex === 0}
              className="fixed left-6 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-4 rounded-full transition-all z-20 backdrop-blur-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Gambar Sebelumnya"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextImage}
              disabled={currentIndex === images.length - 1}
              className="fixed right-6 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-4 rounded-full transition-all z-20 backdrop-blur-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Gambar Selanjutnya"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-6 py-3 rounded-full text-base backdrop-blur-sm shadow-lg z-20">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="fixed top-6 right-6 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-3 rounded-full transition-all z-20 backdrop-blur-sm shadow-lg"
          title="Tutup"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Zoom Controls */}
        <div className="fixed top-6 left-6 bg-black bg-opacity-70 text-white rounded-lg backdrop-blur-sm shadow-lg z-20">
          <div className="flex flex-col gap-2 p-2">
            <button
              onClick={() => setImageZoom(prev => Math.min(prev * 1.2, 5))}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              title="Zoom In"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </button>
            <div className="text-xs text-center px-2">
              {Math.round(imageZoom * 100)}%
            </div>
            <button
              onClick={() => setImageZoom(prev => Math.max(prev * 0.8, 0.5))}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              title="Zoom Out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h6" />
              </svg>
            </button>
            <button
              onClick={resetImageView}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              title="Reset View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};