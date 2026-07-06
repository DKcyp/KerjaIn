import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get single project by ID (public, no auth required)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id);

  if (!projectId) {
    return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const includeModules = searchParams.get('includeModules') === 'true';

  const item = await prisma.proyek.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      noUrut: true,
      kodeProyek: true,
      namaProyek: true,
      client: true,
      pic: true,
      type: true,
      crmId: true,
      idDep: true,
      depNama: true,
      projectNamaCrm: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      teamMembers: {
        select: {
          id: true,
          jabatan: true,
          pegawai: {
            select: {
              id: true,
              namaLengkap: true,
            }
          }
        }
      }
    }
  });

  if (!item) {
    return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
  }

  // Optionally include modules
  if (includeModules) {
    const modules = await prisma.proyekModule.findMany({
      where: { projectId },
      select: {
        id: true,
        projectId: true,
        parentId: true,
        nama: true,
        order: true,
        depth: true,
        isLeaf: true,
        kode: true,
        ba: true,
        baId: true,
        baVersion: true,
        version: true,
      },
      orderBy: [
        { depth: 'asc' },
        { order: 'asc' }
      ]
    });

    // Build tree structure
    const buildTree = (parentId: number | null): any[] => {
      return modules
        .filter(m => m.parentId === parentId)
        .map(m => ({
          ...m,
          children: buildTree(m.id)
        }));
    };

    return NextResponse.json({ 
      success: true, 
      item: {
        ...item,
        modules: buildTree(null)
      }
    });
  }

  return NextResponse.json({ success: true, item });
}
