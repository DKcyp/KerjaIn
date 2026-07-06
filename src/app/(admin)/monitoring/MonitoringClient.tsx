"use client";

import React, { useState, useEffect, useRef } from "react";

type Project = {
    id: number;
    namaProyek: string;
};

type Task = {
    id: number;
    kode: string;
    keterangan: string;
    status: string;
    startDate?: string;
    scheduleDate?: string;
    endDate?: string;
    duration?: number;
    pegawai: {
        namaLengkap: string;
    };
    module: {
        nama: string;
        project: {
            namaProyek: string;
        };
    };
};

type ProgrammerCount = {
    id: number;
    name: string;
    count: number;
};

type PMCount = {
    id: number;
    name: string;
    count: number;
};

type MonitoringData = {
    totalTasks: number;
    listTasks: Task[];
    programmerCounts: ProgrammerCount[];
    pmCounts: PMCount[];
};

interface MonitoringClientProps {
    projects: Project[];
}

export default function MonitoringClient({ projects }: MonitoringClientProps) {
    const [selectedProjectIds, setSelectedProjectIds] = useState<string>("");
    const [data, setData] = useState<MonitoringData | null>(null);
    // const [loading, setLoading] = useState(false); // Not needed since we don't show loading state
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Fetch data
    const fetchData = async () => {
        // if (!selectedProjectIds) {
        //     setData(null);
        //     setLoading(false);
        //     return;
        // }

        try {
            // setLoading(true); // Don't set loading on refresh to avoid flickering
            const params = new URLSearchParams();
            if (selectedProjectIds) {
                params.append('projectIds', selectedProjectIds);
            }

            const res = await fetch(`/api/monitoring?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch data');
            const jsonData = await res.json();
            setData(jsonData);
            // setLoading(false);
        } catch (error) {
            console.error("Error fetching monitoring data", error);
        }
    };

    // Only fetch data when projects are selected
    useEffect(() => {
        if (selectedProjectIds) {
            fetchData();
            // Set interval for auto-refresh every 2 minutes
            const interval = setInterval(fetchData, 120000); // 2 minutes
            return () => clearInterval(interval);
        } else {
            // Clear data when no projects selected
            setData(null);
        }
    }, [selectedProjectIds]);

    // Handle Select2 Change
    // Select2Field returns a comma separated string for multiple? 
    // Wait, Select2Field in this codebase seems designed for single select mostly?
    // I need to check if Select2Field supports multiple.
    // Looking at Select2Field code: `value` is string | number. `onChange` returns string | number | "".
    // It initializes with `width: "100%"`.
    // Does it support `multiple` prop? The props don't list `multiple`.
    // I might need to update Select2Field or use a different approach if it doesn't support multiple.
    // The user prompt said: "select2 multiple".
    // If `Select2Field` doesn't support it, I might have to hack it or create a new wrapper.
    // Let's assume for now I will try to pass `multiple` attribute via ...props if possible, but the component explicit props don't have it.
    // The `Select2Field` implementation binds `val()` as string.
    // I will check `Select2Field.tsx` again.
    // It takes `value`, `onChange`.

    // Actually, for "select2 multiple", I might need to just use the standard HTML select with `multiple` and init Select2 on it, 
    // OR modify Select2Field to support it. 
    // Given the constraints and the user request "select2 multiple", I should probably check if I can modify Select2Field or make a local version.
    // I'll stick to a simple multiple select first using the existing component if I can, but strictly speaking existing Select2Field doesn't look like it handles multiple arrays well.

    // Let's look at `Select2Field` again. `onChange`: (value: string | number | "") => void.
    // If it's multiple, Select2 value matches array.
    // the `handler` does `const v = ($el.val() as string | null);`. If multiple, `$el.val()` returns array of strings.
    // So the existing component might break or return array.

    // I will use a simple workaround: Custom useEffect to init select2 multiple on a simple select element here, 
    // instead of reusing Select2Field if it's not compatible. 
    // Since I am in `MonitoringClient`, I can use jQuery directly if I import it, or just use `Select2Field` and hope I can patch it.
    // BUT, to be safe and quick, I will implement a local `Select2Multiple` inside this file or just use the `Select2Field` and assume I can pass a prop (I'll need to modify Select2Field to accept `multiple`).

    // Decision: I'll try to use a standard HTML select with ref and init select2 manually for multiple support.

    useEffect(() => {
        // Auto scroll logic
        const container = scrollContainerRef.current;
        if (!container) return;

        let scrollAmount = 0;
        let direction = 1; // 1 = down, -1 = up
        const speed = 1; // pixels per tick
        const delay = 50; // ms

        const scrollInterval = setInterval(() => {
            if (!container) return;

            // If content is smaller than container, don't scroll
            if (container.scrollHeight <= container.clientHeight) return;

            if (direction === 1) {
                scrollAmount += speed;
                if (scrollAmount >= container.scrollHeight - container.clientHeight) {
                    direction = -1;
                    // Pause at bottom
                }
            } else {
                scrollAmount -= speed;
                if (scrollAmount <= 0) {
                    direction = 1;
                    // Pause at top
                }
            }

            container.scrollTop = scrollAmount;

        }, delay);

        return () => clearInterval(scrollInterval);
    }, [data?.listTasks]); // Restart when data changes? Maybe better to keep scrolling.

    return (
        <div className="w-full max-w-full min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            {/* Title and Filter in same row */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Project Monitoring</h1>
                
                {/* Inline Filter Button */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
                            <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform duration-200 ${isFilterExpanded ? 'rotate-180' : ''}`}>
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Expandable Filter Section */}
            {isFilterExpanded && (
                <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <CustomSelect2Multiple
                        options={projects.map(p => ({ id: p.id, text: p.namaProyek }))}
                        value={selectedProjectIds.split(',').filter(Boolean)}
                        onChange={(vals) => setSelectedProjectIds(vals.join(','))}
                    />
                </div>
            )}

            <div className="w-full space-y-6">
                {/* Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[400px]">
                    {/* Total Tasklist Box */}
                    <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg shadow p-6 flex flex-col items-center justify-center border border-blue-400/50 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-blue-100 mb-2 relative z-10">Total Tasklist</h2>
                        <div className="text-6xl font-bold text-white relative z-10">
                            {data?.totalTasks ?? 0}
                        </div>
                    </div>

                    {/* List Tasklist Table - Spans 3 cols */}
                    <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <h2 className="font-semibold text-gray-700 dark:text-gray-300">List Tasklist</h2>
                        </div>

                        {/* Status Legend */}
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div className="flex flex-wrap gap-2 text-xs">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-900/40"></div>
                                    <span className="text-gray-600 dark:text-gray-400">Menunggu Proses</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-blue-200 dark:bg-blue-900/40"></div>
                                    <span className="text-gray-600 dark:text-gray-400">Sedang Diproses</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-900/40"></div>
                                    <span className="text-gray-600 dark:text-gray-400">Paused</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-purple-200 dark:bg-purple-900/40"></div>
                                    <span className="text-gray-600 dark:text-gray-400">Review PM</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative group">
                            {/* Header for table */}
                            <div className="grid grid-cols-11 gap-2 p-3 bg-gray-100 dark:bg-gray-800 font-semibold text-xs text-gray-600 dark:text-gray-400 border-b dark:border-gray-700">
                                <div className="col-span-1">Kode</div>
                                <div className="col-span-3">Project / Module</div>
                                <div className="col-span-4">Task</div>
                                <div className="col-span-2">Sched & Due</div>
                                <div className="col-span-1">Durasi</div>
                            </div>

                            {/* Scrollable Content */}
                            <div ref={scrollContainerRef} className="absolute inset-0 top-10 overflow-y-auto no-scrollbar pb-10">
                                {data?.listTasks.map((task, idx) => {
                                    // Define background colors based on task status
                                    const getRowBgColor = (status: string) => {
                                        switch (status) {
                                            case 'SELESAI':
                                                return 'bg-green-200 dark:bg-green-900/40 hover:bg-green-300 dark:hover:bg-green-900/50';
                                            case 'MENUNGGU_PROSES_USER':
                                                return 'bg-yellow-200 dark:bg-yellow-900/40 hover:bg-yellow-300 dark:hover:bg-yellow-900/50';
                                            case 'SEDANG_DIPROSES_USER':
                                                return 'bg-blue-200 dark:bg-blue-900/40 hover:bg-blue-300 dark:hover:bg-blue-900/50';
                                            case 'SEDANG_DIPROSES_USER_PAUSED':
                                                return 'bg-orange-200 dark:bg-orange-900/40 hover:bg-orange-300 dark:hover:bg-orange-900/50';
                                            case 'MENUNGGU_REVIEW_PM':
                                                return 'bg-purple-200 dark:bg-purple-900/40 hover:bg-purple-300 dark:hover:bg-purple-900/50';
                                            default:
                                                return 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700/50';
                                        }
                                    };

                                    return (
                                    <div key={task.id} className={`grid grid-cols-11 gap-2 p-3 text-sm border-b border-gray-100 dark:border-gray-800 transition-colors ${getRowBgColor(task.status)}`}>
                                        <div className="col-span-1 font-mono text-xs truncate dark:text-gray-300" title={task.kode}>{task.kode}</div>

                                        <div className="col-span-3 text-xs text-gray-500 dark:text-gray-400 truncate" title={`${task.module.project.namaProyek} - ${task.module.nama}`}>
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{task.module.project.namaProyek}</span>
                                            <span className="mx-1">-</span>
                                            <span>{task.module.nama}</span>
                                        </div>

                                        <div className="col-span-4 truncate dark:text-gray-300" title={task.keterangan}>{task.keterangan}</div>

                                        <div className="col-span-2 text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                                            <span className="font-semibold text-blue-600 dark:text-blue-400">S:</span>
                                            <span>{task.scheduleDate ? new Date(task.scheduleDate).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                            <span className="mx-0.5">|</span>
                                            <span className="font-semibold text-red-600 dark:text-red-400">D:</span>
                                            <span>{task.endDate ? new Date(task.endDate).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                        </div>

                                        <div className="col-span-1 text-xs flex items-center dark:text-gray-300">
                                            {task.duration ? `${Math.floor(task.duration / 60)}h ${task.duration % 60}m` : '-'}
                                        </div>
                                    </div>
                                    );
                                })}
                                {(!data?.listTasks || data.listTasks.length === 0) && (
                                    <div className="p-10 text-center text-gray-500 flex flex-col items-center justify-center h-full">
                                        {!selectedProjectIds ? (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                                </svg>
                                                <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Silakan pilih project untuk melihat monitoring</p>
                                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Gunakan filter project di atas untuk menampilkan data</p>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                                </svg>
                                                <p>Tidak ada task aktif ditemukan</p>
                                                <p className="text-xs mt-1">untuk project yang dipilih</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 2 - Full width with max 5 cards per row */}
                <div className="w-full flex flex-wrap gap-4 lg:gap-6">
                    {!selectedProjectIds ? (
                        // Show empty state when no filter selected
                        <div className="col-span-full">
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <p className="text-gray-600 dark:text-gray-400 font-medium">PM dan Programmer</p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Akan muncul setelah memilih project filter</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Calculate total cards for dynamic width */}
                            {(() => {
                                const totalCards = (data?.pmCounts?.length || 0) + (data?.programmerCounts?.length || 0);
                                const cardWidth = totalCards === 1 ? 'w-full' : 
                                                totalCards === 2 ? 'w-[calc(50%-0.75rem)]' :
                                                totalCards === 3 ? 'w-[calc(33.333%-1rem)]' :
                                                totalCards === 4 ? 'w-[calc(25%-1.125rem)]' :
                                                'w-[calc(20%-1.2rem)]'; // 5 cards
                                
                                return (
                                    <>
                                        {/* PM Cards - Dynamic Cards */}
                                        {data?.pmCounts?.map((pm) => (
                                            <div key={pm.id} className={`bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow p-6 border border-indigo-400/50 text-white relative overflow-hidden group flex flex-col items-center justify-center text-center ${cardWidth}`}>
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-sm font-medium text-indigo-100 mb-2 relative z-10" title={pm.name}>
                                        {pm.name}
                                    </h2>
                                    <div className="text-5xl font-bold text-white relative z-10">
                                        {pm.count}
                                    </div>
                                </div>
                            ))}

                                        {/* Programmer Cards */}
                                        {data?.programmerCounts.map((prog, index) => {
                                            // Cyclic colors
                                            const colors = [
                                                'from-blue-500 to-cyan-600',
                                                'from-emerald-500 to-teal-600',
                                                'from-orange-500 to-red-600',
                                                'from-pink-500 to-rose-600',
                                                'from-violet-500 to-purple-600',
                                                'from-amber-400 to-orange-500',
                                            ];
                                            const colorClass = colors[index % colors.length];

                                            return (
                                                <div key={prog.id} className={`bg-gradient-to-br ${colorClass} rounded-lg shadow p-6 border border-white/20 text-white relative overflow-hidden group flex flex-col items-center justify-center text-center ${cardWidth}`}>
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                            </svg>
                                        </div>
                                        <h2 className="text-sm font-medium text-white/90 mb-2 relative z-10" title={prog.name}>
                                            {prog.name}
                                        </h2>
                                        <div className="text-5xl font-bold text-white relative z-10">
                                            {prog.count}
                                        </div>
                                    </div>
                                                );
                                            })}
                                    </>
                                );
                            })()}
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}

// Internal component for Select2 Multiple since the shared one might not support it
// Imports query and select2
import $ from "jquery";
import "select2/dist/css/select2.css";

// Need to ensure globals
if (typeof window !== "undefined") {
    (window as any).$ = (window as any).jQuery = $;
}

function CustomSelect2Multiple({ options, value, onChange }: {
    options: { id: number; text: string }[],
    value: string[],
    onChange: (val: string[]) => void
}) {
    const selectRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        // Lazy load select2
        if (typeof window !== "undefined") {
            require("select2");
        }
    }, []);

    useEffect(() => {
        const $el = $(selectRef.current!);
        $el.select2({
            width: '100%',
            placeholder: 'Select Projects',
            multiple: true,
            allowClear: true
        });

        $el.on('change', () => {
            const val = $el.val(); // Returns array of strings for multiple
            onChange(Array.isArray(val) ? val as string[] : []);
        });

        return () => {
            $el.off('change');
            $el.select2('destroy');
        };
    }, []);

    // Sync value
    useEffect(() => {
        const $el = $(selectRef.current!);
        if (JSON.stringify($el.val()) !== JSON.stringify(value)) {
            $el.val(value).trigger('change.select2');
        }
    }, [value]);

    return (
        <select ref={selectRef} multiple className="w-full">
            {options.map(opt => (
                <option key={opt.id} value={String(opt.id)}>{opt.text}</option>
            ))}
        </select>
    );
}
