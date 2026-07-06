import React from 'react';

type StatusType = 
  | 'draft' 
  | 'in-progress' 
  | 'awaiting-approval' 
  | 'approved' 
  | 'passed' 
  | 'failed' 
  | 'not-started'
  | 'open'
  | 'fixed'
  | 'closed';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
}

const statusStyles: Record<StatusType, string> = {
  'draft': 'bg-gray-100 text-gray-700 border-gray-300',
  'in-progress': 'bg-orange-100 text-orange-700 border-orange-300',
  'awaiting-approval': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  'approved': 'bg-green-100 text-green-700 border-green-300',
  'passed': 'bg-green-100 text-green-700 border-green-300',
  'failed': 'bg-red-100 text-red-700 border-red-300',
  'not-started': 'bg-gray-100 text-gray-600 border-gray-300',
  'open': 'bg-red-100 text-red-700 border-red-300',
  'fixed': 'bg-blue-100 text-blue-700 border-blue-300',
  'closed': 'bg-gray-100 text-gray-600 border-gray-300',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[status]}`}
    >
      {label}
    </span>
  );
};
