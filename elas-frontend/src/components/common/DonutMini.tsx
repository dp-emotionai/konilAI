import React from "react";

export default function DonutMini({
  values,
  labels,
}: {
  values: number[]; // sum ~ 100
  labels: string[];
}) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const normalized = values.map((v) => (v / total) * 100);

  // donut params
  const r = 44;
  const c = 2 * Math.PI * r;
  let offset = 0;

  // мягкие разные “чернила” без ручных цветов:
  // используем opacity ступенями (один акцентный + остальные нейтральнее)
  const strokes = normalized.map((_, i) =>
    i === 0 ? "rgba(142,91,255,0.75)" :
    i === 1 ? "rgba(142,91,255,0.45)" :
    i === 2 ? "rgba(15,18,34,0.20)" :
              "rgba(15,18,34,0.12)"
  );

  const segments = normalized.map((pct, i) => {
    const len = (pct / 100) * c;
    const dash = `${len} ${c - len}`;
    const seg = (
      <circle
        key={i}
        r={r}
        cx="60"
        cy="60"
        fill="transparent"
        stroke={strokes[i]}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={dash}
        strokeDashoffset={-offset}
      />
    );
    offset += len + 2; // небольшой gap
    return seg;
  });

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[120px] w-[120px]">
        <svg viewBox="0 0 120 120" className="h-full w-full">
          <circle
            r={r}
            cx="60"
            cy="60"
            fill="transparent"
            stroke="rgba(15,18,34,0.08)"
            strokeWidth="10"
          />
          <g transform="rotate(-90 60 60)">{segments}</g>
        </svg>

        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-sm font-semibold text-fg">{Math.round(normalized[0])}%</div>
            <div className="text-xs text-muted">{labels[0] ?? "Top"}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        {labels.map((lab, i) => (
          <div key={lab} className="flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: strokes[i] }}
            />
            <span className="text-fg">{lab}</span>
            <span className="text-muted">{Math.round(normalized[i] || 0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}