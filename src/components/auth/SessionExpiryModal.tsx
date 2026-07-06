"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";

interface SessionExpiryModalProps {
  isOpen: boolean;
  onRelogin: () => void;
}

export const SessionExpiryModal: React.FC<SessionExpiryModalProps> = ({
  isOpen,
  onRelogin,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing
      showCloseButton={false}
      disableOutsideClose={true}
      disableEscClose={true}
      className="max-w-md mx-4"
    >
      <div className="p-6 text-center">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <svg
            className="h-8 w-8 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Sesi Anda Telah Selesai
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Sesi login Anda telah berakhir karena alasan keamanan. Silakan login kembali untuk melanjutkan.
        </p>

        {/* Button */}
        <button
          onClick={onRelogin}
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
            />
          </svg>
          Login Kembali
        </button>
      </div>
    </Modal>
  );
};
