"use client";

import React, { useEffect, useState } from "react";

type DateTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

export default function DateTimeInput({
  value,
  onChange,
  label = "Tanggal & Waktu Schedule",
  placeholder = "Pilih tanggal dan waktu",
  disabled = false,
  required = false,
}: DateTimeInputProps) {
  const [datetimeValue, setDatetimeValue] = useState("");

  // Parse the input value to datetime-local format
  useEffect(() => {
    if (value) {
      let datePart = '';
      let timePart = '';

      if (value.includes('T')) {
        // Handle ISO format: "YYYY-MM-DDTHH:mm:ss.sssZ"
        const parts = value.split('T');
        datePart = parts[0];
        timePart = parts[1] || '';
        // Remove Z and milliseconds if present
        timePart = timePart.split('Z')[0].split('.')[0];
        // Ensure we have at least HH:mm
        if (timePart.split(':').length < 2) {
          timePart = '09:00';
        }
      } else {
        // Handle custom format: "YYYY-MM-DD HH:mm"
        const parts = value.split(' ');
        datePart = parts[0];
        timePart = parts[1] || '';
      }

      if (datePart && timePart) {
        // Truncate to HH:mm if it has seconds (optional for datetime-local but cleaner)
        const timeParts = timePart.split(':');
        const hhmm = `${timeParts[0]}:${timeParts[1]}`;
        setDatetimeValue(`${datePart}T${hhmm}`);
      } else if (datePart) {
        setDatetimeValue(`${datePart}T09:00`);
      }
    } else {
      setDatetimeValue("");
    }
  }, [value]);

  // Handle datetime change
  const handleDateTimeChange = (newDateTime: string) => {
    setDatetimeValue(newDateTime);
    if (newDateTime) {
      // Convert "YYYY-MM-DDTHH:mm" back to "YYYY-MM-DD HH:mm"
      const formattedValue = newDateTime.replace('T', ' ');
      onChange(formattedValue);
    } else {
      onChange("");
    }
  };

  // No need to generate time options anymore - using native time input

  return (
    <div>
      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <input
        type="datetime-local"
        value={datetimeValue}
        onChange={(e) => handleDateTimeChange(e.target.value)}
        onClick={(e) => {
          // Force the datetime picker to open when clicking anywhere on the input
          try {
            if (e.currentTarget.showPicker && typeof e.currentTarget.showPicker === 'function') {
              e.currentTarget.showPicker();
            }
          } catch (error) {
            // Silently ignore showPicker errors - fallback to default browser behavior
            console.debug('showPicker not available or failed:', error);
          }
        }}
        onFocus={(e) => {
          // Also trigger picker on focus for better accessibility
          try {
            if (e.currentTarget.showPicker && typeof e.currentTarget.showPicker === 'function') {
              e.currentTarget.showPicker();
            }
          } catch (error) {
            // Silently ignore showPicker errors - fallback to default browser behavior
            console.debug('showPicker not available or failed:', error);
          }
        }}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:focus:border-brand-400 dark:focus:ring-brand-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      />

    </div>
  );
}
