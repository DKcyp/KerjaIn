import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface ImportItem {
  title: string;
  note: string;
  projectId?: number;
  moduleId?: number;
  estimatedManHour?: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const items: ImportItem[] = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items to import' }, { status: 400 });
    }

    // Validate and prepare items
    const validItems = items.filter(item => {
      return (item.title && item.title.trim()) || (item.note && item.note.trim());
    });

    if (validItems.length === 0) {
      return NextResponse.json({ error: 'No valid items found' }, { status: 400 });
    }

    // Batch create backlog items
    const created = await prisma.backlog.createMany({
      data: validItems.map(item => ({
        title: (item.title || '').trim(),
        note: (item.note || '').trim(),
        projectId: item.projectId || null,
        moduleId: item.moduleId || null,
        estimatedManHour: item.estimatedManHour ? parseFloat(String(item.estimatedManHour)) : null,
        createdBy: session.user!.id,
        isDeleted: false,
      })),
      skipDuplicates: false,
    });

    return NextResponse.json({
      imported: created.count,
      total: items.length,
      skipped: items.length - created.count,
    });
  } catch (error) {
    console.error('Backlog import error:', error);
    return NextResponse.json(
      { error: 'Failed to import backlog' },
      { status: 500 }
    );
  }
}
