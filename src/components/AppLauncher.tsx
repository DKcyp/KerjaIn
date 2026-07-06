"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

type App = {
  id: string;
  name: string;
  appCode: string;
  description: string | null;
  logoUrl: string | null;
  url: string | null;
  categoryName: string | null;
};

export default function AppLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(false);
  const [portalUrl, setPortalUrl] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && apps.length === 0) {
      fetchApps();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/portal-apps', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setApps(data.apps || []);
        setPortalUrl(data.portalUrl || '');
      }
    } catch (error) {
      console.error('Failed to fetch apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppClick = (app: App) => {
    if (app.url) {
      // Use SSO redirect for seamless authentication
      const ssoUrl = `${portalUrl}/sso-redirect?app=${encodeURIComponent(app.url)}`;
      window.open(ssoUrl, '_blank');
    }
    setIsOpen(false);
  };

  // Only show for SSO users
  if (!user?.ssoEnabled) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-dark-900 h-11 w-11 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        title="App Launcher"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" 
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[480px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-stroke dark:border-gray-700 z-50 overflow-hidden">
          <div className="p-4 border-b border-stroke dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-black dark:text-white">
              Aplikasi Anda
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-gray-2 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 text-bodydark dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 max-h-[500px] overflow-y-auto bg-white dark:bg-gray-900">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : apps.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-bodydark1 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-bodydark1">
                  Tidak ada aplikasi tersedia
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {apps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleAppClick(app)}
                    className="flex flex-col items-center p-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-700 transition-all group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center mb-3 shadow-sm relative overflow-hidden">
                      {app.logoUrl ? (
                        <>
                          <img 
                            src={app.logoUrl} 
                            alt={app.name}
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                            <span className="text-xl font-bold text-white">
                              {app.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-xl font-bold text-white">
                            {app.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-white text-center line-clamp-2">
                      {app.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {apps.length > 0 && (
            <div className="p-3 border-t border-stroke dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary dark:text-blue-400 hover:underline flex items-center justify-center gap-1 font-medium"
              >
                Lihat semua aplikasi
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
