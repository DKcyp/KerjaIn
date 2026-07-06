import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// POST - Approve existing blueprint module to proyek_module database
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json();
    const { moduleId, type, baVersion, baName } = body;

    // Validate required fields
    if (!moduleId || !type) {
      return NextResponse.json(
        {
          success: false,
          error: "Module ID dan type wajib diisi",
        },
        { status: 400 }
      );
    }

    // Get blueprint module data
    const baModule = await prisma.bAModule.findUnique({
      where: { id: moduleId },
      include: {
        parent: true // Get parent if it's a sub module
      }
    });

    if (!baModule) {
      return NextResponse.json(
        {
          success: false,
          error: "Blueprint module tidak ditemukan",
        },
        { status: 404 }
      );
    }

    let result: { id: number; nama: string; kode: string | null } | undefined;

    if (type === 'main') {
      // Create main module in proyek_module
      const maxOrder = await prisma.proyekModule.findFirst({
        where: {
          projectId: projectId,
          parentId: null
        },
        orderBy: { order: 'desc' }
      });

      const nextOrder = (maxOrder?.order || 0) + 1;

      // Create main module in proyek_module
      result = await prisma.proyekModule.create({
        data: {
          projectId: projectId,
          nama: baModule.nama,
          kode: String(nextOrder).padStart(2, '0'),
          order: nextOrder,
          isLeaf: false,
          parentId: null,
          version: baVersion || '0.0.1',
          baVersion: baVersion || '0.0.1',
          ba: baName || null,
        }
      });

      // Update blueprint module status
      await prisma.bAModule.update({
        where: { id: moduleId },
        data: { isAppModule: true }
      });

    } else if (type === 'sub') {
      // Handle sub module approval
      if (!baModule.parent) {
        return NextResponse.json(
          {
            success: false,
            error: "Parent module tidak ditemukan",
          },
          { status: 404 }
        );
      }

      // Find or create parent main module in proyek_module
      let parentModule = await prisma.proyekModule.findFirst({
        where: {
          projectId: projectId,
          nama: baModule.parent.nama,
          parentId: null
        }
      });

      // If parent main module doesn't exist, create it first
      if (!parentModule) {
        const maxOrder = await prisma.proyekModule.findFirst({
          where: {
            projectId: projectId,
            parentId: null
          },
          orderBy: { order: 'desc' }
        });

        const nextOrder = (maxOrder?.order || 0) + 1;

        parentModule = await prisma.proyekModule.create({
          data: {
            projectId: projectId,
            nama: baModule.parent.nama,
            kode: String(nextOrder).padStart(2, '0'),
            order: nextOrder,
            isLeaf: false,
            parentId: null,
            version: baVersion || '0.0.1',
            baVersion: baVersion || '0.0.1',
            ba: baName || null,
          }
        });

        // Also update parent blueprint module status
        await prisma.bAModule.update({
          where: { id: baModule.parent.id },
          data: { isAppModule: true }
        });
      }

      // Proceed with creating new sub module
      const maxSubOrder = await prisma.proyekModule.findFirst({
        where: {
          projectId: projectId,
          parentId: parentModule.id
        },
        orderBy: { order: 'desc' }
      });

      const nextSubOrder = (maxSubOrder?.order || 0) + 1;

      // Create sub module in proyek_module
      result = await prisma.proyekModule.create({
        data: {
          projectId: projectId,
          nama: baModule.nama,
          kode: `${parentModule.kode}.${String(nextSubOrder).padStart(2, '00')}`,
          order: nextSubOrder,
          isLeaf: true,
          parentId: parentModule.id,
          version: baVersion || '0.0.1',
          baVersion: baVersion || '0.0.1',
          ba: baName || null,
        }
      });

      // Update blueprint module status
      await prisma.bAModule.update({
        where: { id: moduleId },
        data: { isAppModule: true }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result!.id,
        nama: result!.nama,
        kode: result!.kode || '',
        type: type,
      },
      message: `${type === 'main' ? 'Main module' : 'Sub module'} berhasil di-approve ke proyek`
    });

  } catch (error) {
    console.error("Error approving existing module to proyek:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to approve existing module to proyek",
      },
      { status: 500 }
    );
  }
}