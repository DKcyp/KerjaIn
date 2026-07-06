import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/blueprint/[id]/review-sessions/[sessionId]
// Fetch detail for a specific review session with all modules
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
    try {
        const { id, sessionId } = await params;
        const blueprintId = parseInt(id);
        const sessionIdNum = parseInt(sessionId);

        if (isNaN(blueprintId) || isNaN(sessionIdNum)) {
            return NextResponse.json(
                { success: false, error: 'Invalid blueprint ID or session ID' },
                { status: 400 }
            );
        }

        // Get session
        const session = await prisma.modulReviewSession.findUnique({
            where: { id: sessionIdNum }
        });

        if (!session || session.blueprintId !== blueprintId) {
            return NextResponse.json(
                { success: false, error: 'Session not found' },
                { status: 404 }
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

        // Get reviews for this session
        const reviews = await prisma.modulReview.findMany({
            where: { sessionId: sessionIdNum }
        });

        const reviewMap = new Map(reviews.map((r: any) => [r.moduleId, r]));

        // Get previous session to inherit progress
        const previousSession = await prisma.modulReviewSession.findFirst({
            where: {
                blueprintId: blueprintId,
                id: { lt: sessionIdNum }, // Previous sessions
                isActive: false // Only completed sessions
            },
            orderBy: { id: 'desc' }, // Get the most recent one
            include: {
                reviews: true
            }
        });

        console.log('[Review Session] Current session ID:', sessionIdNum);
        console.log('[Review Session] Previous session:', previousSession?.id || 'none');

        // Build progress map from previous session
        const moduleProgressMap = new Map<number, number>();

        if (previousSession) {
            // Use progress from previous session's reviews
            previousSession.reviews.forEach((prevReview: any) => {
                // Calculate progress based on previous review state
                const hadComment = prevReview.reviewComment && prevReview.reviewComment.trim();
                // If previous review had comment, it was marked as 90% (needs rework)
                // Otherwise it was 100% (completed)
                moduleProgressMap.set(prevReview.moduleId, hadComment ? 90 : 100);
            });
        } else {
            // First review session - all modules start at 0%
            console.log('[Review Session] First session - all modules start at 0%');
        }

        // Build modules data
        const modulesData = modules.map(module => {
            const review = reviewMap.get(module.id);
            const inheritedProgress = moduleProgressMap.get(module.id) || 0;

            // Get previous review comment from previous session
            const previousReview = previousSession?.reviews.find((r: any) => r.moduleId === module.id);
            const previousReviewComment = previousReview?.reviewComment || null;

            // Calculate current progress based on review comment
            let progressPercentage = inheritedProgress;

            // If this is current session and has review comment
            const hasReviewComment = review?.reviewComment && review.reviewComment.trim();

            // Update progress based on current review
            if (session.isActive) {
                // Active session - inherit from previous session and update based on current state
                if (hasReviewComment) {
                    // Has comment in current session = needs rework = 90%
                    progressPercentage = 90;
                } else if (inheritedProgress > 0) {
                    // Has previous progress, no new comment = keep inherited progress
                    progressPercentage = inheritedProgress;
                } else {
                    // No previous progress, no comment = not reviewed yet = 0%
                    progressPercentage = 0;
                }
            } else {
                // Inactive/snapshot session - use saved state from THIS session
                if (hasReviewComment) {
                    // Has comment in this session = needs rework = 90%
                    progressPercentage = 90;
                } else {
                    // No comment in this session = completed = 100%
                    progressPercentage = 100;
                }
            }

            return {
                id: module.id,
                nama: module.nama,
                kode: module.kode,
                isLeaf: module.isLeaf,
                depth: module.depth,
                reviewComment: review?.reviewComment || null,
                previousReviewComment: previousReviewComment, // Add previous review comment
                progress: {
                    percentage: progressPercentage,
                    completed: 0, // Not used anymore
                    total: 0 // Not used anymore
                },
                canEdit: session.isActive && progressPercentage < 100
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                session: {
                    id: session.id,
                    sessionName: session.sessionName,
                    isActive: session.isActive,
                    createdAt: session.createdAt
                },
                modules: modulesData
            }
        });
    } catch (error) {
        console.error('[Review Session Detail GET] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch session detail' },
            { status: 500 }
        );
    }
}

// POST /api/blueprint/[id]/review-sessions/[sessionId]/save
// Save reviews and optionally create history snapshot
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
    try {
        const { id, sessionId } = await params;
        const blueprintId = parseInt(id);
        const sessionIdNum = parseInt(sessionId);
        const body = await request.json();
        const { reviews, createSnapshot, createdBy } = body;

        if (isNaN(blueprintId) || isNaN(sessionIdNum)) {
            return NextResponse.json(
                { success: false, error: 'Invalid blueprint ID or session ID' },
                { status: 400 }
            );
        }

        // Get session
        const session = await prisma.modulReviewSession.findUnique({
            where: { id: sessionIdNum }
        });

        if (!session || session.blueprintId !== blueprintId) {
            return NextResponse.json(
                { success: false, error: 'Session not found' },
                { status: 404 }
            );
        }

        if (!session.isActive) {
            return NextResponse.json(
                { success: false, error: 'Cannot edit inactive session' },
                { status: 400 }
            );
        }

        // Save all reviews
        const savePromises = reviews.map((review: any) =>
            prisma.modulReview.upsert({
                where: {
                    sessionId_moduleId: {
                        sessionId: sessionIdNum,
                        moduleId: review.moduleId
                    }
                },
                create: {
                    blueprintId,
                    sessionId: sessionIdNum,
                    moduleId: review.moduleId,
                    reviewComment: review.reviewComment || null
                },
                update: {
                    reviewComment: review.reviewComment || null,
                    updatedAt: new Date()
                }
            })
        );

        await Promise.all(savePromises);

        // If createSnapshot, mark current session as inactive and create new active session
        if (createSnapshot) {
            await prisma.modulReviewSession.update({
                where: { id: sessionIdNum },
                data: {
                    isActive: false,
                    sessionName: session.sessionName || `Review ${new Date().toLocaleDateString('id-ID')}`,
                    updatedAt: new Date()
                }
            });

            // Create new active session
            await prisma.modulReviewSession.create({
                data: {
                    blueprintId,
                    sessionName: `Review ${new Date().toLocaleDateString('id-ID')}`,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Reviews saved successfully'
        });

    } catch (error) {
        console.error('[Review Session Save POST] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save reviews' },
            { status: 500 }
        );
    }
}
