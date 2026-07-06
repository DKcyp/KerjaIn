export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession, hasPermission } from '@/lib/auth';

// GET /api/region/[id] -> get single region
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await hasPermission(session.user.id, 'region.read'))) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }

        const regionId = Number(id);
        if (isNaN(regionId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        const region = await prisma.region.findUnique({
            where: { id: regionId },
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

        if (!region) {
            return NextResponse.json({ error: 'Region not found' }, { status: 404 });
        }

        return NextResponse.json({ item: region });
    } catch (e) {
        console.error('GET /api/region/[id] error', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// PUT /api/region/[id] -> update region
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await hasPermission(session.user.id, 'region.update'))) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }

        const regionId = Number(id);
        if (isNaN(regionId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
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

        // Check if region exists
        const existing = await prisma.region.findUnique({
            where: { id: regionId },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Region not found' }, { status: 404 });
        }

        // Validate PIC exists
        const picExists = await prisma.pegawai.findUnique({
            where: { id: Number(picId) },
        });

        if (!picExists) {
            return NextResponse.json({ error: 'PIC (Pegawai) not found' }, { status: 404 });
        }

        // Check for duplicate kode (excluding current region)
        if (kode !== existing.kode) {
            const duplicateKode = await prisma.region.findUnique({
                where: { kode },
            });

            if (duplicateKode) {
                return NextResponse.json({ error: 'Kode region already exists' }, { status: 409 });
            }
        }

        const updated = await prisma.region.update({
            where: { id: regionId },
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

        return NextResponse.json({ item: updated });
    } catch (e) {
        console.error('PUT /api/region/[id] error', e);
        const code = (e as any)?.code;
        if (code === 'P2002') {
            return NextResponse.json({ error: 'Kode region already exists' }, { status: 409 });
        }
        if (code === 'P2003') {
            return NextResponse.json({ error: 'Invalid PIC reference' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// DELETE /api/region/[id] -> delete region
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await hasPermission(session.user.id, 'region.delete'))) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }

        const regionId = Number(id);
        if (isNaN(regionId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        // Check if region exists
        const existing = await prisma.region.findUnique({
            where: { id: regionId },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Region not found' }, { status: 404 });
        }

        await prisma.region.delete({
            where: { id: regionId },
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('DELETE /api/region/[id] error', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
