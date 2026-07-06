"use client";
import React from "react";
import { ArrowLeft } from "lucide-react";
import StatusWorkflow from "./StatusWorkflow";

type BlueprintHeaderProps = {
  projectName: string;
  baName: string;
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  onBack: () => void;
  loading?: boolean;
};

export default function BlueprintHeader({
  projectName,
  baName,
  currentStatus,
  onStatusChange,
  onBack,
  loading
}: BlueprintHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{projectName}</h1>
          <p className="text-gray-600 dark:text-gray-400">{baName}</p>
        </div>
      </div>

      <StatusWorkflow
        currentStatus={currentStatus}
        onStatusChange={onStatusChange}
        loading={loading}
      />
    </div>
  );
}
