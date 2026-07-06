"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchOnce } from "@/lib/fetchOnce";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Calendar from "@/components/calendar/Calendar";

interface PegawaiOption { id: number; nama: string }
type Role = 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN';
type Proyek = { id: number; namaProyek: string };

const getCurrentMonthStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export default function CalendarPageClient() {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr());
  const [pegawaiOptions, setPegawaiOptions] = useState<PegawaiOption[]>([]);
  const [selectedPegawaiId, setSelectedPegawaiId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { user: me } = useAuth() as { user: { id: number; role: Role } | null };
  const [projects, setProjects] = useState<Proyek[]>([]);
  const [filterTeamMemberIds, setFilterTeamMemberIds] = useState<number[]>([]);

  // current user comes from AuthProvider

  // load all pegawai (UI options; access enforcement still on backend)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchOnce('/api/pegawai', { ttlMs: 3000 });
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        const opts: PegawaiOption[] = items
          .map((it: any) => ({ id: Number(it.id ?? it.pegawaiId ?? it.ID ?? 0), nama: String(it.namaLengkap ?? it.nama ?? '') }))
          .filter((o: PegawaiOption) => Number.isFinite(o.id) && !!o.nama);
        if (!cancelled) setPegawaiOptions(opts);
      } catch { }
    })();
    return () => { cancelled = true; };
  }, []);

  // load visible projects (already role-filtered by backend)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        console.log('[Calendar] Fetching projects...');
        const res = await fetch('/api/proyek?activeOnly=true', { credentials: 'include', cache: 'no-store' });
        console.log('[Calendar] Projects response ok:', res.ok);
        if (!res.ok) return;
        const d = await res.json();
        console.log('[Calendar] Projects data:', d);
        const items = Array.isArray(d?.items) ? d.items as Proyek[] : [];
        console.log('[Calendar] Projects items:', items);
        if (alive) setProjects(items);
      } catch (e) {
        console.error('[Calendar] Failed to fetch projects:', e);
      }
    })();
    return () => { alive = false; };
  }, []);

  // compute allowed team member ids based on role and projects
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!me) { if (alive) setFilterTeamMemberIds([]); return; }
      if (me.role === 'PROGRAMMER' || me.role === 'ADMIN') { if (alive) setFilterTeamMemberIds([me.id]); return; }
      if (me.role === 'PM') {
        const collect = async (pid: number): Promise<number[]> => {
          try {
            const r = await fetch(`/api/proyek-team/${pid}`, { cache: 'no-store', credentials: 'include' });
            if (!r.ok) return [];
            const d = await r.json();
            const arr = Array.isArray(d?.items) ? d.items : [];
            return arr.map((x: { pegawaiId: number }) => Number(x.pegawaiId)).filter((n: number) => Number.isFinite(n));
          } catch { return []; }
        };
        const lists = await Promise.all(projects.map((p) => collect(p.id)));
        const s = new Set<number>();
        for (const ids of lists) for (const id of ids) s.add(id);
        if (alive) setFilterTeamMemberIds(Array.from(s));
        return;
      }
      // SUPER_ADMIN -> no restriction
      if (alive) setFilterTeamMemberIds([]);
    })();
    return () => { alive = false; };
  }, [me, projects]);

  // derive filtered options
  const filteredPegawaiOptions = useMemo(() => {
    if (!me) return pegawaiOptions;
    if (me.role === 'SUPER_ADMIN') return pegawaiOptions;
    if (me.role === 'PROGRAMMER' || me.role === 'ADMIN') return pegawaiOptions.filter((p) => p.id === me.id);
    // PM
    return pegawaiOptions.filter((p) => filterTeamMemberIds.includes(p.id));
  }, [pegawaiOptions, me, filterTeamMemberIds]);

  // keep selectedPegawaiId valid
  useEffect(() => {
    if (selectedPegawaiId != null && !filteredPegawaiOptions.some((p) => p.id === selectedPegawaiId)) {
      setSelectedPegawaiId(null);
    }
  }, [filteredPegawaiOptions, selectedPegawaiId]);

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb (title) */}
      <PageBreadcrumb pageTitle="Calendar" />

      {/* Filters directly below title */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-[200px] flex-1 flex-col gap-1 sm:max-w-xs">
            <label className="text-xs font-medium text-gray-600 dark:text-white/70">Bulan</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 rounded border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div className="flex min-w-[200px] flex-1 flex-col gap-1 sm:max-w-xs">
            <label className="text-xs font-medium text-gray-600 dark:text-white/70">Pegawai</label>
            <select
              value={selectedPegawaiId ?? ''}
              onChange={(e) => setSelectedPegawaiId(e.target.value ? Number(e.target.value) : null)}
              className="h-9 rounded border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">Semua</option>
              {filteredPegawaiOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>
          <div className="flex min-w-[200px] flex-1 flex-col gap-1 sm:max-w-xs">
            <label className="text-xs font-medium text-gray-600 dark:text-white/70">Proyek</label>
            <select
              value={selectedProjectId ?? ''}
              onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
              className="h-9 rounded border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">Semua Proyek</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.namaProyek || `Project ${p.id}`}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <Calendar selectedMonth={selectedMonth} selectedPegawaiId={selectedPegawaiId} selectedProjectId={selectedProjectId} />
    </div>
  );
}
