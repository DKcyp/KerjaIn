import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/blueprint-baru/[id]/ba/history?baId={baId}&type={RFC|CED|OK}
 *
 * Returns full file history for a BA, grouped by document type.
 * Each entry includes uploader info, upload time, and isLatest flag.
 *
 * Query params:
 *   baId   (required) — ID of the bacara record
 *   type   (optional) — filter by RFC | CED | OK. If omitted, returns all types.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const baId = searchParams.get('baId');
    const typeFilter = searchParams.get('type'); // RFC | CED | OK | null

    if (!baId) {
      return NextResponse.json(
        { success: false, error: 'baId is required' },
        { status: 400 }
      );
    }

    // Verify BA exists and optionally belongs to this project
    const ba = await prisma.bacara.findUnique({
      where: { id: parseInt(baId) },
      select: { id: true, nama: true, version: true, status: true, projectId: true },
    });

    if (!ba) {
      return NextResponse.json(
        { success: false, error: 'BA not found' },
        { status: 404 }
      );
    }

    // Optional: verify it belongs to the project (can be commented out if not needed)
    if (ba.projectId !== projectId) {
      return NextResponse.json(
        { success: false, error: 'BA does not belong to this project' },
        { status: 403 }
      );
    }

    // Build filter
    const where: any = { baId: parseInt(baId) };
    if (typeFilter && ['RFC', 'CED', 'OK'].includes(typeFilter)) {
      where.type = typeFilter;
    }

    // Fetch all documents ordered newest first
    const docs = await prisma.bADoc.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            namaLengkap: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Group by type for easier frontend consumption
    const grouped: Record<string, typeof docs> = {};
    for (const doc of docs) {
      if (!grouped[doc.type]) grouped[doc.type] = [];
      grouped[doc.type].push(doc);
    }

    // Build response — flat list + grouped view
    const history = docs.map((doc) => ({
      id: doc.id,
      baId: doc.baId,
      type: doc.type,
      filePath: doc.filePath,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      isLatest: doc.isLatest,
      uploadedAt: doc.uploadedAt.toISOString(),
      uploadedBy: doc.uploader
        ? { id: doc.uploader.id, namaLengkap: doc.uploader.namaLengkap }
        : null,
    }));

    const groupedHistory: Record<string, typeof history> = {};
    for (const doc of history) {
      if (!groupedHistory[doc.type]) groupedHistory[doc.type] = [];
      groupedHistory[doc.type].push(doc);
    }

    return NextResponse.json({
      success: true,
      data: {
        ba: {
          id: ba.id,
          nama: ba.nama,
          version: ba.version,
          status: ba.status,
        },
        // Flat list — all documents sorted newest first
        history,
        // Grouped by type — RFC[], CED[], OK[]
        grouped: groupedHistory,
        // Summary counts per type
        summary: {
          RFC: groupedHistory['RFC']?.length ?? 0,
          CED: groupedHistory['CED']?.length ?? 0,
          OK: groupedHistory['OK']?.length ?? 0,
          total: history.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching BA file history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch BA file history' },
      { status: 500 }
    );
  }
}
