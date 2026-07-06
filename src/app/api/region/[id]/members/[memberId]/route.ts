import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession, hasPermission } from '@/lib/auth';

const prisma = new PrismaClient();

// DELETE /api/region/[id]/members/[memberId] - Remove a member from region
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string; memberId: string }> }
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

        const { memberId } = await context.params;
        const memberIdNum = parseInt(memberId);

        if (isNaN(memberIdNum)) {
            return NextResponse.json({ error: 'Invalid member ID' }, { status: 400 });
        }

        // Check if member exists
        const member = await prisma.regionMember.findUnique({
            where: { id: memberIdNum }
        });

        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        // Delete member
        await prisma.regionMember.delete({
            where: { id: memberIdNum }
        });

        return NextResponse.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Error removing region member:', error);
        return NextResponse.json(
            { error: 'Failed to remove region member' },
            { status: 500 }
        );
    }
}
