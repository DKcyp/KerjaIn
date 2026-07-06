import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const statusType = searchParams.get('statusType');
        const projectIdsParam = searchParams.get('projectIds');

        if (!statusType) {
            return NextResponse.json(
                { error: 'statusType parameter is required' },
                { status: 400 }
            );
        }

        let whereCondition: any = {};

        // Parse project IDs jika ada (untuk filter by team)
        const projectIds = projectIdsParam 
            ? projectIdsParam.split(',').map(id => parseInt(id))
            : undefined;

        const session = await getServerSession();
        const baseWhere = {
            depId: session?.user?.departemenId ?? null,
            ...(projectIds && { projectId: { in: projectIds } })
        };

        // Tentukan filter berdasarkan status type
        switch (statusType) {
            case 'Menunggu Proses':
                whereCondition = { 
                    ...baseWhere,
                    status: 'MENUNGGU_PROSES_USER'
                };
                break;
            case 'Sedang Proses':
                whereCondition = { 
                    ...baseWhere,
                    status: 'SEDANG_DIPROSES_USER'
                };
                break;
            case 'Menunggu Review':
                whereCondition = { 
                    ...baseWhere,
                    status: 'MENUNGGU_REVIEW_PM'
                };
                break;
            case 'Selesai Tepat Waktu':
                // Status SELESAI dan assigneeWorkDeadline ada
                whereCondition = {
                    ...baseWhere,
                    status: 'SELESAI',
                    assigneeWorkDeadline: { not: null }
                };
                break;
            case 'Selesai Terlambat':
                // Status SELESAI dan assigneeWorkDeadline ada
                whereCondition = {
                    ...baseWhere,
                    status: 'SELESAI',
                    assigneeWorkDeadline: { not: null }
                };
                break;
            default:
                return NextResponse.json(
                    { error: 'Invalid statusType' },
                    { status: 400 }
                );
        }

        // Fetch tasklist berdasarkan kondisi
        const tasklists = await prisma.tasklist.findMany({
            where: whereCondition,
            include: {
                module: {
                    select: {
                        nama: true,
                        kode: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            },
            take: 100 // Limit untuk performa
        });

        // Filter manual untuk selesai tepat waktu vs terlambat
        let filteredTasklists = tasklists;
        if (statusType === 'Selesai Tepat Waktu') {
            filteredTasklists = tasklists.filter(task => 
                task.assigneeWorkDeadline && task.updatedAt && task.updatedAt <= task.assigneeWorkDeadline
            );
        } else if (statusType === 'Selesai Terlambat') {
            filteredTasklists = tasklists.filter(task => 
                task.assigneeWorkDeadline && task.updatedAt && task.updatedAt > task.assigneeWorkDeadline
            );
        }

        // Fetch project dan pegawai info untuk setiap tasklist
        const tasklistsWithDetails = await Promise.all(
            filteredTasklists.map(async (task) => {
                const project = await prisma.proyek.findUnique({
                    where: { id: task.projectId },
                    select: {
                        namaProyek: true,
                        kodeProyek: true
                    }
                });

                const pegawai = await prisma.pegawai.findUnique({
                    where: { id: task.pegawaiId },
                    select: {
                        namaLengkap: true
                    }
                });

                // Hitung selisih waktu
                let selisih = '-';
                if (task.assigneeStartTaskDeadline && task.assigneeWorkDeadline) {
                    const diffMs = task.assigneeWorkDeadline.getTime() - task.assigneeStartTaskDeadline.getTime();
                    const diffHours = diffMs / (1000 * 60 * 60);
                    selisih = `${diffHours.toFixed(1)} Jam`;
                }

                // Status display
                let statusDisplay = '';
                if (task.status === 'MENUNGGU_PROSES_USER') statusDisplay = 'Menunggu Proses';
                else if (task.status === 'SEDANG_DIPROSES_USER') statusDisplay = 'Sedang Proses';
                else if (task.status === 'MENUNGGU_REVIEW_PM') statusDisplay = 'Menunggu Review';
                else if (task.status === 'SELESAI') statusDisplay = 'Selesai';
                else statusDisplay = task.status;

                return {
                    id: task.id,
                    kode: task.kode,
                    namaProyek: project?.namaProyek || '-',
                    kodeProyek: project?.kodeProyek || '-',
                    namaModule: task.module?.nama || '-',
                    namaPegawai: pegawai?.namaLengkap || '-',
                    status: statusDisplay,
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
            statusType: statusType,
            totalTasks: tasklistsWithDetails.length,
            data: tasklistsWithDetails
        });

    } catch (error) {
        console.error('Error fetching tasklist by status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tasklist by status' },
            { status: 500 }
        );
    }
}
