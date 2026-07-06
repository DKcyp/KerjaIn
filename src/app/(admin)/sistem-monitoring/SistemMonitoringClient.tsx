"use client";

import React, { useState, useEffect } from "react";

// Type untuk team dari database
type TeamData = {
    id: number;
    nama: string;
    deskripsi: string | null;
    type: string;
    taskCount: number;
    totalHours: string;
    memberCount: number;
    projectCount: number;
    chartData: number[]; // Data grafik per tanggal
    projects: Array<{
        id: number | string;
        namaProyek: string;
        kodeProyek: string;
        taskCount: number;
        isGroup: boolean;
        projectIds?: number[];
    }>;
    pegawai: Array<{
        id: number;
        namaLengkap: string;
        role: string;
        taskCount: number;
        totalHours: string;
        scheduledHours: string;
        actualHours: string;
    }>;
    stats: {
        menungguProses: number;
        sedangProses: number;
        menungguReview: number;
        selesaiTepatWaktu: number;
        selesaiTerlambat: number;
    };
};

type SystemStats = {
    menungguProses: number;
    sedangProses: number;
    menungguReview: number;
    selesaiTepatWaktu: number;
    selesaiTerlambat: number;
};

type ChartData = {
    [key: string]: number[];
};

type ModalData = {
    title: string;
    data: Array<{
        no: number;
        kode: string;
        namaProyek: string;
        namaModule?: string;
        namaPegawai: string;
        status: string;
        statusColor?: string;
        jadwalPengerjaan: string;
        aktualPengerjaan: string;
        selisih: string;
        keterangan: string;
    }>;
};

// Props untuk client component
type SistemMonitoringClientProps = {
    teams: TeamData[];
    stats: SystemStats; // Global stats (tidak dipakai lagi)
};

export default function SistemMonitoringClient({ teams, stats }: SistemMonitoringClientProps) {
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<ModalData | null>(null);

    // Ambil data team yang sedang dipilih
    const currentTeam = selectedTeam ? teams.find(team => team.nama === selectedTeam) : null;

    // Chart data dari database (bukan mock lagi)
    const chartData: ChartData = teams.reduce((acc, team) => {
        acc[team.nama] = team.chartData;
        return acc;
    }, {} as ChartData);

    // Hitung data gabungan semua team untuk default view
    const allTeamsChartData = teams.reduce((acc, team) => {
        team.chartData.forEach((value, index) => {
            acc[index] = (acc[index] || 0) + value;
        });
        return acc;
    }, [] as number[]);

    // Hitung stats gabungan semua team
    const allTeamsStats = teams.reduce((acc, team) => {
        acc.menungguProses += team.stats.menungguProses;
        acc.sedangProses += team.stats.sedangProses;
        acc.menungguReview += team.stats.menungguReview;
        acc.selesaiTepatWaktu += team.stats.selesaiTepatWaktu;
        acc.selesaiTerlambat += team.stats.selesaiTerlambat;
        return acc;
    }, {
        menungguProses: 0,
        sedangProses: 0,
        menungguReview: 0,
        selesaiTepatWaktu: 0,
        selesaiTerlambat: 0
    });

    // Hitung top pegawai dari semua team
    const allPegawai = teams.flatMap(team => 
        team.pegawai.map(p => ({
            ...p,
            teamName: team.nama,
            scheduledHours: parseFloat(p.scheduledHours || '0'),
            actualHours: parseFloat(p.actualHours || '0')
        }))
    );
    const topPegawai = allPegawai
        .sort((a, b) => b.taskCount - a.taskCount)
        .slice(0, 5);

    // Data yang akan ditampilkan (team spesifik atau gabungan)
    const displayChartData = selectedTeam ? chartData[selectedTeam] : allTeamsChartData;
    const displayStats = currentTeam ? currentTeam.stats : allTeamsStats;

    // Debug: Log chart data
    console.log('Selected Team:', selectedTeam);
    console.log('Chart Data for selected team:', displayChartData);

    // Mock data for modals
    const getModalData = (type: string): ModalData => {
        const dataMap: { [key: string]: Array<any> } = {
            'Menunggu Proses': [
                {
                    no: 1,
                    kode: "TSK-001",
                    namaProyek: "E-Commerce Platform",
                    namaPegawai: "Ahmad Rizki",
                    status: "Menunggu Proses",
                    jadwalPengerjaan: "03/26/2026, 08:30 - 03/28/2026, 17:45",
                    aktualPengerjaan: "-",
                    selisih: "16 Jam",
                    keterangan: "Menunggu untuk diproses"
                }
            ],
            'Sedang Proses': [
                {
                    no: 1,
                    kode: "TSK-002",
                    namaProyek: "Mobile Banking App",
                    namaPegawai: "Sari Dewi",
                    status: "Sedang Proses",
                    jadwalPengerjaan: "03/25/2026, 09:00 - 03/27/2026, 18:00",
                    aktualPengerjaan: "03/25/2026, 09:15 - Ongoing",
                    selisih: "16 Jam",
                    keterangan: "Sedang dalam pengerjaan"
                }
            ],
            'Menunggu Review': [
                {
                    no: 1,
                    kode: "TSK-003",
                    namaProyek: "CRM System",
                    namaPegawai: "Budi Santoso",
                    status: "Menunggu Review",
                    jadwalPengerjaan: "03/20/2026, 08:30 - 03/24/2026, 17:45",
                    aktualPengerjaan: "03/20/2026, 08:30 - 03/24/2026, 16:00",
                    selisih: "32 Jam",
                    keterangan: "Menunggu review dari PM"
                }
            ],
            'Selesai Tepat Waktu': [
                {
                    no: 1,
                    kode: "TSK-004",
                    namaProyek: "Dashboard Analytics",
                    namaPegawai: "Maya Putri",
                    status: "Selesai",
                    jadwalPengerjaan: "03/15/2026, 08:30 - 03/20/2026, 17:45",
                    aktualPengerjaan: "03/15/2026, 08:30 - 03/20/2026, 15:00",
                    selisih: "40 Jam",
                    keterangan: "Selesai tepat waktu"
                }
            ],
            'Selesai Terlambat': [
                {
                    no: 1,
                    kode: "TSK-005",
                    namaProyek: "API Integration",
                    namaPegawai: "Lisa Maharani",
                    status: "Selesai",
                    jadwalPengerjaan: "03/10/2026, 08:30 - 03/15/2026, 17:45",
                    aktualPengerjaan: "03/10/2026, 08:30 - 03/18/2026, 17:45",
                    selisih: "40 Jam",
                    keterangan: "Selesai terlambat 3 hari"
                }
            ]
        };

        return {
            title: `Tasklist Status - ${type}`,
            data: dataMap[type] || []
        };
    };

    const handleCardClick = async (type: string) => {
        // Set loading state
        setModalData({
            title: `Loading...`,
            data: []
        });
        setIsModalOpen(true);

        try {
            // Ambil semua project IDs dari team yang dipilih atau semua team
            const projectIds = selectedTeam && currentTeam
                ? currentTeam.projects
                    .flatMap(p => p.isGroup && p.projectIds ? p.projectIds : [p.id as number])
                    .join(',')
                : teams
                    .flatMap(team => team.projects)
                    .flatMap(p => p.isGroup && p.projectIds ? p.projectIds : [p.id as number])
                    .join(',');

            // Fetch data dari API
            const response = await fetch(
                `/api/sistem-monitoring/tasklist-by-status?statusType=${encodeURIComponent(type)}&projectIds=${projectIds}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch tasklist');
            }

            const result = await response.json();

            // Format data untuk modal
            const formattedData = result.data.map((task: any, index: number) => ({
                no: index + 1,
                kode: task.kode,
                namaProyek: task.namaProyek,
                namaModule: task.namaModule,
                namaPegawai: task.namaPegawai,
                status: task.status,
                jadwalPengerjaan: task.jadwalPengerjaan,
                aktualPengerjaan: task.aktualPengerjaan,
                selisih: task.selisih,
                keterangan: task.keterangan
            }));

            const teamLabel = selectedTeam ? selectedTeam : 'Semua Team';
            setModalData({
                title: `Tasklist Status - ${type} (${teamLabel}) - ${result.totalTasks} Tasks`,
                data: formattedData
            });

        } catch (error) {
            console.error('Error fetching status tasklist:', error);
            setModalData({
                title: `Error loading tasklist`,
                data: []
            });
        }
    };

    const handleDateClick = (date: number, teamName: string | null) => {
        const data = getDateModalData(date, teamName);
        setModalData(data);
        setIsModalOpen(true);
    };

    const handleProjectClick = async (projectName: string) => {
        // Cari project data dari currentTeam
        const project = currentTeam?.projects.find(p => p.namaProyek === projectName);
        
        if (!project) return;

        // Set loading state
        setModalData({
            title: `Loading...`,
            data: []
        });
        setIsModalOpen(true);

        try {
            // Tentukan project IDs (untuk group atau individual)
            const projectIdsParam = project.isGroup && project.projectIds
                ? project.projectIds.join(',')
                : String(project.id);

            // Fetch data dari API
            const response = await fetch(
                `/api/sistem-monitoring/tasklist-by-project?projectIds=${projectIdsParam}&projectName=${encodeURIComponent(projectName)}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch tasklist');
            }

            const result = await response.json();

            // Format data untuk modal
            const formattedData = result.data.map((task: any, index: number) => ({
                no: index + 1,
                kode: task.kode,
                namaProyek: task.namaProyek,
                namaModule: task.namaModule,
                namaPegawai: task.namaPegawai,
                status: task.status,
                jadwalPengerjaan: task.jadwalPengerjaan,
                aktualPengerjaan: task.aktualPengerjaan,
                selisih: task.selisih,
                keterangan: task.keterangan
            }));

            setModalData({
                title: `Tasklist - ${result.projectName} (${result.totalTasks} Tasks)`,
                data: formattedData
            });

        } catch (error) {
            console.error('Error fetching project tasklist:', error);
            setModalData({
                title: `Error loading tasklist`,
                data: []
            });
        }
    };

    const handleEmployeeClick = async (employeeName: string, pegawaiId: number) => {
        // Set loading state
        setModalData({
            title: `Loading...`,
            data: []
        });
        setIsModalOpen(true);

        try {
            // Ambil semua project IDs dari semua team (karena top pegawai bisa dari team manapun)
            const projectIds = teams
                .flatMap(team => team.projects)
                .flatMap(p => p.isGroup && p.projectIds ? p.projectIds : [p.id as number])
                .join(',');

            // Fetch data dari API
            const response = await fetch(
                `/api/sistem-monitoring/tasklist-by-pegawai?pegawaiId=${pegawaiId}&projectIds=${projectIds}&pegawaiName=${encodeURIComponent(employeeName)}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch pegawai tasklist');
            }

            const result = await response.json();

            // Format data untuk modal
            const formattedData = result.data.map((task: any, index: number) => ({
                no: index + 1,
                kode: task.kode,
                namaProyek: task.namaProyek,
                namaModule: task.namaModule,
                namaPegawai: employeeName,
                status: task.status,
                statusColor: task.statusColor,
                jadwalPengerjaan: task.jadwalPengerjaan,
                aktualPengerjaan: task.aktualPengerjaan,
                selisih: task.selisih,
                keterangan: task.keterangan
            }));

            setModalData({
                title: `Tasklist - ${result.pegawaiName} (${result.totalTasks} Tasks | ✅ ${result.statistics.completed} Selesai | 🔄 ${result.statistics.inProgress} Progress | 📋 ${result.statistics.review} Review)`,
                data: formattedData
            });

        } catch (error) {
            console.error('Error fetching pegawai tasklist:', error);
            setModalData({
                title: `Error loading tasklist`,
                data: []
            });
        }
    };

    const getDateModalData = (date: number, teamName: string | null): ModalData => {
        const taskValue = teamName 
            ? (chartData[teamName]?.[date - 1] || 0)
            : (allTeamsChartData[date - 1] || 0);
        
        // If no tasks for this date, return empty data
        if (taskValue === 0) {
            return {
                title: `Tasklist Tanggal ${date} Maret 2026`,
                data: []
            };
        }
        
        // Generate mock data based on the task count for that date
        const mockTasks = [];
        const teamLabel = teamName || 'Semua Team';
        
        for (let i = 1; i <= taskValue; i++) {
            mockTasks.push({
                no: i,
                kode: `${teamLabel.substring(0, 3).toUpperCase()}-${String(date).padStart(2, '0')}${String(i).padStart(2, '0')}`,
                namaProyek: `Project ${teamLabel} ${i}`,
                namaPegawai: `Pegawai ${i}`,
                status: ['In Progress', 'Completed', 'Review', 'Testing'][Math.floor(Math.random() * 4)],
                jadwalPengerjaan: `${String(date).padStart(2, '0')}/03/2026, 08:30 - ${String(date).padStart(2, '0')}/03/2026, 17:45`,
                aktualPengerjaan: `${String(date).padStart(2, '0')}/03/2026, 08:30 - ${String(date).padStart(2, '0')}/03/2026, 17:45`,
                selisih: ['-1 Jam', 'On Time', '+30 Min', '-30 Min'][Math.floor(Math.random() * 4)],
                keterangan: `Task ${i} untuk team ${teamLabel} pada tanggal ${date} Maret 2026`
            });
        }

        return {
            title: `Tasklist Tanggal ${date} Maret 2026`,
            data: mockTasks
        };
    };

    const getProjectModalData = (projectName: string): ModalData => {
        // Generate mock tasks for the selected project
        const projectTaskCounts: { [key: string]: number } = {
            'Mobile App Development': 12,
            'Security Audit': 5,
            'E-Commerce Platform': 8,
            'CRM Integration': 15
        };
        
        const taskCount = projectTaskCounts[projectName] || 5;
        const mockTasks = [];
        
        const employees = ['Ahmad Rizki', 'Sari Dewi', 'Budi Santoso', 'Maya Putri', 'Lisa Maharani', 'Rina Sari'];
        const taskTypes: { [key: string]: string[] } = {
            'Mobile App Development': ['UI Design', 'API Integration', 'Push Notification', 'Offline Sync', 'Testing'],
            'Security Audit': ['Vulnerability Scan', 'Penetration Test', 'Code Review', 'Security Report', 'Fix Implementation'],
            'E-Commerce Platform': ['Product Catalog', 'Payment Gateway', 'Shopping Cart', 'Order Management', 'User Authentication'],
            'CRM Integration': ['Customer Data Sync', 'API Development', 'Dashboard Creation', 'Report Generation', 'Data Migration']
        };
        
        for (let i = 1; i <= taskCount; i++) {
            const randomDate = Math.floor(Math.random() * 28) + 1; // Random date 1-28
            const taskTypeList = taskTypes[projectName] || ['General Task'];
            mockTasks.push({
                no: i,
                kode: `PRJ-${projectName.substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`,
                namaProyek: projectName,
                namaPegawai: employees[Math.floor(Math.random() * employees.length)],
                status: ['In Progress', 'Completed', 'Review', 'Testing', 'On Hold'][Math.floor(Math.random() * 5)],
                jadwalPengerjaan: `${String(randomDate).padStart(2, '0')}/03/2026, 08:30 - ${String(randomDate + Math.floor(Math.random() * 3) + 1).padStart(2, '0')}/03/2026, 17:45`,
                aktualPengerjaan: `${String(randomDate).padStart(2, '0')}/03/2026, 08:30 - ${String(randomDate + Math.floor(Math.random() * 3) + 1).padStart(2, '0')}/03/2026, 17:45`,
                selisih: ['-2 Jam', 'On Time', '+1 Jam', '-30 Min', '+45 Min'][Math.floor(Math.random() * 5)],
                keterangan: `${taskTypeList[Math.floor(Math.random() * taskTypeList.length)]} untuk proyek ${projectName}`
            });
        }

        return {
            title: `Tasklist Proyek - ${projectName}`,
            data: mockTasks
        };
    };

    const getEmployeeModalData = (employeeName: string): ModalData => {
        // Generate mock tasks for the selected employee
        const employeeTaskCounts: { [key: string]: number } = {
            'Sari Dewi': 7,
            'Lisa Maharani': 7,
            'Ahmad Rizki': 5,
            'Budi Santoso': 9
        };
        
        const taskCount = employeeTaskCounts[employeeName] || 5;
        const mockTasks = [];
        
        const projects = ['Mobile App Development', 'Security Audit', 'E-Commerce Platform', 'CRM Integration', 'Dashboard Analytics'];
        const employeeSkills: { [key: string]: string[] } = {
            'Sari Dewi': ['Backend Development', 'Database Design', 'API Development', 'Code Review'],
            'Lisa Maharani': ['Frontend Development', 'UI/UX Design', 'Testing', 'Documentation'],
            'Ahmad Rizki': ['Full Stack Development', 'DevOps', 'System Integration', 'Performance Optimization'],
            'Budi Santoso': ['Project Management', 'System Analysis', 'Quality Assurance', 'Client Communication']
        };
        
        for (let i = 1; i <= taskCount; i++) {
            const randomDate = Math.floor(Math.random() * 28) + 1; // Random date 1-28
            const skillList = employeeSkills[employeeName] || ['General Development'];
            mockTasks.push({
                no: i,
                kode: `EMP-${employeeName.split(' ')[0].substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`,
                namaProyek: projects[Math.floor(Math.random() * projects.length)],
                namaPegawai: employeeName,
                status: ['In Progress', 'Completed', 'Review', 'Testing'][Math.floor(Math.random() * 4)],
                jadwalPengerjaan: `${String(randomDate).padStart(2, '0')}/03/2026, 08:30 - ${String(randomDate).padStart(2, '0')}/03/2026, 17:45`,
                aktualPengerjaan: `${String(randomDate).padStart(2, '0')}/03/2026, 08:30 - ${String(randomDate).padStart(2, '0')}/03/2026, 17:45`,
                selisih: ['-1 Jam', 'On Time', '+30 Min', '-45 Min'][Math.floor(Math.random() * 4)],
                keterangan: `${skillList[Math.floor(Math.random() * skillList.length)]} dikerjakan oleh ${employeeName}`
            });
        }

        return {
            title: `Tasklist Pegawai - ${employeeName}`,
            data: mockTasks
        };
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalData(null);
    };

    // Simulate data loading
    useEffect(() => {
        // Data already set in initial state
    }, []);

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Sistem Monitoring
                </h1>
            </div>

            {/* Stats Cards Grid - Dynamic dari Database */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {teams.map((team, index) => {
                    // Array warna gradient untuk setiap card
                    const colors = [
                        { from: 'from-green-500', to: 'to-green-600', ring: 'ring-green-300', text: 'text-green-100', subtext: 'text-green-200' },
                        { from: 'from-orange-500', to: 'to-orange-600', ring: 'ring-orange-300', text: 'text-orange-100', subtext: 'text-orange-200' },
                        { from: 'from-red-500', to: 'to-red-600', ring: 'ring-red-300', text: 'text-red-100', subtext: 'text-red-200' },
                        { from: 'from-blue-500', to: 'to-blue-600', ring: 'ring-blue-300', text: 'text-blue-100', subtext: 'text-blue-200' },
                        { from: 'from-purple-500', to: 'to-purple-600', ring: 'ring-purple-300', text: 'text-purple-100', subtext: 'text-purple-200' },
                        { from: 'from-pink-500', to: 'to-pink-600', ring: 'ring-pink-300', text: 'text-pink-100', subtext: 'text-pink-200' },
                    ];
                    
                    const color = colors[index % colors.length];
                    
                    return (
                        <div 
                            key={team.id}
                            className={`bg-gradient-to-r ${color.from} ${color.to} rounded-lg p-6 text-white shadow-lg cursor-pointer transform transition-transform hover:scale-105 ${
                                selectedTeam === team.nama ? `ring-4 ${color.ring}` : ''
                            }`}
                            onClick={() => setSelectedTeam(selectedTeam === team.nama ? null : team.nama)}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={`${color.text} text-sm font-medium`}>{team.nama}</p>
                                    <p className="text-3xl font-bold">{team.taskCount}</p>
                                    <p className={`${color.subtext} text-xs`}>({team.totalHours} JAM)</p>
                                    <p className={`${color.subtext} text-xs mt-1`}>
                                        {team.projectCount} Proyek
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Second Row Stats - Berdasarkan Team yang Dipilih */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                {/* Menunggu Proses - Abu-abu */}
                <div 
                    className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 shadow-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:shadow-xl transition-shadow"
                    onClick={() => handleCardClick('Menunggu Proses')}
                >
                    <div className="text-center">
                        <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">Menunggu Proses</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{displayStats.menungguProses}</p>
                    </div>
                </div>

                {/* Sedang Proses - Biru */}
                <div 
                    className="bg-blue-100 dark:bg-blue-900 rounded-lg p-6 shadow-lg border border-blue-300 dark:border-blue-700 cursor-pointer hover:shadow-xl transition-shadow"
                    onClick={() => handleCardClick('Sedang Proses')}
                >
                    <div className="text-center">
                        <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">Sedang Proses</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-white">{displayStats.sedangProses}</p>
                    </div>
                </div>

                {/* Menunggu Review - Kuning */}
                <div 
                    className="bg-yellow-100 dark:bg-yellow-900 rounded-lg p-6 shadow-lg border border-yellow-300 dark:border-yellow-700 cursor-pointer hover:shadow-xl transition-shadow"
                    onClick={() => handleCardClick('Menunggu Review')}
                >
                    <div className="text-center">
                        <p className="text-yellow-700 dark:text-yellow-300 text-sm font-medium">Menunggu Review</p>
                        <p className="text-2xl font-bold text-yellow-900 dark:text-white">{displayStats.menungguReview}</p>
                    </div>
                </div>

                {/* Selesai Tepat Waktu - Hijau */}
                <div 
                    className="bg-green-100 dark:bg-green-900 rounded-lg p-6 shadow-lg border border-green-300 dark:border-green-700 cursor-pointer hover:shadow-xl transition-shadow"
                    onClick={() => handleCardClick('Selesai Tepat Waktu')}
                >
                    <div className="text-center">
                        <p className="text-green-700 dark:text-green-300 text-sm font-medium">Selesai Tepat Waktu</p>
                        <p className="text-2xl font-bold text-green-900 dark:text-white">{displayStats.selesaiTepatWaktu}</p>
                    </div>
                </div>

                {/* Selesai Terlambat - Merah */}
                <div 
                    className="bg-red-100 dark:bg-red-900 rounded-lg p-6 shadow-lg border border-red-300 dark:border-red-700 cursor-pointer hover:shadow-xl transition-shadow"
                    onClick={() => handleCardClick('Selesai Terlambat')}
                >
                    <div className="text-center">
                        <p className="text-red-700 dark:text-red-300 text-sm font-medium">Selesai Terlambat</p>
                        <p className="text-2xl font-bold text-red-900 dark:text-white">{displayStats.selesaiTerlambat}</p>
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className={`grid gap-6 mb-8 ${!selectedTeam ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {/* Grafik */}
                <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700 ${!selectedTeam ? 'lg:col-span-2' : ''}`}>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Grafik Harian Tasklist {selectedTeam ? <span className="text-blue-600">({selectedTeam})</span> : <span className="text-blue-600">(Semua Team)</span>}
                    </h2>
                    <div className="h-64 flex flex-col justify-end items-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 relative">
                        {/* Y-axis labels */}
                        <div className="absolute left-2 top-4 flex flex-col justify-between h-48 text-xs text-gray-500">
                            <span>4</span>
                            <span>3</span>
                            <span>2</span>
                            <span>1</span>
                            <span>0</span>
                        </div>
                        
                        {/* Y-axis title */}
                        <div className="absolute left-0 top-1/2 transform -rotate-90 text-xs text-gray-600 dark:text-gray-400">
                            Jumlah
                        </div>
                        
                        {/* Chart bars */}
                        <div className="flex items-end justify-center space-x-1 h-48 w-full ml-8">
                            {(displayChartData || []).map((value, index) => (
                                <div key={index} className="flex flex-col items-center group relative">
                                    {value > 0 ? (
                                        <>
                                            <div 
                                                className="bg-red-500 hover:bg-red-600 w-4 transition-all duration-300 ease-in-out cursor-pointer relative"
                                                style={{ 
                                                    height: `${(value / 4) * 100}%`,
                                                    minHeight: '8px'
                                                }}
                                                title={`Tanggal ${index + 1}: ${value} task`}
                                                onClick={() => handleDateClick(index + 1, selectedTeam)}
                                            />
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                                {value} task - Klik untuk detail
                                            </div>
                                        </>
                                    ) : (
                                        // Placeholder kosong untuk tanggal dengan 0 task (tidak ada bar)
                                        <div className="w-4 h-0"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {/* X-axis labels */}
                        <div className="flex justify-center space-x-1 mt-2 text-xs text-gray-500 w-full ml-8">
                            {Array.from({ length: 31 }, (_, i) => (
                                <span key={i} className="w-4 text-center">
                                    {i + 1}
                                </span>
                            ))}
                        </div>
                        
                        {/* X-axis title */}
                        <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Tanggal
                        </div>
                    </div>
                </div>

                {/* Top Pegawai - Hanya tampil jika tidak ada team yang dipilih */}
                {!selectedTeam && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Top Pegawai
                        </h3>
                        <div className="space-y-3">
                            {topPegawai.map((pegawai, index) => {
                                const colors = [
                                    'from-yellow-400 to-yellow-500',
                                    'from-gray-300 to-gray-400',
                                    'from-orange-400 to-orange-500',
                                    'from-blue-400 to-blue-500',
                                    'from-green-400 to-green-500',
                                ];
                                const color = colors[index] || 'from-gray-400 to-gray-500';
                                
                                // Data real dari database
                                const actualHours = pegawai.actualHours || 0; // Total durasi pengerjaan
                                const scheduledHours = pegawai.scheduledHours || 0; // Total jam terjadwal
                                const selisihJam = actualHours - scheduledHours;
                                
                                // Hitung jam dan menit dari selisih
                                const absSelisih = Math.abs(selisihJam);
                                const selisihJamInt = Math.floor(absSelisih);
                                const selisihMenit = Math.round((absSelisih - selisihJamInt) * 60);
                                
                                // Mock data untuk stat kanan (nanti akan diganti)
                                const totalJamKerja = 98.0; // jam
                                const persentaseJamKerja = totalJamKerja > 0 
                                    ? ((actualHours / totalJamKerja) * 100).toFixed(0)
                                    : '0';
                                
                                return (
                                    <div 
                                        key={`${pegawai.id}-${pegawai.teamName}`}
                                        className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-lg transition-shadow"
                                        onClick={() => handleEmployeeClick(pegawai.namaLengkap, pegawai.id)}
                                    >
                                        {/* Header dengan nama dan ranking */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className={`bg-gradient-to-r ${color} rounded-full w-10 h-10 flex items-center justify-center text-white font-bold text-lg`}>
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 dark:text-white">{pegawai.namaLengkap}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{pegawai.teamName}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{pegawai.taskCount}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">tasks</div>
                                            </div>
                                        </div>

                                        {/* Stats Cards */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* Stat 1: Durasi vs Terjadwal */}
                                            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 text-center">
                                                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    {actualHours.toFixed(1)} - {scheduledHours.toFixed(1)}
                                                </div>
                                                <div className={`text-xs font-bold mt-1 ${selisihJam >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {selisihJam >= 0 ? '+' : '-'}{selisihJamInt}j {selisihMenit}m
                                                </div>
                                            </div>

                                            {/* Stat 2: Durasi vs Jam Kerja (Mock) */}
                                            <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 text-center">
                                                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    {actualHours.toFixed(1)} / {totalJamKerja.toFixed(1)}
                                                </div>
                                                <div className="text-xs font-bold text-red-600 mt-1">
                                                    ↓ {persentaseJamKerja}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Section - Hanya tampil jika ada team yang dipilih */}
            {selectedTeam && currentTeam && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Daftar Proyek - Data dari Database */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Daftar Proyek ({currentTeam?.projects.length || 0})
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {currentTeam?.projects.length > 0 ? (
                                currentTeam.projects.map((project, index) => {
                                // Array warna untuk card proyek
                                const colors = [
                                    'from-red-400 to-red-500 hover:from-red-500 hover:to-red-600',
                                    'from-green-400 to-green-500 hover:from-green-500 hover:to-green-600',
                                    'from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600',
                                    'from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600',
                                    'from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600',
                                    'from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600',
                                ];
                                const color = colors[index % colors.length];
                                
                                return (
                                    <div 
                                        key={project.id}
                                        className={`bg-gradient-to-r ${color} rounded-lg p-4 text-white text-center cursor-pointer transition-all transform hover:scale-105 relative`}
                                        onClick={() => handleProjectClick(project.namaProyek)}
                                    >
                                        {/* Ikon untuk group */}
                                        {project.isGroup && (
                                            <div className="absolute top-2 right-2 bg-opacity-30 p-1.5 rounded-full" title="Project Group">
                                                <svg 
                                                    xmlns="http://www.w3.org/2000/svg" 
                                                    className="h-4 w-4 text-white" 
                                                    fill="none" 
                                                    viewBox="0 0 24 24" 
                                                    stroke="currentColor"
                                                >
                                                    <path 
                                                        strokeLinecap="round" 
                                                        strokeLinejoin="round" 
                                                        strokeWidth={2} 
                                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="text-sm font-medium mb-2 truncate" title={project.namaProyek}>
                                            {project.namaProyek}
                                        </div>
                                        <div className="text-2xl font-bold">{project.taskCount}</div>
                                        {project.isGroup && project.projectIds && (
                                            <div className="text-xs opacity-80 mt-1">
                                                {project.projectIds.length} Projects
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-2 text-center text-gray-500 dark:text-gray-400 py-8">
                                Tidak ada proyek di team ini
                            </div>
                        )}
                    </div>
                </div>

                {/* Daftar Pegawai - Data dari Database */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Daftar Pegawai ({currentTeam?.pegawai.length || 0})
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        {currentTeam?.pegawai.length > 0 ? (
                            currentTeam.pegawai.map((pegawai, index) => {
                                // Array warna untuk card pegawai
                                const colors = [
                                    'from-green-400 to-green-500 hover:from-green-500 hover:to-green-600',
                                    'from-red-400 to-red-500 hover:from-red-500 hover:to-red-600',
                                    'from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600',
                                    'from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600',
                                    'from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600',
                                    'from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600',
                                ];
                                const color = colors[index % colors.length];
                                
                                return (
                                    <div 
                                        key={pegawai.id}
                                        className={`bg-gradient-to-r ${color} rounded-lg p-4 text-white cursor-pointer transition-all transform hover:scale-105`}
                                        onClick={() => handleEmployeeClick(pegawai.namaLengkap, pegawai.id)}
                                    >
                                        <div className="text-lg font-bold mb-1 truncate" title={pegawai.namaLengkap}>
                                            {pegawai.namaLengkap}
                                        </div>
                                        <div className="text-2xl font-bold text-center">{pegawai.taskCount}</div>
                                        <div className="text-xs opacity-80">{pegawai.role}</div>
                                        <div className="text-xs opacity-80">{pegawai.totalHours} Jam</div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-2 text-center text-gray-500 dark:text-gray-400 py-8">
                                Tidak ada anggota di team ini
                            </div>
                        )}
                    </div>
                </div>
            </div>
            )}
            {isModalOpen && modalData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden my-8">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {modalData.title}
                            </h2>
                            <div className="flex items-center space-x-3">
                                <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2">
                                    <span>📊</span>
                                    <span>Export Excel</span>
                                </button>
                                <button 
                                    onClick={closeModal}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Filters */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cari Kode</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        placeholder="Cari kode..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semua Proyek</label>
                                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                        <option>Semua Proyek</option>
                                        <option>Database Migration</option>
                                        <option>Mobile App Development</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semua Review</label>
                                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                        <option>Semua Review</option>
                                        <option>Menunggu Review</option>
                                        <option>Sudah Review</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semua Status</label>
                                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                        <option>Semua Status</option>
                                        <option>Menunggu Review</option>
                                        <option>In Progress</option>
                                        <option>Completed</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="overflow-auto max-h-[60vh]">
                            <table className="w-full">
                                <thead className="bg-blue-600 text-white sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium">No</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Kode</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Nama Proyek</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Module</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Nama Pegawai</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Jadwal Pengerjaan</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Aktual Pengerjaan</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Selisih</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {modalData.data.length > 0 ? (
                                        modalData.data.map((row, index) => (
                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.no}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.kode}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.namaProyek}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.namaModule || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.namaPegawai}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 ${row.statusColor || 'bg-yellow-100 text-yellow-800'} text-xs rounded-full`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.jadwalPengerjaan}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.aktualPengerjaan}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="text-red-600 font-medium">{row.selisih}</span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate" title={row.keterangan}>
                                                    {row.keterangan}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                                Tidak ada data
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Rows per page: 
                                    <select className="ml-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800">
                                        <option>5</option>
                                        <option>10</option>
                                        <option>25</option>
                                    </select>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {modalData.data.length > 0 ? `1-${modalData.data.length} of ${modalData.data.length}` : '0-0 of 0'}
                                    </span>
                                    <div className="flex space-x-1">
                                        <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}