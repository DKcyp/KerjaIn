"use client";
import React, { useState, useMemo, useEffect } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface PegawaiPerformanceChartProps {
  tasks?: any[];
  startDate?: string;
  endDate?: string;
}

export default function PegawaiPerformanceChart({ tasks = [], startDate, endDate }: PegawaiPerformanceChartProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [selectedProgrammer, setSelectedProgrammer] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [teams, setTeams] = useState<any[]>([]);
  const [myTeamMembers, setMyTeamMembers] = useState<any[] | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/master-team')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTeams(data.items || []);
          }
        })
        .catch(err => console.error('Error fetching teams:', err));
    } else {
      fetch('/api/master-team/my-team-members')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setMyTeamMembers(data.items || []);
          } else {
            setMyTeamMembers([]);
          }
        })
        .catch(err => {
          console.error('Error fetching team members:', err);
          setMyTeamMembers([]);
        });
    }
  }, [isSuperAdmin]);

  const chartData = useMemo(() => {
    // 1. Generate dates for current week (Mon-Sun)
    const categories: string[] = [];
    const dateKeys: string[] = [];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${day}`;
      dateKeys.push(dateKey);
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      categories.push(`${day}/${m} (${dayName})`);
    }

    // 2. Filter tasks by team membership FIRST
    let filteredTasks = tasks;
    
    console.log('📊 [Chart] Total tasks received:', tasks.length);
    console.log('📊 [Chart] Date range:', startDate, 'to', endDate);
    
    // For non-SUPER_ADMIN (PM), filter tasks to only show their team members
    if (!isSuperAdmin && myTeamMembers !== null) {
      const teamMemberNames = myTeamMembers.map(m => m.name);
      console.log('📊 [Chart] Team member names:', teamMemberNames);
      filteredTasks = tasks.filter(t => {
        const progName = t.pegawaiNama || "Tidak Ada PIC";
        return teamMemberNames.includes(progName);
      });
      console.log('📊 [Chart] Filtered tasks by team:', filteredTasks.length);
    }
    
    // For SUPER_ADMIN with team filter
    if (isSuperAdmin && selectedTeam !== "all") {
      const team = teams.find(t => t.id.toString() === selectedTeam);
      if (team && team.pegawai) {
        const teamPegawaiNames = team.pegawai.map((p: any) => p.nama);
        filteredTasks = tasks.filter(t => {
          const progName = t.pegawaiNama || "Tidak Ada PIC";
          return teamPegawaiNames.includes(progName);
        });
      }
    }
    
    // 3. Process filtered tasks - count tasks per programmer per day
    const programmersMap = new Map<string, { completed: Record<string, number>, pending: Record<string, number> }>();
    
    filteredTasks.forEach(t => {
      const progName = t.pegawaiNama || "Tidak Ada PIC";
      if (!programmersMap.has(progName)) {
        programmersMap.set(progName, { completed: {}, pending: {} });
      }
      
      const progData = programmersMap.get(progName)!;
      const isCompleted = t.status === 'SELESAI';
      
      const targetDate = t.scheduleAt || t.createdAt;
      if (targetDate) {
        const d = new Date(targetDate);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${day}`;
        
        if (isCompleted) {
          progData.completed[dateKey] = (progData.completed[dateKey] || 0) + 1;
        } else {
          progData.pending[dateKey] = (progData.pending[dateKey] || 0) + 1;
        }
      }
    });

    // 4. Build series - Stacked bars (completed + pending) grouped by programmer
    const series: any[] = [];
    let availableProgrammers = Array.from(programmersMap.keys());
    
    if (!isSuperAdmin && myTeamMembers !== null) {
      const teamMemberNames = myTeamMembers.map(m => m.name);
      availableProgrammers = availableProgrammers.filter(name => teamMemberNames.includes(name));
    }

    let targetProgrammers = availableProgrammers;
    if (isSuperAdmin) {
      targetProgrammers = availableProgrammers;
    } else {
      if (selectedProgrammer !== "all" && availableProgrammers.includes(selectedProgrammer)) {
        targetProgrammers = [selectedProgrammer];
      } else {
        targetProgrammers = availableProgrammers.slice(0, 3);
      }
    }

    targetProgrammers.forEach((progName) => {
      const progData = programmersMap.get(progName)!;
      const initials = progName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
      
      const completedData = dateKeys.map(key => progData.completed[key] || 0);
      const pendingData = dateKeys.map(key => progData.pending[key] || 0);
      
      series.push({
        name: `${progName}`,
        type: "column",
        data: completedData,
        group: initials,
      });
      series.push({
        name: `${progName}_jadwal`,
        type: "column",
        data: pendingData,
        group: initials,
        showInLegend: false,
      });
    });

    const maxValue = Math.max(1, ...dateKeys.map(key => {
      let dayTotal = 0;
      for (const progName of targetProgrammers) {
        const d = programmersMap.get(progName)!;
        dayTotal += (d.completed[key] || 0) + (d.pending[key] || 0);
      }
      return dayTotal;
    }));
    const niceMax = Math.ceil(maxValue / 5) * 5 || 5;

    return { categories, series, availableProgrammers, maxY: niceMax };
  }, [tasks, selectedProgrammer, isSuperAdmin, selectedTeam, teams, myTeamMembers]);

  const options: ApexOptions = {
    colors: [
      "#10b981", "#10b981", // Programmer 1: green
      "#3b82f6", "#3b82f6", // Programmer 2: blue
      "#8b5cf6", "#8b5cf6", // Programmer 3: purple
      "#06b6d4", "#06b6d4", // Programmer 4: cyan
      "#84cc16", "#84cc16", // Programmer 5: lime
      "#14b8a6", "#14b8a6", // Programmer 6: teal
    ],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      stacked: true, // Stack actual + jadwal
      height: 350,
      toolbar: {
        show: false,
      },
    },
    fill: {
      opacity: [1, 0.2, 1, 0.2, 1, 0.2, 1, 0.2, 1, 0.2, 1, 0.2],
    },
    stroke: {
      show: false,
      width: 0,
    },
    plotOptions: {
      bar: {
        columnWidth: "55%",
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: chartData.categories,
      title: {
        text: "Periode",
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        rotate: -45,
      }
    },
    yaxis: {
      title: {
        text: "Jumlah Task",
      },
      min: 0,
      max: chartData.maxY,
      tickAmount: chartData.maxY,
      forceNiceScale: true,
      labels: {
        formatter: (val: number) => Math.round(val).toString(),
      },
    },
    tooltip: {
      shared: false,
      intersect: true,
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const seriesName = w.globals.seriesNames[seriesIndex];
        const progName = seriesName.replace('_jadwal', '');
        const completedIdx = w.globals.seriesNames.findIndex((name: string) => name === progName);
        const pendingIdx = w.globals.seriesNames.findIndex((name: string) => name === `${progName}_jadwal`);
        const completed = completedIdx >= 0 ? series[completedIdx][dataPointIndex] : 0;
        const pending = pendingIdx >= 0 ? series[pendingIdx][dataPointIndex] : 0;
        const total = completed + pending;
        return `<div style="padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px;">
          <strong>${progName}</strong><br/>
          Selesai: <span style="color: #10b981; font-weight: bold;">${completed} Task</span><br/>
          Belum: <span style="color: #f59e0b; font-weight: bold;">${pending} Task</span><br/>
          Total: <span style="font-weight: bold;">${total} Task</span>
        </div>`;
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "center",
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-sm border border-gray-200 dark:border-gray-700">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-lg">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          Grafik Task Pegawai
        </h3>
      </div>
      <div className="p-4">
        <style>{`
          .apexcharts-legend-series[seriesname*="_jadwal"],
          .apexcharts-legend-series[seriesname*="_trend"] {
            display: none !important;
          }
        `}</style>
        <div id="pegawaiPerformanceChart" className="max-w-full overflow-x-auto custom-scrollbar">
          <div style={{ minWidth: "800px" }}>
            <ReactApexChart
              options={options}
              series={chartData.series}
              type="bar"
              height={320}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
