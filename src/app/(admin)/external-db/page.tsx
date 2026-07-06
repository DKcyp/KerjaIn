"use client";

import React, { useEffect, useState } from "react";

type ExternalUser = Record<string, any>;

export default function ExternalDbPage() {
  const [items, setItems] = useState<ExternalUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/external-db/employees?${params}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e.message || "Gagal mengambil data");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const totalPages = Math.ceil(total / pageSize);
  const columns = items.length > 0 ? Object.keys(items[0]) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          External DB — global_auth_user
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Data dari database <code>dev_richz</code> (schema: global)
        </p>
        <a
          href="/external-db/compare"
          className="inline-block mt-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
        >
          Compare dengan Internal DB →
        </a>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Cari nama / username..."
          className="flex-1 max-w-md rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">
            Error: {error}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Total: {total} data | Halaman {page} / {totalPages || 1}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length || 1}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length || 1}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Tidak ada data
                </td>
              </tr>
            ) : (
              items.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[200px] truncate"
                      title={String(row[col] ?? "")}
                    >
                      {row[col] === null ? (
                        <span className="text-gray-400">-</span>
                      ) : typeof row[col] === "object" ? (
                        JSON.stringify(row[col])
                      ) : (
                        String(row[col])
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
