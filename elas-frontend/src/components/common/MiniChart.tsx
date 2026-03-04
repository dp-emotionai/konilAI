import React from "react";

export default function MiniChart({ height = 180 }: { height?: number }) {
  // статичный “реалистичный” path
  const d =
    "M0,120 C40,90 80,150 120,110 C160,70 200,120 240,95 C280,70 320,120 360,85 C400,55 440,100 480,75 C520,55 560,95 600,70";

  return (
    <div className="relative w-full overflow-hidden rounded-elas-lg bg-surface-subtle" style={{ height }}>
      <svg viewBox="0 0 600 180" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(142,91,255,0.55)" />
            <stop offset="1" stopColor="rgba(142,91,255,0.10)" />
          </linearGradient>
          <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(142,91,255,0.18)" />
            <stop offset="1" stopColor="rgba(142,91,255,0.00)" />
          </linearGradient>
        </defs>

        {/* grid */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={i}
            x1="0"
            x2="600"
            y1={20 + i * 28}
            y2={20 + i * 28}
            stroke="rgba(15,18,34,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* area */}
        <path d={`${d} L600,180 L0,180 Z`} fill="url(#g2)" />
        {/* line */}
        <path d={d} fill="none" stroke="url(#g1)" strokeWidth="3" />
      </svg>

      {/* subtle glow */}
      <div
        className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(142,91,255,.14), transparent 60%)" }}
      />
    </div>
  );
}