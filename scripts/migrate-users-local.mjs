/**
 * One-time migration script: copy users from external DB to local DB.
 * Run this ONCE after switching to local-only auth.
 *
 * Usage: node scripts/migrate-users-local.mjs
 */
import { createPool } from '@vercel/pg';
import pg from 'pg';
const { Pool } = pg;

const EXT_DATABASE_URL = process.env.EXTERNAL_DATABASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;

if (!EXT_DATABASE_URL) {
  console.log('EXTERNAL_DATABASE_URL not set — nothing to migrate.');
  process.exit(0);
}

async function main() {
  // 1. Connect to external DB
  const extPool = new Pool({ connectionString: EXT_DATABASE_URL, max: 3 });
  const localPool = new Pool({ connectionString: DATABASE_URL, max: 3 });

  console.log('Fetching users from external DB...');
  const result = await extPool.query(`
    SELECT u.usr_id, u.usr_loginname, u.usr_password, u.nama_pgw, u.id_pgw,
           u.id_dep, u.usr_no_hp, u.id_rol, u.usr_status,
           d.dep_nama, r.rol_name
    FROM global.global_auth_user u
    LEFT JOIN global.global_departemen d ON u.id_dep = d.dep_id
    LEFT JOIN global.global_auth_role r ON u.id_rol = r.rol_id
    WHERE u.usr_status = '1' OR u.usr_status IS NULL
  `);

  const users = result.rows;
  console.log(`Found ${users.length} users in external DB.`);

  let migrated = 0, skipped = 0, errors = 0;

  for (const ext of users) {
    try {
      const username = ext.usr_loginname?.toLowerCase();
      if (!username) { skipped++; continue; }

      // Check if user already exists in local DB by username
      const existing = await localPool.query(
        `SELECT id, "passwordHash" FROM pegawai WHERE LOWER(username) = LOWER($1)`,
        [username]
      );

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        if (row.passwordHash && row.passwordHash !== '') {
          skipped++;
          continue;
        }
        // Update password hash from external DB
        await localPool.query(
          `UPDATE pegawai SET "passwordHash" = $1 WHERE id = $2`,
          [ext.usr_password, row.id]
        );
        migrated++;
      } else {
        // Create new user in local DB
        const deptResult = ext.dep_nama
          ? await localPool.query(`SELECT id FROM master_departemen WHERE nama = $1`, [ext.dep_nama])
          : { rows: [] };

        let departemenId = null;
        if (deptResult.rows.length > 0) {
          departemenId = deptResult.rows[0].id;
        } else if (ext.dep_nama) {
          const newDept = await localPool.query(
            `INSERT INTO master_departemen ("idDep", nama) VALUES ($1, $2) RETURNING id`,
            [ext.dep_nama.toLowerCase().replace(/\s+/g, '_'), ext.dep_nama]
          );
          departemenId = newDept.rows[0].id;
        }

        // Map role
        let role = 'ADMIN';
        const rn = (ext.rol_name || '').toLowerCase();
        if (rn.includes('super')) role = 'SUPER_ADMIN';
        else if (rn === 'pm' || rn.includes('project manager') || rn.includes('manajer')) role = 'PM';
        else if (rn.includes('programmer') || rn.includes('developer')) role = 'PROGRAMMER';

        // Get max noUrut
        const maxUrut = await localPool.query(`SELECT COALESCE(MAX("noUrut"), 0) + 1 AS next FROM pegawai`);
        const noUrut = ext.id_pgw || maxUrut.rows[0].next;

        await localPool.query(
          `INSERT INTO pegawai ("noUrut", "namaLengkap", "noHp", username, "passwordHash", role, "departemen_id")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            noUrut,
            ext.nama_pgw || username,
            ext.usr_no_hp || '-',
            username,
            ext.usr_password,
            role,
            departemenId,
          ]
        );
        migrated++;
      }
    } catch (err) {
      console.error(`Error migrating user ${ext.usr_loginname}:`, err.message);
      errors++;
    }
  }

  console.log(`\nDone! Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);

  await extPool.end();
  await localPool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
