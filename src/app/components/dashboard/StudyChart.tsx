"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import type { StudyDayData } from "./studyData";

// Hoisted static config to avoid re-creating objects on every render
const CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 0 } as const;
const X_TICK = { fontSize: 12, fontWeight: 800, fill: "#000" } as const;
const X_AXIS_LINE = { stroke: "#000", strokeWidth: 2 } as const;
const Y_TICK = { fontSize: 12, fontWeight: 800, fill: "#000" } as const;
const DOT_STYLE = { r: 5, fill: "#fff", stroke: "#000", strokeWidth: 2 } as const;
const ACTIVE_DOT = { r: 7, fill: "#FFC107", stroke: "#000", strokeWidth: 2 } as const;
const TOOLTIP_STYLE = {
  border: "3px solid #000",
  background: "#fff",
  fontWeight: 800,
  fontSize: 13,
  boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)",
} as const;

interface StudyChartProps {
  data: StudyDayData[];
  timeframeLabel: string;
}

const StudyChart: React.FC<StudyChartProps> = ({ data, timeframeLabel }) => {
  const peakPoint = useMemo(() => {
    return data.reduce(
      (max, point) => (point.hours > max.hours ? point : max),
      data[0]
    );
  }, [data]);

  return (
    <div
      className="w-full h-48 md:h-64"
      role="img"
      aria-label={`Study pattern chart showing ${timeframeLabel.toLowerCase()} performance data`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="day"
            tick={X_TICK}
            axisLine={X_AXIS_LINE}
            tickLine={false}
          />
          <YAxis tick={Y_TICK} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [`${value}h`, "Study"]}
          />
          <Line
            type="monotone"
            dataKey="hours"
            stroke="#000"
            strokeWidth={3}
            dot={DOT_STYLE}
            activeDot={ACTIVE_DOT}
          />
          <ReferenceDot
            x={peakPoint.day}
            y={peakPoint.hours}
            r={8}
            fill="#FFC107"
            stroke="#000"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StudyChart;
