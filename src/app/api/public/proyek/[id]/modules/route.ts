import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get project modules (public, no auth required)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id);

  if (!projectId) {
    return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
  }

  // Check if project exists
  const project = await prisma.proyek.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
  }

  // Get all modules for this project
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
      createdAt: true,
      updatedAt: true,
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

  const tree = buildTree(null);

  return NextResponse.json({ 
    success: true, 
    projectId,
    modules: modules, // flat list
    tree: tree // nested tree
  });
}
