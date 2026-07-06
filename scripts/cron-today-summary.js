/*
  Cron runner for Today Summary refresh
  - Default: Calls the Next.js API route every hour (configurable by INTERVAL_MS)
  - Optional schedule: Trigger persis di jam tertentu menurut waktu Asia/Jakarta
    - CRON_MODE=default  → Senin–Jumat (8–15), Sabtu (9–11), Minggu (off)
    - CRON_MODE=custom   → Gunakan CRON_HOURS dan CRON_WEEKDAYS
  - Triggers once on start (setelah server siap)

  Config:
  - BASE_URL: base URL to your running Next app (default: http://localhost:3001)
  - INTERVAL_MS: fallback interval (default: 1 jam)
  - CRON_MODE: 'default' | 'custom' | undefined (jika undefined → gunakan INTERVAL_MS saja)
  - CRON_HOURS (custom): contoh "8,9,10,11,12,13,14,15"
  - CRON_WEEKDAYS (custom): angka 0-6 (0=Min) contoh "1,2,3,4,5" atau range "1-5"
*/

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const TARGET = `${BASE_URL}/api/pegawai/today-summary/refresh`;
const INTERVAL_MS = Number(process.env.CRON_INTERVAL_MS || 60 * 60 * 1000);
const CRON_MODE = process.env.CRON_MODE || 'default'; // 'default' | 'custom'
const CRON_HOURS = process.env.CRON_HOURS || '';
const CRON_WEEKDAYS = process.env.CRON_WEEKDAYS || '';
const STARTUP_RETRIES = Number(process.env.CRON_STARTUP_RETRIES || 20); // ~40s if 2s step
const STARTUP_RETRY_DELAY_MS = Number(process.env.CRON_STARTUP_RETRY_DELAY_MS || 2000);

async function ensureFetch() {
  if (typeof fetch !== 'undefined') return fetch;
  // Fallback to node-fetch if running on older Node
  const mod = await import('node-fetch');
  return mod.default;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function waitForServer() {
  const _fetch = await ensureFetch();
  const healthUrl = BASE_URL;
  for (let i = 1; i <= STARTUP_RETRIES; i++) {
    try {
      const res = await _fetch(healthUrl, { method: 'GET' });
      if (res.ok) {
        console.log(`[cron-today-summary] Server is up (attempt ${i}/${STARTUP_RETRIES}). Proceeding...`);
        return true;
      }
      console.log(`[cron-today-summary] Server responded ${res.status} (attempt ${i}/${STARTUP_RETRIES}). Retrying in ${STARTUP_RETRY_DELAY_MS}ms...`);
    } catch (e) {
      console.log(`[cron-today-summary] Server not ready (attempt ${i}/${STARTUP_RETRIES}). Retrying in ${STARTUP_RETRY_DELAY_MS}ms...`);
    }
    await sleep(STARTUP_RETRY_DELAY_MS);
  }
  console.warn('[cron-today-summary] Server did not become ready in time. Continuing anyway; triggers will retry.');
  return false;
}

async function triggerOnce() {
  try {
    const startedAt = new Date();
    console.log(`[cron-today-summary] trigger start ${startedAt.toISOString()} → ${TARGET}`);
    const _fetch = await ensureFetch();
    const res = await _fetch(TARGET, { method: 'GET', headers: { 'accept': 'application/json' } });
    const contentType = res.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await res.json() : await res.text();
    const finishedAt = new Date();
    const tookMs = finishedAt.getTime() - startedAt.getTime();
    const nextAt = new Date(Date.now() + INTERVAL_MS).toISOString();
    const level = res.ok ? 'log' : 'warn';
    console[level](`[cron-today-summary] trigger done ${finishedAt.toISOString()} (took ${tookMs}ms) status=${res.status} next=${nextAt} body=`, body);
  } catch (err) {
    const nextAt = new Date(Date.now() + INTERVAL_MS).toISOString();
    console.error('[cron-today-summary] trigger error; will retry at', nextAt, err);
  }
}

function startScheduler() {
  if (CRON_MODE === 'default' || CRON_MODE === 'custom') {
    console.log(`[cron-today-summary] PID=${process.pid} starting scheduler in CRON_MODE=${CRON_MODE} (Asia/Jakarta based) target=${TARGET}`);
    console.log('[cron-today-summary] Waiting for server to be ready before first run...');
    waitForServer().then(() => {
      // If within allowed window, trigger immediately once, then schedule next tick
      if (isAllowedNow()) {
        console.log('[cron-today-summary] First run: within allowed window, triggering now then scheduling next tick...');
        triggerOnce().then(() => scheduleNext());
      } else {
        console.log('[cron-today-summary] First run: outside allowed window, scheduling next tick...');
        scheduleNext();
      }
    });
  } else {
    const human = INTERVAL_MS % 60000 === 0
      ? `${Math.round(INTERVAL_MS / 60000)} minute(s)`
      : `${INTERVAL_MS} ms`;
    console.log(`[cron-today-summary] PID=${process.pid} starting scheduler interval=${human} target=${TARGET}`);
    console.log('[cron-today-summary] Waiting for server to be ready before first run...');
    waitForServer().then(() => {
      console.log('[cron-today-summary] First run: triggering now...');
      triggerOnce();
    });
    const timer = setInterval(triggerOnce, INTERVAL_MS);
    timer.unref && timer.unref();
    // Graceful shutdown for interval mode
    const shutdown = () => {
      console.log('[cron-today-summary] Shutting down');
      clearInterval(timer);
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    return;
  }

  // In CRON_MODE schedule, we manage timeouts dynamically
  const shutdown = () => {
    console.log('[cron-today-summary] Shutting down');
    if (global.__cron_timeout) clearTimeout(global.__cron_timeout);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startScheduler();

// ---------------------- Scheduling (Asia/Jakarta) ----------------------
const JAKARTA_TZ = 'Asia/Jakarta';
function getJakartaParts(base) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JAKARTA_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(base);
  const grabNum = (type) => Number(parts.find(p => p.type === type)?.value || '0');
  const weekdayStr = (parts.find(p => p.type === 'weekday')?.value || 'Sun');
  const wdMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: grabNum('year'), month: grabNum('month'), day: grabNum('day'),
    hour: grabNum('hour'), minute: grabNum('minute'), second: grabNum('second'),
    weekday: wdMap[weekdayStr] ?? 0,
  };
}
function getTZOffsetMsAt(utcDate, timeZone) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(utcDate);
  const h = Number(p.find(x => x.type === 'hour')?.value || '0');
  const m = Number(p.find(x => x.type === 'minute')?.value || '0');
  const s = Number(p.find(x => x.type === 'second')?.value || '0');
  return ((h * 60 + m) * 60 + s) * 1000;
}
function jakartaMidnightUTCDate(parts) {
  const utcMidnight = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  const offsetMs = getTZOffsetMsAt(utcMidnight, JAKARTA_TZ);
  return new Date(utcMidnight.getTime() - offsetMs);
}
function nextDayParts(y, m, d) {
  const todayMidUTC = jakartaMidnightUTCDate({ year: y, month: m, day: d });
  const nextUTC = new Date(todayMidUTC.getTime() + 24 * 60 * 60 * 1000);
  const p = getJakartaParts(nextUTC);
  return { year: p.year, month: p.month, day: p.day, weekday: p.weekday };
}

function parseList(spec) {
  // supports "8,9,10" and ranges like "8-15"
  const set = new Set();
  String(spec).split(',').map(s => s.trim()).filter(Boolean).forEach(tok => {
    if (tok.includes('-')) {
      const [a, b] = tok.split('-').map(n => Number(n));
      if (!isNaN(a) && !isNaN(b)) {
        const start = Math.min(a, b), end = Math.max(a, b);
        for (let i = start; i <= end; i++) set.add(i);
      }
    } else {
      const n = Number(tok);
      if (!isNaN(n)) set.add(n);
    }
  });
  return Array.from(set).sort((a, b) => a - b);
}

function computeNextTriggerDateDefault(now) {
  // Mon-Fri: 8..15; Sat: 9..11; Sun: off
  const p = getJakartaParts(now);
  let y = p.year, m = p.month, d = p.day, wd = p.weekday, h = p.hour;
  if (p.minute > 0 || p.second > 0) h += 1;
  const isAllowed = (wd, h) => (wd >= 1 && wd <= 5 && h >= 8 && h <= 15) || (wd === 6 && h >= 9 && h <= 11);
  for (let dayStep = 0; dayStep < 14; dayStep++) {
    for (let hh = h; hh <= 23; hh++) {
      if (isAllowed(wd, hh)) {
        const midUTC = jakartaMidnightUTCDate({ year: y, month: m, day: d });
        const target = new Date(midUTC.getTime() + hh * 60 * 60 * 1000);
        if (target.getTime() > now.getTime()) return target;
      }
    }
    // move to next day
    const nd = nextDayParts(y, m, d);
    y = nd.year; m = nd.month; d = nd.day; wd = nd.weekday; h = 0;
  }
  return new Date(now.getTime() + INTERVAL_MS);
}

function computeNextTriggerDateCustom(now) {
  const hours = parseList(CRON_HOURS);
  const weekdays = parseList(CRON_WEEKDAYS);
  if (hours.length === 0 || weekdays.length === 0) return new Date(now.getTime() + INTERVAL_MS);
  const p = getJakartaParts(now);
  let y = p.year, m = p.month, d = p.day, wd = p.weekday, h = p.hour;
  if (p.minute > 0 || p.second > 0) h += 1;
  const isAllowed = (wd, h) => weekdays.includes(wd) && hours.includes(h);
  for (let dayStep = 0; dayStep < 14; dayStep++) {
    for (let hh = h; hh <= 23; hh++) {
      if (isAllowed(wd, hh)) {
        const midUTC = jakartaMidnightUTCDate({ year: y, month: m, day: d });
        const target = new Date(midUTC.getTime() + hh * 60 * 60 * 1000);
        if (target.getTime() > now.getTime()) return target;
      }
    }
    const nd = nextDayParts(y, m, d);
    y = nd.year; m = nd.month; d = nd.day; wd = nd.weekday; h = 0;
  }
  return new Date(now.getTime() + INTERVAL_MS);
}

function isAllowedNow() {
  const now = new Date();
  const p = getJakartaParts(now);
  const day = p.weekday; // 0=Sun .. 6=Sat (Jakarta)
  const hour = p.hour;
  if (CRON_MODE === 'default') {
    // Mon-Fri 08..15, Sat 09..11
    return (day >= 1 && day <= 5 && hour >= 8 && hour <= 15) || (day === 6 && hour >= 9 && hour <= 11);
  } else if (CRON_MODE === 'custom') {
    const hours = parseList(CRON_HOURS);
    const weekdays = parseList(CRON_WEEKDAYS);
    if (hours.length === 0 || weekdays.length === 0) return false;
    return weekdays.includes(day) && hours.includes(hour);
  }
  return false;
}

async function scheduleNext() {
  const now = new Date();
  const next = (CRON_MODE === 'default') ? computeNextTriggerDateDefault(now) : computeNextTriggerDateCustom(now);
  const delay = Math.max(0, next.getTime() - now.getTime());
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: JAKARTA_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  console.log(`[cron-today-summary] Next trigger at Jakarta ${fmt.format(next)} (in ${Math.round(delay/1000)}s)`);
  if (global.__cron_timeout) clearTimeout(global.__cron_timeout);
  global.__cron_timeout = setTimeout(async () => {
    await triggerOnce();
    scheduleNext();
  }, delay);
  global.__cron_timeout.unref && global.__cron_timeout.unref();
}
