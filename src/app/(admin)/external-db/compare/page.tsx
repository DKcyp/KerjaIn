"use client";

import React, { useEffect, useState, useCallback } from "react";

type CompareResult = {
  summary: {
    totalExternal: number;
    totalInternal: number;
    matched: number;
    externalOnly: number;
    internalOnly: number;
  };
  matched: Array<{
    external: Record<string, any>;
    internal: Record<string, any>;
    matchBy: string;
  }>;
  externalOnly: Record<string, any>[];
  internalOnly: Record<string, any>[];
  departments: Array<{ dep_id: string; dep_nama: string }>;
};

type MigratePreview = {
  summary: {
    totalExternal: number;
    toInsert: number;
    toUpdate: number;
    skipped: number;
  };
  toInsert: Array<{ external: Record<string, any>; mappedData: Record<string, any> }>;
  toUpdate: Array<{
    external: Record<string, any>;
    internal: Record<string, any>;
    mappedData: Record<string, any>;
    currentData: Record<string, any>;
  }>;
  skipped: Array<{ external: Record<string, any>; reason: string }>;
};

type Tab = "matched" | "externalOnly" | "internalOnly" | "migrate";

export default function ComparePage() {
  const [data, setData] = useState<CompareResult | null>(null);
  const [migratePreview, setMigratePreview] = useState<MigratePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrateLoading, setMigrateLoading] = useState(false);
  const [migratingItem, setMigratingItem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("matched");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/external-db/compare", { credentials: "include" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || "Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMigratePreview = useCallback(async () => {
    try {
      const res = await fetch("/api/external-db/migrate", { credentials: "include" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setMigratePreview(await res.json());
    } catch (e: any) {
      setError(e.message || "Gagal mengambil preview migrasi");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "migrate") {
      fetchMigratePreview();
    }
  }, [activeTab, fetchMigratePreview]);

  const handleMigrateAll = async (mode: "insert" | "update" | "all") => {
    const confirmMsg =
      mode === "all"
        ? "Migrasi semua data? (insert + update)"
        : mode === "insert"
        ? "Insert semua data baru yang belum ada di internal?"
        : "Update semua data yang sudah cocok?";
    if (!confirm(confirmMsg)) return;

    setMigrateLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/external-db/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
        credentials: "include",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);

      const msg = `Berhasil! Insert: ${result.summary.inserted}, Update: ${result.summary.updated}, Skip: ${result.summary.skipped}`;
      setSuccess(msg);
      // Refresh both views
      await Promise.all([fetchData(), fetchMigratePreview()]);
    } catch (e: any) {
      setError(e.message || "Gagal melakukan migrasi");
    } finally {
      setMigrateLoading(false);
    }
  };

  const handleMigrateItem = async (usrId: string) => {
    setMigratingItem(usrId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/external-db/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "all", items: [{ usr_id: usrId }] }),
        credentials: "include",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
      setSuccess(`Item ${usrId} berhasil dimigrasi`);
      await Promise.all([fetchData(), fetchMigratePreview()]);
    } catch (e: any) {
      setError(e.message || "Gagal migrasi item");
    } finally {
      setMigratingItem(null);
    }
  };

  const handleBulkMigrate = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Migrasi ${selectedItems.size} item terpilih?`)) return;

    setMigrateLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const items = Array.from(selectedItems).map((usrId) => ({ usr_id: usrId }));
      const res = await fetch("/api/external-db/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "all", items }),
        credentials: "include",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
      setSuccess(`${items.length} item berhasil dimigrasi`);
      setSelectedItems(new Set());
      await Promise.all([fetchData(), fetchMigratePreview()]);
    } catch (e: any) {
      setError(e.message || "Gagal bulk migrasi");
    } finally {
      setMigrateLoading(false);
    }
  };

  const toggleSelectItem = (usrId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(usrId)) next.delete(usrId);
      else next.add(usrId);
      return next;
    });
  };

  const toggleSelectAll = (items: Array<{ external: Record<string, any> }>) => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((i) => i.external.usr_id)));
    }
  };

  const filterRows = (rows: any[], key?: string) => {
    let result = rows;

    // Filter by department (only for external data)
    if (filterDept) {
      result = result.filter((row) => {
        const obj = key ? row[key] || row : row;
        return obj.id_dep === filterDept || obj.external?.id_dep === filterDept;
      });
    }

    // Filter by search text
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter((row) => {
      const obj = key ? row[key] || row : row;
      return Object.values(obj).some(
        (v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q)
      );
    });
  };

  const tabs: { key: Tab; label: string; count: number; color: string }[] = data
    ? [
        { key: "matched", label: "Cocok", count: data.summary.matched, color: "green" },
        { key: "externalOnly", label: "Hanya External", count: data.summary.externalOnly, color: "yellow" },
        { key: "internalOnly", label: "Hanya Internal", count: data.summary.internalOnly, color: "red" },
        {
          key: "migrate",
          label: "Migrasi",
          count: migratePreview ? migratePreview.summary.toInsert + migratePreview.summary.toUpdate : 0,
          color: "blue",
        },
      ]
    : [];

  const currentRows =
    activeTab === "matched"
      ? filterRows(data?.matched || [])
      : activeTab === "externalOnly"
      ? filterRows(data?.externalOnly || [])
      : activeTab === "internalOnly"
      ? filterRows(data?.internalOnly || [])
      : [];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Compare & Migrate Data Pegawai
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Internal (Prisma) vs External (global_auth_user) — Tarik data dari external ke internal
        </p>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <SummaryCard label="External" value={data.summary.totalExternal} color="blue" />
          <SummaryCard label="Internal" value={data.summary.totalInternal} color="purple" />
          <SummaryCard label="Cocok" value={data.summary.matched} color="green" />
          <SummaryCard label="Hanya External" value={data.summary.externalOnly} color="yellow" />
          <SummaryCard label="Hanya Internal" value={data.summary.internalOnly} color="red" />
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">Error: {error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Loading */}
      {loading && <div className="text-center py-12 text-gray-500">Loading...</div>}

      {/* Content */}
      {data && !loading && (
        <>
          {/* Tabs + Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-wrap">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === t.key
                      ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {t.label}{" "}
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === t.key ? "bg-gray-200 dark:bg-gray-600" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full sm:w-48 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Semua Departemen</option>
                {data?.departments?.map((d) => (
                  <option key={d.dep_id} value={d.dep_id}>
                    {d.dep_nama}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter..."
                className="w-full sm:w-64 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Tables */}
          {activeTab === "matched" && <MatchedTable rows={currentRows as any[]} />}
          {activeTab === "externalOnly" && (
            <SingleTable
              rows={currentRows as Record<string, any>[]}
              columns={["usr_id", "usr_name", "usr_loginname", "nama_pgw", "id_dep", "dep_nama", "rol_name", "usr_status", "usr_no_hp"]}
              label="External"
            />
          )}
          {activeTab === "internalOnly" && (
            <SingleTable
              rows={currentRows as Record<string, any>[]}
              columns={["id", "noUrut", "namaLengkap", "username", "noHp", "role", "departemenId"]}
              label="Internal"
            />
          )}

          {/* Migrate Tab */}
          {activeTab === "migrate" && (
            <MigratePanel
              preview={migratePreview}
              loading={migrateLoading}
              migratingItem={migratingItem}
              selectedItems={selectedItems}
              search={search}
              filterDept={filterDept}
              onMigrateAll={handleMigrateAll}
              onMigrateItem={handleMigrateItem}
              onBulkMigrate={handleBulkMigrate}
              onSelectItem={toggleSelectItem}
              onSelectAll={toggleSelectAll}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ─── Migrate Panel ─── */
function MigratePanel({
  preview,
  loading,
  migratingItem,
  selectedItems,
  search,
  filterDept,
  onMigrateAll,
  onMigrateItem,
  onBulkMigrate,
  onSelectItem,
  onSelectAll,
}: {
  preview: MigratePreview | null;
  loading: boolean;
  migratingItem: string | null;
  selectedItems: Set<string>;
  search: string;
  filterDept: string;
  onMigrateAll: (mode: "insert" | "update" | "all") => void;
  onMigrateItem: (usrId: string) => void;
  onBulkMigrate: () => void;
  onSelectItem: (usrId: string) => void;
  onSelectAll: (items: Array<{ external: Record<string, any> }>) => void;
}) {
  if (!preview) {
    return <div className="text-center py-12 text-gray-500">Loading preview...</div>;
  }

  const filterMigrateRows = (items: Array<{ external: Record<string, any>; mappedData?: Record<string, any> }>) => {
    let result = items;

    if (filterDept) {
      result = result.filter((item) => item.external.id_dep === filterDept);
    }

    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter((item) => {
      const ext = item.external;
      return Object.values(ext).some(
        (v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q)
      );
    });
  };

  const filteredInsert = filterMigrateRows(preview.toInsert);
  const filteredUpdate = filterMigrateRows(preview.toUpdate);

  const allItems = [...filteredInsert, ...filteredUpdate];
  const allSelected = allItems.length > 0 && allItems.every((i) => selectedItems.has(i.external.usr_id));

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400 mr-2">
          <span className="font-semibold text-green-600 dark:text-green-400">{preview.summary.toInsert}</span> insert
          {" · "}
          <span className="font-semibold text-yellow-600 dark:text-yellow-400">{preview.summary.toUpdate}</span> update
          {" · "}
          <span className="font-semibold text-gray-500">{preview.summary.skipped}</span> skip
        </div>

        <div className="flex gap-2 ml-auto">
          {preview.summary.toInsert > 0 && (
            <button
              onClick={() => onMigrateAll("insert")}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Insert All ({preview.summary.toInsert})
            </button>
          )}
          {preview.summary.toUpdate > 0 && (
            <button
              onClick={() => onMigrateAll("update")}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Update All ({preview.summary.toUpdate})
            </button>
          )}
          {allItems.length > 0 && (
            <button
              onClick={() => onMigrateAll("all")}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Migrate Semua ({allItems.length})
            </button>
          )}
          {selectedItems.size > 0 && (
            <button
              onClick={onBulkMigrate}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Migrate Terpilih ({selectedItems.size})
            </button>
          )}
        </div>
      </div>

      {/* Insert Items */}
      {filteredInsert.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-bold text-green-700 dark:text-green-400">
              + Insert Baru ({filteredInsert.length})
            </h3>
            <button
              onClick={() => onSelectAll(filteredInsert)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {allSelected ? "Unselect All" : "Select All"}
            </button>
          </div>
          <div className="overflow-x-auto border border-green-200 dark:border-green-800 rounded-lg">
            <table className="min-w-full divide-y divide-green-200 dark:divide-green-800">
              <thead className="bg-green-50 dark:bg-green-900/20">
                <tr>
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => onSelectAll(filteredInsert)}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 dark:text-green-300">usr_id</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 dark:text-green-300">nama_pgw</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 dark:text-green-300">usr_loginname</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 dark:text-green-300">id_dep</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 dark:text-green-300">dep_nama</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 dark:text-green-300">rol_name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 dark:text-green-300">usr_no_hp</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 dark:text-green-300">→ namaLengkap</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 dark:text-green-300">→ username</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-green-700 dark:text-green-300">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-100 dark:divide-green-900">
                {filteredInsert.map((item) => (
                  <tr key={item.external.usr_id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.external.usr_id)}
                        onChange={() => onSelectItem(item.external.usr_id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm">{item.external.usr_id}</td>
                    <td className="px-3 py-2 text-sm">{item.external.nama_pgw}</td>
                    <td className="px-3 py-2 text-sm">{item.external.usr_loginname}</td>
                    <td className="px-3 py-2 text-sm">{item.external.id_dep}</td>
                    <td className="px-3 py-2 text-sm">{item.external.dep_nama || "-"}</td>
                    <td className="px-3 py-2 text-sm">{item.external.rol_name || "-"}</td>
                    <td className="px-3 py-2 text-sm">{item.external.usr_no_hp}</td>
                    <td className="px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300">{item.mappedData.namaLengkap}</td>
                    <td className="px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300">{item.mappedData.username || "-"}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => onMigrateItem(item.external.usr_id)}
                        disabled={migratingItem === item.external.usr_id}
                        className="px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                      >
                        {migratingItem === item.external.usr_id ? "..." : "Insert"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Update Items */}
      {filteredUpdate.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
              ~ Update ({filteredUpdate.length})
            </h3>
            <button
              onClick={() => onSelectAll(filteredUpdate)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {allSelected ? "Unselect All" : "Select All"}
            </button>
          </div>
          <div className="overflow-x-auto border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <table className="min-w-full divide-y divide-yellow-200 dark:divide-yellow-800">
              <thead className="bg-yellow-50 dark:bg-yellow-900/20">
                <tr>
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => onSelectAll(filteredUpdate)}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-yellow-700 dark:text-yellow-300">noUrut</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-yellow-700 dark:text-yellow-300">nama (ext → int)</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-yellow-700 dark:text-yellow-300">username (ext → int)</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-yellow-700 dark:text-yellow-300">departemen (ext)</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-yellow-700 dark:text-yellow-300">role (ext → int)</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-yellow-700 dark:text-yellow-300">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-yellow-100 dark:divide-yellow-900">
                {filteredUpdate.map((item) => (
                  <tr key={item.external.usr_id} className="hover:bg-yellow-50/50 dark:hover:bg-yellow-900/10">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.external.usr_id)}
                        onChange={() => onSelectItem(item.external.usr_id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm">{item.internal.noUrut}</td>
                    <td className="px-3 py-2 text-sm">
                      <span className="text-red-500 line-through">{item.currentData.namaLengkap}</span>
                      {" → "}
                      <span className="text-green-600 dark:text-green-400 font-medium">{item.mappedData.namaLengkap}</span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className="text-red-500 line-through">{item.currentData.username || "-"}</span>
                      {" → "}
                      <span className="text-green-600 dark:text-green-400 font-medium">{item.mappedData.username || "-"}</span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {item.external.dep_nama ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">{item.external.dep_nama}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className="text-red-500 line-through">{item.internal.role}</span>
                      {" → "}
                      <span className="text-green-600 dark:text-green-400 font-medium">{item.external.rol_name || "ADMIN"}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => onMigrateItem(item.external.usr_id)}
                        disabled={migratingItem === item.external.usr_id}
                        className="px-2 py-1 text-xs font-medium bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors disabled:opacity-50"
                      >
                        {migratingItem === item.external.usr_id ? "..." : "Update"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Skipped */}
      {preview.skipped.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-500 mb-3">Skipped ({preview.skipped.length})</h3>
          <div className="text-xs text-gray-500">
            {preview.skipped.map((s, i) => (
              <span key={i} className="inline-block mr-2 mb-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                {s.external.nama_pgw || s.external.usr_id} — {s.reason}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredInsert.length === 0 && filteredUpdate.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Semua data sudah sinkron! Tidak ada yang perlu dimigrasi.
        </div>
      )}
    </div>
  );
}

/* ─── Existing Components ─── */
function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    green: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  };
  return (
    <div className={`rounded-lg border p-3 ${colorMap[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-80">{label}</div>
    </div>
  );
}

function MatchedTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return <div className="text-center py-8 text-gray-500">Tidak ada data cocok</div>;
  }

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th colSpan={7} className="px-4 py-2 text-center text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
              External (global_auth_user)
            </th>
            <th className="px-2 py-2 border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
              <span className="text-xs text-gray-500">Match</span>
            </th>
            <th colSpan={5} className="px-4 py-2 text-center text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border-b border-purple-200 dark:border-purple-800">
              Internal (pegawai)
            </th>
          </tr>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <ExtTh>usr_id</ExtTh>
            <ExtTh>usr_name</ExtTh>
            <ExtTh>usr_loginname</ExtTh>
            <ExtTh>nama_pgw</ExtTh>
            <ExtTh>id_dep</ExtTh>
            <ExtTh>dep_nama</ExtTh>
            <ExtTh>rol_name</ExtTh>
            <ExtTh>usr_no_hp</ExtTh>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-b border-gray-200 dark:border-gray-700">via</th>
            <IntTh>noUrut</IntTh>
            <IntTh>namaLengkap</IntTh>
            <IntTh>username</IntTh>
            <IntTh>noHp</IntTh>
            <IntTh>role</IntTh>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <ExtTd>{row.external.usr_id}</ExtTd>
              <ExtTd>{row.external.usr_name}</ExtTd>
              <ExtTd>{row.external.usr_loginname}</ExtTd>
              <ExtTd>{row.external.nama_pgw}</ExtTd>
              <ExtTd>{row.external.id_dep}</ExtTd>
              <ExtTd>{row.external.dep_nama || <span className="text-gray-400">-</span>}</ExtTd>
              <ExtTd>{row.external.rol_name || <span className="text-gray-400">-</span>}</ExtTd>
              <ExtTd>{row.external.usr_no_hp}</ExtTd>
              <td className="px-2 py-2 text-center">
                <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                  {row.matchBy}
                </span>
              </td>
              <IntTd>{row.internal.noUrut}</IntTd>
              <IntTd>{row.internal.namaLengkap}</IntTd>
              <IntTd>{row.internal.username || <span className="text-gray-400">-</span>}</IntTd>
              <IntTd>{row.internal.noHp}</IntTd>
              <IntTd>
                <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 rounded">
                  {row.internal.role}
                </span>
              </IntTd>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SingleTable({
  rows,
  columns,
  label,
}: {
  rows: Record<string, any>[];
  columns: string[];
  label: string;
}) {
  if (rows.length === 0) {
    return <div className="text-center py-8 text-gray-500">Tidak ada data</div>;
  }

  return (
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
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {columns.map((col) => (
                <td
                  key={col}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[200px] truncate"
                  title={String(row[col] ?? "")}
                >
                  {row[col] === null || row[col] === undefined ? (
                    <span className="text-gray-400">-</span>
                  ) : (
                    String(row[col])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExtTh({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider border-b border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10 whitespace-nowrap">
      {children}
    </th>
  );
}

function IntTh({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider border-b border-purple-100 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-900/10 whitespace-nowrap">
      {children}
    </th>
  );
}

function ExtTd({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap bg-blue-50/30 dark:bg-blue-900/5">
      {children === null || children === undefined ? <span className="text-gray-400">-</span> : children}
    </td>
  );
}

function IntTd({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap bg-purple-50/30 dark:bg-purple-900/5">
      {children === null || children === undefined ? <span className="text-gray-400">-</span> : children}
    </td>
  );
}
