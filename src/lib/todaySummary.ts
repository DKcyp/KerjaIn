import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

function pad2(n: number) { return n.toString().padStart(2, '0'); }
function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function formatDateTime(d: Date) {
  return `${formatDate(d)} ${formatTime(d)}`;
}

// Helpers for Asia/Jakarta timezone handling
const JAKARTA_TZ = 'Asia/Jakarta';
function getJakartaParts(base: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(base);
  const grab = (type: string) => Number(parts.find(p => p.type === type)?.value || '0');
  return {
    year: grab('year'),
    month: grab('month'),
    day: grab('day'),
    hour: grab('hour'),
    minute: grab('minute'),
    second: grab('second'),
  };
}
function getTZOffsetMsAt(utcDate: Date, timeZone: string) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(utcDate);
  const h = Number(p.find(x => x.type === 'hour')?.value || '0');
  const m = Number(p.find(x => x.type === 'minute')?.value || '0');
  const s = Number(p.find(x => x.type === 'second')?.value || '0');
  return ((h * 60 + m) * 60 + s) * 1000;
}
function jakartaMidnightUTCDate(parts: { year: number; month: number; day: number; }) {
  // Start with UTC midnight for that Gregorian date
  const utcMidnight = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  // Determine what local Jakarta time that UTC instant represents, then subtract the offset to reach local midnight
  const offsetMs = getTZOffsetMsAt(utcMidnight, JAKARTA_TZ);
  return new Date(utcMidnight.getTime() - offsetMs);
}
function formatDateTimeJakarta(d: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d);
}
function formatRole(role: string): string {
  if (role === 'PM') return 'PM';
  return role
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const normNumber = (raw?: string | null) => {
  if (!raw) return null;
  let n = String(raw).replace(/[^0-9+]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  if (n.startsWith('0')) n = '62' + n.slice(1);
  return n.match(/^\d{7,18}$/) ? n : null;
};
const pickNumber = (p: any): string | null => {
  const cand = p?.noHp ?? null;
  return normNumber(cand);
};

export async function sendTodaySummary() {
  // Compute time using Asia/Jakarta for day boundaries
  const now = new Date();
  const jp = getJakartaParts(now);
  const startOfToday = jakartaMidnightUTCDate({ year: jp.year, month: jp.month, day: jp.day });
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  // Fetch all target-role pegawai for the summary base set
  const targetRoles = ['PROGRAMMER', 'ADMIN'] as const;
  const allPegawai = await prisma.pegawai.findMany({
    where: { role: { in: targetRoles as any } },
    orderBy: { namaLengkap: 'asc' },
    select: { id: true, namaLengkap: true, username: true, role: true, noUrut: true, noHp: true },
  });
  const pegawaiIds = allPegawai.map(p => p.id);

  // Distinct assignees that currently have an active (not finished) task scheduled at or before now
  let tanpaTaskHariIni: typeof allPegawai = [];
  // Current task counts per pegawai (active, scheduled at/before now)
  let currentMap = new Map<number, number>();
  if (pegawaiIds.length > 0) {
    const currentAssignees = await prisma.tasklist.findMany({
      where: {
        pegawaiId: { in: pegawaiIds },
        scheduleAt: { lte: now },
        NOT: { OR: [ { status: 'SELESAI' as any }, { statusCode: 4 as any }, { status: 'MENUNGGU_REVIEW_PM' as any }, { statusCode: 3 as any } ] },
      },
      select: { pegawaiId: true },
      distinct: ['pegawaiId'],
    });
    const currentSet = new Set(currentAssignees.map(r => r.pegawaiId));
    tanpaTaskHariIni = allPegawai.filter(p => !currentSet.has(p.id)).sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));

    // Group count for current tasks per pegawai
    const currentGroups = await (prisma.tasklist as any).groupBy({
      by: ['pegawaiId'],
      where: {
        pegawaiId: { in: pegawaiIds },
        scheduleAt: { lte: now },
        NOT: { OR: [ { status: 'SELESAI' as any }, { statusCode: 4 as any }, { status: 'MENUNGGU_REVIEW_PM' as any }, { statusCode: 3 as any } ] },
      },
      _count: { _all: true },
    });
    currentMap = new Map<number, number>(currentGroups.map((g: any) => [g.pegawaiId, g._count._all as number]));
  }

  // (moved) Build message and send to SUPER_ADMIN will be placed after PM loop

  // Overdue counts per pegawai (based on deadline, not scheduleAt)
  // Task is overdue if:
  // - MENUNGGU_PROSES_USER: assigneeStartTaskDeadline < now (belum mulai padahal sudah lewat deadline mulai)
  // - SEDANG_DIPROSES_USER: assigneeWorkDeadline < now (belum selesai padahal sudah lewat deadline kerja)
  const overdueGroups = pegawaiIds.length === 0 ? [] : await prisma.$queryRaw<Array<{ pegawaiId: number; count: bigint }>>`
    SELECT "pegawaiId", COUNT(*) as count
    FROM tasklist
    WHERE "pegawaiId" IN (${Prisma.join(pegawaiIds)})
      AND (
        (status = 'MENUNGGU_PROSES_USER' AND "assigneeStartTaskDeadline" < ${now})
        OR (status = 'SEDANG_DIPROSES_USER' AND "assigneeWorkDeadline" < ${now})
      )
    GROUP BY "pegawaiId"
  `;
  const overdueMap = new Map<number, number>(overdueGroups.map((g: any) => [g.pegawaiId, Number(g.count)]));
  const terlambat = allPegawai
    .filter(p => overdueMap.has(p.id))
    .map(p => ({ pegawai: p, overdueCount: overdueMap.get(p.id) || 0 }))
    .sort((a, b) => a.pegawai.namaLengkap.localeCompare(b.pegawai.namaLengkap));
  const tanpaTaskSet = new Set(tanpaTaskHariIni.map(p => p.id));

  // Global breakdown: tasks waiting for PM review, grouped per PM (via project ownership)
  const waitingByProject = await (prisma.tasklist as any).groupBy({
    by: ['projectId'],
    where: {
      OR: [
        { status: 'MENUNGGU_REVIEW_PM' as any },
        { statusCode: 3 as any },
      ],
    },
    _count: { _all: true },
  });
  const projectIds = waitingByProject.map((g: any) => g.projectId as number);
  const projectPMs = projectIds.length
    ? await prisma.proyekTeam.findMany({
        where: { projectId: { in: projectIds }, jabatan: 'PM' as any },
        select: { projectId: true, pegawaiId: true },
      })
    : [];
  const projectToPMs = new Map<number, number[]>();
  for (const r of projectPMs) {
    const arr = projectToPMs.get(r.projectId) || [];
    arr.push(r.pegawaiId);
    projectToPMs.set(r.projectId, arr);
  }
  const pmCountMap = new Map<number, number>();
  for (const g of waitingByProject) {
    const pms = projectToPMs.get(g.projectId) || [];
    for (const pmId of pms) {
      pmCountMap.set(pmId, (pmCountMap.get(pmId) || 0) + (g._count?._all || g._count || 0));
    }
  }
  const pmIds = Array.from(pmCountMap.keys());
  const pmList = pmIds.length
    ? await prisma.pegawai.findMany({ where: { id: { in: pmIds } }, select: { id: true, namaLengkap: true }, orderBy: { namaLengkap: 'asc' } })
    : [];

  // Resolve SUPER_ADMIN recipients
  const superAdmins = await prisma.pegawai.findMany({
    where: { role: 'SUPER_ADMIN' as any },
    orderBy: { noUrut: 'asc' },
    select: { id: true, namaLengkap: true, noHp: true },
  });

  // Prepare recipients and results (will construct message after PM analysis)
  const recipientsRaw = superAdmins
    .map(sa => ({ id: sa.id, nama: sa.namaLengkap, number: pickNumber(sa) }))
    .filter(r => !!r.number) as Array<{ id: number; nama: string; number: string }>;
  const seen = new Set<string>();
  const recipients: Array<{ id: number; nama: string; number: string }> = [];
  for (const r of recipientsRaw) {
    if (seen.has(r.number)) continue;
    seen.add(r.number);
    recipients.push(r);
  }

  const sendResults: Array<{ id: number; number: string; ok: boolean; status: number; body?: string; category?: string } > = [];

  // Build and send targeted messages to PMs
  // 1) Ambil semua mapping tim proyek
  const teams = await prisma.proyekTeam.findMany({
    select: { projectId: true, pegawaiId: true, jabatan: true },
  });
  const teamByProject = new Map<number, Array<{ pegawaiId: number; jabatan: any }>>();
  for (const t of teams) {
    const arr = teamByProject.get(t.projectId) || [];
    arr.push({ pegawaiId: t.pegawaiId, jabatan: t.jabatan });
    teamByProject.set(t.projectId, arr);
  }
  // 2) pmId -> set anggota (pegawaiId) dari semua proyek di mana dia PM
  const pmToMembers = new Map<number, Set<number>>();
  for (const [projectId, members] of teamByProject.entries()) {
    const pms = members.filter(m => String(m.jabatan) === 'PM');
    const nonPMs = members.filter(m => String(m.jabatan) !== 'PM');
    for (const pm of pms) {
      const set = pmToMembers.get(pm.pegawaiId) || new Set<number>();
      for (const m of nonPMs) set.add(m.pegawaiId);
      pmToMembers.set(pm.pegawaiId, set);
    }
  }
  const pmIdsAll = Array.from(pmToMembers.keys());
  const pmDetailList = pmIdsAll.length
    ? await prisma.pegawai.findMany({ where: { id: { in: pmIdsAll } }, select: { id: true, namaLengkap: true, noHp: true } })
    : [];
  const pmDetailsById = new Map(pmDetailList.map(p => [p.id, p]));
  // Lookup pegawai detail map
  const pegawaiById = new Map(allPegawai.map(p => [p.id, p]));
  // Collect PMs without Programmer/Admin members for summary section
  const pmNoTeamList: Array<{ nama: string; current: number; overdue: number } > = [];

  for (const pmId of pmIdsAll) {
    const pm = pmDetailsById.get(pmId);
    if (!pm) continue;
    const number = pickNumber(pm as any);
    if (!number) continue;
    const members = Array.from(pmToMembers.get(pmId) || []);
    // Detect if PM has no ADMIN/PROGRAMMER members
    const progAdminMembers = members.filter(id => pegawaiById.has(id));
    if (progAdminMembers.length === 0) {
      // Compute PM's own task status (current and overdue)
      let pmCurrent = 0;
      let pmOverdue = 0;
      try {
        const currentCount = await (prisma.tasklist as any).groupBy({
          by: ['pegawaiId'],
          where: {
            pegawaiId: pmId,
            scheduleAt: { lte: now },
            NOT: { OR: [ { status: 'SELESAI' as any }, { statusCode: 4 as any } ] },
          },
          _count: { _all: true },
        });
        pmCurrent = currentCount?.[0]?._count?._all || 0;
      } catch {}
      try {
        const overdueCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM tasklist
          WHERE "pegawaiId" = ${pmId}
            AND (
              (status = 'MENUNGGU_PROSES_USER' AND "assigneeStartTaskDeadline" < ${now})
              OR (status = 'SEDANG_DIPROSES_USER' AND "assigneeWorkDeadline" < ${now})
            )
        `;
        pmOverdue = Number(overdueCount?.[0]?.count || 0);
      } catch {}

      // Add to global summary list (aggregated for SUPER_ADMIN message)
      pmNoTeamList.push({ nama: pm.namaLengkap, current: pmCurrent, overdue: pmOverdue });

      // Send to the PM themselves (keep notifying PM)
      const infoLines = [
        `Info: Anda saat ini tidak memiliki anggota tim berperan Programmer/Admin.`,
        `Status Anda:`,
        `- Task tersisa saat ini: ${pmCurrent}`,
        `- Task terlambat: ${pmOverdue}`,
        '',
        '_(Pesan Otomatis dari Richz-Log)_',
      ];
      const infoMsg = infoLines.join('\n');
      try {
        const res = await fetch('https://wa.expressa.id/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number, message: infoMsg }),
        });
        const body = await (res.text().catch(() => ''));
        sendResults.push({ id: pm.id, number, ok: res.ok, status: res.status, body, category: 'PM_SELF' });
      } catch (e) {
        sendResults.push({ id: pm.id, number, ok: false, status: 0, body: String(e), category: 'PM_SELF' });
      }
    }
    // Filter anggota yang tanpa task atau terlambat
    const flagged = members
      .map(id => ({ id, data: pegawaiById.get(id) }))
      .filter(x => !!x.data)
      .map(x => ({
        id: x!.id,
        nama: x!.data!.namaLengkap,
        role: String((x!.data as any).role || ''),
        overdueCount: overdueMap.get(x!.id) || 0,
        tanpaTask: tanpaTaskSet.has(x!.id),
      }))
      .filter(x => x.tanpaTask || x.overdueCount > 0)
      .sort((a, b) => a.nama.localeCompare(b.nama));

    if (flagged.length === 0) continue;

    const pmMsgLines = [
      `Halo ${pm.namaLengkap}, berikut ringkasan anggota tim Anda yang perlu perhatian:`,
      '',
      ...flagged.map((x, idx) => {
        const notes: string[] = [];
        if (x.tanpaTask) notes.push('Tanpa task');
        if (x.overdueCount > 0) notes.push(`${x.overdueCount} task terlambat`);
        return `${idx + 1}. ${x.nama} (${formatRole(x.role)}) - ${notes.join(', ')}`;
      }),
      '',
      '_(Pesan Otomatis dari Richz-Log)_',
    ];
    const pmMessage = pmMsgLines.join('\n');

    try {
      const res = await fetch('https://wa.expressa.id/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, message: pmMessage }),
      });
      const body = await (res.text().catch(() => ''));
      sendResults.push({ id: pm.id, number, ok: res.ok, status: res.status, body, category: 'PM' });
    } catch (e) {
      sendResults.push({ id: pm.id, number, ok: false, status: 0, body: String(e), category: 'PM' });
    }
  }

  // Build global message (after all computations)
  const headerLines = [
    `Ringkasan Richz-Log ${formatDateTimeJakarta(now)}:`,
    '',
  ];
  const pmReviewLines = (() => {
    const countPegawai = pmList.length;
    const lines: string[] = [`Menunggu Review PM (${countPegawai} Pegawai):`];
    for (let i = 0; i < pmList.length; i++) {
      const p = pmList[i];
      const c = pmCountMap.get(p.id) || 0;
      lines.push(`${i + 1}. ${p.namaLengkap} - ${c} Task Menunggu Review`);
    }
    lines.push('');
    return lines;
  })();

  const tanpaLines = tanpaTaskHariIni.length === 0
    ? ['Tidak ada PROGRAMMER/ADMIN tanpa task saat ini.']
    : [
        `Tanpa Task Saat Ini (${tanpaTaskHariIni.length} Pegawai):`,
        ...tanpaTaskHariIni.map((p, idx) => `${idx + 1}. ${p.namaLengkap} (${formatRole(String(p.role))})`),
      ];

  const terlambatLines = terlambat.length === 0
    ? ['Tidak ada yang terlambat.']
    : [
        `Terlambat (${terlambat.length} pegawai):`,
        ...terlambat.map((r, idx) => `${idx + 1}. ${r.pegawai.namaLengkap} (${formatRole(String(r.pegawai.role))}) - ${r.overdueCount} Task Terlambat`),
      ];

  const pmNoTeamLines = pmNoTeamList.length === 0
    ? []
    : [
        `PM Tanpa Tim Programmer/Admin (${pmNoTeamList.length}):`,
        ...pmNoTeamList.map((x, idx) => `${idx + 1}. ${x.nama} - Task tersisa: ${x.current}, Terlambat: ${x.overdue}`),
        '',
      ];

  const message = [
    ...headerLines,
    ...pmReviewLines,
    ...pmNoTeamLines,
    ...tanpaLines,
    '',
    ...terlambatLines,
    '',
    '_(Pesan Otomatis dari Richz-Log)_',
  ].join('\n');

  // Send global message to SUPER_ADMINs
  for (const r of recipients) {
    try {
      const res = await fetch('https://wa.expressa.id/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: r.number, message }),
      });
      const body = await (res.text().catch(() => ''));
      sendResults.push({ id: r.id, number: r.number, ok: res.ok, status: res.status, body, category: 'SUPER_ADMIN' });
    } catch (e) {
      sendResults.push({ id: r.id, number: r.number, ok: false, status: 0, body: String(e), category: 'SUPER_ADMIN' });
    }
  }

  return {
    recipients: recipients.map(r => ({ id: r.id, nama: r.nama, number: r.number })),
    sendResults,
    summary: { tanpaTaskHariIniCount: tanpaTaskHariIni.length, terlambatCount: terlambat.length },
  };
}
