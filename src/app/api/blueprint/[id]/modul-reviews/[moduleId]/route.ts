import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/blueprint/[id]/modul-reviews/[moduleId]
// Fetch detail for a specific module including tasklist and history
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
    try {
        const { id, moduleId } = await params;
        const blueprintId = parseInt(id);
        const moduleIdNum = parseInt(moduleId);

        if (isNaN(blueprintId) || isNaN(moduleIdNum)) {
            return NextResponse.json(
                { success: false, error: 'Invalid blueprint ID or module ID' },
                { status: 400 }
            );
        }

        // Get blueprint to find project ID
        const blueprint = await prisma.blueprint.findUnique({
            where: { id: blueprintId },
            select: { proyekId: true }
        });

        if (!blueprint) {
            return NextResponse.json(
                { success: false, error: 'Blueprint not found' },
                { status: 404 }
            );
        }

        // Get module details
        const module = await prisma.proyekModule.findUnique({
            where: { id: moduleIdNum }
        });

        if (!module) {
            return NextResponse.json(
                { success: false, error: 'Module not found' },
                { status: 404 }
            );
        }

        // Get review for this module (from active session)
        // First, get the active session
        const activeSession = await prisma.modulReviewSession.findFirst({
            where: {
                blueprintId,
                isActive: true
            }
        });

        let review = null;
        if (activeSession) {
            review = await prisma.modulReview.findUnique({
                where: {
                    sessionId_moduleId: {
                        sessionId: activeSession.id,
                        moduleId: moduleIdNum
                    }
                }
            });
        }

        // Get tasklists for this module
        const tasklists = await prisma.tasklist.findMany({
            where: {
                moduleId: moduleIdNum,
                projectId: blueprint.proyekId,
                tasklistType: 'BLUEPRINT'
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                kode: true,
                keterangan: true,
                status: true,
                scheduleAt: true,
                createdAt: true,
                updatedAt: true
            }
        });

        // Calculate progress
        const totalTasks = tasklists.length;
        const completedTasks = tasklists.filter(t => t.status === 'SELESAI').length;
        const progressPercentage = totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100)
            : 0;

        // Get activity history (from tasklist logs related to this module)
        const activityHistory = await prisma.tasklistLog.findMany({
            where: {
                taskId: {
                    in: tasklists.map(t => t.id)
                }
            },
            orderBy: { waktu: 'desc' },
            take: 10,
            select: {
                id: true,
                waktu: true,
                userId: true,
                keterangan: true,
                action: true,
                status: true
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                module: {
                    id: module.id,
                    nama: module.nama,
                    kode: module.kode,
                    isLeaf: module.isLeaf,
                    depth: module.depth
                },
                review: {
                    reviewComment: review?.reviewComment || null,
                    createdAt: review?.createdAt,
                    updatedAt: review?.updatedAt
                },
                progress: {
                    percentage: progressPercentage,
                    completed: completedTasks,
                    total: totalTasks
                },
                tasklists,
                history: activityHistory
            }
        });
    } catch (error) {
        console.error('[Modul Review Detail GET] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch module detail' },
            { status: 500 }
        );
    }
}
