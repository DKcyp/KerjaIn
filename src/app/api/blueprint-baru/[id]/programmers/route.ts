import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid project ID',
        data: []
      }, { status: 400 });
    }

    // Raw SQL to get programmers who are members of the project team
    // Simplified for PHP CI beginner style
    const data = await prisma.$queryRaw`
      SELECT p.id, p."namaLengkap", p.role 
      FROM pegawai p
      INNER JOIN proyek_team pt ON p.id = pt."pegawaiId"
      WHERE pt."projectId" = ${projectId}
      ORDER BY p."namaLengkap" ASC
    `;

    console.log(`[API] Found ${Array.isArray(data) ? data.length : 0} programmers for project ${projectId}`);

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Error fetching programmers:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      data: []
    }, { status: 500 });
  }
}