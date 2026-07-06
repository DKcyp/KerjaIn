import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// POST - Create new TaskBA
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json();

    const {
      moduleId,
      nama,
      deskripsi,
      programmerId,
      jadwalMulai,
      kompleksitas,
    } = body;

    // Validate required fields
    if (!moduleId || !nama) {
      return NextResponse.json(
        {
          success: false,
          error: "Module ID dan nama task wajib diisi",
        },
        { status: 400 }
      );
    }

    // Verify module exists
    const module = await prisma.proyekModule.findUnique({
      where: { id: parseInt(moduleId) },
    });

    if (!module) {
      return NextResponse.json(
        {
          success: false,
          error: "Module tidak ditemukan",
        },
        { status: 404 }
      );
    }

    // Create TaskBA
    const newTaskBA = await prisma.taskBA.create({
      data: {
        projectId,
        moduleId: parseInt(moduleId),
        nama,
        deskripsi: deskripsi || null,
        programmerId: programmerId ? parseInt(programmerId) : null,
        jadwalMulai: jadwalMulai ? new Date(jadwalMulai) : null,
        kompleksitas: kompleksitas || "MEDIUM",
      },
      include: {
        programmer: {
          select: {
            id: true,
            namaLengkap: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newTaskBA.id,
        nama: newTaskBA.nama,
        deskripsi: newTaskBA.deskripsi,
        programmerId: newTaskBA.programmerId,
        programmer: newTaskBA.programmer?.namaLengkap || null,
        jadwalMulai: newTaskBA.jadwalMulai,
        kompleksitas: newTaskBA.kompleksitas,
      },
    });
  } catch (error) {
    console.error("Error creating TaskBA:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal membuat task BA",
      },
      { status: 500 }
    );
  }
}

// PUT - Update TaskBA
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Consume params
    const body = await request.json();
    const {
      taskBAId,
      nama,
      deskripsi,
      programmerId,
      jadwalMulai,
      kompleksitas,
    } = body;

    if (!taskBAId) {
      return NextResponse.json(
        {
          success: false,
          error: "Task BA ID wajib diisi",
        },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (nama !== undefined) updateData.nama = nama;
    if (deskripsi !== undefined) updateData.deskripsi = deskripsi;
    if (programmerId !== undefined)
      updateData.programmerId = programmerId ? parseInt(programmerId) : null;
    if (jadwalMulai !== undefined)
      updateData.jadwalMulai = jadwalMulai ? new Date(jadwalMulai) : null;
    if (kompleksitas !== undefined) updateData.kompleksitas = kompleksitas;

    const updatedTaskBA = await prisma.taskBA.update({
      where: { id: parseInt(taskBAId) },
      data: updateData,
      include: {
        programmer: {
          select: {
            id: true,
            namaLengkap: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedTaskBA.id,
        nama: updatedTaskBA.nama,
        deskripsi: updatedTaskBA.deskripsi,
        programmerId: updatedTaskBA.programmerId,
        programmer: updatedTaskBA.programmer?.namaLengkap || null,
        jadwalMulai: updatedTaskBA.jadwalMulai,
        kompleksitas: updatedTaskBA.kompleksitas,
      },
    });
  } catch (error) {
    console.error("Error updating TaskBA:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengupdate task BA",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete TaskBA
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Consume params
    const { searchParams } = new URL(request.url);
    const taskBAId = searchParams.get("taskBAId");

    if (!taskBAId) {
      return NextResponse.json(
        {
          success: false,
          error: "Task BA ID wajib diisi",
        },
        { status: 400 }
      );
    }

    await prisma.taskBA.delete({
      where: { id: parseInt(taskBAId) },
    });

    return NextResponse.json({
      success: true,
      message: "Task BA berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting TaskBA:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menghapus task BA",
      },
      { status: 500 }
    );
  }
}
