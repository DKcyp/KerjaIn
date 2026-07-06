import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// POST - Recalculate and update BA status based on its tasks
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Consume params
    const body = await request.json();
    const { baId } = body;

    if (!baId) {
      return NextResponse.json(
        { success: false, error: "BA ID is required" },
        { status: 400 }
      );
    }

    // Get all tasks for this BA through baModules
    const tasks = await prisma.bATask.findMany({
      where: {
        module: {
          baId: parseInt(baId)
        }
      },
      select: {
        id: true,
        isApproved: true
      }
    });

    let newStatus = "DRAFT";
    
    if (tasks.length > 0) {
      const approvedCount = tasks.filter(t => t.isApproved).length;
      if (approvedCount === tasks.length) {
        newStatus = "APPROVED";
      } else if (approvedCount > 0) {
        newStatus = "MENUNGGU_APPROVAL";
      }
    }

    const updatedBA = await prisma.bacara.update({
      where: { id: parseInt(baId) },
      data: { status: newStatus as any }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedBA.id,
        status: updatedBA.status
      }
    });
  } catch (error) {
    console.error("Error updating BA status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update BA status" },
      { status: 500 }
    );
  }
}
