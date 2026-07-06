import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/blueprint/[id]/review-sessions
// Fetch all review sessions for a blueprint
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

        // Get all sessions for this blueprint
        const sessions = await prisma.modulReviewSession.findMany({
            where: { blueprintId },
            orderBy: [
                { isActive: 'desc' }, // Active session first
                { createdAt: 'desc' }  // Then by newest
            ],
            include: {
                _count: {
                    select: { reviews: true }
                }
            }
        });

        // Auto-create default session if none exists
        if (sessions.length === 0) {
            const newSession = await prisma.modulReviewSession.create({
                data: {
                    blueprintId,
                    sessionName: null,
                    isActive: true,
                    createdBy: null
                },
                include: {
                    _count: {
                        select: { reviews: true }
                    }
                }
            });
            sessions.push(newSession);
        }

        // Transform to include review count
        const sessionsData = sessions.map(session => ({
            id: session.id,
            sessionName: session.sessionName || (session.isActive ? 'Review Aktif' : `Review ${new Date(session.createdAt).toLocaleDateString('id-ID')}`),
            isActive: session.isActive,
            createdAt: session.createdAt,
            reviewCount: session._count.reviews
        }));

        return NextResponse.json({
            success: true,
            data: {
                sessions: sessionsData
            }
        });
    } catch (error) {
        console.error('[Review Sessions GET] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch review sessions' },
            { status: 500 }
        );
    }
}

// POST /api/blueprint/[id]/review-sessions
// Create a new review session
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const blueprintId = parseInt(id);
        const body = await request.json();
        const { sessionName, createdBy } = body;

        if (isNaN(blueprintId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid blueprint ID' },
                { status: 400 }
            );
        }

        // Create new session
        const session = await prisma.modulReviewSession.create({
            data: {
                blueprintId,
                sessionName: sessionName || null,
                isActive: true,
                createdBy: createdBy || null
            }
        });

        return NextResponse.json({
            success: true,
            data: session
        });
    } catch (error) {
        console.error('[Review Sessions POST] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create review session' },
            { status: 500 }
        );
    }
}
