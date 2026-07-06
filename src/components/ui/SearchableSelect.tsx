"use client";

import { useState, useEffect, useRef } from "react";

interface Option {
  value: string;
  label: string;
  badge?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className = "",
  label,
  required = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 240; // max-h-60 = 240px
      const spaceBelow = window.innerHeight - containerRect.bottom;
      const spaceAbove = containerRect.top;

      // If not enough space below but enough space above, show on top
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected option label
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type="text"
          value={isOpen ? searchQuery : displayValue}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchQuery("");
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-10 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 disabled:opacity-30"
        >
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && !disabled && (
        <div 
          ref={dropdownRef}
          className={`absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto ${
            dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearchQuery("");
                }}
                className={`w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-between ${
                  value === option.value
                    ? "bg-blue-100 dark:bg-blue-900/30 font-semibold text-gray-900 dark:text-white"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                <span>{option.label}</span>
                {option.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700">
                    {option.badge}
                  </span>
                )}
                {value === option.value && (
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No options found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
