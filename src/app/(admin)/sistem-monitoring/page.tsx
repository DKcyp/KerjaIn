import React from 'react';
import SistemMonitoringClient from './SistemMonitoringClient';
import { prisma } from '@/lib/prisma';

export const metadata = {
    title: 'Sistem Monitoring | Richz-Log',
    description: 'System Monitoring Dashboard',
};

export default async function SistemMonitoringPage() {
    // Hitung statistik global untuk 5 card
    const allTasklists = await prisma.tasklist.findMany({
        select: {
            status: true,
            assigneeWorkDeadline: true,
            updatedAt: true, // Gunakan updatedAt sebagai proxy untuk waktu selesai
        }
    });

    const stats = {
        menungguProses: allTasklists.filter((t: typeof allTasklists[number]) => t.status === 'MENUNGGU_PROSES_USER').length,
        sedangProses: allTasklists.filter((t: typeof allTasklists[number]) => t.status === 'SEDANG_DIPROSES_USER').length,
        menungguReview: allTasklists.filter((t: typeof allTasklists[number]) => t.status === 'MENUNGGU_REVIEW_PM').length,
        selesaiTepatWaktu: allTasklists.filter((t: typeof allTasklists[number]) => {
            if (t.status !== 'SELESAI' || !t.updatedAt || !t.assigneeWorkDeadline) return false;
            return t.updatedAt <= t.assigneeWorkDeadline;
        }).length,
        selesaiTerlambat: allTasklists.filter((t: typeof allTasklists[number]) => {
            if (t.status !== 'SELESAI' || !t.updatedAt || !t.assigneeWorkDeadline) return false;
            return t.updatedAt > t.assigneeWorkDeadline;
        }).length
    };

    // Fetch teams dari database dengan count tasklist
    const teams = await prisma.masterTeam.findMany({
        where: {
            isActive: true,
        },
        include: {
            projects: {
                include: {
                    _count: {
                        select: {
                            teamMembers: true,
                        }
                    }
                }
            },
            members: {
                include: {
                    pegawai: {
                        select: {
                            id: true,
                            namaLengkap: true,
                        }
                    }
                }
            },
            // Include project groups
            projectGroups: {
                where: {
                    isActive: true
                },
                include: {
                    projects: {
                        include: {
                            project: {
                                select: {
                                    id: true,
                                    namaProyek: true,
                                    kodeProyek: true
                                }
                            }
                        }
                    }
                }
            }
        },
        orderBy: {
            nama: 'asc',
        }
    });

    // Hitung total tasklist per team
    const teamsWithStats = await Promise.all(
        teams.map(async (team: typeof teams[number]) => {
            const projectIds = team.projects.map((p: typeof team.projects[number]) => p.id);
            
            // Debug: Log project IDs untuk setiap team
            console.log(`Team: ${team.nama}`);
            console.log(`Project IDs:`, projectIds);
            
            // Hitung total tasklist dari semua project di team ini
            const taskCount = await prisma.tasklist.count({
                where: {
                    projectId: {
                        in: projectIds
                    }
                }
            });
            
            console.log(`Total Tasklist: ${taskCount}\n`);
            
            // Ambil semua tasklist untuk hitung selisih jam
            const tasklists = await prisma.tasklist.findMany({
                where: {
                    projectId: {
                        in: projectIds
                    },
                    // Pastikan kedua kolom ada nilainya
                    assigneeStartTaskDeadline: { not: null },
                    assigneeWorkDeadline: { not: null }
                },
                select: {
                    assigneeStartTaskDeadline: true,
                    assigneeWorkDeadline: true,
                    scheduleAt: true,
                }
            });

            // Hitung total jam dari selisih assigneeStartTaskDeadline dan assigneeWorkDeadline
            let totalHours = 0;
            tasklists.forEach((task: typeof tasklists[number]) => {
                if (task.assigneeStartTaskDeadline && task.assigneeWorkDeadline) {
                    // Hitung selisih dalam milliseconds
                    const diffMs = task.assigneeWorkDeadline.getTime() - task.assigneeStartTaskDeadline.getTime();
                    // Convert ke jam (ms -> detik -> menit -> jam)
                    const diffHours = diffMs / (1000 * 60 * 60);
                    totalHours += diffHours;
                }
            });

            // Hitung tasklist per tanggal untuk grafik (31 hari terakhir)
            const now = new Date();
            const chartData: number[] = [];
            
            console.log(`\n📊 Calculating chart data for team: ${team.nama}`);
            
            for (let i = 0; i < 31; i++) {
                const targetDate = new Date(now);
                targetDate.setDate(now.getDate() - (30 - i)); // 30 hari yang lalu sampai hari ini
                targetDate.setHours(0, 0, 0, 0);
                
                const nextDate = new Date(targetDate);
                nextDate.setDate(targetDate.getDate() + 1);
                
                const count = await prisma.tasklist.count({
                    where: {
                        projectId: { in: projectIds },
                        scheduleAt: {
                            gte: targetDate,
                            lt: nextDate
                        }
                    }
                });
                
                chartData.push(count);
            }
            
            console.log(`Chart Data (31 days):`, chartData);
            console.log(`Total tasks in chart: ${chartData.reduce((a, b) => a + b, 0)}\n`);

            // Hitung statistik status untuk team ini
            const teamTasklists = await prisma.tasklist.findMany({
                where: {
                    projectId: { in: projectIds }
                },
                select: {
                    status: true,
                    assigneeWorkDeadline: true,
                    updatedAt: true
                }
            });

            const teamStats = {
                menungguProses: teamTasklists.filter((t: typeof teamTasklists[number]) => t.status === 'MENUNGGU_PROSES_USER').length,
                sedangProses: teamTasklists.filter((t: typeof teamTasklists[number]) => t.status === 'SEDANG_DIPROSES_USER').length,
                menungguReview: teamTasklists.filter((t: typeof teamTasklists[number]) => t.status === 'MENUNGGU_REVIEW_PM').length,
                selesaiTepatWaktu: teamTasklists.filter((t: typeof teamTasklists[number]) => {
                    if (t.status !== 'SELESAI' || !t.updatedAt || !t.assigneeWorkDeadline) return false;
                    return t.updatedAt <= t.assigneeWorkDeadline;
                }).length,
                selesaiTerlambat: teamTasklists.filter((t: typeof teamTasklists[number]) => {
                    if (t.status !== 'SELESAI' || !t.updatedAt || !t.assigneeWorkDeadline) return false;
                    return t.updatedAt > t.assigneeWorkDeadline;
                }).length
            };

            // Format data proyek untuk daftar proyek
            // Prioritaskan project groups, jika tidak ada baru tampilkan individual projects
            let projectList: Array<{
                id: number | string;
                namaProyek: string;
                kodeProyek: string;
                isGroup: boolean;
                projectIds?: number[]; // Untuk group, simpan array project IDs
            }> = [];

            // 1. Tambahkan project groups
            if (team.projectGroups && team.projectGroups.length > 0) {
                team.projectGroups.forEach((group: typeof team.projectGroups[number]) => {
                    const groupProjectIds = group.projects.map((item: typeof group.projects[number]) => item.project.id);
                    projectList.push({
                        id: `group-${group.id}`,
                        namaProyek: group.nama,
                        kodeProyek: `GROUP-${group.id}`,
                        isGroup: true,
                        projectIds: groupProjectIds
                    });
                });
            }

            // 2. Tambahkan individual projects yang tidak ada di group
            const groupedProjectIds = new Set(
                team.projectGroups?.flatMap((g: typeof team.projectGroups[number]) => g.projects.map((p: typeof g.projects[number]) => p.project.id)) || []
            );
            
            team.projects.forEach((project: typeof team.projects[number]) => {
                if (!groupedProjectIds.has(project.id)) {
                    projectList.push({
                        id: project.id,
                        namaProyek: project.namaProyek,
                        kodeProyek: project.kodeProyek,
                        isGroup: false
                    });
                }
            });

            console.log(`\n📦 Project List for ${team.nama}:`);
            console.log(`   Groups: ${team.projectGroups?.length || 0}`);
            console.log(`   Individual Projects: ${projectList.filter((p: typeof projectList[number]) => !p.isGroup).length}`);
            console.log(`   Total Display Items: ${projectList.length}`);

            // Optimasi: Ambil semua tasklist sekali, lalu group di JavaScript
            const allTasklistsForProjects = await prisma.tasklist.findMany({
                where: {
                    projectId: { in: projectIds }
                },
                select: {
                    id: true,
                    projectId: true
                }
            });

            // Hitung tasklist per proyek/group dari data yang sudah diambil
            const projectsWithTaskCount = projectList.map((project: typeof projectList[number]) => {
                let count = 0;
                
                if (project.isGroup && project.projectIds) {
                    // Untuk group, hitung total dari semua project dalam group
                    count = allTasklistsForProjects.filter((t: typeof allTasklistsForProjects[number]) => 
                        project.projectIds!.includes(t.projectId)
                    ).length;
                } else {
                    // Untuk individual project
                    count = allTasklistsForProjects.filter((t: typeof allTasklistsForProjects[number]) => 
                        t.projectId === project.id
                    ).length;
                }
                
                return {
                    ...project,
                    taskCount: count
                };
            });

            // Format data pegawai dari proyek_team (bukan dari master_team_member)
            // Ambil semua pegawai yang assigned ke project-project di team ini
            const proyekTeamMembers = await prisma.proyekTeam.findMany({
                where: {
                    projectId: { in: projectIds }
                },
                include: {
                    pegawai: {
                        select: {
                            id: true,
                            namaLengkap: true
                        }
                    }
                },
                distinct: ['pegawaiId'] // Hindari duplikat pegawai
            });

            console.log(`\n👥 Pegawai from proyek_team: ${proyekTeamMembers.length}`);

            // Optimasi: Ambil semua tasklist untuk pegawai sekali saja
            const allTasklistsForPegawai = await prisma.tasklist.findMany({
                where: {
                    projectId: { in: projectIds },
                    pegawaiId: { in: proyekTeamMembers.map((m: typeof proyekTeamMembers[number]) => m.pegawaiId) }
                },
                select: {
                    pegawaiId: true,
                    assigneeStartTaskDeadline: true,
                    assigneeWorkDeadline: true
                }
            });

            // Hitung tasklist per pegawai dari data yang sudah diambil
            const pegawaiWithTaskCount = proyekTeamMembers.map((member: typeof proyekTeamMembers[number]) => {
                // Filter tasklist untuk pegawai ini
                const pegawaiTasks = allTasklistsForPegawai.filter((t: typeof allTasklistsForPegawai[number]) => 
                    t.pegawaiId === member.pegawaiId
                );
                
                const count = pegawaiTasks.length;
                
                // Hitung total jam kerja pegawai ini (durasi pengerjaan)
                let pegawaiHours = 0;
                let scheduledHours = 0; // Total jam terjadwal
                
                pegawaiTasks.forEach((task: typeof pegawaiTasks[number]) => {
                    if (task.assigneeStartTaskDeadline && task.assigneeWorkDeadline) {
                        const diffMs = task.assigneeWorkDeadline.getTime() - task.assigneeStartTaskDeadline.getTime();
                        const hours = diffMs / (1000 * 60 * 60);
                        pegawaiHours += hours;
                        scheduledHours += hours; // Untuk saat ini, scheduled = durasi yang dialokasikan
                    }
                });
                
                return {
                    id: member.pegawai.id,
                    namaLengkap: member.pegawai.namaLengkap,
                    role: member.jabatan, // Jabatan dari proyek_team
                    taskCount: count,
                    totalHours: pegawaiHours.toFixed(2),
                    scheduledHours: scheduledHours.toFixed(2), // Total jam terjadwal
                    actualHours: pegawaiHours.toFixed(2) // Total durasi pengerjaan aktual (untuk saat ini sama dengan totalHours)
                };
            });

            return {
                id: team.id,
                nama: team.nama,
                deskripsi: team.deskripsi,
                type: team.type,
                taskCount,
                totalHours: totalHours.toFixed(2),
                memberCount: team.members.length,
                projectCount: projectList.length, // Jumlah item yang ditampilkan (groups + individual)
                chartData, // Data untuk grafik
                projects: projectsWithTaskCount, // Data proyek dengan jumlah task
                pegawai: pegawaiWithTaskCount, // Data pegawai dengan jumlah task
                stats: teamStats, // Statistik status untuk team ini
            };
        })
    );

    return <SistemMonitoringClient teams={teamsWithStats} stats={stats} />;
}