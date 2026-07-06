import { NextRequest, NextResponse } from 'next/server';
import { type Backlog } from '@prisma/client';

import { getServerSession } from '@/lib/auth';

import { prisma } from '@/lib/prisma';
const db: any = prisma;

// GET /api/backlog
// Query: q, projectId, assigned (values: 'unassigned' | 'any'), page, size
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const projectId = searchParams.get('projectId');
    const assigned = searchParams.get('assigned') || 'unassigned';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const size = Math.min(100, Math.max(1, parseInt(searchParams.get('size') || '20', 10)));

    // Privacy filter: only see own or assigned
    const userId = session.user.id;
    const where: any = {
      isDeleted: false,
      OR: [
        { createdBy: userId },
        { assignedTo: userId }
      ]
    };

    if (q) {
      where.AND = [
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { note: { contains: q, mode: 'insensitive' as const } },
          ]
        }
      ];
    }
    if (projectId) where.projectId = Number(projectId);

    const [total, items] = await Promise.all([
      db.backlog.count({ where }),
      db.backlog.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      })
    ]);

    // Manual population of creator/assignee/module since relations are decoupled
    const userIds = new Set<number>();
    const moduleIds = new Set<number>(); // Track modules

    items.forEach((i: Backlog) => {
      if (i.createdBy) userIds.add(i.createdBy);
      if (i.assignedTo) userIds.add(i.assignedTo);
      if (i.moduleId) moduleIds.add(i.moduleId);
    });

    const [users, modules] = await Promise.all([
      userIds.size > 0
        ? db.pegawai.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, namaLengkap: true }
        })
        : [],
      moduleIds.size > 0
        ? db.proyekModule.findMany({
          where: { id: { in: Array.from(moduleIds) } },
          select: { id: true, nama: true }
        })
        : []
    ]);

    const userMap = new Map(users.map((u: { id: number; namaLengkap: string }) => [u.id, u.namaLengkap]));
    const moduleMap = new Map(modules.map((m: { id: number; nama: string }) => [m.id, m.nama]));

    const enrichedItems = items.map((item: Backlog) => ({
      ...item,
      creator: item.createdBy ? { namaLengkap: userMap.get(item.createdBy) } : null,
      assignee: item.assignedTo ? { namaLengkap: userMap.get(item.assignedTo) } : null,
      module: item.moduleId ? { nama: moduleMap.get(item.moduleId) } : null, // Add module name
    }));

    return NextResponse.json({ items: enrichedItems, total, page, size });
  } catch (e) {
    console.error('GET /api/backlog error', e);
    return NextResponse.json({ error: 'Failed to fetch backlog' }, { status: 500 });
  }
}

// POST /api/backlog
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contentType = req.headers.get('content-type') || '';
    let title: string, note: string, projectId: number | null, moduleId: number | null;
    let assignedTo: number | null = null, tasklistId: number | null = null;
    let estimatedManHour: number | null = null;
    const uploadedFiles: Array<{ fileName: string, originalName: string, filePath: string, fileType: string, fileSize: number }> = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with files)
      const formData = await req.formData();
      title = String(formData.get('title') || '').trim();
      note = String(formData.get('note') || '').trim();
      projectId = formData.get('projectId') ? Number(formData.get('projectId')) : null;
      moduleId = formData.get('moduleId') ? Number(formData.get('moduleId')) : null;
      estimatedManHour = formData.get('estimatedManHour') ? parseFloat(String(formData.get('estimatedManHour'))) : null;
      
      // Handle file uploads
      const files = formData.getAll('files') as unknown as File[];
      if (files && files.length > 0) {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'backlog');
          await fs.mkdir(uploadsDir, { recursive: true });

          for (const file of files) {
            if (file && typeof file === 'object' && 'arrayBuffer' in file) {
              const bytes = Buffer.from(await file.arrayBuffer());
              const ext = (file.name && file.name.includes('.')) ? `.${file.name.split('.').pop()?.toLowerCase()}` : '';
              const cleanExt = ext.replace(/[^a-z0-9.]/gi, '').toLowerCase();
              const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${cleanExt}`;
              const fullPath = path.join(uploadsDir, filename);
              
              await fs.writeFile(fullPath, bytes);
              
              // Verify file was written successfully
              const stats = await fs.stat(fullPath);
              if (stats.size === 0) {
                throw new Error('File was not written correctly');
              }

              uploadedFiles.push({
                fileName: filename,
                originalName: file.name || filename,
                filePath: `/api/uploads/backlog/${filename}`,
                fileType: file.type || 'application/octet-stream',
                fileSize: stats.size
              });
            }
          }
        } catch (e) {
          console.error('Failed saving uploads', e);
          return NextResponse.json({ error: 'Gagal menyimpan file' }, { status: 500 });
        }
      }
    } else {
      // Handle JSON
      const body = await req.json();
      const data = body || {};
      title = String(data.title || '').trim();
      note = String(data.note || '').trim();
      projectId = data.projectId ? Number(data.projectId) : null;
      moduleId = data.moduleId ? Number(data.moduleId) : null;
      assignedTo = data.assignedTo ? Number(data.assignedTo) : null;
      tasklistId = data.tasklistId ? Number(data.tasklistId) : null;
      estimatedManHour = data.estimatedManHour ? parseFloat(data.estimatedManHour) : null;
    }

    if (!title && !note) {
      return NextResponse.json({ error: 'Title or note is required' }, { status: 400 });
    }

    const item = await db.backlog.create({
      data: {
        title: title,
        note: note,
        projectId: projectId,
        moduleId: moduleId,
        assignedTo: assignedTo,
        tasklistId: tasklistId,
        estimatedManHour: estimatedManHour,
        createdBy: session.user.id, // Auto-set creator
      }
    });

    // Save files to backlog_files table if any
    if (uploadedFiles.length > 0) {
      try {
        // Create backlog_files table if it doesn't exist
        await db.$executeRaw`
          CREATE TABLE IF NOT EXISTS public.backlog_files (
            id SERIAL PRIMARY KEY,
            "backlogId" INTEGER NOT NULL,
            "fileName" VARCHAR(255) NOT NULL,
            "originalName" VARCHAR(255) NOT NULL,
            "filePath" VARCHAR(500) NOT NULL,
            "fileType" VARCHAR(100) NOT NULL,
            "fileSize" INTEGER NOT NULL,
            "uploadedBy" INTEGER,
            "uploadedAt" TIMESTAMP DEFAULT NOW()
          )
        `;

        for (const file of uploadedFiles) {
          await db.$executeRaw`
            INSERT INTO public.backlog_files ("backlogId", "fileName", "originalName", "filePath", "fileType", "fileSize", "uploadedBy", "uploadedAt")
            VALUES (${item.id}, ${file.fileName}, ${file.originalName}, ${file.filePath}, ${file.fileType}, ${file.fileSize}, ${session.user.id}, NOW())
          `;
        }
      } catch (e) {
        console.error('Failed to save files to database:', e);
      }
    }

    return NextResponse.json({ 
      item, 
      uploadedFiles: uploadedFiles 
    }, { status: 201 });
  } catch (e: any) {
    console.error('POST /api/backlog error', e);
    const code = e?.code || e?.name || 'UNKNOWN_ERROR';
    const message = e?.message || 'Failed to create backlog';
    return NextResponse.json({ error: 'Failed to create backlog', code, message }, { status: 500 });
  }
}
