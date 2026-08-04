"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "@/types/common";

/**
 * Line + gradient-area chart used by the daily/monthly sales cards.
 * Brand purple line, soft fade fill, minimal axes — matches the mockup.
 */
export function MiniAreaChart({
  data,
  yTicks,
  gradientId,
}: {
  data: ChartPoint[];
  yTicks: number[];
  gradientId: string;
}) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6D28D9" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#6D28D9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            dy={8}
            interval={0}
            minTickGap={0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            ticks={yTicks}
            domain={[0, yTicks[yTicks.length - 1]]}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: "#ECECF3", strokeWidth: 1 }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #ECECF3",
              boxShadow: "0 12px 30px rgba(15,23,42,.12)",
              fontSize: 13,
              padding: "8px 12px",
            }}
            labelStyle={{ color: "#6B7280", fontWeight: 500, marginBottom: 2 }}
            itemStyle={{ color: "#141625", fontWeight: 600 }}
            formatter={(value: number) => [value, "Ventas"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#6D28D9"
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={{ r: 3, fill: "#6D28D9", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#6D28D9", stroke: "#fff", strokeWidth: 2 }}
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
