import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseDatabaseUrl(url: string) {
  try {
    const masked = url.replace(/\/\/[^:]+:([^@]+)@/, '//*****:*****@');
    const parsed = new URL(url);
    return {
      fullUrl: masked,
      host: parsed.hostname,
      port: parsed.port,
      database: parsed.pathname.replace('/', ''),
      user: parsed.username,
      ssl: parsed.searchParams.get('sslmode') || 'prefer',
      connectionLimit: parsed.searchParams.get('connection_limit') || '-',
      poolTimeout: parsed.searchParams.get('pool_timeout') || '-',
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const startTime = Date.now();

  try {
    await prisma.$connect();

    const results = await prisma.$queryRawUnsafe(`
      SELECT
        version(),
        current_database() AS db_name,
        current_user AS db_user,
        inet_server_addr() AS server_addr,
        inet_server_port() AS server_port,
        pg_postmaster_start_time() AS server_start,
        NOW() AS server_time,
        pg_database_size(current_database()) AS db_size_bytes,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND state = 'active') AS active_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) AS total_connections,
        (SELECT setting FROM pg_settings WHERE name = 'max_connections') AS max_connections,
        (SELECT setting FROM pg_settings WHERE name = 'server_version') AS pg_version
    `);

    const info = (results as any[])[0];

    const tables = await prisma.$queryRawUnsafe(`
      SELECT
        relname AS table_name,
        n_live_tup AS row_count,
        pg_total_relation_size(relid) AS total_bytes
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY relname ASC
    `);

    const dbUrl = parseDatabaseUrl(process.env.DATABASE_URL || '');

    const latency = Date.now() - startTime;

    const totalRows = (tables as any[]).reduce((sum: number, t: any) => sum + Number(t.row_count), 0);
    const totalTables = (tables as any[]).length;

    await prisma.$disconnect();

    return NextResponse.json({
      status: 'connected',
      latency,
      connection: dbUrl,
      server: {
        version: info.pg_version || info.version?.split(',')[0]?.trim(),
        startTime: info.server_start,
        currentTime: info.server_time,
        uptime: info.server_start
          ? Math.floor((new Date().getTime() - new Date(info.server_start).getTime()) / 1000)
          : null,
      },
      database: {
        name: info.db_name,
        user: info.db_user,
        address: info.server_addr ? `${info.server_addr}:${info.server_port}` : null,
        sizeBytes: info.db_size_bytes ? Number(info.db_size_bytes) : null,
        sizeFormatted: info.db_size_bytes
          ? formatBytes(Number(info.db_size_bytes))
          : null,
      },
      connections: {
        active: Number(info.active_connections),
        total: Number(info.total_connections),
        max: Number(info.max_connections),
      },
      tables: {
        total: totalTables,
        totalRows,
        list: (tables as any[]).map((t: any) => ({
          name: t.table_name,
          rowCount: Number(t.row_count),
          sizeFormatted: formatBytes(Number(t.total_bytes)),
        })),
      },
    });
  } catch (error) {
    const dbUrl = parseDatabaseUrl(process.env.DATABASE_URL || '');
    const latency = Date.now() - startTime;

    return NextResponse.json({
      status: 'disconnected',
      latency,
      connection: dbUrl,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(2)} ${units[unit]}`;
}
