import { NextRequest, NextResponse } from "next/server";
import { getLatestDevelopmentBAVersion } from "@/lib/versionService";

// GET - Get last approved BA version for a project
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

    // Find the last BA that has approved tasks (status >= DEVELOPMENT) for this project and type
    const latestVersion = await getLatestDevelopmentBAVersion(projectId, baType as any);

    if (latestVersion) {
      return NextResponse.json({
        success: true,
        data: {
          version: latestVersion,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        version: null,
      },
      message: "No approved BA found",
    });
  } catch (error) {
    console.error("Error fetching last approved BA version:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch last approved BA version",
      },
      { status: 500 }
    );
  }
}
