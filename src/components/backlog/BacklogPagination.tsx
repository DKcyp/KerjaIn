import React from 'react';

interface BacklogPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

const BacklogPagination: React.FC<BacklogPaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  loading = false,
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (total === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-white/[0.06] rounded-xl px-6 py-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Results Info */}
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Menampilkan <span className="font-medium">{startItem}</span> sampai{' '}
          <span className="font-medium">{endItem}</span> dari{' '}
          <span className="font-medium">{total}</span> hasil
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center space-x-2">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Sebelumnya
          </button>

          {/* Page Numbers */}
          <div className="hidden sm:flex items-center space-x-1">
            {getPageNumbers().map((pageNum, index) => (
              <React.Fragment key={index}>
                {pageNum === '...' ? (
                  <span className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">...</span>
                ) : (
                  <button
                    onClick={() => onPageChange(pageNum as number)}
                    disabled={loading}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      page === pageNum
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {pageNum}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Mobile Page Info */}
          <div className="sm:hidden text-sm text-gray-700 dark:text-gray-300">
            Halaman {page} dari {totalPages}
          </div>

          {/* Next Button */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Selanjutnya
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quick Jump (for large datasets) */}
      {totalPages > 10 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center space-x-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Lompat ke halaman:</label>
            <input
              type="number"
              min="1"
              max={totalPages}
              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = parseInt((e.target as HTMLInputElement).value);
                  if (value >= 1 && value <= totalPages) {
                    onPageChange(value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              placeholder={String(page)}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">dari {totalPages}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BacklogPagination;