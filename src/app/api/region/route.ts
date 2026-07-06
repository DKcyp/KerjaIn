export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession, hasPermission } from '@/lib/auth';

// GET /api/region -> list all regions with PIC details
export async function GET() {
    try {
        // Check authentication and permissions
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await hasPermission(session.user.id, 'region.read'))) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }

        const regions = await prisma.region.findMany({
            include: {
                pic: {
                    select: {
                        id: true,
                        namaLengkap: true,
                        noHp: true,
                        role: true,
                    },
                },
            },
            orderBy: { kode: 'asc' },
        });

        return NextResponse.json({ items: regions });
    } catch (e) {
        console.error('GET /api/region error', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// POST /api/region -> create new region
export async function POST(req: Request) {
    try {
        // Check authentication and permissions
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await hasPermission(session.user.id, 'region.create'))) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }

        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const kode = String(body?.kode || '').trim();
        const nama = String(body?.nama || '').trim();
        const picId = body?.picId;

        if (!kode || !nama || !picId) {
            return NextResponse.json({ error: 'kode, nama, and picId are required' }, { status: 400 });
        }

        // Validate PIC exists
        const picExists = await prisma.pegawai.findUnique({
            where: { id: Number(picId) },
        });

        if (!picExists) {
            return NextResponse.json({ error: 'PIC (Pegawai) not found' }, { status: 404 });
        }

        // Check for duplicate kode
        const existingKode = await prisma.region.findUnique({
            where: { kode },
        });

        if (existingKode) {
            return NextResponse.json({ error: 'Kode region already exists' }, { status: 409 });
        }

        const created = await prisma.region.create({
            data: {
                kode,
                nama,
                picId: Number(picId),
            },
            include: {
                pic: {
                    select: {
                        id: true,
                        namaLengkap: true,
                        noHp: true,
                        role: true,
                    },
                },
            },
        });

        return NextResponse.json({ item: created });
    } catch (e) {
        console.error('POST /api/region error', e);
        console.error('Error details:', {
            message: (e as any)?.message,
            code: (e as any)?.code,
            meta: (e as any)?.meta,
            stack: (e as any)?.stack
        });
        const code = (e as any)?.code;
        if (code === 'P2002') {
            return NextResponse.json({ error: 'Kode region already exists' }, { status: 409 });
        }
        if (code === 'P2003') {
            return NextResponse.json({ error: 'Invalid PIC reference' }, { status: 400 });
        }
        return NextResponse.json({
            error: 'Server error',
            details: process.env.NODE_ENV === 'development' ? (e as any)?.message : undefined
        }, { status: 500 });
    }
}
