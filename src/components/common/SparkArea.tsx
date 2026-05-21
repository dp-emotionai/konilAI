import React from "react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function SparkArea({
  values,
  height = 170,
}: {
  values: number[];
  height?: number;
}) {
  const w = 600;
  const h = 180;

  const min = 0;
  const max = 100;

  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * w;
    const y = h - ((clamp(v, min, max) - min) / (max - min)) * (h - 24) - 12;
    return { x, y };
  });

  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <div className="relative w-full overflow-hidden rounded-elas-lg bg-surface-subtle" style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="elasLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(142,91,255,0.55)" />
            <stop offset="1" stopColor="rgba(142,91,255,0.16)" />
          </linearGradient>
          <linearGradient id="elasFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(142,91,255,0.18)" />
            <stop offset="1" stopColor="rgba(142,91,255,0.00)" />
          </linearGradient>
        </defs>

        {/* grid */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={i}
            x1="0"
            x2={w}
            y1={20 + i * 28}
            y2={20 + i * 28}
            stroke="rgba(15,18,34,0.06)"
            strokeWidth="1"
          />
        ))}

        <path d={area} fill="url(#elasFill)" />
        <path d={line} fill="none" stroke="url(#elasLine)" strokeWidth="3" />
      </svg>

      {/* soft glow */}
      <div
        className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(142,91,255,.12), transparent 60%)" }}
      />
    </div>
  );
}