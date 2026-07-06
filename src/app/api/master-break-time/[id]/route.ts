import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/master-break-time/[id] - Update break time
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
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
      is_active,
    } = body;

    // Use Prisma raw query with proper parameter binding
    if (nama !== undefined || deskripsi !== undefined || jam_mulai !== undefined || 
        jam_selesai !== undefined || tipe_penerapan !== undefined || pegawai_id !== undefined ||
        departemen_id !== undefined || role !== undefined || is_active !== undefined) {
      
      await prisma.$executeRaw`
        UPDATE master_break_time SET
          nama = COALESCE(${nama}, nama),
          deskripsi = COALESCE(${deskripsi}, deskripsi),
          jam_mulai = COALESCE(${jam_mulai}, jam_mulai),
          jam_selesai = COALESCE(${jam_selesai}, jam_selesai),
          tipe_penerapan = COALESCE(${tipe_penerapan}, tipe_penerapan),
          pegawai_id = COALESCE(${pegawai_id}, pegawai_id),
          departemen_id = COALESCE(${departemen_id}, departemen_id),
          role = COALESCE(${role}, role),
          is_active = COALESCE(${is_active}, is_active),
          updated_at = NOW()
        WHERE id = ${id}
      `;
    } else {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Break time updated successfully' });
  } catch (error) {
    console.error('Error updating break time:', error);
    return NextResponse.json(
      { error: 'Failed to update break time' },
      { status: 500 }
    );
  }
}

// DELETE /api/master-break-time/[id] - Delete break time
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    await prisma.$executeRaw`
      DELETE FROM master_break_time WHERE id = ${id}
    `;

    return NextResponse.json({ message: 'Break time deleted successfully' });
  } catch (error) {
    console.error('Error deleting break time:', error);
    return NextResponse.json(
      { error: 'Failed to delete break time' },
      { status: 500 }
    );
  }
}
