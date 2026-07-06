import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const projectIdsParam = searchParams.get('projectIds');
        const projectName = searchParams.get('projectName');

        if (!projectIdsParam) {
            return NextResponse.json(
                { error: 'projectIds parameter is required' },
                { status: 400 }
            );
        }

        // Parse project IDs (bisa single atau multiple untuk group)
        const projectIds = projectIdsParam.split(',').map(id => parseInt(id));

        const session = await getServerSession();

        // Fetch tasklist dengan relasi
        const tasklists = await prisma.tasklist.findMany({
            where: {
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

        // Fetch pegawai info untuk setiap tasklist
        const tasklistsWithDetails = await Promise.all(
            tasklists.map(async (task) => {
                const pegawai = await prisma.pegawai.findUnique({
                    where: { id: task.pegawaiId },
                    select: {
                        namaLengkap: true
                    }
                });

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

                return {
                    id: task.id,
                    kode: task.kode,
                    namaProyek: project?.namaProyek || '-',
                    kodeProyek: project?.kodeProyek || '-',
                    namaModule: task.module?.nama || '-',
                    namaPegawai: pegawai?.namaLengkap || '-',
                    status: task.status,
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

        return NextResponse.json({
            success: true,
            projectName: projectName || 'Project',
            totalTasks: tasklistsWithDetails.length,
            data: tasklistsWithDetails
        });

    } catch (error) {
        console.error('Error fetching tasklist:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tasklist' },
            { status: 500 }
        );
    }
}
