import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';

// POST - Approve or Revisi UAT External for a task
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { taskId, approved, keterangan, fileUrl } = body;

  if (!taskId) {
    return NextResponse.json({ success: false, error: 'Task ID required' }, { status: 400 });
  }

  const cookieHeader = req.headers.get('cookie');
  const session = parseSessionFromCookieHeader(cookieHeader);

  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const task = await prisma.bATask.update({
      where: { id: parseInt(taskId) },
      data: {
        uatExternalApproved: approved,
        uatExternalApprovedAt: approved ? new Date() : null,
        uatExternalApprovedBy: approved ? session.id : null,
        ...(!approved ? {
          isApproved: false,
          revisiKeterangan: keterangan || null,
          revisiFileUrl: fileUrl || null,
          revisiAt: new Date(),
          revisiBy: session.id,
        } : {}),
      },
      include: {
        module: {
          include: {
            bacara: true
          }
        },
        tasklist: {
          select: { id: true, kode: true }
        }
      }
    });

    const baId = task.module.bacara.id;

    // If revision (approved: false), save to bacara_task
    if (!approved) {
      return NextResponse.json({
        success: true,
        message: 'Catatan revisi berhasil disimpan',
      });
    }

    // Check if all completed tasks in this BA are now UAT External approved
    const allTasks = await prisma.bATask.findMany({
      where: {
        module: {
          baId: baId
        }
      },
      include: {
        tasklist: {
          select: {
            status: true
          }
        }
      }
    });

    const tasksWithTasklist = allTasks.filter(t => t.tasklistId !== null);
    const completedTasks = allTasks.filter(t => t.tasklist?.status === 'SELESAI');
    const uatExternalApprovedTasks = completedTasks.filter(t => t.uatExternalApproved);

    const allTasksHaveTasklist = allTasks.length > 0 && allTasks.length === tasksWithTasklist.length;
    const allTasklistsCompleted = tasksWithTasklist.length > 0 && tasksWithTasklist.length === completedTasks.length;
    const allCompletedTasksUATExternalApproved = completedTasks.length > 0 && completedTasks.length === uatExternalApprovedTasks.length;
    
    const shouldUpdateBAStatus = allTasksHaveTasklist && allTasklistsCompleted && allCompletedTasksUATExternalApproved;
    
    if (shouldUpdateBAStatus) {
      await prisma.bacara.update({
        where: { id: baId },
        data: { status: 'UAT_EXTERNAL_SELESAI' }
      });

      return NextResponse.json({
        success: true,
        data: task,
        message: `Task UAT External approved. Semua ${allTasks.length} task sudah di-approve UAT External, BA status otomatis diubah ke UAT_EXTERNAL_SELESAI`,
        baStatusUpdated: true,
        stats: {
          totalTasks: allTasks.length,
          completedTasks: completedTasks.length,
          uatExternalApprovedTasks: uatExternalApprovedTasks.length
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: task,
      baStatusUpdated: false,
      stats: {
        totalTasks: allTasks.length,
        completedTasks: completedTasks.length,
        uatExternalApprovedTasks: uatExternalApprovedTasks.length
      }
    });
  } catch (error) {
    console.error('Error updating UAT External status:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get UAT status for a BA
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const baId = searchParams.get('baId');

    if (!baId) {
      return NextResponse.json({ success: false, error: 'BA ID required' }, { status: 400 });
    }

    const ba = await prisma.bacara.findUnique({
      where: { id: parseInt(baId) },
      include: {
        baModules: {
          include: {
            taskBAs: {
              include: {
                programmer: {
                  select: {
                    id: true,
                    namaLengkap: true,
                  }
                },
                tasklist: {
                  select: {
                    id: true,
                    status: true,
                    kode: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!ba) {
      return NextResponse.json({ success: false, error: 'BA not found' }, { status: 404 });
    }

    const allTasks = ba.baModules.flatMap(m => m.taskBAs);
    const tasksWithTasklist = allTasks.filter(t => t.tasklistId);
    const completedTasks = allTasks.filter(t => t.tasklist?.status === 'SELESAI');
    const uatExternalApprovedTasks = allTasks.filter(t => t.uatExternalApproved);

    return NextResponse.json({
      success: true,
      data: {
        ba,
        stats: {
          total: allTasks.length,
          withTasklist: tasksWithTasklist.length,
          completed: completedTasks.length,
          uatExternalApproved: uatExternalApprovedTasks.length,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching UAT status:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
