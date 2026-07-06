'use client';

import React from 'react';
import { htmlContentStyles } from '@/lib/htmlUtils';

interface BacklogDetailViewProps {
  content: string;
  className?: string;
}

const BacklogDetailView: React.FC<BacklogDetailViewProps> = ({ content, className = '' }) => {
  return (
    <>
      <style>{htmlContentStyles}</style>
      <div
        className={`html-content text-gray-900 dark:text-gray-100 ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </>
  );
};

export default BacklogDetailView;
