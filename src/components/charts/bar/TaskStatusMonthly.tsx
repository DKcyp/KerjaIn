"use client";
import React from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type SeriesItem = { name: string; data: number[] };

export default function TaskStatusMonthly({
  categories,
  series,
}: {
  categories: string[]; // e.g., ["Jan", "Feb", ...]
  series: SeriesItem[]; // one series per status
}) {
  const options: ApexOptions = {
    chart: {
      type: "bar",
      height: 280,
      toolbar: { show: false },
      fontFamily: "Outfit, sans-serif",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "38%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { rotate: -15 },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 3, colors: ["transparent"] },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit, sans-serif",
    },
    colors: ["#9ca3af", "#60a5fa", "#f59e0b", "#10b981"], // grey, blue, amber, emerald
    grid: { yaxis: { lines: { show: true } } },
    tooltip: {
      y: { formatter: (v: number) => `${v}` },
    },
  };

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div className="min-w-[900px]">
        <ReactApexChart options={options} series={series} type="bar" height={280} />
      </div>
    </div>
  );
}
