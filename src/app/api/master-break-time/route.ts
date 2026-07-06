import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/master-break-time - Get all break times
export async function GET(request: NextRequest) {
  try {
    const breakTimes = await prisma.$queryRaw`
      SELECT id, nama, deskripsi, jam_mulai, jam_selesai, tipe_penerapan, pegawai_id, departemen_id, role, is_active
      FROM master_break_time
      ORDER BY tipe_penerapan, nama
    `;

    return NextResponse.json(breakTimes);
  } catch (error) {
    console.error('Error fetching break times:', error);
    return NextResponse.json(
      { error: 'Failed to fetch break times' },
      { status: 500 }
    );
  }
}

// POST /api/master-break-time - Create break time
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nama,
      deskripsi,
      jam_mulai,
      jam_selesai,
      tipe_penerapan,
      pegawai_id,
      departemen_id,
      role,
    } = body;

    if (!nama || !jam_mulai || !jam_selesai) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await prisma.$executeRaw`
      INSERT INTO master_break_time (
        nama, deskripsi, jam_mulai, jam_selesai, tipe_penerapan,
        pegawai_id, departemen_id, role, is_active, created_at, updated_at
      ) VALUES (
        ${nama}, ${deskripsi || null}, ${jam_mulai}, ${jam_selesai}, ${tipe_penerapan || 'GLOBAL'},
        ${pegawai_id || null}, ${departemen_id || null}, ${role || null}, true, NOW(), NOW()
      )
    `;

    return NextResponse.json(
      { message: 'Break time created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating break time:', error);
    return NextResponse.json(
      { error: 'Failed to create break time' },
      { status: 500 }
    );
  }
}
