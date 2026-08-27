"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

export default function TopDonorsChart({ data }: { data: { name: string; total_donated: number }[] }) {
  if (data.length === 0) {
    return <div className="flex h-56 items-center justify-center text-sm text-muted">No donors yet.</div>;
  }

  return (
    <div className="viz-root h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 48, bottom: 0, left: 0 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "var(--viz-text-secondary)" }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Bar dataKey="total_donated" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((_, i) => (
              <Cell key={i} fill="var(--viz-series-2)" />
            ))}
            <LabelList
              dataKey="total_donated"
              position="right"
              formatter={(v) => `₹${Number(v).toLocaleString()}`}
              style={{ fill: "var(--viz-text-secondary)", fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
