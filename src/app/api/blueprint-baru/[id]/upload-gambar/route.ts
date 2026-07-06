import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'blueprint');
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop();
    const uniqueFileName = `blueprint_${projectId}_${timestamp}_${randomStr}.${ext}`;
    await writeFile(join(uploadDir, uniqueFileName), buffer);

    return NextResponse.json({
      success: true,
      data: {
        fileUrl: `/api/uploads/blueprint/${uniqueFileName}`,
        fileName: file.name,
      },
    });
  } catch (error) {
    console.error('Error uploading gambar:', error);
    return NextResponse.json({ success: false, error: 'Gagal upload gambar' }, { status: 500 });
  }
}
