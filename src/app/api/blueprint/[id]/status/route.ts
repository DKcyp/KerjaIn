import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/blueprint/[id]/status
// Check if all modules are 100% complete (no review comments)
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
        const allModules = await prisma.proyekModule.findMany({
            where: { projectId: blueprint.proyekId },
            select: { id: true }
        });

        // Get the latest HISTORY session (not active, most recent completed review)
        const latestHistorySession = await prisma.modulReviewSession.findFirst({
            where: {
                blueprintId,
                isActive: false  // Only check history/completed sessions
            },
            orderBy: { createdAt: 'desc' },
            include: {
                reviews: true
            }
        });

        if (!latestHistorySession || latestHistorySession.reviews.length === 0) {
            // No completed review history yet
            console.log('[Blueprint Status] No history session found');
            return NextResponse.json({
                success: true,
                data: {
                    allModulesComplete: false,
                    totalModules: allModules.length,
                    reviewedModules: 0,
                    reason: 'No completed review history'
                }
            });
        }

        // Check if all modules have been reviewed in the latest history session
        const reviewedModuleIds = new Set(latestHistorySession.reviews.map(r => r.moduleId));
        const allModulesReviewed = allModules.length > 0 && allModules.every(m => reviewedModuleIds.has(m.id));

        // Check if all reviewed modules have NO comments (100% = no comment)
        // A module is 100% complete if it has NO review comment (or empty comment)
        const modulesWithComments = latestHistorySession.reviews.filter(r => r.reviewComment && r.reviewComment.trim()).length;
        const allModulesComplete = allModulesReviewed && modulesWithComments === 0;

        console.log('[Blueprint Status]', {
            blueprintId,
            totalModules: allModules.length,
            reviewedModules: reviewedModuleIds.size,
            allModulesReviewed,
            modulesWithComments,
            allModulesComplete,
            sessionId: latestHistorySession.id,
            sessionName: latestHistorySession.sessionName,
            isActive: latestHistorySession.isActive,
            reviews: latestHistorySession.reviews.map(r => ({
                moduleId: r.moduleId,
                hasComment: !!(r.reviewComment && r.reviewComment.trim()),
                comment: r.reviewComment ? r.reviewComment.substring(0, 50) : null
            }))
        });

        return NextResponse.json({
            success: true,
            data: {
                allModulesComplete,
                totalModules: allModules.length,
                reviewedModules: reviewedModuleIds.size,
                modulesWithComments,
                allModulesReviewed
            }
        });

    } catch (error) {
        console.error('[Blueprint Status GET] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to check blueprint status' },
            { status: 500 }
        );
    }
}
