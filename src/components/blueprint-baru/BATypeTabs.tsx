"use client";

import React from 'react';

type BATypeTabsProps = {
  activeTab: 'BLUEPRINT' | 'BERITA_ACARA';
  onTabChange: (tab: 'BLUEPRINT' | 'BERITA_ACARA') => void;
  blueprintCount?: number;
  beritaAcaraCount?: number;
};

export default function BATypeTabs({ 
  activeTab, 
  onTabChange, 
  blueprintCount = 0, 
  beritaAcaraCount = 0 
}: BATypeTabsProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex -mb-px">
        <button
          onClick={() => onTabChange('BLUEPRINT')}
          className={`
            group inline-flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors
            ${activeTab === 'BLUEPRINT'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }
          `}
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          <span>Blueprint</span>
          {blueprintCount > 0 && (
            <span className={`
              ml-2 px-2 py-0.5 rounded-full text-xs font-semibold
              ${activeTab === 'BLUEPRINT'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }
            `}>
              {blueprintCount}
            </span>
          )}
        </button>

        {/* <button
          onClick={() => onTabChange('BERITA_ACARA')}
          className={`
            group inline-flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors
            ${activeTab === 'BERITA_ACARA'
              ? 'border-green-500 text-green-600 dark:text-green-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }
          `}
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <span>Berita Acara</span>
          {beritaAcaraCount > 0 && (
            <span className={`
              ml-2 px-2 py-0.5 rounded-full text-xs font-semibold
              ${activeTab === 'BERITA_ACARA'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }
            `}>
              {beritaAcaraCount}
            </span>
          )}
        </button> */}
      </nav>
    </div>
  );
}
