"use client";
import React from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface HorizontalBarChartProps {
  categories: string[];
  data: number[];
  title?: string;
  color?: string;
  height?: number;
}

export default function HorizontalBarChart({
  categories,
  data,
  title = "Data",
  color = "#3b82f6",
  height = 350,
}: HorizontalBarChartProps) {
  const options: ApexOptions = {
    colors: [color],
    chart: {
      fontFamily: "Inter, sans-serif",
      type: "bar",
      height: height,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        columnWidth: "55%",
        borderRadius: 4,
        borderRadiusApplication: "end",
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      offsetX: 30,
      style: {
        fontSize: "12px",
        colors: ["#304758"],
      },
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      title: {
        text: undefined,
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} proyek`,
      },
    },
  };

  const series = [
    {
      name: title,
      data: data,
    },
  ];

  return (
    <div className="w-full">
      <ReactApexChart
        options={options}
        series={series}
        type="bar"
        height={height}
      />
    </div>
  );
}
