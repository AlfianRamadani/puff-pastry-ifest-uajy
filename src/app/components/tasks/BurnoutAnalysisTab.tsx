"use client";

import React, { useCallback } from "react";
import dynamic from "next/dynamic";
import { Activity, Clock, Flame, FileDown } from "lucide-react";
import { getBurnoutTrend, getBurnoutMetrics, type BurnoutMetric } from "./burnoutData";

const BurnoutChart = dynamic(() => import("./BurnoutChart"), {
  ssr: false,
  loading: () => (
    <div className="border-[3px] border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-[330px] flex items-center justify-center">
      <p className="font-black text-xs uppercase tracking-wide text-gray-400 animate-pulse">Loading chart...</p>
    </div>
  ),
});

const RISK_CONFIG: Record<BurnoutMetric["riskLevel"], { bg: string; text: string; barColor: string }> = {
  CRITICAL: { bg: "bg-[#FF4444]", text: "text-white", barColor: "bg-[#FF4444]" },
  MODERATE: { bg: "bg-[#FFC107]", text: "text-black", barColor: "bg-[#FFC107]" },
  LOW: { bg: "bg-[#B3FFB3]", text: "text-black", barColor: "bg-[#B3FFB3]" },
};

export default function BurnoutAnalysisTab() {
  const trend = getBurnoutTrend();
  const metrics = getBurnoutMetrics();

  const handleGenerateReport = useCallback(() => {
    const lines = [
      "BURNOUT ANALYSIS REPORT",
      `Generated: ${new Date().toLocaleString()}`,
      "=".repeat(40),
      "",
      "7-DAY TREND",
      ...trend.map((t) => `  ${t.day}: ${t.probability}%`),
      "",
      "TASK RISK BREAKDOWN",
      ...metrics.map((m) => `  [${m.riskLevel}] ${m.taskName} — ${m.contribution}%`),
      "",
      `Current Burnout Probability: ${trend[trend.length - 1]?.probability ?? 0}%`,
      `Critical Tasks: ${metrics.filter((m) => m.riskLevel === "CRITICAL").length}`,
      `Moderate Tasks: ${metrics.filter((m) => m.riskLevel === "MODERATE").length}`,
      `Low Risk Tasks: ${metrics.filter((m) => m.riskLevel === "LOW").length}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "burnout-report.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [trend, metrics]);

  return (
    <div className="space-y-6">
      {/* Subtitle */}
      <p className="font-bold text-sm text-gray-500">
        Real-time detector for academic mental fatigue and task congestion.
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border-[3px] border-black bg-[#FFC107] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-black" strokeWidth={2.5} />
            <span className="font-black text-xs uppercase tracking-wide text-black">Task Density</span>
          </div>
          <p className="font-black text-4xl text-black">
            18 <span className="text-lg">Active</span>
          </p>
        </div>

        <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-black" strokeWidth={2.5} />
            <span className="font-black text-xs uppercase tracking-wide text-black">Deadline Proximity</span>
          </div>
          <p className="font-black text-4xl text-black">
            HIGH <span className="text-lg">Cluster</span>
          </p>
        </div>

        <div className="border-[3px] border-black bg-[#FFB3C1] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-black" strokeWidth={2.5} />
            <span className="font-black text-xs uppercase tracking-wide text-black">Workload Intensity</span>
          </div>
          <p className="font-black text-4xl text-black">
            9.2 <span className="text-lg">/ 10</span>
          </p>
        </div>
      </div>

      {/* Burnout Chart */}
      <BurnoutChart data={trend} />

      {/* Detailed Analysis Table */}
      <div>
        <h3 className="font-black text-lg uppercase tracking-wide text-black mb-4">
          Detailed Analysis
        </h3>

        {/* Desktop Table */}
        <div className="hidden md:block border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b-[3px] border-black bg-gray-50">
                <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black">Task Name</th>
                <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-64">Metric Contribution</th>
                <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-28">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.taskName} className="border-b-2 border-black last:border-b-0">
                  <td className="px-4 py-3 font-bold text-sm text-black">{m.taskName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-4 border-2 border-black bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={m.contribution} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.taskName} metric contribution`}>
                        <div
                          className={`h-full ${RISK_CONFIG[m.riskLevel].barColor} transition-all duration-300`}
                          style={{ width: `${m.contribution}%` }}
                        />
                      </div>
                      <span className="font-black text-xs text-black w-8">{m.contribution}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 border-2 border-black font-black text-xs uppercase tracking-wide ${RISK_CONFIG[m.riskLevel].bg} ${RISK_CONFIG[m.riskLevel].text}`}>
                      {m.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden flex flex-col gap-3">
          {metrics.map((m) => (
            <div key={m.taskName} className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start justify-between mb-2">
                <p className="font-bold text-sm text-black flex-1">{m.taskName}</p>
                <span className={`inline-block px-2 py-0.5 border-2 border-black font-black text-xs uppercase shrink-0 ml-2 ${RISK_CONFIG[m.riskLevel].bg} ${RISK_CONFIG[m.riskLevel].text}`}>
                  {m.riskLevel}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 border-2 border-black bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={m.contribution} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.taskName} metric contribution`}>
                  <div
                    className={`h-full ${RISK_CONFIG[m.riskLevel].barColor}`}
                    style={{ width: `${m.contribution}%` }}
                  />
                </div>
                <span className="font-black text-xs text-black">{m.contribution}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Report */}
      <button
        onClick={handleGenerateReport}
        className="flex items-center gap-2 px-6 py-3 bg-[#FFC107] border-[3px] border-black font-black text-xs uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2">
        <FileDown className="w-4 h-4" strokeWidth={2.5} />
        Generate Report
      </button>
    </div>
  );
}
