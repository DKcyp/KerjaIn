"use client";
import React from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface DonutChartProps {
  series: number[];
  labels: string[];
  colors?: string[];
  height?: number;
}

export default function DonutChart({
  series,
  labels,
  colors = ["#10b981", "#ef4444"],
  height = 300,
}: DonutChartProps) {
  const options: ApexOptions = {
    chart: {
      fontFamily: "Inter, sans-serif",
      type: "donut",
    },
    colors: colors,
    labels: labels,
    legend: {
      show: true,
      position: "bottom",
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: "Total",
              fontSize: "16px",
              fontWeight: 600,
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: {
            width: 200,
          },
          legend: {
            position: "bottom",
          },
        },
      },
    ],
  };

  return (
    <div className="w-full flex justify-center">
      <ReactApexChart
        options={options}
        series={series}
        type="donut"
        height={height}
      />
    </div>
  );
}
