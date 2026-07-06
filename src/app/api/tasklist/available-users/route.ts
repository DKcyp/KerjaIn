import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/tasklist/available-users
// Returns available users for tasklist assignment based on project type
// - SUPPORT projects: ProyekTeam members + All PMs
// - Other projects: ProyekTeam members only
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectIdStr = searchParams.get('projectId');
        const requesterIdStr = searchParams.get('requesterId');

        if (!projectIdStr) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        const projectId = parseInt(projectIdStr);
        if (isNaN(projectId)) {
            return NextResponse.json(
                { error: 'Invalid projectId' },
                { status: 400 }
            );
        }

        const requesterId = requesterIdStr ? parseInt(requesterIdStr) : null;

        // Get project with type
        const project = await prisma.proyek.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                namaProyek: true,
                type: true,
            },
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        // Check if project has region team (for DEV projects with optional region support)
        const hasRegionTeam = await prisma.proyekTeam.findFirst({
            where: {
                projectId,
                teamSource: 'region'
            }
        });

        // For non-SUPPORT/DEV projects (or DEV without region), return team members only
        if (project.type !== 'SUPPORT' && !(project.type === 'DEVELOPMENT' && hasRegionTeam)) {
            const teamMemberIds = await prisma.proyekTeam.findMany({
                where: { projectId },
                select: { pegawaiId: true },
            });

            const ids = teamMemberIds.map(t => t.pegawaiId);

            const teamMembers = ids.length > 0
                ? await prisma.pegawai.findMany({
                    where: { id: { in: ids } },
                    select: { id: true, namaLengkap: true },
                })
                : [];

            return NextResponse.json({
                projectId: project.id,
                projectName: project.namaProyek,
                projectType: project.type,
                users: teamMembers.map(u => ({ ...u, source: 'team' })),
            });
        }

        // SUPPORT/DEV project with region - check requester role
        if (!requesterId) {
            // No requester specified, return all team (fallback)
            const teamMemberIds = await prisma.proyekTeam.findMany({
                where: { projectId },
                select: { pegawaiId: true },
            });

            const ids = teamMemberIds.map(t => t.pegawaiId);

            const teamMembers = ids.length > 0
                ? await prisma.pegawai.findMany({
                    where: { id: { in: ids } },
                    select: { id: true, namaLengkap: true },
                })
                : [];

            return NextResponse.json({
                projectId: project.id,
                projectName: project.namaProyek,
                projectType: project.type,
                users: teamMembers.map(u => ({ ...u, source: 'team' })),
            });
        }

        // Check if requester is inherited PM
        const pmEntry = await prisma.proyekTeam.findFirst({
            where: {
                projectId,
                pegawaiId: requesterId,
                teamSource: 'inherited',
            },
        });

        if (pmEntry) {
            // Check if jabatan contains both PM and PIC (merged role)
            const isDualRole = pmEntry.jabatan.includes('PM') && pmEntry.jabatan.includes('PIC');

            if (isDualRole) {
                // PM & PIC → return ALL team members
                console.log(`✅ PM ${requesterId} has dual role (PM & PIC) - can assign to all team members`);

                const teamMembers = await prisma.proyekTeam.findMany({
                    where: {
                        projectId,
                        teamSource: { in: ['region', 'inherited'] },
                    },
                    select: {
                        pegawaiId: true,
                        jabatan: true
                    },
                });

                const ids = teamMembers.map(t => t.pegawaiId);

                const pegawaiData = ids.length > 0
                    ? await prisma.pegawai.findMany({
                        where: { id: { in: ids } },
                        select: { id: true, namaLengkap: true },
                    })
                    : [];

                // Merge pegawai with jabatan
                const allMembers = pegawaiData.map(p => {
                    const teamEntry = teamMembers.find(t => t.pegawaiId === p.id);
                    return {
                        id: p.id,
                        namaLengkap: p.namaLengkap,
                        jabatan: teamEntry?.jabatan || 'Unknown'
                    };
                });

                return NextResponse.json({
                    projectId: project.id,
                    projectName: project.namaProyek,
                    projectType: project.type,
                    requesterRole: 'pm_and_pic',
                    users: allMembers.map(u => ({ ...u, source: 'all' })),
                });
            }

            // Inherited PM only (not PIC): return subordinates from hierarchy + PM themselves
            const subordinateIds = await prisma.teamHierarchy.findMany({
                where: {
                    projectId,
                    managerId: requesterId,
                    isActive: true,
                },
                select: { memberId: true },
            });

            const ids = subordinateIds.map(s => s.memberId);

            // Add PM themselves to the list
            if (!ids.includes(requesterId)) {
                ids.push(requesterId);
            }

            // Get jabatan from ProyekTeam
            const teamMembers = await prisma.proyekTeam.findMany({
                where: {
                    projectId,
                    pegawaiId: { in: ids }
                },
                select: { pegawaiId: true, jabatan: true }
            });

            const pegawaiData = ids.length > 0
                ? await prisma.pegawai.findMany({
                    where: { id: { in: ids } },
                    select: { id: true, namaLengkap: true },
                })
                : [];

            // Merge pegawai with jabatan
            const subordinates = pegawaiData.map(p => {
                const teamEntry = teamMembers.find(t => t.pegawaiId === p.id);
                return {
                    id: p.id,
                    namaLengkap: p.namaLengkap,
                    jabatan: teamEntry?.jabatan || 'Programmer'
                };
            });

            console.log(`✅ Inherited PM ${requesterId} can assign to ${subordinates.length} users (${subordinateIds.length} subordinates + PM themselves)`);

            return NextResponse.json({
                projectId: project.id,
                projectName: project.namaProyek,
                projectType: project.type,
                requesterRole: 'inherited_pm',
                users: subordinates.map(u => ({ ...u, source: 'hierarchy' })),
            });
        }

        // PIC or region member: return region team + inherited PMs (exclude inherited Programmers)
        const teamMembersWithJabatan = await prisma.proyekTeam.findMany({
            where: {
                projectId,
                OR: [
                    // All region members (PIC, Programmers)
                    { teamSource: 'region' },
                    // Inherited PMs only (not inherited Programmers)
                    {
                        AND: [
                            { teamSource: 'inherited' },
                            { jabatan: { contains: 'PM' } }
                        ]
                    },
                    // Direct members (manually assigned)
                    { teamSource: 'direct' },
                    // Handle legacy/null
                    { teamSource: null }
                ]
            },
            select: {
                pegawaiId: true,
                jabatan: true
            },
        });

        const ids = teamMembersWithJabatan.map(t => t.pegawaiId);

        const pegawaiData = ids.length > 0
            ? await prisma.pegawai.findMany({
                where: { id: { in: ids } },
                select: { id: true, namaLengkap: true },
            })
            : [];

        // Merge pegawai with jabatan
        const teamMembers = pegawaiData.map(p => {
            const teamEntry = teamMembersWithJabatan.find(t => t.pegawaiId === p.id);
            return {
                id: p.id,
                namaLengkap: p.namaLengkap,
                jabatan: teamEntry?.jabatan || 'Unknown'
            };
        });

        console.log(`✅ PIC/Region member can assign to ${teamMembers.length} users (region team + inherited PMs, excluding inherited Programmers)`);

        return NextResponse.json({
            projectId: project.id,
            projectName: project.namaProyek,
            projectType: project.type,
            requesterRole: 'pic_or_region',
            users: teamMembers.map(u => ({ ...u, source: 'team' })),
        });
    } catch (error) {
        console.error('Error fetching available users:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
