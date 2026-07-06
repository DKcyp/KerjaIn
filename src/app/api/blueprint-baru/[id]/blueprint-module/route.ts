import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// POST - Create new Blueprint Module
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json();

    const {
      baId,
      parentId,
      nama,
      kode,
      level,
      version,
    } = body;

    // Validate required fields
    if (!baId || !nama || !level) {
      return NextResponse.json(
        {
          success: false,
          error: "BA ID, nama, dan level wajib diisi",
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
          error: "BA tidak ditemukan",
        },
        { status: 404 }
      );
    }

    // Get max order for siblings
    const siblings = await prisma.bAModule.findMany({
      where: {
        projectId,
        baId: parseInt(baId),
        parentId: parentId ? parseInt(parentId) : null,
      },
      orderBy: {
        order: "desc",
      },
      take: 1,
    });

    const order = siblings.length > 0 ? siblings[0].order + 1 : 0;

    // Create blueprint module
    const newModule = await prisma.bAModule.create({
      data: {
        projectId,
        baId: parseInt(baId),
        parentId: parentId ? parseInt(parentId) : null,
        nama,
        kode: kode || "",
        level: parseInt(level),
        order,
        version: version || "0.0.1",
        isAppModule: parseInt(level) === 1,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newModule.id,
        nama: newModule.nama,
        kode: newModule.kode,
        level: newModule.level,
        version: newModule.version,
      },
    });
  } catch (error) {
    console.error("Error creating blueprint module:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal membuat blueprint module",
      },
      { status: 500 }
    );
  }
}

// PUT - Update Blueprint Module
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Consume params
    const body = await request.json();
    const {
      moduleId,
      nama,
      kode,
      version,
      order,
    } = body;

    if (!moduleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Module ID wajib diisi",
        },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (nama !== undefined) updateData.nama = nama;
    if (kode !== undefined) updateData.kode = kode;
    if (version !== undefined) updateData.version = version;
    if (order !== undefined) updateData.order = typeof order === 'string' ? parseInt(order) : order;

    const updatedModule = await prisma.bAModule.update({
      where: { id: parseInt(moduleId) },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedModule.id,
        nama: updatedModule.nama,
        kode: updatedModule.kode,
        level: updatedModule.level,
        version: updatedModule.version,
      },
    });
  } catch (error) {
    console.error("Error updating blueprint module:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengupdate blueprint module",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete Blueprint Module
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
          error: "Module ID wajib diisi",
        },
        { status: 400 }
      );
    }

    await prisma.bAModule.delete({
      where: { id: parseInt(moduleId) },
    });

    return NextResponse.json({
      success: true,
      message: "Blueprint module berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting blueprint module:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menghapus blueprint module",
      },
      { status: 500 }
    );
  }
}