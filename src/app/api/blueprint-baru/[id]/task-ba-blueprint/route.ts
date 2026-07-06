import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// POST - Create new Task BA Blueprint
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
      jadwalExternal,
      durasiPengerjaan,
      durasiExternal,
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
    const module = await prisma.bAModule.findUnique({
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

    // Create TaskBA Blueprint
    const newTaskBA = await prisma.bATask.create({
      data: {
        projectId,
        moduleId: parseInt(moduleId),
        nama,
        deskripsi: deskripsi || null,
        programmerId: programmerId ? parseInt(programmerId) : null,
        jadwalMulai: jadwalMulai ? new Date(jadwalMulai) : null,
        jadwalExternal: jadwalExternal ? new Date(jadwalExternal) : null,
        durasiPengerjaan: durasiPengerjaan ? parseFloat(durasiPengerjaan) : null,
        durasiExternal: durasiExternal ? parseFloat(durasiExternal) : null,
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
        jadwalExternal: newTaskBA.jadwalExternal,
        durasiPengerjaan: newTaskBA.durasiPengerjaan,
        durasiExternal: newTaskBA.durasiExternal,
        kompleksitas: newTaskBA.kompleksitas,
      },
    });
  } catch (error) {
    console.error("Error creating Task BA Blueprint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal membuat task BA blueprint",
      },
      { status: 500 }
    );
  }
}

// PUT - Update Task BA Blueprint
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
      jadwalExternal,
      durasiPengerjaan,
      durasiExternal,
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
    if (jadwalExternal !== undefined)
      updateData.jadwalExternal = jadwalExternal ? new Date(jadwalExternal) : null;
    if (durasiPengerjaan !== undefined)
      updateData.durasiPengerjaan = durasiPengerjaan ? parseFloat(durasiPengerjaan) : null;
    if (durasiExternal !== undefined)
      updateData.durasiExternal = durasiExternal ? parseFloat(durasiExternal) : null;
    if (kompleksitas !== undefined) updateData.kompleksitas = kompleksitas;

    const updatedTaskBA = await prisma.bATask.update({
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
        jadwalExternal: updatedTaskBA.jadwalExternal,
        durasiPengerjaan: updatedTaskBA.durasiPengerjaan,
        durasiExternal: updatedTaskBA.durasiExternal,
        kompleksitas: updatedTaskBA.kompleksitas,
      },
    });
  } catch (error) {
    console.error("Error updating Task BA Blueprint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengupdate task BA blueprint",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete Task BA Blueprint
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

    await prisma.bATask.delete({
      where: { id: parseInt(taskBAId) },
    });

    return NextResponse.json({
      success: true,
      message: "Task BA blueprint berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting Task BA Blueprint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menghapus task BA blueprint",
      },
      { status: 500 }
    );
  }
}