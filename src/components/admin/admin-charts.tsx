"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "@/types/common";
import type { NamedValue } from "@/types/admin-dashboard";

const BRAND = "#6D28D9";
const AXIS_TICK = { fill: "#9ca3af", fontSize: 11 };
const CHART_HEIGHT = 160;

/** Ventas por asesora — barras verticales con valor arriba. */
export function AdvisorBarChart({ data }: { data: NamedValue[] }) {
  return (
    <div className="w-full" style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={6} />
          <Bar dataKey="value" fill={BRAND} radius={[6, 6, 0, 0]} maxBarSize={34}>
            <LabelList
              dataKey="value"
              position="top"
              style={{ fill: "#141625", fontSize: 13, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ventas por día — línea con puntos y valores. */
export function DailyLineChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="w-full" style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 18, right: 8, left: 8, bottom: 0 }}>
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={6} interval={0} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={BRAND}
            strokeWidth={2.5}
            dot={{ r: 4, fill: BRAND, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          >
            <LabelList
              dataKey="value"
              position="top"
              style={{ fill: "#141625", fontSize: 12, fontWeight: 700 }}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras horizontales con etiqueta a la izquierda y valor al final. */
export function HorizontalBarChart({ data }: { data: NamedValue[] }) {
  return (
    <div className="w-full" style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 36, left: 4, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} stroke="#f1f1f6" />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 12 }}
            width={88}
          />
          <Bar dataKey="value" fill={BRAND} radius={[0, 6, 6, 0]} barSize={14}>
            <LabelList
              dataKey="value"
              position="right"
              style={{ fill: "#141625", fontSize: 13, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
