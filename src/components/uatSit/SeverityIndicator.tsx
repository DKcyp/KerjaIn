import React from 'react';

type SeverityType = 'critical' | 'major' | 'minor' | 'trivial';

interface SeverityIndicatorProps {
  severity: SeverityType;
}

const severityConfig: Record<SeverityType, { label: string; color: string; icon: string }> = {
  critical: { label: 'Critical', color: 'bg-red-500', icon: '🔴' },
  major: { label: 'Major', color: 'bg-orange-500', icon: '🟠' },
  minor: { label: 'Minor', color: 'bg-yellow-500', icon: '🟡' },
  trivial: { label: 'Trivial', color: 'bg-gray-400', icon: '⚪' },
};

export const SeverityIndicator: React.FC<SeverityIndicatorProps> = ({ severity }) => {
  const config = severityConfig[severity];
  
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${config.color}`} />
      <span className="text-sm font-medium text-gray-700">{config.label}</span>
    </div>
  );
};
