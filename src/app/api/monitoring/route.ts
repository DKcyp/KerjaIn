
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
    try {
        // const session = await getServerSession();
        // const user = session?.user;

        // if (!user) {
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        const { searchParams } = new URL(request.url);
        const projectIdsParam = searchParams.get('projectIds');

        const whereCondition: Prisma.TasklistWhereInput = {};

        // Role based constraints - REMOVED per user request to show all projects
        // let allowedProjectIds: number[] | null = null;
        // if (user.role === 'PM') {
        // Logic removed
        // }

        // If no project filter is provided, return empty data
        if (!projectIdsParam) {
            return NextResponse.json({
                totalTasks: 0,
                listTasks: [],
                pmCounts: [],
                programmerCounts: []
            });
        }

        const projectIds = projectIdsParam.split(',').map(Number).filter(n => !isNaN(n));
        if (projectIds.length === 0) {
            return NextResponse.json({
                totalTasks: 0,
                listTasks: [],
                pmCounts: [],
                programmerCounts: []
            });
        }

        whereCondition.projectId = { in: projectIds };
        // Only count tasks that haven't been approved by PM yet (exclude SELESAI)
        whereCondition.status = { not: 'SELESAI' };

        // 1. Total Tasklist Count - All tasks that haven't been approved by PM
        const totalTasks = await prisma.tasklist.count({
            where: whereCondition,
        });

        // 2. List Tasklist (Fetch details for table manualy)
        const rawTasks = await prisma.tasklist.findMany({
            where: whereCondition,
            select: {
                id: true,
                kode: true,
                keterangan: true,
                status: true,
                pegawaiId: true,
                projectId: true,
                moduleId: true,
                startedAt: true,
                assigneeWorkDeadline: true,
                totalDurationMinutes: true,
                scheduleAt: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: 200,
        });

        // Collect IDs for manual join
        const userIds = [...new Set(rawTasks.map(t => t.pegawaiId))];
        const projIds = [...new Set(rawTasks.map(t => t.projectId))];
        const modIds = [...new Set(rawTasks.map(t => t.moduleId))];

        const users = await prisma.pegawai.findMany({
            where: { id: { in: userIds } },
            select: { id: true, namaLengkap: true }
        });

        const projs = await prisma.proyek.findMany({
            where: { id: { in: projIds } },
            select: { id: true, namaProyek: true }
        });

        const mods = await prisma.proyekModule.findMany({
            where: { id: { in: modIds } },
            select: { id: true, nama: true }
        });

        const listTasks = rawTasks.map(t => {
            const user = users.find(u => u.id === t.pegawaiId);
            const proj = projs.find(p => p.id === t.projectId);
            const mod = mods.find(m => m.id === t.moduleId);

            return {
                id: t.id,
                kode: t.kode,
                keterangan: t.keterangan || '',
                status: t.status,
                startDate: t.startedAt,
                scheduleDate: t.scheduleAt,
                endDate: t.assigneeWorkDeadline,
                duration: t.totalDurationMinutes,
                pegawai: {
                    namaLengkap: user?.namaLengkap || 'Unknown',
                },
                module: {
                    nama: mod?.nama || 'Unknown',
                    project: {
                        namaProyek: proj?.namaProyek || 'Unknown',
                    }
                }
            };
        });

        // Sort by Project Name
        listTasks.sort((a, b) => {
            const nameA = a.module.project.namaProyek.toLowerCase();
            const nameB = b.module.project.namaProyek.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        // Logic 2: Total Tasklist PM (this was used for a single total, now we calculate individual PM counts below)
        // Count: Tasks assigned to PM + Tasks waiting for PM review
        // const pmUsers = await prisma.pegawai.findMany({
        //     where: { role: 'PM' },
        //     select: { id: true }
        // });
        // const pmIds = pmUsers.map(u => u.id);

        // const pmTaskCount = await prisma.tasklist.count({
        //     where: {
        //         ...whereCondition,
        //         OR: [
        //             { pegawaiId: { in: pmIds } },
        //             { status: 'MENUNGGU_REVIEW_PM' }
        //         ]
        //     }
        // });

        // Logic 3: Programmer Task Counts
        let progUsers: { id: number; namaLengkap: string }[] = [];

        // Logic 4: Fetch PM Counts (Dynamic cards per PM)
        type PMCount = {
            id: number;
            name: string;
            count: number;
        };
        let pmCounts: PMCount[] = [];
        let targetProjectIds: number[] = [];

        if (whereCondition.projectId && typeof whereCondition.projectId === 'object' && 'in' in whereCondition.projectId) {
            targetProjectIds = whereCondition.projectId.in as number[];
        } else if (typeof whereCondition.projectId === 'number') {
            targetProjectIds = [whereCondition.projectId];
        }

        // Show only PMs from selected projects
        const teamMembers = await prisma.proyekTeam.findMany({
            where: {
                projectId: { in: targetProjectIds },
            },
            select: {
                pegawaiId: true,
                projectId: true,
            }
        });

        // Get unique pegawai IDs from team members
        const teamPegawaiIds = [...new Set(teamMembers.map(t => t.pegawaiId))];
        
        // Get pegawai details for team members
        const teamPegawai = await prisma.pegawai.findMany({
            where: {
                id: { in: teamPegawaiIds },
                role: 'PM'
            },
            select: {
                id: true,
                namaLengkap: true,
                role: true,
            }
        });

        // Create a map of pegawai for easy lookup
        const pegawaiMap = new Map(teamPegawai.map(p => [p.id, p]));

        // Filter team members who are PMs
        const pmMembers = teamMembers.filter(t => pegawaiMap.has(t.pegawaiId));

        // Get distinct PMs
        const distinctPMs = [];
        const seenPmIds = new Set();
        for (const m of pmMembers) {
            if (!seenPmIds.has(m.pegawaiId)) {
                const pegawai = pegawaiMap.get(m.pegawaiId);
                if (pegawai) {
                    distinctPMs.push(pegawai);
                    seenPmIds.add(m.pegawaiId);
                }
            }
        }

        // Calculate counts for each PM
        // REQUIREMENT: Tasks assigned to PM themselves + Tasks waiting for PM review - based on selected projects
        for (const pm of distinctPMs) {
            // Find all projects in the *current selection* where this user is PM
            const myProjectIds = pmMembers
                .filter(m => m.pegawaiId === pm.id)
                .map(m => m.projectId);

            const count = await prisma.tasklist.count({
                where: {
                    AND: [
                        whereCondition, // Already includes selected projects filter
                        {
                            OR: [
                                { pegawaiId: pm.id }, // Tasks assigned to this PM
                                {
                                    projectId: { in: myProjectIds }, // In PM's projects
                                    status: 'MENUNGGU_REVIEW_PM' // Waiting for PM review
                                }
                            ]
                        }
                    ]
                }
            });

            pmCounts.push({
                id: pm.id,
                name: pm.namaLengkap,
                count
            });
        }

        // Logic 3: Programmer Task Counts
        // Show only programmers from selected projects
        const progTeamMembers = await prisma.proyekTeam.findMany({
            where: {
                projectId: { in: targetProjectIds },
            },
            select: {
                pegawaiId: true
            }
        });
        const uniquePegawaiIds = [...new Set(progTeamMembers.map(t => t.pegawaiId))];

        if (uniquePegawaiIds.length > 0) {
            progUsers = await prisma.pegawai.findMany({
                where: {
                    id: { in: uniquePegawaiIds },
                    role: 'PROGRAMMER'
                },
                select: { id: true, namaLengkap: true },
                orderBy: { namaLengkap: 'asc' }
            });
        }

        const progIds = progUsers.map(u => u.id);

        // Logic 3: Programmer Task Counts
        // REQUIREMENT: Tasks with status "belum dikerjakan" + "sedang dikerjakan" + "paused" - based on selected projects
        // Status: MENUNGGU_PROSES_USER (belum dikerjakan) + SEDANG_DIPROSES_USER (sedang dikerjakan) + SEDANG_DIPROSES_USER_PAUSED (paused)
        // Excludes: tasks waiting for PM review, and completed tasks
        
        const grouped = await prisma.tasklist.groupBy({
            by: ['pegawaiId'],
            where: {
                ...whereCondition, // Already includes selected projects filter
                pegawaiId: { in: progIds }, // Only programmers from selected projects
                status: {
                    in: ['MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED']
                }
            },
            _count: {
                id: true
            },
        });

        // Map all relevant programmers, filling in 0 for those with no tasks
        const programmerCounts = progUsers.map(prog => {
            const group = grouped.find(g => g.pegawaiId === prog.id);
            return {
                id: prog.id,
                name: prog.namaLengkap,
                count: group?._count.id || 0
            };
        });

        return NextResponse.json({
            totalTasks,
            listTasks,
            pmCounts,
            programmerCounts
        });

    } catch (error) {
        console.error('Error fetching monitoring data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
