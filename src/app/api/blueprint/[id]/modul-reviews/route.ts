import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/blueprint/[id]/modul-reviews
// Fetch all modul reviews for a blueprint with progress calculation
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const blueprintId = parseInt(id);

        if (isNaN(blueprintId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid blueprint ID' },
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

        // Get all modules for this project
        const modules = await prisma.proyekModule.findMany({
            where: { projectId: blueprint.proyekId },
            orderBy: [
                { depth: 'asc' },
                { order: 'asc' }
            ]
        });

        // Get existing reviews
        const reviews = await prisma.modulReview.findMany({
            where: { blueprintId }
        });

        // Create a map of reviews by moduleId
        const reviewMap = new Map(reviews.map((r: any) => [r.moduleId, r]));

        // Get tasklist counts for each module
        const tasklistCounts = await prisma.tasklist.groupBy({
            by: ['moduleId', 'status'],
            where: {
                projectId: blueprint.proyekId,
                tasklistType: 'BLUEPRINT'
            },
            _count: true
        });

        // Calculate progress for each module
        const moduleProgressMap = new Map<number, { total: number; completed: number }>();

        tasklistCounts.forEach(({ moduleId, status, _count }) => {
            if (!moduleProgressMap.has(moduleId)) {
                moduleProgressMap.set(moduleId, { total: 0, completed: 0 });
            }
            const progress = moduleProgressMap.get(moduleId)!;
            progress.total += _count;
            if (status === 'SELESAI') {
                progress.completed += _count;
            }
        });

        // Build flat list of all modules with their data
        const modulesData = modules.map(module => {
            const review = reviewMap.get(module.id);
            const progress = moduleProgressMap.get(module.id) || { total: 0, completed: 0 };
            const progressPercentage = progress.total > 0
                ? Math.round((progress.completed / progress.total) * 100)
                : 0;

            return {
                id: module.id,
                nama: module.nama,
                kode: module.kode,
                isLeaf: module.isLeaf,
                depth: module.depth,
                parentId: module.parentId,
                reviewComment: review?.reviewComment || null,
                progress: {
                    percentage: progressPercentage,
                    completed: progress.completed,
                    total: progress.total
                }
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                blueprintId,
                projectId: blueprint.proyekId,
                modules: modulesData
            }
        });
    } catch (error) {
        console.error('[Modul Reviews GET] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch modul reviews' },
            { status: 500 }
        );
    }
}

// POST /api/blueprint/[id]/modul-reviews
// Save or update a modul review
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const blueprintId = parseInt(id);
        const body = await request.json();
        const { moduleId, reviewComment } = body;

        if (isNaN(blueprintId) || !moduleId) {
            return NextResponse.json(
                { success: false, error: 'Invalid blueprint ID or module ID' },
                { status: 400 }
            );
        }

        // Verify blueprint exists
        const blueprint = await prisma.blueprint.findUnique({
            where: { id: blueprintId }
        });

        if (!blueprint) {
            return NextResponse.json(
                { success: false, error: 'Blueprint not found' },
                { status: 404 }
            );
        }

        // Verify module exists
        const module = await prisma.proyekModule.findUnique({
            where: { id: moduleId }
        });

        if (!module) {
            return NextResponse.json(
                { success: false, error: 'Module not found' },
                { status: 404 }
            );
        }

        // Get or create active session
        let activeSession = await prisma.modulReviewSession.findFirst({
            where: {
                blueprintId,
                isActive: true
            }
        });

        if (!activeSession) {
            activeSession = await prisma.modulReviewSession.create({
                data: {
                    blueprintId,
                    sessionName: null,
                    isActive: true,
                    createdBy: null
                }
            });
        }

        // Upsert the review
        const review = await prisma.modulReview.upsert({
            where: {
                sessionId_moduleId: {
                    sessionId: activeSession.id,
                    moduleId
                }
            },
            create: {
                blueprintId,
                sessionId: activeSession.id,
                moduleId,
                reviewComment: reviewComment || null
            },
            update: {
                reviewComment: reviewComment || null,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            data: review
        });
    } catch (error) {
        console.error('[Modul Reviews POST] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save modul review' },
            { status: 500 }
        );
    }
}
