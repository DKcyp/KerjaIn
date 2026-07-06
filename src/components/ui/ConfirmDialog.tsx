"use client";

interface ConfirmDialogProps {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info" | "success";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  show,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  type = "info",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!show) return null;

  const icons = {
    danger: (
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <svg
          className="h-6 w-6 text-red-600 dark:text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
    ),
    warning: (
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
        <svg
          className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
    ),
    info: (
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
        <svg
          className="h-6 w-6 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
    ),
    success: (
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <svg
          className="h-6 w-6 text-green-600 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    ),
  };

  const confirmStyles = {
    danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    warning: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
    info: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    success: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={isLoading ? undefined : onCancel}
        />

        {/* Dialog */}
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <div className="mb-4">{icons[type]}</div>
                <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white mb-2">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`inline-flex w-full justify-center items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmStyles[type]}`}
            >
              {isLoading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {confirmText}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
