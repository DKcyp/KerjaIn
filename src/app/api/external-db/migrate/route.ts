import { NextResponse } from 'next/server';
import { externalPool } from '@/lib/externalDb';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

if (!externalPool) {
  console.warn('[external-db] EXTERNAL_DATABASE_URL not configured — routes will return 503');
}

// Field mapping: external → internal (departemen handled separately)
const FIELD_MAP: Record<string, string> = {
  id_pgw: 'noUrut',
  nama_pgw: 'namaLengkap',
  usr_loginname: 'username',
  usr_no_hp: 'noHp',
};

// Resolve or create departemen by name, return internal id
async function resolveDepartemen(depNama: string | null): Promise<number | null> {
  if (!depNama) return null;

  // Find existing by nama
  let dept = await prisma.masterDepartemen.findFirst({
    where: { nama: depNama },
    select: { id: true },
  });

  if (dept) return dept.id;

  // Create new departemen
  const newDept = await prisma.masterDepartemen.create({
    data: {
      idDep: depNama.toLowerCase().replace(/\s+/g, '_'),
      nama: depNama,
    },
  });

  console.log(`[Migrate] Created new departemen: ${depNama} (id=${newDept.id})`);
  return newDept.id;
}

// GET = preview migration
export async function GET() {
  try {
    const [extResult, internalEmployees] = await Promise.all([
      externalPool.query(
        `SELECT u.usr_id, u.usr_name, u.usr_loginname, u.nama_pgw, u.id_pgw, u.id_dep,
                u.usr_status, u.usr_no_hp, u.id_rol,
                d.dep_nama,
                r.rol_name
         FROM global.global_auth_user u
         LEFT JOIN global.global_departemen d ON u.id_dep = d.dep_id
         LEFT JOIN global.global_auth_role r ON u.id_rol = r.rol_id
         ORDER BY u.usr_id ASC`
      ),
      prisma.pegawai.findMany({
        select: { id: true, noUrut: true, namaLengkap: true, username: true, noHp: true, departemenId: true },
        orderBy: { noUrut: 'asc' },
      }),
    ]);

    const externalRows = extResult.rows;
    const internalByNoUrut = new Map(internalEmployees.map((e) => [e.noUrut, e]));
    const internalByUsername = new Map(
      internalEmployees.filter((e) => e.username).map((e) => [e.username!.toLowerCase(), e])
    );

    const toInsert: any[] = [];
    const toUpdate: any[] = [];
    const skipped: any[] = [];

    for (const ext of externalRows) {
      let existing = null;
      if (ext.id_pgw) {
        existing = internalByNoUrut.get(ext.id_pgw);
      }
      if (!existing && ext.usr_loginname) {
        existing = internalByUsername.get(ext.usr_loginname.toLowerCase());
      }

      const mappedData: Record<string, any> = {};
      for (const [extField, intField] of Object.entries(FIELD_MAP)) {
        mappedData[intField] = ext[extField] ?? null;
      }

      // Departemen preview: show dep_nama that will be used for matching
      mappedData.departemenNama = ext.dep_nama || null;
      mappedData.departemenId = null; // will be resolved at execution time

      if (existing) {
        const hasChanges =
          (mappedData.namaLengkap && mappedData.namaLengkap !== existing.namaLengkap) ||
          (mappedData.username && mappedData.username !== existing.username) ||
          (mappedData.noHp && mappedData.noHp !== existing.noHp);

        // Check departemen change
        if (!hasChanges && ext.dep_nama) {
          const existingDept = existing.departemenId
            ? await prisma.masterDepartemen.findUnique({ where: { id: existing.departemenId }, select: { nama: true } })
            : null;
          if (existingDept?.nama !== ext.dep_nama) {
            mappedData.currentDeptNama = existingDept?.nama || null;
          }
        }

        if (hasChanges || mappedData.departemenNama) {
          toUpdate.push({
            external: ext,
            internal: existing,
            mappedData,
            currentData: {
              namaLengkap: existing.namaLengkap,
              username: existing.username,
              noHp: existing.noHp,
              departemenNama: null, // will be looked up at execution
            },
          });
        }
      } else {
        toInsert.push({ external: ext, mappedData });
      }
    }

    return NextResponse.json({
      summary: {
        totalExternal: externalRows.length,
        toInsert: toInsert.length,
        toUpdate: toUpdate.length,
        skipped: skipped.length,
      },
      toInsert,
      toUpdate,
      skipped,
    });
  } catch (error: any) {
    console.error('[Migrate Preview] Failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST = execute migration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode, items } = body as {
      mode: 'insert' | 'update' | 'all';
      items?: Array<{ usr_id: string; mappedData: Record<string, any> }>;
    };

    if (!mode) {
      return NextResponse.json({ error: 'mode is required (insert | update | all)' }, { status: 400 });
    }

    let extResult;
    if (items && items.length > 0) {
      const ids = items.map((i) => i.usr_id);
      extResult = await externalPool.query(
        `SELECT u.usr_id, u.usr_name, u.usr_loginname, u.nama_pgw, u.id_pgw, u.id_dep,
                u.usr_status, u.usr_no_hp, u.id_rol,
                d.dep_nama,
                r.rol_name
         FROM global.global_auth_user u
         LEFT JOIN global.global_departemen d ON u.id_dep = d.dep_id
         LEFT JOIN global.global_auth_role r ON u.id_rol = r.rol_id
         WHERE u.usr_id = ANY($1)`,
        [ids]
      );
    } else {
      extResult = await externalPool.query(
        `SELECT u.usr_id, u.usr_name, u.usr_loginname, u.nama_pgw, u.id_pgw, u.id_dep,
                u.usr_status, u.usr_no_hp, u.id_rol,
                d.dep_nama,
                r.rol_name
         FROM global.global_auth_user u
         LEFT JOIN global.global_departemen d ON u.id_dep = d.dep_id
         LEFT JOIN global.global_auth_role r ON u.id_rol = r.rol_id`
      );
    }

    const externalRows = extResult.rows;

    // Fetch current internal data
    const [internalEmployees, allDepartemen] = await Promise.all([
      prisma.pegawai.findMany({
        select: { id: true, noUrut: true, namaLengkap: true, username: true, noHp: true, departemenId: true },
        orderBy: { noUrut: 'asc' },
      }),
      prisma.masterDepartemen.findMany({ select: { id: true, nama: true } }),
    ]);

    const internalByNoUrut = new Map(internalEmployees.map((e) => [e.noUrut, e]));
    const internalByUsername = new Map(
      internalEmployees.filter((e) => e.username).map((e) => [e.username!.toLowerCase(), e])
    );

    // Build departemen lookup by name, cached for reuse
    const deptByName = new Map(allDepartemen.map((d) => [d.nama.toLowerCase(), d.id]));
    const deptToCreate = new Set<string>();

    const maxNoUrut = internalEmployees.length > 0
      ? Math.max(...internalEmployees.map((e) => e.noUrut))
      : 0;

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    let nextNoUrut = maxNoUrut + 1;

    // Map external role name to internal Role enum
    const mapRole = (rolName: string | null): string => {
      if (!rolName) return 'ADMIN';
      const lower = rolName.toLowerCase();
      if (lower.includes('super')) return 'SUPER_ADMIN';
      if (lower === 'pm' || lower.includes('project manager') || lower.includes('manajer')) return 'PM';
      if (lower.includes('programmer') || lower.includes('developer')) return 'PROGRAMMER';
      return 'ADMIN';
    };
    const resolveDeptId = async (depNama: string | null): Promise<number | null> => {
      if (!depNama) return null;
      const key = depNama.toLowerCase();

      if (deptByName.has(key)) return deptByName.get(key)!;

      // Avoid duplicate creation
      if (deptToCreate.has(key)) {
        // Wait and re-check (another iteration may have created it)
        const existing = await prisma.masterDepartemen.findFirst({ where: { nama: depNama }, select: { id: true } });
        if (existing) {
          deptByName.set(key, existing.id);
          return existing.id;
        }
      }

      // Create new departemen
      const newDept = await prisma.masterDepartemen.create({
        data: {
          idDep: key.replace(/\s+/g, '_'),
          nama: depNama,
        },
      });
      deptByName.set(key, newDept.id);
      deptToCreate.add(key);
      console.log(`[Migrate] Created new departemen: ${depNama} (id=${newDept.id})`);
      return newDept.id;
    };

    for (const ext of externalRows) {
      const mappedData: Record<string, any> = {};
      for (const [extField, intField] of Object.entries(FIELD_MAP)) {
        mappedData[intField] = ext[extField] ?? null;
      }

      // Resolve departemen
      try {
        mappedData.departemenId = await resolveDeptId(ext.dep_nama || null);
      } catch (e: any) {
        errors.push(`usr_id=${ext.usr_id}: Failed to resolve departemen: ${e.message}`);
        skipped++;
        continue;
      }

      // Find existing
      let existing = null;
      if (ext.id_pgw) {
        existing = internalByNoUrut.get(ext.id_pgw);
      }
      if (!existing && ext.usr_loginname) {
        existing = internalByUsername.get(ext.usr_loginname.toLowerCase());
      }

      try {
        if (existing) {
          if (mode === 'insert') { skipped++; continue; }

          const updatePayload: Record<string, any> = {};
          if (mappedData.namaLengkap && mappedData.namaLengkap !== existing.namaLengkap) {
            updatePayload.namaLengkap = mappedData.namaLengkap;
          }
          if (mappedData.username && mappedData.username !== existing.username) {
            updatePayload.username = mappedData.username;
          }
          if (mappedData.noHp && mappedData.noHp !== existing.noHp) {
            updatePayload.noHp = mappedData.noHp;
          }
          if (mappedData.departemenId !== null && mappedData.departemenId !== existing.departemenId) {
            updatePayload.departemenId = mappedData.departemenId;
          }

          const newRole = mapRole(ext.rol_name) as any;
          if (newRole !== existing.role) {
            updatePayload.role = newRole;
          }

          if (Object.keys(updatePayload).length > 0) {
            await prisma.pegawai.update({
              where: { id: existing.id },
              data: updatePayload,
            });
            updated++;
          }
        } else {
          if (mode === 'update') { skipped++; continue; }

          const newNoUrut = mappedData.noUrut || nextNoUrut++;
          const newPegawai = await prisma.pegawai.create({
            data: {
              noUrut: newNoUrut,
              namaLengkap: mappedData.namaLengkap || mappedData.username || `User ${newNoUrut}`,
              noHp: mappedData.noHp || '-',
              username: mappedData.username || null,
              departemenId: mappedData.departemenId,
              role: mapRole(ext.rol_name) as any,
            },
          });

          // Assign to user_role based on role enum
          const resolvedRole = mapRole(ext.rol_name);
          const roleIdMap: Record<string, number> = {
            SUPER_ADMIN: 1,
            PM: 2,
            PROGRAMMER: 3,
            ADMIN: 4,
          };
          const assignedRoleId = roleIdMap[resolvedRole];
          if (assignedRoleId) {
            await prisma.userRole.create({
              data: {
                userId: newPegawai.id,
                roleId: assignedRoleId,
              },
            });
          }

          inserted++;
        }
      } catch (e: any) {
        errors.push(`usr_id=${ext.usr_id}: ${e.message}`);
      }
    }

    return NextResponse.json({
      summary: { inserted, updated, skipped, errors: errors.length },
      errors: errors.slice(0, 20),
    });
  } catch (error: any) {
    console.error('[Migrate Execute] Failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
