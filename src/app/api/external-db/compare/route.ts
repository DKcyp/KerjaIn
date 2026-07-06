import { NextResponse } from 'next/server';
import { externalPool } from '@/lib/externalDb';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!externalPool) {
    return NextResponse.json({ error: 'External DB not configured' }, { status: 503 });
  }
  try {
    const [externalResult, internalEmployees, deptResult] = await Promise.all([
      externalPool.query(
        `SELECT u.usr_id, u.usr_name, u.usr_loginname, u.nama_pgw, u.id_pgw, u.id_dep,
                u.usr_status, u.usr_no_hp, u.id_rol, u.is_pegawai,
                d.dep_nama,
                r.rol_name
         FROM global.global_auth_user u
         LEFT JOIN global.global_departemen d ON u.id_dep = d.dep_id
         LEFT JOIN global.global_auth_role r ON u.id_rol = r.rol_id
         ORDER BY u.usr_id ASC`
      ),
      prisma.pegawai.findMany({
        select: {
          id: true,
          noUrut: true,
          namaLengkap: true,
          username: true,
          noHp: true,
          role: true,
          departemenId: true,
        },
        orderBy: { noUrut: 'asc' },
      }),
      externalPool.query(
        `SELECT dep_id, dep_nama FROM global.global_departemen ORDER BY dep_nama ASC`
      ),
    ]);

    const externalRows = externalResult.rows;
    const departments = deptResult.rows;

    // Build lookup maps for matching
    const internalByNoUrut = new Map(internalEmployees.map((e) => [e.noUrut, e]));
    const internalByUsername = new Map(
      internalEmployees.filter((e) => e.username).map((e) => [e.username!.toLowerCase(), e])
    );
    const internalByName = new Map(
      internalEmployees.map((e) => [e.namaLengkap.toLowerCase(), e])
    );

    // Match external → internal
    const matched: any[] = [];
    const externalOnly: any[] = [];
    const internalOnly: any[] = [];

    const matchedInternalIds = new Set<number>();

    for (const ext of externalRows) {
      let internalMatch = null;
      let matchBy = '';

      if (ext.id_pgw) {
        internalMatch = internalByNoUrut.get(ext.id_pgw);
        if (internalMatch) matchBy = 'id_pgw → noUrut';
      }

      if (!internalMatch && ext.usr_loginname) {
        internalMatch = internalByUsername.get(ext.usr_loginname.toLowerCase());
        if (internalMatch) matchBy = 'usr_loginname → username';
      }

      if (!internalMatch && ext.nama_pgw) {
        internalMatch = internalByName.get(ext.nama_pgw.toLowerCase());
        if (internalMatch) matchBy = 'nama_pgw → namaLengkap';
      }

      if (internalMatch) {
        matchedInternalIds.add(internalMatch.id);
        matched.push({
          external: ext,
          internal: internalMatch,
          matchBy,
        });
      } else {
        externalOnly.push(ext);
      }
    }

    for (const emp of internalEmployees) {
      if (!matchedInternalIds.has(emp.id)) {
        internalOnly.push(emp);
      }
    }

    return NextResponse.json({
      summary: {
        totalExternal: externalRows.length,
        totalInternal: internalEmployees.length,
        matched: matched.length,
        externalOnly: externalOnly.length,
        internalOnly: internalOnly.length,
      },
      matched,
      externalOnly,
      internalOnly,
      departments,
    });
  } catch (error: any) {
    console.error('[External DB Compare] Failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to compare data' },
      { status: 500 }
    );
  }
}
