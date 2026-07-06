import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession, hasPermission } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/region/[id]/members - List all members of a region
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const canRead = await hasPermission(session.user.id, 'region.read');
        if (!canRead) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await context.params;
        const regionId = parseInt(id);

        if (isNaN(regionId)) {
            return NextResponse.json({ error: 'Invalid region ID' }, { status: 400 });
        }

        const members = await prisma.regionMember.findMany({
            where: { regionId },
            include: {
                pegawai: {
                    select: {
                        id: true,
                        namaLengkap: true,
                        noHp: true,
                        role: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        return NextResponse.json({ items: members });
    } catch (error) {
        console.error('Error fetching region members:', error);
        return NextResponse.json(
            { error: 'Failed to fetch region members' },
            { status: 500 }
        );
    }
}

// POST /api/region/[id]/members - Add a member to region
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const canUpdate = await hasPermission(session.user.id, 'region.update');
        if (!canUpdate) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await context.params;
        const regionId = parseInt(id);

        if (isNaN(regionId)) {
            return NextResponse.json({ error: 'Invalid region ID' }, { status: 400 });
        }

        const body = await request.json();
        const { pegawaiId } = body;

        if (!pegawaiId) {
            return NextResponse.json({ error: 'pegawaiId is required' }, { status: 400 });
        }

        // Check if region exists
        const region = await prisma.region.findUnique({
            where: { id: regionId }
        });

        if (!region) {
            return NextResponse.json({ error: 'Region not found' }, { status: 404 });
        }

        // Check if pegawai exists
        const pegawai = await prisma.pegawai.findUnique({
            where: { id: pegawaiId }
        });

        if (!pegawai) {
            return NextResponse.json({ error: 'Pegawai not found' }, { status: 404 });
        }

        // Check if already member
        const existing = await prisma.regionMember.findUnique({
            where: {
                regionId_pegawaiId: {
                    regionId,
                    pegawaiId
                }
            }
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Pegawai is already a member of this region' },
                { status: 409 }
            );
        }

        // Add member
        const member = await prisma.regionMember.create({
            data: {
                regionId,
                pegawaiId
            },
            include: {
                pegawai: {
                    select: {
                        id: true,
                        namaLengkap: true,
                        noHp: true,
                        role: true,
                    }
                }
            }
        });

        return NextResponse.json({ item: member }, { status: 201 });
    } catch (error) {
        console.error('Error adding region member:', error);
        return NextResponse.json(
            { error: 'Failed to add region member' },
            { status: 500 }
        );
    }
}
