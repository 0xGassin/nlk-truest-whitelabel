"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface CVSSGaugeProps {
  score: number;
}

/** Data structure for gauge segments */
interface GaugeSegment {
  [key: string]: number | string;
  color: string;
  name: string;
  range: string;
  value: number;
}

const gaugeData: GaugeSegment[] = [
  { color: "#3b82f6", name: "Low", range: "0 - 3.9", value: 3.9 }, // blue-500
  { color: "#f97316", name: "Medium", range: "4.0 - 6.9", value: 3 }, // orange-500
  { color: "#ef4444", name: "High", range: "7.0 - 10.0", value: 3.1 }, // red-500
];

/** Payload item structure for recharts tooltip */
interface TooltipPayloadItem {
  payload?: GaugeSegment;
}

/** Custom tooltip props */
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

/** Custom tooltip component for the CVSS gauge */
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length > 0 && payload[0].payload) {
    const data = payload[0].payload;
    return (
      <div className="rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md">
        <p className="font-medium">{data.name}</p>
        <p className="text-muted-foreground">{data.range}</p>
      </div>
    );
  }
  return null;
}

export function CVSSGauge({ score }: CVSSGaugeProps) {
  return (
    <div className="flex items-center gap-6">
      {/* Gauge Chart */}
      <div className="relative h-[80px] w-[160px] flex-shrink-0">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              cx="50%"
              cy="100%"
              data={gaugeData}
              dataKey="value"
              endAngle={0}
              innerRadius={50}
              outerRadius={70}
              paddingAngle={0}
              startAngle={180}
              stroke="none"
            >
              {gaugeData.map((entry) => (
                <Cell fill={entry.color} key={entry.name} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
          </PieChart>
        </ResponsiveContainer>
        {/* Overlay Needle - Z-Index 10 to sit above chart but below tooltip (1000) */}
        <svg className="pointer-events-none absolute top-0 left-0 z-10 size-full overflow-visible" viewBox="0 0 160 80">
          <g transform="translate(80, 80)">
            <line
              className="stroke-black dark:stroke-white"
              strokeLinecap="butt"
              strokeWidth="4"
              x1={50 * Math.cos(((180 + (score / 10) * 180) * Math.PI) / 180)}
              x2={70 * Math.cos(((180 + (score / 10) * 180) * Math.PI) / 180)}
              y1={50 * Math.sin(((180 + (score / 10) * 180) * Math.PI) / 180)}
              y2={70 * Math.sin(((180 + (score / 10) * 180) * Math.PI) / 180)}
            />
          </g>
        </svg>
      </div>

      {/* Score Display */}
      <div className="flex flex-col">
        <span className="mb-0.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">CVSS Score</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tracking-tighter">{score.toFixed(1)}</span>
          <span className="text-sm font-medium text-muted-foreground">/ 10</span>
        </div>
      </div>
    </div>
  );
}
