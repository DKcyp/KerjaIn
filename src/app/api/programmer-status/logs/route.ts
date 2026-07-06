export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession, hasPermission } from '@/lib/auth';

// GET /api/programmer-status/logs -> get all status change logs
export async function GET(req: Request) {
        const session = await getServerSession();
        // Get query params
        const { searchParams } = new URL(req.url);
        const programmerId = searchParams.get('programmerId');

        const where: any = {};
        if (programmerId) {
            where.programmerId = Number(programmerId);
        }

        const logs = await prisma.programmerStatusLog.findMany({
            where,
            include: {
                programmer: {
                    select: {
                        id: true,
                        namaLengkap: true,
                    },
                },
                changer: {
                    select: {
                        id: true,
                        namaLengkap: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100, // Limit to last 100 logs
        });

        return NextResponse.json({ items: logs });
}
