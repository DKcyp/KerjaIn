"use client";

import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import { CalenderIcon } from '../../icons';

type DatePickerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export default function DatePickerField({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  className = "",
}: DatePickerFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const flatpickrRef = useRef<flatpickr.Instance | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    flatpickrRef.current = flatpickr(inputRef.current, {
      mode: "single",
      dateFormat: "Y-m-d",
      defaultDate: value || undefined,
      onChange: (selectedDates) => {
        if (selectedDates.length > 0) {
          const date = selectedDates[0];
          // Format date as YYYY-MM-DD in local timezone (not UTC)
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const formatted = `${year}-${month}-${day}`;
          onChange(formatted);
        } else {
          onChange('');
        }
      },
    });

    return () => {
      if (flatpickrRef.current) {
        flatpickrRef.current.destroy();
      }
    };
  }, []);

  // Update flatpickr when value changes externally
  useEffect(() => {
    if (flatpickrRef.current && value !== flatpickrRef.current.input.value) {
      flatpickrRef.current.setDate(value || '', false);
    }
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        readOnly
      />
      <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
        <CalenderIcon className="size-5" />
      </span>
    </div>
  );
}
