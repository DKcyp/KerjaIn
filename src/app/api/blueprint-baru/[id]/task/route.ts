import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getLatestDevelopmentBAVersion, getNextVersionForModule } from "@/lib/versionService";
import { generateTasklistKode } from '@/lib/generateKode';

const prisma = new PrismaClient();

// POST - Add new task to module
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
      namaTask,
      kompleksitas,
      estimasi,
      programmerId,
      deskripsi,
    } = body;

    // Validate required fields
    if (!moduleId || !namaTask || !programmerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Module ID, task name, and programmer are required",
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
          error: "Module not found",
        },
        { status: 404 }
      );
    }

    // Get programmer name
    const programmer = await prisma.pegawai.findUnique({
      where: { id: parseInt(programmerId) },
      select: { namaLengkap: true },
    });

    // Determine the version for the new task
    let taskVersion = await getLatestDevelopmentBAVersion(projectId);
    if (!taskVersion) {
      taskVersion = await getNextVersionForModule(parseInt(moduleId));
    }

    // Create task
    const newTask = await prisma.tasklist.create({
      data: {
        projectId,
        moduleId: parseInt(moduleId),
        pegawaiId: parseInt(programmerId),
        keterangan: namaTask,
        programmerDescription: deskripsi || "",
        taskComplexity: kompleksitas || "MEDIUM",
        customDurationHours: estimasi || 8,
        scheduleAt: new Date(),
        status: "MENUNGGU_PROSES_USER",
        tasklistType: "DEVELOPMENT",
        baVersion: taskVersion,
        version: taskVersion,
        kode: await generateTasklistKode(prisma),
      },
    });
    
    console.log('=== SUCCESS CREATING TASKLIST FROM REGULAR MODULE ===');
    console.log('Tasklist ID:', newTask.id);
    console.log('Tasklist Keterangan:', newTask.keterangan);
    console.log('Tasklist Programmer ID:', newTask.pegawaiId);
    console.log('=====================================================');

    return NextResponse.json({
      success: true,
      data: {
        id: newTask.id.toString(),
        namaTask: newTask.keterangan || "",
        kompleksitas: newTask.taskComplexity,
        estimasi: newTask.customDurationHours
          ? parseFloat(newTask.customDurationHours.toString())
          : 8,
        programmerId: newTask.pegawaiId,
        programmer: programmer?.namaLengkap || "Unknown",
        deskripsi: newTask.programmerDescription || "",
        lampiran: undefined,
      },
    });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create task",
      },
      { status: 500 }
    );
  }
}

// PUT - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Consume params
    const body = await request.json();
    const {
      taskId,
      namaTask,
      kompleksitas,
      estimasi,
      programmerId,
      deskripsi,
    } = body;

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: "Task ID is required",
        },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (namaTask) updateData.keterangan = namaTask;
    if (kompleksitas) updateData.taskComplexity = kompleksitas;
    if (estimasi) updateData.customDurationHours = estimasi;
    if (programmerId) updateData.pegawaiId = parseInt(programmerId);
    if (deskripsi !== undefined) updateData.programmerDescription = deskripsi;

    const updatedTask = await prisma.tasklist.update({
      where: { id: parseInt(taskId) },
      data: updateData,
    });

    // Get programmer name
    const programmer = await prisma.pegawai.findUnique({
      where: { id: updatedTask.pegawaiId },
      select: { namaLengkap: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedTask.id.toString(),
        namaTask: updatedTask.keterangan || "",
        kompleksitas: updatedTask.taskComplexity,
        estimasi: updatedTask.customDurationHours
          ? parseFloat(updatedTask.customDurationHours.toString())
          : 8,
        programmerId: updatedTask.pegawaiId,
        programmer: programmer?.namaLengkap || "Unknown",
        deskripsi: updatedTask.programmerDescription || "",
      },
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update task",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Consume params
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: "Task ID is required",
        },
        { status: 400 }
      );
    }

    await prisma.tasklist.delete({
      where: { id: parseInt(taskId) },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete task",
      },
      { status: 500 }
    );
  }
}
