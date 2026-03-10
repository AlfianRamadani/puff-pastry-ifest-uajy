"use client";

import React, { useState, useMemo } from "react";
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
import { getStudyChartData, type Timeframe } from "./studyData";

const TIMEFRAMES: Timeframe[] = ["Day", "Week", "Month", "Sem"];

const StudyPatternCard: React.FC = () => {
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>("Week");

  const chartData = useMemo(
    () => getStudyChartData(activeTimeframe),
    [activeTimeframe]
  );

  const peakPoint = useMemo(() => {
    return chartData.reduce(
      (max, point) => (point.hours > max.hours ? point : max),
      chartData[0]
    );
  }, [chartData]);

  return (
    <section className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 md:p-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="font-black text-lg md:text-xl text-black uppercase tracking-wide">
          Study Pattern
        </h2>

        {/* Timeframe Segmented Control */}
        <div className="flex border-[3px] border-black overflow-hidden self-start sm:self-auto">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={`px-3 md:px-5 py-2 font-black text-xs md:text-sm tracking-wide transition-colors border-r-[3px] border-black last:border-r-0 ${
                activeTimeframe === tf
                  ? "bg-[#FFC107] text-black"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-48 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fontWeight: 800, fill: "#000" }}
              axisLine={{ stroke: "#000", strokeWidth: 2 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fontWeight: 800, fill: "#000" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                border: "3px solid #000",
                background: "#fff",
                fontWeight: 800,
                fontSize: 13,
                boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)",
              }}
              formatter={(value) => [`${value}h`, "Study"]}
            />
            <Line
              type="monotone"
              dataKey="hours"
              stroke="#000"
              strokeWidth={3}
              dot={{ r: 5, fill: "#fff", stroke: "#000", strokeWidth: 2 }}
              activeDot={{
                r: 7,
                fill: "#FFC107",
                stroke: "#000",
                strokeWidth: 2,
              }}
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
    </section>
  );
};

export default StudyPatternCard;
