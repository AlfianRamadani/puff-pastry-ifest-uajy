"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { getStudyChartData, type Timeframe } from "./studyData";

const TIMEFRAMES: Timeframe[] = ["Day", "Week", "Month", "Sem"];

const StudyChart = dynamic(() => import("./StudyChart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 md:h-64 bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center">
      <span className="font-bold text-sm text-gray-400 uppercase tracking-wide">Loading chart...</span>
    </div>
  ),
});

const StudyPatternCard: React.FC = () => {
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>("Week");

  const chartData = useMemo(
    () => getStudyChartData(activeTimeframe),
    [activeTimeframe]
  );

  return (
    <section className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 md:p-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="font-black text-lg md:text-xl text-black uppercase tracking-wide">
          Study Pattern
        </h2>

        {/* Timeframe Segmented Control */}
        <div
          role="group"
          aria-label="Study pattern timeframe"
          className="flex border-[3px] border-black overflow-hidden self-start sm:self-auto"
        >
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              aria-pressed={activeTimeframe === tf}
              className={`px-3 md:px-5 py-2.5 md:py-2 font-black text-xs md:text-sm tracking-wide transition-colors border-r-[3px] border-black last:border-r-0 ${
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

      {/* Chart (dynamically loaded, no SSR) */}
      <StudyChart data={chartData} timeframeLabel={activeTimeframe} />
    </section>
  );
};

export default StudyPatternCard;
