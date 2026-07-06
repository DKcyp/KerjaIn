/**
 * Completion Time Preview Component
 * Shows calculated completion time based on:
 * - Start time (scheduleAt)
 * - Duration (customDurationHours or taskComplexity)
 * - Working hours (from JWT)
 * - Break time (from master_break_time)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, Calendar, Coffee } from 'lucide-react';

interface CompletionTimePreviewProps {
  pegawaiId?: number;
  scheduleAt?: string | Date;
  customDurationHours?: number;
  taskComplexity?: string;
  isLoading?: boolean;
  variant?: 'full' | 'summary' | 'details'; // summary = green card only, details = info panel only
  onAdjustTime?: (adjustedTime: Date) => void; // Callback to update parent with adjusted time
}

interface CalculationResult {
  success: boolean;
  data?: {
    startTime: string;
    completionTime: string;
    durationMinutes: number;
    durationHours: string;
    durationSource: string;
    workingDays: number;
    breakTimeExcluded: number;
    schedule: Array<{
      date: string;
      startTime: string;
      endTime: string;
      workingMinutes: number;
    }>;
    summary: {
      startDate: string;
      startTime: string;
      completionDate: string;
      completionTime: string;
      durationText: string;
      workingDaysText: string;
      breakTimeText: string;
    };
    debugInfo?: {
      workingHours: {
        startTime: string;
        endTime: string;
        source: string;
      };
      breakTime: {
        startTime: string;
        endTime: string;
        source: string;
      } | null;
      calculationMethod: string;
    };
  };
  error?: string;
}

export function CompletionTimePreview({
  pegawaiId,
  scheduleAt,
  customDurationHours,
  taskComplexity = 'MEDIUM',
  isLoading: externalIsLoading = false,
  variant = 'full',
  onAdjustTime
}: CompletionTimePreviewProps) {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if start time is before shift start
  const needsAdjustment = result?.data?.schedule && result.data.schedule.length > 0 && scheduleAt ? (() => {
    const firstDay = result.data.schedule[0];
    const scheduleDate = new Date(scheduleAt);
    const scheduleHour = scheduleDate.getHours();
    const scheduleMin = scheduleDate.getMinutes();
    const scheduleTotalMin = scheduleHour * 60 + scheduleMin;
    
    const [shiftHour, shiftMin] = firstDay.startTime.split(':').map(Number);
    const shiftTotalMin = shiftHour * 60 + shiftMin;
    
    return scheduleTotalMin < shiftTotalMin;
  })() : false;

  // Handle adjust button click
  const handleAdjust = () => {
    if (!result?.data?.schedule || result.data.schedule.length === 0 || !scheduleAt) return;
    
    const firstDay = result.data.schedule[0];
    const [shiftHour, shiftMin] = firstDay.startTime.split(':').map(Number);
    
    // Create adjusted date with shift start time
    const scheduleDate = new Date(scheduleAt);
    const adjustedDate = new Date(
      scheduleDate.getFullYear(),
      scheduleDate.getMonth(),
      scheduleDate.getDate(),
      shiftHour,
      shiftMin,
      0,
      0
    );
    
    if (onAdjustTime) {
      onAdjustTime(adjustedDate);
    }
  };

  // Calculate completion time whenever inputs change
  useEffect(() => {
    if (!pegawaiId || !scheduleAt) {
      setResult(null);
      setError(null);
      return;
    }

    const calculateCompletionTime = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/tasklist/calculate-completion-time', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pegawaiId,
            scheduleAt: new Date(scheduleAt).toISOString(),
            customDurationHours,
            taskComplexity
          })
        });

        const data: CalculationResult = await response.json();

        if (data.success && data.data) {
          setResult(data);
          setError(null);
        } else {
          setError(data.error || 'Failed to calculate completion time');
          setResult(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce calculation to avoid too many requests
    const timer = setTimeout(calculateCompletionTime, 500);
    return () => clearTimeout(timer);
  }, [pegawaiId, scheduleAt, customDurationHours, taskComplexity]);

  if (externalIsLoading || isLoading) {
    return (
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="animate-spin">⏳</div>
          <span className="text-sm text-blue-700">Menghitung jam selesai...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Gagal menghitung jam selesai</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result?.data) {
    return null;
  }

  const { summary, schedule, durationSource, workingDays, breakTimeExcluded, debugInfo } = result.data;
  const scheduleWarning = (result as any).warning;

  // Details panel (left column)
  const detailsPanel = (
    <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2 text-sm">
      {debugInfo?.workingHours ? (
        <div>
          <p className="font-semibold text-gray-700 mb-1">🕐 Jam Kerja (dari JWT):</p>
          <div className="bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
            <p className="text-gray-900 font-medium">
              {debugInfo.workingHours.startTime} - {debugInfo.workingHours.endTime}
            </p>
            <p className="text-xs text-gray-500">Sumber: {debugInfo.workingHours.source}</p>
          </div>
        </div>
      ) : debugInfo?.note ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
          <p className="font-semibold text-amber-800 mb-1 flex items-center gap-1">
            ⚠️ Fitur Get Jadwal Dinonaktifkan
          </p>
          <p className="text-xs text-amber-700">
            {debugInfo.note}
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Menggunakan jam kerja default: 08:00 - 16:00
          </p>
        </div>
      ) : null}

      <div>
        <p className="font-semibold text-gray-700 mb-1">📌 Sumber Durasi:</p>
        <p className="text-gray-600 bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
          {durationSource}
        </p>
      </div>

      {breakTimeExcluded > 0 && (
        <div>
          <p className="font-semibold text-gray-700 mb-1 flex items-center gap-1">
            <Coffee className="w-3.5 h-3.5" /> Waktu Istirahat:
          </p>
          <div className="bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
            <p className="text-gray-900">{breakTimeExcluded} menit (sudah dikecualikan dari perhitungan)</p>
            {debugInfo?.breakTime && (
              <p className="text-xs text-gray-500 mt-0.5">
                Jam istirahat: {debugInfo.breakTime.startTime} - {debugInfo.breakTime.endTime}
              </p>
            )}
          </div>
        </div>
      )}

      <div>
        <p className="font-semibold text-gray-700 mb-1">📅 Rincian Jadwal Kerja:</p>
        <div className="space-y-1">
          {schedule.map((day, index) => (
            <div key={index} className="bg-gray-50 px-2 py-1.5 rounded border border-gray-200 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">{day.date}</span>
                <span className="text-gray-600">{day.startTime} - {day.endTime}</span>
              </div>
              <div className="text-gray-500 mt-0.5">
                Durasi kerja: {day.workingMinutes} menit ({(day.workingMinutes / 60).toFixed(1)} jam)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Summary card (right column / below schedule)
  const summaryCard = (
    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">
        📊 Estimasi Jam Selesai
      </p>
      
      {/* Warning if start time needs adjustment */}
      {needsAdjustment && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-300 rounded text-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800">Waktu mulai sebelum shift</p>
              <p className="text-yellow-700 mt-0.5">
                Task dijadwalkan jam {summary.startTime}, tapi shift baru mulai jam {schedule[0].startTime}
              </p>
              {onAdjustTime && (
                <button
                  type="button"
                  onClick={handleAdjust}
                  className="mt-2 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded transition-colors"
                >
                  🔧 Adjust ke {schedule[0].startTime}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-green-600" />
          <span className="text-sm text-gray-600">Mulai:</span>
          <span className="text-sm font-semibold text-gray-900">
            {summary.startDate} {summary.startTime}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border-2 border-green-400">
          <Calendar className="w-4 h-4 text-green-600" />
          <span className="text-sm text-gray-600">Selesai:</span>
          <span className="text-sm font-bold text-green-700">
            {summary.completionDate} {summary.completionTime}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>⏱️ {summary.durationText}</span>
          <span>•</span>
          <span>{summary.workingDaysText}</span>
        </div>
        
        {/* Warning if schedule insufficient */}
        {scheduleWarning && (
          <div className="mt-2 p-2 bg-orange-50 border border-orange-300 rounded text-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-orange-800 font-medium">{scheduleWarning}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (variant === 'summary') return summaryCard;
  if (variant === 'details') return <div className="mt-4">{detailsPanel}</div>;

  // full: both side by side
  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-3 items-start">
        {detailsPanel}
        {summaryCard}
      </div>
    </div>
  );
}
