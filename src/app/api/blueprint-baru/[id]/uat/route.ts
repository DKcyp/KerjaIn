import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';

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

    // Get BA with all tasks
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

    // Calculate task statistics
    const allTasks = ba.baModules.flatMap(m => m.taskBAs);
    const tasksWithTasklist = allTasks.filter(t => t.tasklistId);
    const completedTasks = allTasks.filter(t => t.tasklist?.status === 'SELESAI');
    const uatApprovedTasks = allTasks.filter(t => t.uatApproved);
    const uatExternalApprovedTasks = allTasks.filter(t => t.uatExternalApproved);

    return NextResponse.json({
      success: true,
      data: {
        ba,
        stats: {
          total: allTasks.length,
          withTasklist: tasksWithTasklist.length,
          completed: completedTasks.length,
          uatApproved: uatApprovedTasks.length,
          uatExternalApproved: uatExternalApprovedTasks.length,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching UAT status:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Approve or Revisi UAT for a task
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const { taskId, approved, keterangan, fileUrl } = await req.json();

    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Only erda@exp can approve UAT Internal
    if (approved) {
      if (session.username?.toLowerCase() !== 'erda@exp') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Hanya akun erda@exp yang dapat melakukan approval UAT Internal.' 
          }, 
          { status: 403 }
        );
      }
    }

    // Update task UAT status
    const task = await prisma.bATask.update({
      where: { id: parseInt(taskId) },
      data: {
        uatApproved: approved,
        uatApprovedAt: approved ? new Date() : null,
        uatApprovedBy: approved ? session.id : null,
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

    // Approve flow continues...
    // Check if all completed tasks in this BA are now UAT approved
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

    console.log('[UAT] Total tasks in BA:', allTasks.length);
    
    const tasksWithTasklist = allTasks.filter(t => t.tasklistId !== null);
    console.log('[UAT] Tasks with tasklist:', tasksWithTasklist.length);
    
    const completedTasks = allTasks.filter(t => t.tasklist?.status === 'SELESAI');
    console.log('[UAT] Completed tasks:', completedTasks.length);
    
    const uatApprovedTasks = completedTasks.filter(t => t.uatApproved);
    console.log('[UAT] UAT approved tasks:', uatApprovedTasks.length);

    const allTasksHaveTasklist = allTasks.length > 0 && allTasks.length === tasksWithTasklist.length;
    const allTasklistsCompleted = tasksWithTasklist.length > 0 && tasksWithTasklist.length === completedTasks.length;
    const allCompletedTasksUATApproved = completedTasks.length > 0 && completedTasks.length === uatApprovedTasks.length;

    const shouldUpdateBAStatus = allTasksHaveTasklist && allTasklistsCompleted && allCompletedTasksUATApproved;
    
    if (shouldUpdateBAStatus) {
      await prisma.bacara.update({
        where: { id: baId },
        data: { status: 'UAT_INTERNAL_SELESAI' }
      });

      return NextResponse.json({
        success: true,
        data: task,
        message: `Task berhasil di-approve! Semua ${allTasks.length} task sudah selesai dan di-approve UAT, BA status otomatis diubah ke UAT_INTERNAL_SELESAI`,
        baStatusUpdated: true,
        stats: {
          totalTasks: allTasks.length,
          tasksWithTasklist: tasksWithTasklist.length,
          completedTasks: completedTasks.length,
          uatApprovedTasks: uatApprovedTasks.length
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: task,
      message: `Task berhasil di-approve (${uatApprovedTasks.length}/${completedTasks.length} completed tasks UAT approved, ${completedTasks.length}/${allTasks.length} tasks completed)`,
      baStatusUpdated: false,
      stats: {
        totalTasks: allTasks.length,
        tasksWithTasklist: tasksWithTasklist.length,
        completedTasks: completedTasks.length,
        uatApprovedTasks: uatApprovedTasks.length
      }
    });
  } catch (error) {
    console.error('Error updating UAT status:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update BA status for UAT internal stage
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const { baId, status } = await req.json();

    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Validate status
    if (!['DEVELOPMENT', 'PROSES_DEVELOPMENT', 'UAT_INTERNAL'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    // If rejecting to DEVELOPMENT, reset all UAT approvals
    if (status === 'DEVELOPMENT') {
      await prisma.bATask.updateMany({
        where: {
          module: {
            baId: parseInt(baId)
          }
        },
        data: {
          uatApproved: false,
          uatApprovedAt: null,
          uatApprovedBy: null,
          uatExternalApproved: false,
          uatExternalApprovedAt: null,
          uatExternalApprovedBy: null,
        }
      });
    }

    // Update BA status
    const ba = await prisma.bacara.update({
      where: { id: parseInt(baId) },
      data: { status }
    });

    return NextResponse.json({
      success: true,
      data: ba
    });
  } catch (error) {
    console.error('Error updating BA status:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
