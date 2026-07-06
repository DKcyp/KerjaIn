import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/modules/[moduleId] - Get module details by ID
export async function GET(
  _req: NextRequest, 
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { moduleId: moduleIdParam } = await params;
    const moduleId = parseInt(moduleIdParam);
    if (!Number.isFinite(moduleId)) {
      return NextResponse.json({ error: 'Invalid module ID' }, { status: 400 });
    }

    // Get module details
    const module = await prisma.proyekModule.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        nama: true,
        kode: true,
        projectId: true,
        parentId: true,
      }
    });

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Build hierarchical path for better display
    let fullPath = module.nama;
    let currentModule = module;
    
    // Walk up the parent chain to build full path
    while (currentModule.parentId) {
      const parent = await prisma.proyekModule.findUnique({
        where: { id: currentModule.parentId },
        select: { id: true, nama: true, kode: true, projectId: true, parentId: true }
      });
      
      if (parent) {
        fullPath = `${parent.nama} - ${fullPath}`;
        currentModule = parent;
      } else {
        break;
      }
    }

    // Format with code if available
    const displayName = module.kode ? `${module.kode} — ${fullPath}` : fullPath;

    return NextResponse.json({ 
      module: {
        id: module.id,
        nama: module.nama,
        kode: module.kode,
        fullPath,
        displayName,
        projectId: module.projectId
      }
    });
  } catch (error) {
    console.error('GET /api/modules/[moduleId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch module' }, { status: 500 });
  }
}