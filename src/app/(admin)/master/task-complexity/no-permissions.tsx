"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/context/ToastContext";

type TaskComplexityConfig = {
  id: number;
  complexity: 'EASY' | 'MEDIUM' | 'HARD';
  hours: number;
  points: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function TaskComplexityNoPermissionsPage() {
  const { success, error } = useToast();
  const [items, setItems] = useState<TaskComplexityConfig[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Load data
  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/task-complexity');
      if (!response.ok) throw new Error('Failed to fetch task complexity configurations');
      const data = await response.json();
      setItems(data);
      console.log('✅ Data loaded:', data);
    } catch (err) {
      console.error('❌ Error fetching task complexity configurations:', err);
      error('Failed to load task complexity configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Get complexity color
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'EASY': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'HARD': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  };

  // Format hours display
  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} menit`;
    } else if (hours === 1) {
      return '1 jam';
    } else if (hours < 8) {
      return `${hours} jam`;
    } else {
      const days = Math.floor(hours / 8);
      const remainingHours = hours % 8;
      if (remainingHours === 0) {
        return `${days} hari`;
      } else {
        return `${days} hari ${remainingHours} jam`;
      }
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              ⚙️ Task Complexity Management (No Permissions Version)
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Testing version without permission gates - Data loaded: {items.length} items
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>Complexity Level</TableCell>
              <TableCell>Hours</TableCell>
              <TableCell>Points</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No complexity levels found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${getComplexityColor(item.complexity)}`}>
                      {item.complexity}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatHours(item.hours)}
                  </TableCell>
                  <TableCell className="font-mono">
                    {item.points} pts
                  </TableCell>
                  <TableCell>
                    {item.description || '-'}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      item.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100">🔍 Debug Information:</h3>
        <ul className="mt-2 text-sm text-blue-800 dark:text-blue-200">
          <li>✅ API Response: {items.length} items loaded</li>
          <li>✅ No permission gates applied</li>
          <li>✅ This should show the data if API works</li>
          <li>🔗 <a href="/master/task-complexity" className="underline">Try original page</a></li>
          <li>🔗 <a href="/master/task-complexity/debug" className="underline">Try debug page</a></li>
        </ul>
      </div>
    </div>
  );
}
