import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/blueprint-baru/[id]/chat?baId=123
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const baId = parseInt(req.nextUrl.searchParams.get('baId') || '');

    if (isNaN(projectId) || isNaN(baId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const chats = await prisma.blueprintChat.findMany({
      where: { baId },
      orderBy: { createdAt: 'asc' },
    });

    const result = chats.map((c) => ({ ...c, senderName: c.senderName || '' }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching blueprint chat:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// POST /api/blueprint-baru/[id]/chat
// body: { baId, senderId, senderName, message }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await req.json();
    const { baId, senderId, senderName, message } = body;

    if (!baId || !senderId || !senderName || !message?.trim()) {
      return NextResponse.json({ success: false, error: 'baId, senderId, senderName, dan message wajib diisi' }, { status: 400 });
    }

    const chat = await prisma.blueprintChat.create({
      data: {
        baId: parseInt(baId),
        senderId: parseInt(senderId),
        senderName: senderName.trim(),
        message: message.trim(),
      },
    });

    return NextResponse.json({ success: true, data: chat }, { status: 201 });
  } catch (error) {
    console.error('Error sending blueprint chat:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
