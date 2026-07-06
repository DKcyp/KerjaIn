/**
 * Break Time Service
 * Service untuk mengambil break time dari Master Break Time
 */

import { prisma } from '@/lib/prisma';

export interface BreakTime {
  startTime: string;
  endTime: string;
  nama: string;
}

/**
 * Get break time untuk user berdasarkan berbagai kriteria
 * Priority: User-specific > Departemen > Role > Global
 */
export async function getUserBreakTime(userId: number): Promise<BreakTime | null> {
  try {
    // Get user info
    const user = await prisma.pegawai.findUnique({
      where: { id: userId },
      select: {
        id: true,
        departemenId: true,
        role: true,
      },
    });

    if (!user) {
      console.warn(`⚠️ [BreakTime] User ${userId} not found`);
      return null;
    }

    console.log(`📋 [BreakTime] Getting break time for user ${userId}`);

    // 1. Check user-specific break time
    const userBreakTime = await prisma.$queryRaw`
      SELECT jam_mulai, jam_selesai, nama
      FROM master_break_time
      WHERE pegawai_id = ${userId}
        AND is_active = true
      LIMIT 1
    `;

    if (userBreakTime && Array.isArray(userBreakTime) && userBreakTime.length > 0) {
      const bt = userBreakTime[0] as any;
      console.log(`✅ [BreakTime] User-specific break time found: ${bt.jam_mulai} - ${bt.jam_selesai}`);
      return {
        startTime: bt.jam_mulai,
        endTime: bt.jam_selesai,
        nama: bt.nama,
      };
    }

    // 2. Check departemen break time
    if (user.departemenId) {
      const deptBreakTime = await prisma.$queryRaw`
        SELECT jam_mulai, jam_selesai, nama
        FROM master_break_time
        WHERE departemen_id = ${user.departemenId}
          AND is_active = true
        LIMIT 1
      `;

      if (deptBreakTime && Array.isArray(deptBreakTime) && deptBreakTime.length > 0) {
        const bt = deptBreakTime[0] as any;
        console.log(`✅ [BreakTime] Departemen break time found: ${bt.jam_mulai} - ${bt.jam_selesai}`);
        return {
          startTime: bt.jam_mulai,
          endTime: bt.jam_selesai,
          nama: bt.nama,
        };
      }
    }

    // 3. Check role-based break time
    if (user.role) {
      const roleBreakTime = await prisma.$queryRaw`
        SELECT jam_mulai, jam_selesai, nama
        FROM master_break_time
        WHERE role = ${user.role}
          AND is_active = true
        LIMIT 1
      `;

      if (roleBreakTime && Array.isArray(roleBreakTime) && roleBreakTime.length > 0) {
        const bt = roleBreakTime[0] as any;
        console.log(`✅ [BreakTime] Role-based break time found: ${bt.jam_mulai} - ${bt.jam_selesai}`);
        return {
          startTime: bt.jam_mulai,
          endTime: bt.jam_selesai,
          nama: bt.nama,
        };
      }
    }

    // 4. Check global break time
    const globalBreakTime = await prisma.$queryRaw`
      SELECT jam_mulai, jam_selesai, nama
      FROM master_break_time
      WHERE tipe_penerapan = 'GLOBAL'
        AND is_active = true
      LIMIT 1
    `;

    if (globalBreakTime && Array.isArray(globalBreakTime) && globalBreakTime.length > 0) {
      const bt = globalBreakTime[0] as any;
      console.log(`✅ [BreakTime] Global break time found: ${bt.jam_mulai} - ${bt.jam_selesai}`);
      return {
        startTime: bt.jam_mulai,
        endTime: bt.jam_selesai,
        nama: bt.nama,
      };
    }

    console.warn(`⚠️ [BreakTime] No break time found for user ${userId}, using default`);
    return null;
  } catch (error) {
    console.error('❌ [BreakTime] Failed to get user break time:', error);
    return null;
  }
}

/**
 * Get all active break times
 */
export async function getAllBreakTimes() {
  try {
    const breakTimes = await prisma.$queryRaw`
      SELECT id, nama, deskripsi, jam_mulai, jam_selesai, tipe_penerapan, pegawai_id, departemen_id, role
      FROM master_break_time
      WHERE is_active = true
      ORDER BY tipe_penerapan, nama
    `;

    return breakTimes;
  } catch (error) {
    console.error('❌ [BreakTime] Failed to get all break times:', error);
    return [];
  }
}

/**
 * Create new break time
 */
export async function createBreakTime(data: {
  nama: string;
  deskripsi?: string;
  jamMulai: string;
  jamSelesai: string;
  tipePenerapan: 'GLOBAL' | 'USER' | 'DEPARTEMEN' | 'ROLE';
  pegawaiId?: number;
  departemenId?: number;
  role?: string;
}) {
  try {
    const result = await prisma.$executeRaw`
      INSERT INTO master_break_time (nama, deskripsi, jam_mulai, jam_selesai, tipe_penerapan, pegawai_id, departemen_id, role, created_at, updated_at)
      VALUES (${data.nama}, ${data.deskripsi || null}, ${data.jamMulai}, ${data.jamSelesai}, ${data.tipePenerapan}, ${data.pegawaiId || null}, ${data.departemenId || null}, ${data.role || null}, NOW(), NOW())
    `;

    console.log(`✅ [BreakTime] Break time created: ${data.nama}`);
    return result;
  } catch (error) {
    console.error('❌ [BreakTime] Failed to create break time:', error);
    throw error;
  }
}

/**
 * Update break time
 */
export async function updateBreakTime(
  id: number,
  data: {
    nama?: string;
    deskripsi?: string;
    jamMulai?: string;
    jamSelesai?: string;
    tipePenerapan?: string;
    pegawaiId?: number;
    departemenId?: number;
    role?: string;
    isActive?: boolean;
  }
) {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.nama !== undefined) {
      updates.push('nama = ?');
      values.push(data.nama);
    }
    if (data.deskripsi !== undefined) {
      updates.push('deskripsi = ?');
      values.push(data.deskripsi);
    }
    if (data.jamMulai !== undefined) {
      updates.push('jam_mulai = ?');
      values.push(data.jamMulai);
    }
    if (data.jamSelesai !== undefined) {
      updates.push('jam_selesai = ?');
      values.push(data.jamSelesai);
    }
    if (data.tipePenerapan !== undefined) {
      updates.push('tipe_penerapan = ?');
      values.push(data.tipePenerapan);
    }
    if (data.pegawaiId !== undefined) {
      updates.push('pegawai_id = ?');
      values.push(data.pegawaiId);
    }
    if (data.departemenId !== undefined) {
      updates.push('departemen_id = ?');
      values.push(data.departemenId);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      values.push(data.role);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive);
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const query = `UPDATE master_break_time SET ${updates.join(', ')} WHERE id = ?`;

    const result = await prisma.$executeRawUnsafe(query, ...values);

    console.log(`✅ [BreakTime] Break time updated: ${id}`);
    return result;
  } catch (error) {
    console.error('❌ [BreakTime] Failed to update break time:', error);
    throw error;
  }
}

/**
 * Delete break time
 */
export async function deleteBreakTime(id: number) {
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM master_break_time WHERE id = ${id}
    `;

    console.log(`✅ [BreakTime] Break time deleted: ${id}`);
    return result;
  } catch (error) {
    console.error('❌ [BreakTime] Failed to delete break time:', error);
    throw error;
  }
}
