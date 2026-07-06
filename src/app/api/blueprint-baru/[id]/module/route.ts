import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// POST - Add new module
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json();

    const { baId, parentModule, namaModule, kode, version } = body;

    // Validate required fields
    if (!namaModule || !baId) {
      return NextResponse.json(
        {
          success: false,
          error: "Module name and BA are required",
        },
        { status: 400 }
      );
    }

    // Verify BA exists
    const ba = await prisma.bacara.findUnique({
      where: { id: parseInt(baId) },
    });

    if (!ba) {
      return NextResponse.json(
        {
          success: false,
          error: "BA not found",
        },
        { status: 400 }
      );
    }

    // Calculate depth
    let depth = 0;
    let parentId = null;

    if (parentModule) {
      const parent = await prisma.proyekModule.findUnique({
        where: { id: parseInt(parentModule) },
      });

      if (parent) {
        depth = parent.depth + 1;
        parentId = parent.id;
      }
    }

    // Get max order for siblings
    const siblings = await prisma.proyekModule.findMany({
      where: {
        projectId,
        baId: parseInt(baId),
        parentId,
      },
      orderBy: {
        order: "desc",
      },
      take: 1,
    });

    const order = siblings.length > 0 ? siblings[0].order + 1 : 0;

    // Use latest development version or provided version or default to "0.0.1"
    const { getLatestDevelopmentBAVersion } = await import("@/lib/versionService");
    const latestVersion = await getLatestDevelopmentBAVersion(projectId, ba.type as any);
    const moduleVersion = latestVersion || version || ba.version || "0.0.1";

    // Create module
    const newModule = await prisma.proyekModule.create({
      data: {
        projectId,
        baId: parseInt(baId),
        parentId,
        nama: namaModule,
        kode: kode || "",
        version: moduleVersion,
        depth,
        order,
        isLeaf: true,
      },
    });

    // Update parent isLeaf if has parent
    if (parentId) {
      await prisma.proyekModule.update({
        where: { id: parentId },
        data: { isLeaf: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newModule.id.toString(),
        kode: newModule.kode || "",
        modul: newModule.nama,
        version: newModule.version,
        ba: ba.nama,
        baVersion: ba.version,
        tasklist: [],
        parentId: newModule.parentId?.toString(),
        depth: newModule.depth,
      },
    });
  } catch (error) {
    console.error("Error creating module:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create module",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// PUT - Update module
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Consume params
    const body = await request.json();
    const { moduleId, namaModule, version } = body;

    if (!moduleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Module ID is required",
        },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (namaModule) updateData.nama = namaModule;
    if (version) updateData.version = version;

    const updatedModule = await prisma.proyekModule.update({
      where: { id: parseInt(moduleId) },
      data: updateData,
      include: {
        bacara: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedModule.id.toString(),
        kode: updatedModule.kode || "",
        modul: updatedModule.nama,
        version: updatedModule.version,
        ba: updatedModule.bacara?.nama || "",
        baVersion: updatedModule.bacara?.version || "0.0.1",
      },
    });
  } catch (error) {
    console.error("Error updating module:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update module",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete module
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Consume params
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("moduleId");

    if (!moduleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Module ID is required",
        },
        { status: 400 }
      );
    }

    // Check if module has children
    const children = await prisma.proyekModule.findMany({
      where: { parentId: parseInt(moduleId) },
    });

    if (children.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete module with children. Delete children first.",
        },
        { status: 400 }
      );
    }

    // Check if module has tasks
    const tasks = await prisma.tasklist.findMany({
      where: { moduleId: parseInt(moduleId) },
    });

    if (tasks.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete module with tasks. Delete tasks first.",
        },
        { status: 400 }
      );
    }

    await prisma.proyekModule.delete({
      where: { id: parseInt(moduleId) },
    });

    return NextResponse.json({
      success: true,
      message: "Module deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting module:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete module",
      },
      { status: 500 }
    );
  }
}
