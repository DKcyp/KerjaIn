import React, { useState, useEffect } from 'react';
import { getModuleDisplayName, loadModuleDisplayName } from '@/lib/moduleUtils';

interface ModuleDisplayProps {
  moduleId: number | null;
  moduleLabelCache: Record<number, string>;
  className?: string;
}

const ModuleDisplay: React.FC<ModuleDisplayProps> = ({
  moduleId,
  moduleLabelCache,
  className = ''
}) => {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!moduleId) {
      setDisplayName(null);
      return;
    }

    // Try to get from cache first
    const cachedName = getModuleDisplayName(moduleId, moduleLabelCache);
    
    // If we have a proper name (not just ID fallback), use it
    if (cachedName && !cachedName.startsWith('Modul #')) {
      setDisplayName(cachedName);
      return;
    }

    // Otherwise, try to load the actual name
    setLoading(true);
    loadModuleDisplayName(moduleId)
      .then(name => {
        setDisplayName(name);
      })
      .catch(() => {
        setDisplayName(`Modul #${moduleId}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [moduleId, moduleLabelCache]);

  if (!moduleId) return <span className={className}>-</span>;

  if (loading) {
    return (
      <span className={`${className} inline-flex items-center`}>
        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Memuat...
      </span>
    );
  }

  return <span className={className}>{displayName || '-'}</span>;
};

export default ModuleDisplay;