export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession, hasPermission } from '@/lib/auth';

// GET /api/programmer-status -> list programmer statuses based on active tasks
export async function GET() {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await hasPermission(session.user.id, 'programmer_status.read'))) {
            // return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }

        // Calculate status based on active tasks with priority
        // Priority 1: Work (SEDANG_DIPROSES_USER, SEDANG_DIPROSES_USER_PAUSED)
        // Priority 2: OnList (MENUNGGU_PROSES_USER, MENUNGGU_REVIEW_PM)
        // Default: Free
        
        const tasks = await prisma.tasklist.groupBy({
            by: ['pegawaiId', 'status'],
            where: {
                status: {
                    in: [
                        'SEDANG_DIPROSES_USER', 
                        'SEDANG_DIPROSES_USER_PAUSED', 
                        'MENUNGGU_PROSES_USER', 
                        'MENUNGGU_REVIEW_PM'
                    ]
                }
            },
            _count: {
                _all: true
            }
        });

        // Process results to determine status per programmer
        const statusMap = new Map<number, string>();
        const notesMap = new Map<number, string[]>();

        tasks.forEach(t => {
            const pid = t.pegawaiId;
            const status = t.status;
            const count = t._count._all;

            // Initialize if not exists
            if (!statusMap.has(pid)) {
                statusMap.set(pid, 'Free');
                notesMap.set(pid, []);
            }

            // Add to notes
            notesMap.get(pid)?.push(`${status}: ${count}`);

            const currentStatus = statusMap.get(pid);

            // Logic determination
            if (status === 'SEDANG_DIPROSES_USER' || status === 'SEDANG_DIPROSES_USER_PAUSED') {
                // Always upgrade to Work
                statusMap.set(pid, 'Work');
            } else if (
                (status === 'MENUNGGU_PROSES_USER' || status === 'MENUNGGU_REVIEW_PM') && 
                currentStatus !== 'Work'
            ) {
                // Set to OnList only if not already Work
                statusMap.set(pid, 'OnList');
            }
        });

        // Convert map to array
        const statuses = Array.from(statusMap.entries()).map(([programmerId, status]) => ({
            id: 0,
            programmerId,
            status,
            notes: notesMap.get(programmerId)?.join(', '),
            updatedBy: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }));

        return NextResponse.json({ items: statuses });
    } catch (e) {
        console.error('GET /api/programmer-status error', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// POST /api/programmer-status -> create or update programmer status
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await hasPermission(session.user.id, 'programmer_status.create'))) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }

        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const programmerId = Number(body?.programmerId);
        const status = String(body?.status || '').trim();
        const notes = body?.notes ? String(body.notes).trim() : null;

        if (!programmerId || !status) {
            return NextResponse.json({ error: 'programmerId and status are required' }, { status: 400 });
        }

        // Validate programmer exists
        const programmer = await prisma.pegawai.findUnique({
            where: { id: programmerId },
        });

        if (!programmer) {
            return NextResponse.json({ error: 'Programmer not found' }, { status: 404 });
        }

        // Check if status already exists
        const existing = await prisma.programmerStatus.findUnique({
            where: { programmerId },
        });

        let result;
        let oldStatus = existing?.status || null;

        if (existing) {
            // Update existing status
            result = await prisma.programmerStatus.update({
                where: { programmerId },
                data: {
                    status,
                    notes,
                    updatedBy: session.user.id,
                },
                include: {
                    programmer: {
                        select: {
                            id: true,
                            namaLengkap: true,
                            noHp: true,
                            role: true,
                        },
                    },
                },
            });

            // Create log entry
            await prisma.programmerStatusLog.create({
                data: {
                    statusId: result.id,
                    programmerId,
                    oldStatus,
                    newStatus: status,
                    notes,
                    changedBy: session.user.id,
                },
            });
        } else {
            // Create new status
            result = await prisma.programmerStatus.create({
                data: {
                    programmerId,
                    status,
                    notes,
                    updatedBy: session.user.id,
                },
                include: {
                    programmer: {
                        select: {
                            id: true,
                            namaLengkap: true,
                            noHp: true,
                            role: true,
                        },
                    },
                },
            });

            // Create initial log entry
            await prisma.programmerStatusLog.create({
                data: {
                    statusId: result.id,
                    programmerId,
                    oldStatus: null,
                    newStatus: status,
                    notes,
                    changedBy: session.user.id,
                },
            });
        }

        return NextResponse.json({ item: result });
    } catch (e) {
        console.error('POST /api/programmer-status error', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
