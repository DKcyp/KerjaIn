import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { DEVELOPMENT_OR_HIGHER_STATUSES, compareVersions } from "@/lib/versionService";

const prisma = new PrismaClient();

// GET - Get the latest BA/Blueprint object for a project (Public/CRM API)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    
    // Get type from query params (BLUEPRINT or BERITA_ACARA)
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'BERITA_ACARA';

    // Validate type
    const validTypes = ['BLUEPRINT', 'BERITA_ACARA'];
    const baType = validTypes.includes(type) ? type : 'BERITA_ACARA';

    // Fetch all BAs for the project and type that are DEVELOPMENT or higher
    const items = await prisma.bacara.findMany({
      where: {
        projectId,
        type: baType as any,
        status: { in: DEVELOPMENT_OR_HIGHER_STATUSES },
      },
      select: {
        id: true,
        projectId: true,
        nama: true,
        version: true,
        status: true,
        type: true,
        deskripsi: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No approved BA found",
      });
    }

    // Sort by semantic version to get the highest one
    items.sort((a, b) => compareVersions(b.version, a.version));

    // The first item is the latest version
    const latestBA = items[0];

    return NextResponse.json({
      success: true,
      data: latestBA,
    });
  } catch (error) {
    console.error("Error fetching latest BA:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch latest BA",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
