"use client";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventInput,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import TaskDetailModal from "@/components/tasklist/TaskDetailModal";

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    pegawaiNama?: string;
    kode?: string;
    proyekNama?: string;
    moduleNama?: string;
    status?: string;
    rawTask?: any;
    groupedTasks?: any[];
    isExpandedGroup?: boolean;
    groupKey?: string;
    taskCount?: number;
  };
}

interface CalendarProps {
  selectedMonth: string;
  selectedPegawaiId: number | null;
  selectedProjectId: number | null;
}

const Calendar: React.FC<CalendarProps> = ({ selectedMonth, selectedPegawaiId, selectedProjectId }) => {
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rawTasks, setRawTasks] = useState<any[]>([]);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const s = String(iso);
    const m = s.match(/^\d{4}-\d{2}-\d{2}/);
    if (m) return m[0];
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const statusToCalendar = (status?: string) => {
    switch (status) {
      case 'MENUNGGU_PROSES_USER': return 'Warning';
      case 'SEDANG_DIPROSES_USER': return 'Primary';
      case 'MENUNGGU_REVIEW_PM': return 'Danger';
      case 'SELESAI': return 'Success';
      default: return 'Warning';
    }
  };

  const openTaskDetail = useCallback((task: any) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  }, []);

  const collapseGroup = useCallback(() => {
    setExpandedGroupKey(null);
  }, []);

  const events = useMemo<CalendarEvent[]>(() => {
    const groups: Record<string, any[]> = {};
    for (const t of rawTasks) {
      const dateKey = formatDate(t.scheduleAt);
      if (!dateKey) continue;
      const groupKey = `${dateKey}|${t.pegawaiNama || ''}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(t);
    }

    const evts: CalendarEvent[] = [];
    for (const [groupKey, grp] of Object.entries(groups)) {
      const first = grp[0];
      const dateKey = groupKey.split('|')[0];
      const isExpanded = groupKey === expandedGroupKey;

      const count = grp.length;
      const pegawaiNama = first.pegawaiNama || '';
      evts.push({
        id: `group-${groupKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
        title: pegawaiNama,
        start: dateKey,
        allDay: true,
        extendedProps: {
          calendar: isExpanded ? 'Primary' : statusToCalendar(first.status),
          pegawaiNama,
          kode: first.kode || '',
          proyekNama: first.proyekNama || '',
          status: isExpanded ? '' : (first.status || ''),
          rawTask: first,
          groupedTasks: grp,
          isExpandedGroup: isExpanded,
          groupKey,
          taskCount: count,
        },
      });
    }
    return evts;
  }, [rawTasks, expandedGroupKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams();
        if (selectedPegawaiId != null) qs.set('pegawaiId', String(selectedPegawaiId));
        if (selectedProjectId != null) qs.set('projectId', String(selectedProjectId));
        qs.set('showAll', '1');
        qs.set('page', '1');
        qs.set('size', '5000');
        const res = await fetch(`/api/tasklist?${qs.toString()}`, { cache: 'no-store', credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setRawTasks(Array.isArray(data?.items) ? data.items : []);
        setExpandedGroupKey(null);
      } catch (e) {
        console.error('Failed to fetch tasks', e);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedPegawaiId, selectedProjectId, selectedMonth]);

  useEffect(() => {
    if (!selectedMonth) return;
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const [y, m] = selectedMonth.split('-').map((v) => Number(v));
    if (Number.isFinite(y) && Number.isFinite(m)) {
      Promise.resolve().then(() => {
        api.gotoDate(new Date(y, (m || 1) - 1, 1, 0, 0, 0, 0));
      });
    }
  }, [selectedMonth]);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const ext = clickInfo.event.extendedProps as any;
    if (ext.isExpandedGroup) return;
    const grp = ext.groupedTasks || [];
    if (grp.length === 0) return;

    const dateKey = formatDate(grp[0].scheduleAt);
    const groupKey = `${dateKey}|${ext.pegawaiNama}`;
    setExpandedGroupKey(groupKey);
  }, []);

  const closeDetailModal = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedTask(null);
  }, []);

  const eventContent = useCallback((eventInfo: EventContentArg) => {
    const rawStatus = String((eventInfo.event.extendedProps as any)?.status || '').trim();
    const ext = eventInfo.event.extendedProps as any;

    if (ext?.isExpandedGroup) {
      const tasks = ext.groupedTasks || [];
      return (
        <div className="fc-event-main w-full">
          <div
            onClick={(e) => { e.stopPropagation(); collapseGroup(); }}
            className="flex cursor-pointer items-center gap-1 rounded-t border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            <span>&#9650;</span>
            <span>Sembunyikan</span>
            <span className="ml-auto text-gray-500 dark:text-gray-400">{ext.pegawaiNama || ''}</span>
          </div>
          {tasks.map((task: any) => {
            const st = String(task?.status || '').trim();
            let sc = 'border-l-gray-400';
            if (st === 'SEDANG_DIPROSES_USER') sc = 'border-l-blue-400';
            else if (st === 'MENUNGGU_REVIEW_PM') sc = 'border-l-amber-400';
            else if (st === 'SELESAI') sc = 'border-l-emerald-400';
            return (
              <div
                key={task.id}
                onClick={(e) => { e.stopPropagation(); openTaskDetail(task); }}
                className={`rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 ${sc} border-l-4 px-1.5 py-1 mt-0.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700`}
              >
                <div className="text-[10px] font-medium text-gray-900 dark:text-gray-100 truncate">
                  {task.proyekNama || ''}{task.moduleNama ? ' - ' + task.moduleNama : ''}
                </div>
                <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate">
                  {task.kode || ''}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    const count = ext?.taskCount || 0;
    let wrapperBg = 'bg-gray-100 border border-gray-300 text-gray-800 dark:bg-gray-500/20 dark:border-transparent dark:text-white';
    if (rawStatus === 'MENUNGGU_PROSES_USER') wrapperBg = 'bg-gray-100 border border-gray-300 text-gray-800 dark:bg-gray-500/20 dark:border-transparent dark:text-white';
    if (rawStatus === 'SEDANG_DIPROSES_USER') wrapperBg = 'bg-blue-100 border border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-transparent dark:text-white';
    if (rawStatus === 'MENUNGGU_REVIEW_PM') wrapperBg = 'bg-amber-100 border border-amber-300 text-amber-800 dark:bg-amber-500/20 dark:border-transparent dark:text-white';
    if (rawStatus === 'SELESAI') wrapperBg = 'bg-emerald-100 border border-emerald-300 text-emerald-800 dark:bg-emerald-500/20 dark:border-transparent dark:text-white';
    return (
      <div className={`event-fc-color fc-event-main ${wrapperBg} w-full max-w-full overflow-hidden rounded-sm px-1 py-[1px] cursor-pointer`}>
        <div className="flex w-full items-center gap-1 leading-tight min-w-0 overflow-hidden">
          <span className="font-medium text-[11px] truncate flex-1">{eventInfo.event.title}</span>
          <span className="shrink-0 text-[10px] font-semibold text-gray-500 dark:text-gray-400">({count})</span>
          <span className="text-[10px] opacity-70 shrink-0">&#9654;</span>
        </div>
      </div>
    );
  }, [collapseGroup, openTaskDetail]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="custom-calendar">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          timeZone="local"
          headerToolbar={{
            left: "",
            center: "title",
            right: "",
          }}
          events={events}
          selectable={false}
          editable={false}
          eventStartEditable={false}
          eventDurationEditable={false}
          droppable={false}
          eventClick={handleEventClick}
          eventContent={eventContent}
          height="auto"
        />
      </div>

      <TaskDetailModal
        key={selectedTask?.id || 'no-task'}
        isOpen={detailModalOpen}
        onClose={closeDetailModal}
        task={selectedTask}
      />

      <style jsx global>{`
        .fc .fc-daygrid-day.fc-day-today {
          background-color: transparent !important;
        }
        .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
          font-weight: 400 !important;
          color: inherit !important;
        }
        .fc .fc-daygrid-day {
          min-height: 80px !important;
          height: auto !important;
        }
        .fc .fc-daygrid-day-frame {
          min-height: 80px !important;
        }
      `}</style>
    </div>
  );
};

export default Calendar;

if (typeof document !== 'undefined') {
  const styleId = 'fullcalendar-dark-mode';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .dark .fc .fc-toolbar-title {
        color: white !important;
      }
      .dark .fc .fc-col-header-cell-cushion {
        color: white !important;
      }
      .dark .fc .fc-daygrid-day-number {
        color: white !important;
      }
      .dark .fc .fc-button {
        background-color: rgba(255, 255, 255, 0.1) !important;
        border-color: rgba(255, 255, 255, 0.2) !important;
        color: white !important;
      }
      .dark .fc .fc-button:hover {
        background-color: rgba(255, 255, 255, 0.2) !important;
      }
      .dark .fc .fc-button .fc-icon {
        color: white !important;
      }
      .dark .fc-icon {
        color: white !important;
      }
      .dark .fc .fc-daygrid-day.fc-day-other .fc-daygrid-day-number {
        color: rgba(255, 255, 255, 0.4) !important;
      }
      .dark .fc .fc-scrollgrid {
        border-color: rgba(255, 255, 255, 0.1) !important;
      }
      .dark .fc .fc-scrollgrid td,
      .dark .fc .fc-scrollgrid th {
        border-color: rgba(255, 255, 255, 0.1) !important;
      }
      .dark .fc-event,
      .dark .fc-event-main,
      .dark .fc-event-main div,
      .dark .fc-event-main span {
        color: white !important;
      }
    `;
    document.head.appendChild(style);
  }
}
