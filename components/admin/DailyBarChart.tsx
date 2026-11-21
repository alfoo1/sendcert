'use client';

import { useState } from 'react';

export type DailyPoint = { date: string; value: number };

type Props = {
  data: DailyPoint[];
  label: string; // what one unit is, e.g. "certificates"
};

const WIDTH = 900;
const HEIGHT = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 40 };
const GAP = 2; // surface gap between adjacent columns
const MAX_BAR = 24;
const RADIUS = 4;

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s * 4 >= value) ?? magnitude * 10;
  return step * 4;
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// Column with a rounded data end and a square baseline.
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(RADIUS, w / 2, h);
  const bottom = y + h;
  return `M${x},${bottom} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${bottom} Z`;
}

export default function DailyBarChart({ data, label }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.min(MAX_BAR, slot - GAP);
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const labelEvery = Math.ceil(data.length / 8);
  const activePoint = active !== null ? data[active] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Daily ${label}, last ${data.length} days`}
        onMouseLeave={() => setActive(null)}
      >
        {ticks.map((t) => {
          const y = PAD.top + plotH - (t / max) * plotH;
          return (
            <g key={t}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={PAD.left - 8} y={y} textAnchor="end" dominantBaseline="central" fontSize={11} fill="#6b7280" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {t.toLocaleString('en-US')}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const h = (d.value / max) * plotH;
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const y = PAD.top + plotH - h;
          return (
            <g key={d.date}>
              {d.value > 0 && (
                <path d={columnPath(x, y, barW, h)} fill="#4f46e5" opacity={active === null || active === i ? 1 : 0.55} />
              )}
              {/* Hit target is the whole slot, taller than the bar itself. */}
              <rect
                x={PAD.left + i * slot}
                y={PAD.top}
                width={slot}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${formatDay(d.date)}: ${d.value} ${label}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                style={{ outline: 'none' }}
              />
              {i % labelEvery === 0 && (
                <text x={PAD.left + i * slot + slot / 2} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="#6b7280">
                  {formatDay(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {activePoint && active !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-sm"
          style={{
            left: `${((PAD.left + active * slot + slot / 2) / WIDTH) * 100}%`,
            top: 0,
          }}
        >
          <div className="font-semibold text-gray-900">
            {activePoint.value.toLocaleString('en-US')} {label}
          </div>
          <div className="text-gray-500">{formatDay(activePoint.date)}</div>
        </div>
      )}
    </div>
  );
}
