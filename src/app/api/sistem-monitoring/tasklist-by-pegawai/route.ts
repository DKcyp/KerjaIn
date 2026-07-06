import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const pegawaiId = searchParams.get('pegawaiId');
        const projectIdsParam = searchParams.get('projectIds');
        const pegawaiName = searchParams.get('pegawaiName');

        if (!pegawaiId || !projectIdsParam) {
            return NextResponse.json(
                { error: 'pegawaiId and projectIds parameters are required' },
                { status: 400 }
            );
        }

        // Parse project IDs
        const projectIds = projectIdsParam.split(',').map(id => parseInt(id));

        const session = await getServerSession();
        
        // Fetch tasklist untuk pegawai ini di project-project team
        const tasklists = await prisma.tasklist.findMany({
            where: {
                pegawaiId: parseInt(pegawaiId),
                projectId: { in: projectIds },
                depId: session?.user?.departemenId ?? null
            },
            include: {
                module: {
                    select: {
                        nama: true,
                        kode: true
                    }
                }
            },
            orderBy: {
                scheduleAt: 'desc'
            },
            take: 100 // Limit untuk performa
        });

        // Fetch project info untuk setiap tasklist
        const tasklistsWithDetails = await Promise.all(
            tasklists.map(async (task) => {
                const project = await prisma.proyek.findUnique({
                    where: { id: task.projectId },
                    select: {
                        namaProyek: true,
                        kodeProyek: true
                    }
                });

                // Hitung selisih waktu
                let selisih = '-';
                if (task.assigneeStartTaskDeadline && task.assigneeWorkDeadline) {
                    const diffMs = task.assigneeWorkDeadline.getTime() - task.assigneeStartTaskDeadline.getTime();
                    const diffHours = diffMs / (1000 * 60 * 60);
                    selisih = `${diffHours.toFixed(1)} Jam`;
                }

                // Status badge color
                let statusColor = 'bg-yellow-100 text-yellow-800';
                if (task.status === 'SELESAI') {
                    statusColor = 'bg-green-100 text-green-800';
                } else if (task.status === 'SEDANG_DIPROSES_USER') {
                    statusColor = 'bg-blue-100 text-blue-800';
                } else if (task.status === 'MENUNGGU_REVIEW_PM') {
                    statusColor = 'bg-purple-100 text-purple-800';
                }

                return {
                    id: task.id,
                    kode: task.kode,
                    namaProyek: project?.namaProyek || '-',
                    kodeProyek: project?.kodeProyek || '-',
                    namaModule: task.module?.nama || '-',
                    status: task.status,
                    statusColor: statusColor,
                    jadwalPengerjaan: task.assigneeStartTaskDeadline && task.assigneeWorkDeadline
                        ? `${new Date(task.assigneeStartTaskDeadline).toLocaleString('id-ID')} - ${new Date(task.assigneeWorkDeadline).toLocaleString('id-ID')}`
                        : '-',
                    aktualPengerjaan: task.startedAt
                        ? `${new Date(task.startedAt).toLocaleString('id-ID')} - ${task.status === 'SELESAI' ? 'Selesai' : 'Ongoing'}`
                        : '-',
                    selisih: selisih,
                    keterangan: task.keterangan || task.programmerDescription || '-',
                    complexity: task.taskComplexity
                };
            })
        );

        // Hitung statistik
        const totalCompleted = tasklistsWithDetails.filter(t => t.status === 'SELESAI').length;
        const totalInProgress = tasklistsWithDetails.filter(t => t.status === 'SEDANG_DIPROSES_USER').length;
        const totalReview = tasklistsWithDetails.filter(t => t.status === 'MENUNGGU_REVIEW_PM').length;

        return NextResponse.json({
            success: true,
            pegawaiName: pegawaiName || 'Pegawai',
            totalTasks: tasklistsWithDetails.length,
            statistics: {
                completed: totalCompleted,
                inProgress: totalInProgress,
                review: totalReview
            },
            data: tasklistsWithDetails
        });

    } catch (error) {
        console.error('Error fetching pegawai tasklist:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pegawai tasklist' },
            { status: 500 }
        );
    }
}
