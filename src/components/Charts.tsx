import React from "react";

interface ChartData {
  label: string;
  value: number;
  color: string;
}

export function PieChart({ data, size = 160 }: { data: ChartData[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="text-echo-dim text-xs text-center">NO DATA</div>;

  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  let cumAngle = -90;

  const slices = data.filter((d) => d.value > 0).map((d) => {
    const angle = (d.value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;

    const s1 = (startAngle * Math.PI) / 180;
    const s2 = (endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s1);
    const y1 = cy + r * Math.sin(s1);
    const x2 = cx + r * Math.cos(s2);
    const y2 = cy + r * Math.sin(s2);
    const large = angle > 180 ? 1 : 0;

    const path = angle >= 359.99
      ? `M ${cx - r},${cy} A ${r},${r} 0 1,1 ${cx + r},${cy} A ${r},${r} 0 1,1 ${cx - r},${cy}`
      : `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${large},1 ${x2},${y2} Z`;

    return { ...d, path, pct: Math.round((d.value / total) * 100) };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#0a0a0f" strokeWidth="2" opacity="0.85">
            <title>{s.label}: {s.value} ({s.pct}%)</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r={r * 0.45} fill="#0a0a0f" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#e0e0e0" fontSize="18" fontFamily="monospace" fontWeight="bold">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#666" fontSize="8" fontFamily="monospace">TOTAL</text>
      </svg>
      <div className="space-y-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-mono">
            <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-echo-dim uppercase">{s.label}</span>
            <span className="text-echo-text font-bold">{s.value}</span>
            <span className="text-echo-dim">({s.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart({ data, maxHeight = 120 }: { data: ChartData[]; maxHeight?: number }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-3" style={{ height: maxHeight + 30 }}>
      {data.map((d, i) => {
        const h = (d.value / maxVal) * maxHeight;
        return (
          <div key={i} className="flex flex-col items-center gap-1" style={{ minWidth: 48 }}>
            <span className="text-echo-text text-xs font-bold font-mono">{d.value}</span>
            <div
              className="w-10 transition-all duration-500 relative group"
              style={{ height: h, backgroundColor: d.color, opacity: 0.8, minHeight: d.value > 0 ? 4 : 0 }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-30 bg-white transition-opacity" />
            </div>
            <span className="text-echo-dim text-[9px] uppercase font-mono text-center leading-tight">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function StatusBar({ data }: { data: ChartData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden border border-echo-border">
        {data.filter((d) => d.value > 0).map((d, i) => (
          <div
            key={i}
            className="h-full flex items-center justify-center text-[9px] font-mono font-bold text-echo-black relative group"
            style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color, opacity: 0.85 }}
          >
            {(d.value / total) > 0.08 && d.value}
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2">
        {data.filter((d) => d.value > 0).map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono">
            <div className="w-2 h-2" style={{ backgroundColor: d.color }} />
            <span className="text-echo-dim uppercase">{d.label}</span>
            <span className="text-echo-text">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
