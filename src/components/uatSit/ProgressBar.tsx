import React from 'react';

interface ProgressBarProps {
  percentage: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  percentage, 
  showLabel = true,
  size = 'md' 
}) => {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  
  const getColor = () => {
    if (clampedPercentage === 100) return 'bg-green-500';
    if (clampedPercentage >= 70) return 'bg-blue-500';
    if (clampedPercentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <div
          className={`${getColor()} ${sizeStyles[size]} rounded-full transition-all duration-300 ease-in-out`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-600 mt-1 block">
          {clampedPercentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
};
