"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChangelogModal from "@/components/ui/ChangelogModal";

type VersionItem = {
  id: string;
  appName: string;
  version: string;
  appUrl: string | null;
  techStack: string[];
  isActive: boolean;
  releasedAt: string | null;
  createdAt: string;
  applicationId: string;
};

type VersionsResponse = {
  status: string;
  items: VersionItem[];
};

// (removed per-card ChangeLoader; using bulk loader when modal opens)

export default function AppFooter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<VersionItem[]>([]);
  const [appName, setAppName] = useState<string>("KerjaIn");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);
  const [changesMap, setChangesMap] = useState<Record<string, { title: string; description?: string }[]>>({});
  const [changesLoading, setChangesLoading] = useState<boolean>(false);
  const loadedChangesRef = useRef(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/app-versions`, { cache: "no-store" });
        if (!res.ok) return;
        const data: VersionsResponse = await res.json();
        if (ignore) return;
        if (data?.items?.length) {
          setItems(data.items);
          try {
            const withDate = data.items.every((it: VersionItem) => it.releasedAt || it.createdAt);
            let latestItem: VersionItem | undefined;
            if (withDate) {
              latestItem = [...data.items].sort((a: VersionItem, b: VersionItem) => {
                const da = new Date(a.releasedAt || a.createdAt).getTime();
                const db = new Date(b.releasedAt || b.createdAt).getTime();
                return db - da;
              })[0];
            } else {
              latestItem = data.items[0];
            }
            if (latestItem?.appName) setAppName(latestItem.appName);
          } catch {}
          setErrorMsg(undefined);
        } else {
          setItems([]);
          setErrorMsg((data as any)?.error || 'Tidak dapat memuat changelog.');
        }
      } catch (e: any) {
        setErrorMsg(e?.message || 'Tidak dapat memuat changelog.');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  const year = useMemo(() => new Date().getFullYear(), []);
  const latest = useMemo(() => {
    if (!items || items.length === 0) return undefined;
    // Prefer releasedAt, fallback to createdAt, else keep original order
    const withDate = items.every(it => it.releasedAt || it.createdAt);
    if (withDate) {
      const sorted = [...items].sort((a, b) => {
        const da = new Date(a.releasedAt || a.createdAt).getTime();
        const db = new Date(b.releasedAt || b.createdAt).getTime();
        return db - da;
      });
      return sorted[0];
    }
    return items[0];
  }, [items]);

  const hasFreshRelease = useMemo(() => {
    if (!latest) return false;
    const ts = new Date(latest.releasedAt || latest.createdAt).getTime();
    if (Number.isNaN(ts)) return false;
    const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
    return Date.now() - ts <= TWO_DAYS;
  }, [latest]);

  const handleLoadedItem = useCallback((id: string, list: { title: string; description?: string }[]) => {
    setChangesMap((prev) => ({ ...prev, [id]: list }));
  }, []);

  // Bulk load all changes once when modal is opened
  useEffect(() => {
    if (!open) return;
    if (loadedChangesRef.current) return;
    if (!items || items.length === 0) return; // wait until versions are loaded
    loadedChangesRef.current = true;
    let active = true;
    (async () => {
      try {
        setChangesLoading(true);
        const entries = await Promise.allSettled(items.map(async (it) => {
          try {
            const res = await fetch(`/api/app-versions/${it.id}/changes`, { cache: 'no-store' });
            const ok = res.ok;
            const data = ok ? await res.json() : null;
            const rawItems = Array.isArray(data?.items) ? data.items : [];
            const changes: { title: string; description?: string }[] = rawItems.map((r: any) => ({
              title: r?.title || r?.name || 'Untitled',
              description: typeof r?.description === 'string' ? r.description : Array.isArray(r?.description) ? r.description.join('\n') : (r?.detail || r?.message || undefined),
            }));
            return [it.id, changes] as const;
          } catch {
            return [it.id, [] as { title: string; description?: string }[]] as const;
          }
        }));
        if (!active) return;
        const map: Record<string, { title: string; description?: string }[]> = {};
        for (const e of entries) {
          if (e.status === 'fulfilled') {
            const [id, list] = e.value;
            map[id] = list;
          }
        }
        setChangesMap(map);
      } finally {
        if (active) setChangesLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open, items]);

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 md:py-6 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-sm">© {year} {appName}. All rights reserved.</span>
        <a
          href="https://expressa.id"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline hover:text-gray-900 dark:hover:text-white"
        >
          expressa.id
        </a>
        {latest?.version && (
          <span className="text-sm">- {latest.version}</span>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${hasFreshRelease ? 'relative pl-3 pr-3 py-1 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/20' : 'underline hover:text-gray-900 dark:hover:text-white'} text-sm`}
        >
          {hasFreshRelease && (
            <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
          changelog
        </button>
      </div>

      <ChangelogModal open={open} onClose={() => setOpen(false)} title={`Changelog • ${appName}`}>
        {/* Subtitle */}
        <p className="text-xs text-gray-500 mb-3">All versions and their changes</p>

        {/* Loading / Error States */}
        {loading && (
          <div className="py-6 flex items-center gap-2 text-sm text-gray-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
            Loading changelog...
          </div>
        )}
        {!loading && errorMsg && (
          <div className="py-3 text-sm text-amber-600 dark:text-amber-400">
            {errorMsg}
          </div>
        )}

        {/* Bulk loader runs once on open; below we show per-card loading state until map filled */}

        {/* Timeline */}
        {!loading && items.length > 0 && (
          <div className="space-y-6">
            {[...items]
              .sort((a, b) => {
                const da = new Date(a.releasedAt || a.createdAt).getTime();
                const db = new Date(b.releasedAt || b.createdAt).getTime();
                return db - da;
              })
              .map((it, idx) => {
                const dt = new Date(it.releasedAt || it.createdAt);
                const dateStr = isNaN(dt.getTime()) ? '' : dt.toLocaleDateString();
                const isLatest = idx === 0;
                return (
                  <div key={it.id} className="rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 p-4 hover:shadow-sm transition-shadow">
                    <div className="flex gap-4">
                      {/* Left: version badge and date */}
                      <div className="w-24 shrink-0 flex flex-col items-center">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isLatest ? 'bg-rose-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100'}`}>{it.version}</span>
                        <span className="mt-2 text-[10px] text-gray-500">{dateStr}</span>
                      </div>

                      {/* Right: timeline content with vertical connector */}
                      <div className="flex-1 relative">
                        {/* connector */}
                        <div className="absolute left-1.5 top-0 bottom-0 ml-0.5">
                          <div className="h-full w-px bg-gray-200 dark:bg-gray-700" />
                        </div>
                        <div className="pl-6">
                          <div className="flex items-start gap-2">
                            <span className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${isLatest ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{isLatest ? 'Latest' : 'Version'} {it.version}</h4>
                              {!changesMap[it.id] && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                                  Loading changes...
                                </div>
                              )}
                              {changesMap[it.id] && changesMap[it.id].length > 0 ? (
                                <div className="mt-2 space-y-3">
                                  {changesMap[it.id].map((c, i) => (
                                    <div key={i}>
                                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{c.title}</div>
                                      {c.description && (
                                        <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line mt-0.5">{c.description}</pre>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                changesMap[it.id] && changesMap[it.id].length === 0 && (
                                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Tidak ada detail perubahan yang tersedia.</div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </ChangelogModal>
    </footer>
  );
}
