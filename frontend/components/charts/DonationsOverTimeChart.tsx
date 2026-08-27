"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function DonationsOverTimeChart({ data }: { data: { month: string; amount: number }[] }) {
  if (data.length === 0) {
    return <div className="flex h-56 items-center justify-center text-sm text-muted">No donations recorded yet.</div>;
  }

  return (
    <div className="viz-root h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--viz-muted)" }} axisLine={{ stroke: "var(--viz-grid)" }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--viz-muted)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₹${v.toLocaleString()}`}
            width={68}
          />
          <Tooltip
            contentStyle={{ background: "var(--viz-surface)", border: "1px solid var(--viz-grid)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "var(--viz-text-secondary)" }}
            formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Raised"]}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="var(--viz-series-1)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--viz-series-1)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
