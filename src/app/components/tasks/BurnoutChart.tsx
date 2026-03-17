"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface BurnoutChartProps {
  data: Array<{ day: string; probability: number }>;
}

export default function BurnoutChart({ data }: BurnoutChartProps) {
  return (
    <div className="border-[3px] border-black bg-white p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-sm uppercase tracking-wide text-black">
          Burnout Probability
        </h3>
        <span className="px-2.5 py-0.5 border-2 border-black bg-[#FFC107] font-black text-xs uppercase tracking-wide">
          7 Day Trend
        </span>
      </div>
      <div className="h-[250px]" role="img" aria-label="Burnout probability chart over 7 days">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id="burnoutGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: "#000", strokeWidth: 2 }}
            />
            <YAxis
              tick={{ fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: "#000", strokeWidth: 2 }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                border: "3px solid #000",
                borderRadius: 0,
                fontWeight: 900,
                fontSize: 12,
              }}
              formatter={(value) => [`${value}%`, "Probability"]}
            />
            <Area
              type="monotone"
              dataKey="probability"
              stroke="#FF4444"
              strokeWidth={3}
              fill="url(#burnoutGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
