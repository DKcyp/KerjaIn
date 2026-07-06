import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLatestDevelopmentBAVersion } from '@/lib/versionService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const { subModuleId } = await req.json();

    if (!subModuleId) {
      return NextResponse.json({
        success: false,
        error: 'Module ID is required'
      }, { status: 400 });
    }

    // Get BA module with its bacara
    const baModule = await prisma.bAModule.findUnique({
      where: { id: parseInt(subModuleId) },
      include: {
        parent: true,
        bacara: true,
      }
    });

    if (!baModule) {
      return NextResponse.json({
        success: false,
        error: 'Module not found'
      }, { status: 404 });
    }

    const baId = baModule.bacara?.id || null;

    // CATATAN: proyek_module.baId FK menunjuk ke tabel 'business_analyst' (legacy),
    // bukan 'bacara'. Jadi jangan isi baId dari bacara — set null saja.

    // Helper: find or create a proyek_module for a given BAModule
    const ensureProyekModule = async (
      bam: { id: number; nama: string },
      parentProyekModuleId: number | null,
      isLeaf: boolean
    ) => {
      const where: any = {
        projectId,
        nama: bam.nama,
      };
      if (parentProyekModuleId !== null) {
        where.parentId = parentProyekModuleId;
      } else {
        where.parentId = null;
      }

      let existing = await prisma.proyekModule.findFirst({ where });
      if (existing) return existing;

      // Get next order
      const orderWhere: any = { projectId };
      if (parentProyekModuleId !== null) {
        orderWhere.parentId = parentProyekModuleId;
      } else {
        orderWhere.parentId = null;
      }

      const maxOrder = await prisma.proyekModule.findFirst({
        where: orderWhere,
        orderBy: { order: 'desc' }
      });

      const nextOrder = (maxOrder?.order || 0) + 1;

      // Get BA info for version (gunakan bacara untuk ambil version saja, bukan untuk FK)
      const bacara = baId
        ? await prisma.bacara.findUnique({ where: { id: baId } })
        : null;

      let moduleVersion = bacara?.version || '0.0.1';
      if (moduleVersion === '0.0.1') {
        const latestDevVersion = await getLatestDevelopmentBAVersion(projectId);
        if (latestDevVersion) {
          moduleVersion = latestDevVersion;
        }
      }

      // Build kode
      let kode: string;
      if (isLeaf && parentProyekModuleId !== null) {
        const parentPm = await prisma.proyekModule.findUnique({ where: { id: parentProyekModuleId } });
        kode = `${parentPm?.kode || '00'}.${String(nextOrder).padStart(2, '0')}`;
      } else {
        kode = String(nextOrder).padStart(2, '0');
      }

      const created = await prisma.proyekModule.create({
        data: {
          projectId,
          nama: bam.nama,
          kode,
          order: nextOrder,
          isLeaf,
          parentId: parentProyekModuleId,
          baId: null, // FK ke business_analyst (legacy), bukan bacara — set null
          version: moduleVersion,
          baVersion: moduleVersion,
          ba: bacara?.nama || null,
        }
      });

      // Mark the BA module as approved
      await prisma.bAModule.update({
        where: { id: bam.id },
        data: { isAppModule: true }
      });

      console.log(`[check-modules] Created proyek_module ID ${created.id} for BA module ${bam.nama} (leaf=${isLeaf})`);
      return created;
    };

    if (baModule.level === 2 && baModule.parent) {
      // Level 2 (sub module): ensure main module first, then sub module
      const proyekMain = await ensureProyekModule(baModule.parent, null, false);

      const proyekSub = await prisma.proyekModule.findFirst({
        where: {
          projectId,
          nama: baModule.nama,
          parentId: proyekMain.id
        }
      }) || await ensureProyekModule(baModule, proyekMain.id, true);

      return NextResponse.json({
        success: true,
        data: {
          moduleId: proyekSub.id,
          mainModule: {
            id: proyekMain.id,
            nama: proyekMain.nama,
            kode: proyekMain.kode
          },
          subModule: {
            id: proyekSub.id,
            nama: proyekSub.nama,
            kode: proyekSub.kode
          }
        }
      });
    } else {
      // Level 1 (main module) atau flat module tanpa parent: ensure itself sebagai leaf
      // Semua BAModule level 1 flat langsung bisa di-tasklist-kan
      const proyekMain = await ensureProyekModule(baModule, null, true);

      return NextResponse.json({
        success: true,
        data: {
          moduleId: proyekMain.id,
          mainModule: {
            id: proyekMain.id,
            nama: proyekMain.nama,
            kode: proyekMain.kode
          }
        }
      });
    }

  } catch (error) {
    console.error('Error checking/creating modules:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}