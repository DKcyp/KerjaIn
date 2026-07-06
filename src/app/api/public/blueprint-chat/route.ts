import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

// GET /api/public/blueprint-chat?baId=123
export async function GET(req: NextRequest) {
  try {
    const baId = parseInt(req.nextUrl.searchParams.get('baId') || '');

    if (isNaN(baId)) {
      return NextResponse.json({ success: false, error: 'Parameter baId wajib diisi' }, { status: 400 });
    }

    const ba = await prisma.bacara.findUnique({ where: { id: baId }, select: { id: true } });
    if (!ba) {
      return NextResponse.json({ success: false, error: `BA dengan ID ${baId} tidak ditemukan` }, { status: 404 });
    }

    const chats = await prisma.blueprintChat.findMany({
      where: { baId },
      orderBy: { createdAt: 'asc' },
    });

    // handle data lama yang senderName masih null
    const result = chats.map((c) => ({ ...c, senderName: c.senderName || '' }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[Public API] Error fetching blueprint chat:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/public/blueprint-chat
// JSON: { baId, senderId, senderName, message, fileUrl?, fileName?, fileType?, fileSize? }
// FormData: baId, senderId, senderName, message, file?
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let baId: number;
    let senderId: number;
    let senderName: string;
    let message: string;
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;
    let fileSize: number | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      const rawBaId     = formData.get('baId')?.toString();
      const rawSenderId = formData.get('senderId')?.toString();
      const rawSenderName = formData.get('senderName')?.toString();
      const rawMessage  = formData.get('message')?.toString();
      const file        = formData.get('file') as File | null;

      if (!rawBaId || !rawSenderName || !rawMessage?.trim()) {
        return NextResponse.json({ success: false, error: 'baId, senderName, dan message wajib diisi' }, { status: 400 });
      }

      baId       = parseInt(rawBaId);
      senderId   = 30;
      senderName = rawSenderName.trim();
      message    = rawMessage.trim();

      if (isNaN(baId)) {
        return NextResponse.json({ success: false, error: 'baId harus angka' }, { status: 400 });
      }

      if (file && file.size > 0) {
        const bytes  = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'blueprint-chat');
        await mkdir(uploadDir, { recursive: true });
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename  = `${Date.now()}_${safeName}`;
        await writeFile(path.join(uploadDir, filename), buffer);
        fileUrl  = `/uploads/blueprint-chat/${filename}`;
        fileName = file.name;
        fileType = file.type || null;
        fileSize = file.size;
      }
    } else {
      const body = await req.json();
      const { baId: rawBaId, senderName: rawSenderName, message: rawMessage } = body;

      if (!rawBaId || !rawSenderName || !rawMessage?.trim()) {
        return NextResponse.json({ success: false, error: 'baId, senderName, dan message wajib diisi' }, { status: 400 });
      }

      baId       = parseInt(rawBaId);
      senderId   = 30;
      senderName = rawSenderName.trim();
      message    = rawMessage.trim();

      if (isNaN(baId)) {
        return NextResponse.json({ success: false, error: 'baId harus angka' }, { status: 400 });
      }

      fileUrl  = body.fileUrl  || null;
      fileName = body.fileName || null;
      fileType = body.fileType || null;
      fileSize = body.fileSize ? parseInt(body.fileSize) : null;
    }

    // Validasi BA exists
    const ba = await prisma.bacara.findUnique({ where: { id: baId }, select: { id: true } });
    if (!ba) {
      return NextResponse.json({ success: false, error: `BA dengan ID ${baId} tidak ditemukan` }, { status: 404 });
    }

    const chat = await prisma.blueprintChat.create({
      data: { baId, senderId, senderName, message, fileUrl, fileName, fileType, fileSize },
    });

    return NextResponse.json({ success: true, data: chat }, { status: 201 });
  } catch (error: any) {
    console.error('[Public API] Error sending blueprint chat:', error);
    const msg = error.code === 'P2003' ? 'Referensi BA atau pegawai tidak valid' : 'Internal server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
