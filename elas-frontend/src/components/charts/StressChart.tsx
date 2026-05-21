"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { gridColor, tickColor, stressColor, stressFill } from "./chartTheme";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function StressChart({ labels, values }: { labels: string[]; values: number[] }) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: "Stress",
            data: values,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            borderColor: stressColor,
            backgroundColor: stressFill,
            fill: true,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(11,11,18,0.92)",
            borderColor: "rgba(255,255,255,0.12)",
            borderWidth: 1,
            titleColor: "rgba(255,255,255,0.92)",
            bodyColor: "rgba(255,255,255,0.75)",
          },
        },
        scales: {
          x: { grid: { color: gridColor() }, ticks: { color: tickColor() } },
          y: { grid: { color: gridColor() }, ticks: { color: tickColor() }, min: 0, max: 100 },
        },
      }}
    />
  );
}
