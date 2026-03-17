"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Activity, Clock, Flame, FileDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const BurnoutChart = dynamic(() => import("./BurnoutChart"), {
  ssr: false,
  loading: () => (
    <div className="border-[3px] border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-[330px] flex items-center justify-center">
      <p className="font-black text-xs uppercase tracking-wide text-gray-400 animate-pulse">Loading chart...</p>
    </div>
  ),
});

type RiskLevel = "CRITICAL" | "MODERATE" | "LOW";
type DeadlineUrgency = "HIGH" | "MEDIUM" | "LOW";

type TaskRow = {
  id: string;
  title: string;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  workload_impact: number | null;
};

type SnapshotRow = {
  probability: number;
  snapshot_date: string;
};

type Metric = {
  taskId: string;
  taskName: string;
  contribution: number;
  riskLevel: RiskLevel;
};

type BurnoutReport = {
  summary: string;
  riskLevel: RiskLevel | "HIGH";
  recommendations: string[];
};

const RISK_CONFIG: Record<RiskLevel, { bg: string; text: string; barColor: string }> = {
  CRITICAL: { bg: "bg-[#FF4444]", text: "text-white", barColor: "bg-[#FF4444]" },
  MODERATE: { bg: "bg-[#FFC107]", text: "text-black", barColor: "bg-[#FFC107]" },
  LOW: { bg: "bg-[#B3FFB3]", text: "text-black", barColor: "bg-[#B3FFB3]" },
};

function normalizeStatus(value: string | null): string {
  return (value ?? "not_started").toLowerCase();
}

function normalizePriority(value: string | null): string {
  return (value ?? "medium").toLowerCase();
}

function dayDiffFromToday(dateStr: string): number {
  const today = new Date();
  const due = new Date(dateStr);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function inferWorkload(task: TaskRow): number {
  const status = normalizeStatus(task.status);
  if (status === "done") return 0;

  let score = 50;
  const priority = normalizePriority(task.priority);
  if (priority === "high") score = 80;
  if (priority === "low") score = 25;

  if (task.due_date) {
    const overdueDays = Math.max(0, dayDiffFromToday(task.due_date));
    score += overdueDays * 5;
  }

  return Math.max(0, Math.min(100, score));
}

function toRiskLevel(contribution: number): RiskLevel {
  if (contribution >= 70) return "CRITICAL";
  if (contribution >= 40) return "MODERATE";
  return "LOW";
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return "Today";
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function dateToIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildLast7Days(todayIso: string, snapshots: SnapshotRow[]): Array<{ day: string; probability: number }> {
  const today = new Date(`${todayIso}T00:00:00`);
  const map = new Map(snapshots.map((s) => [s.snapshot_date, Number(s.probability)]));

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const iso = dateToIso(date);
    return {
      day: formatDayLabel(iso),
      probability: map.get(iso) ?? 0,
    };
  });
}

export default function BurnoutAnalysisTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [trend, setTrend] = useState<Array<{ day: string; probability: number }>>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [activeTasksCount, setActiveTasksCount] = useState(0);
  const [deadlineUrgency, setDeadlineUrgency] = useState<DeadlineUrgency>("LOW");
  const [workloadIntensity, setWorkloadIntensity] = useState(0);
  const [reportLoading, setReportLoading] = useState(false);

  const loadBurnoutData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = dateToIso(today);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    const sevenDaysAgoIso = dateToIso(sevenDaysAgo);

    const [tasksResult, coursesResult] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, priority, status, due_date, workload_impact")
        .eq("user_id", user.id),
      supabase
        .from("courses")
        .select("credits")
        .eq("user_id", user.id),
    ]);

    if (tasksResult.error || coursesResult.error) {
      setLoading(false);
      setErrorMessage(tasksResult.error?.message ?? coursesResult.error?.message ?? "Failed to load burnout data.");
      return;
    }

    const allTasks = (tasksResult.data as TaskRow[]) ?? [];
    const activeTasks = allTasks.filter((task) => normalizeStatus(task.status) !== "done");
    const overdueTasks = activeTasks.filter((task) => task.due_date && dayDiffFromToday(task.due_date) > 0);
    const dueSoonCount = activeTasks.filter((task) => {
      if (!task.due_date) return false;
      const due = new Date(`${task.due_date}T00:00:00`);
      const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 3;
    }).length;

    const totalCredits = ((coursesResult.data as Array<{ credits: number }> | null) ?? []).reduce(
      (sum, row) => sum + (row.credits ?? 0),
      0,
    );
    const nextWorkloadIntensity = Number(
      Math.min(10, activeTasks.length * 0.3 + overdueTasks.length * 0.5 + totalCredits / 30).toFixed(1),
    );

    const computedProbability = Math.min(100, nextWorkloadIntensity * 10 + overdueTasks.length * 5);

    const recalculated = activeTasks.map((task) => ({
      ...task,
      workload: task.workload_impact ?? inferWorkload(task),
      needsUpdate: task.workload_impact == null,
    }));

    const updates = recalculated.filter((task) => task.needsUpdate);
    if (updates.length > 0) {
      await Promise.all(
        updates.map((task) =>
          supabase
            .from("tasks")
            .update({ workload_impact: task.workload })
            .eq("id", task.id)
            .eq("user_id", user.id),
        ),
      );
    }

    const tableMetrics = recalculated
      .sort((a, b) => b.workload - a.workload)
      .map((task) => ({
        taskId: task.id,
        taskName: task.title,
        contribution: task.workload,
        riskLevel: toRiskLevel(task.workload),
      }));

    const urgency: DeadlineUrgency =
      dueSoonCount >= 3 ? "HIGH" : dueSoonCount >= 1 ? "MEDIUM" : "LOW";

    const { error: upsertSnapshotError } = await supabase
      .from("burnout_snapshots")
      .upsert(
        {
          user_id: user.id,
          probability: computedProbability,
          workload_intensity: nextWorkloadIntensity,
          active_tasks_count: activeTasks.length,
          snapshot_date: todayIso,
        },
        { onConflict: "user_id,snapshot_date" },
      );

    if (upsertSnapshotError) {
      setLoading(false);
      setErrorMessage(upsertSnapshotError.message);
      return;
    }

    const { data: trendRows, error: trendError } = await supabase
      .from("burnout_snapshots")
      .select("probability, snapshot_date")
      .eq("user_id", user.id)
      .gte("snapshot_date", sevenDaysAgoIso)
      .order("snapshot_date", { ascending: true });

    if (trendError) {
      setLoading(false);
      setErrorMessage(trendError.message);
      return;
    }

    setActiveTasksCount(activeTasks.length);
    setDeadlineUrgency(urgency);
    setWorkloadIntensity(nextWorkloadIntensity);
    setMetrics(tableMetrics);
    setTrend(buildLast7Days(todayIso, (trendRows as SnapshotRow[]) ?? []));
    setLoading(false);
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void loadBurnoutData(), [loadBurnoutData]);

  const handleGenerateReport = useCallback(async () => {
    if (!user) return;

    setReportLoading(true);
    setErrorMessage(null);
    const { data, error } = await supabase.functions.invoke("burnout-report", {
      body: { userId: user.id },
    });
    setReportLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const payload = data as Partial<BurnoutReport> | null;
    const report = {
      summary: payload?.summary ?? "No summary returned.",
      riskLevel: payload?.riskLevel ?? "MODERATE",
      recommendations: payload?.recommendations ?? [],
    };

    const lines = [
      "BURNOUT ANALYSIS REPORT",
      `Generated: ${new Date().toLocaleString()}`,
      "=".repeat(40),
      "",
      "SUMMARY",
      report.summary,
      "",
      `RISK LEVEL: ${report.riskLevel}`,
      "",
      "RECOMMENDATIONS",
      ...(report.recommendations.length > 0 ? report.recommendations.map((item, idx) => `${idx + 1}. ${item}`) : ["No recommendations returned."]),
      "",
      "7-DAY TREND",
      ...trend.map((t) => `  ${t.day}: ${t.probability}%`),
      "",
      "WORKLOAD IMPACT",
      ...metrics.map((m) => `  [${m.riskLevel}] ${m.taskName} — ${m.contribution}%`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "burnout-report.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, trend, user]);

  const deadlineSubtext = useMemo(() => {
    if (deadlineUrgency === "HIGH") return "Many Due Soon";
    if (deadlineUrgency === "MEDIUM") return "Some Due Soon";
    return "On Track";
  }, [deadlineUrgency]);

  return (
    <div className="space-y-6">
      <p className="font-bold text-sm text-gray-500">Monitor your workload and catch burnout before it hits.</p>

      {errorMessage && (
        <div className="border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs text-black">{errorMessage}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border-[3px] border-black bg-[#FFC107] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-black" strokeWidth={2.5} />
            <span className="font-black text-xs uppercase tracking-wide text-black">Active Tasks</span>
          </div>
          <p className="font-black text-4xl text-black">
            {loading ? "..." : activeTasksCount} <span className="text-lg">Active</span>
          </p>
        </div>

        <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-black" strokeWidth={2.5} />
            <span className="font-black text-xs uppercase tracking-wide text-black">Upcoming Deadlines</span>
          </div>
          <p className="font-black text-4xl text-black">
            {loading ? "..." : deadlineUrgency} <span className="text-lg">{deadlineSubtext}</span>
          </p>
        </div>

        <div className="border-[3px] border-black bg-[#FFB3C1] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-black" strokeWidth={2.5} />
            <span className="font-black text-xs uppercase tracking-wide text-black">Workload Intensity</span>
          </div>
          <p className="font-black text-4xl text-black">
            {loading ? "..." : workloadIntensity.toFixed(1)} <span className="text-lg">/ 10</span>
          </p>
        </div>
      </div>

      <BurnoutChart data={trend} />

      <div>
        <h3 className="font-black text-lg uppercase tracking-wide text-black mb-4">Detailed Analysis</h3>

        <div className="hidden md:block border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b-[3px] border-black bg-gray-50">
                <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black">Task Name</th>
                <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-64">Workload Impact</th>
                <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-28">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.taskId} className="border-b-2 border-black last:border-b-0">
                  <td className="px-4 py-3 font-bold text-sm text-black">{m.taskName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-4 border-2 border-black bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={m.contribution} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.taskName} workload impact`}>
                        <div className={`h-full ${RISK_CONFIG[m.riskLevel].barColor} transition-all duration-300`} style={{ width: `${m.contribution}%` }} />
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
              {metrics.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center font-black text-xs uppercase text-gray-500">
                    No active tasks to analyze.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col gap-3">
          {metrics.map((m) => (
            <div key={m.taskId} className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start justify-between mb-2">
                <p className="font-bold text-sm text-black flex-1">{m.taskName}</p>
                <span className={`inline-block px-2 py-0.5 border-2 border-black font-black text-xs uppercase shrink-0 ml-2 ${RISK_CONFIG[m.riskLevel].bg} ${RISK_CONFIG[m.riskLevel].text}`}>
                  {m.riskLevel}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 border-2 border-black bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={m.contribution} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.taskName} workload impact`}>
                  <div className={`h-full ${RISK_CONFIG[m.riskLevel].barColor}`} style={{ width: `${m.contribution}%` }} />
                </div>
                <span className="font-black text-xs text-black">{m.contribution}%</span>
              </div>
            </div>
          ))}
          {metrics.length === 0 && (
            <div className="border-[3px] border-black bg-white p-4 text-center font-black text-xs uppercase text-gray-500">
              No active tasks to analyze.
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => void handleGenerateReport()}
        disabled={reportLoading}
        className="flex items-center gap-2 px-6 py-3 bg-[#FFC107] border-[3px] border-black font-black text-xs uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
      >
        <FileDown className="w-4 h-4" strokeWidth={2.5} />
        {reportLoading ? "Generating..." : "Generate Report"}
      </button>

    </div>
  );
}
