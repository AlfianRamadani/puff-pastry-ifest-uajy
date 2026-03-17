"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Activity, CheckCircle2, Clock, FileDown, Flame, Info, ShieldAlert, X } from "lucide-react";
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

type RiskLevel = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
type TaskRiskLevel = "CRITICAL" | "MODERATE" | "LOW";
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

type CheckinRow = {
  checkin_date: string;
  mood: number;
  energy: number;
  sleep_hours: number;
  focus_quality: number;
  notes: string | null;
};

type InterventionRow = {
  recommendation_key: string;
  recommendation_text: string;
  status: "suggested" | "accepted" | "completed";
  outcome_7d: number | null;
};

type ModelWeights = {
  active_task_weight: number;
  overdue_task_weight: number;
  credit_weight: number;
  sleep_penalty_weight: number;
  energy_penalty_weight: number;
  mood_penalty_weight: number;
  last_alert_at: string | null;
};

type RecoveryPlanRow = {
  id: string;
  generated_at: string;
  before_score: number;
  after_score: number;
  plan_payload: { items?: Array<{ day: string; task: string; time: string }> } | null;
};

type Metric = {
  taskId: string;
  taskName: string;
  contribution: number;
  riskLevel: TaskRiskLevel;
};

type RecommendationItem = {
  key: string;
  text: string;
  historicalScore: number;
  status: "suggested" | "accepted" | "completed";
};

type BurnoutReport = {
  summary: string;
  riskLevel: RiskLevel;
  recommendations: string[];
};

const RISK_CONFIG: Record<TaskRiskLevel, { bg: string; text: string; barColor: string }> = {
  CRITICAL: { bg: "bg-[#FF4444]", text: "text-white", barColor: "bg-[#FF4444]" },
  MODERATE: { bg: "bg-[#FFC107]", text: "text-black", barColor: "bg-[#FFC107]" },
  LOW: { bg: "bg-[#B3FFB3]", text: "text-black", barColor: "bg-[#B3FFB3]" },
};

const OVERALL_RISK_STYLE: Record<RiskLevel, string> = {
  CRITICAL: "bg-[#FF4444] text-white",
  HIGH: "bg-[#FF7A45] text-black",
  MODERATE: "bg-[#FFC107] text-black",
  LOW: "bg-[#B3FFB3] text-black",
};

function normalizeStatus(value: string | null): string {
  return (value ?? "not_started").toLowerCase();
}

function normalizePriority(value: string | null): string {
  return (value ?? "medium").toLowerCase();
}

function recommendationKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
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

function toTaskRiskLevel(contribution: number): TaskRiskLevel {
  if (contribution >= 70) return "CRITICAL";
  if (contribution >= 40) return "MODERATE";
  return "LOW";
}

function probabilityToRisk(probability: number): RiskLevel {
  if (probability >= 85) return "CRITICAL";
  if (probability >= 65) return "HIGH";
  if (probability >= 40) return "MODERATE";
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
  const [overallRisk, setOverallRisk] = useState<RiskLevel>("LOW");
  const [riskConfidence, setRiskConfidence] = useState(0);
  const [riskCauses, setRiskCauses] = useState<string[]>([]);
  const [correlationInsight, setCorrelationInsight] = useState<string>("Add daily check-ins to improve recommendation quality.");

  const [reportLoading, setReportLoading] = useState(false);
  const [reportSummary, setReportSummary] = useState<string | null>(null);
  const [reportRisk, setReportRisk] = useState<RiskLevel | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);

  const [checkinMood, setCheckinMood] = useState("3");
  const [checkinEnergy, setCheckinEnergy] = useState("3");
  const [checkinSleepHours, setCheckinSleepHours] = useState("7");
  const [checkinFocus, setCheckinFocus] = useState("3");
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinSaving, setCheckinSaving] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [escalationSaving, setEscalationSaving] = useState(false);
  const [contactChannel, setContactChannel] = useState("mentor");
  const [contactDestination, setContactDestination] = useState("");
  const [shareSummary, setShareSummary] = useState(true);
  const [shareRecommendations, setShareRecommendations] = useState(true);
  const [consentChecked, setConsentChecked] = useState(false);
  const [modelWeights, setModelWeights] = useState<ModelWeights | null>(null);
  const [recoveryPlans, setRecoveryPlans] = useState<RecoveryPlanRow[]>([]);
  const [recoveryPlanLoading, setRecoveryPlanLoading] = useState(false);

  const logTelemetry = useCallback(
    async (eventType: string, payload: Record<string, unknown>, eventKey?: string) => {
      if (!user) return;
      await supabase.from("burnout_telemetry_events").upsert(
        {
          user_id: user.id,
          event_type: eventType,
          event_key: eventKey ?? `${eventType}:${new Date().toISOString().slice(0, 10)}`,
          payload,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id,event_key" },
      );
    },
    [user],
  );

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

    const [tasksResult, coursesResult, checkinsResult, interventionsResult, weightsResult, recoveryResult] = await Promise.all([
      supabase.from("tasks").select("id, title, priority, status, due_date, workload_impact").eq("user_id", user.id),
      supabase.from("courses").select("credits").eq("user_id", user.id),
      supabase
        .from("burnout_checkins")
        .select("checkin_date, mood, energy, sleep_hours, focus_quality, notes")
        .eq("user_id", user.id)
        .gte("checkin_date", sevenDaysAgoIso)
        .order("checkin_date", { ascending: false }),
      supabase
        .from("intervention_events")
        .select("recommendation_key, recommendation_text, status, outcome_7d")
        .eq("user_id", user.id),
      supabase
        .from("burnout_model_weights")
        .select("active_task_weight, overdue_task_weight, credit_weight, sleep_penalty_weight, energy_penalty_weight, mood_penalty_weight, last_alert_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("burnout_recovery_plans")
        .select("id, generated_at, before_score, after_score, plan_payload")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(3),
    ]);

    if (tasksResult.error || coursesResult.error || checkinsResult.error || interventionsResult.error || recoveryResult.error) {
      setLoading(false);
      setErrorMessage(
        tasksResult.error?.message ??
          coursesResult.error?.message ??
          checkinsResult.error?.message ??
          interventionsResult.error?.message ??
          recoveryResult.error?.message ??
          "Failed to load burnout data.",
      );
      return;
    }

    const allTasks = (tasksResult.data as TaskRow[]) ?? [];
    const checkins = (checkinsResult.data as CheckinRow[]) ?? [];
    const interventions = (interventionsResult.data as InterventionRow[]) ?? [];
    const latestCheckin = checkins[0] ?? null;

    const activeTasks = allTasks.filter((task) => normalizeStatus(task.status) !== "done");
    const overdueTasks = activeTasks.filter((task) => task.due_date && dayDiffFromToday(task.due_date) > 0);
    const dueSoonCount = activeTasks.filter((task) => {
      if (!task.due_date) return false;
      const due = new Date(`${task.due_date}T00:00:00`);
      const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 3;
    }).length;

    const weights: ModelWeights = (weightsResult.data as ModelWeights | null) ?? {
      active_task_weight: 0.3,
      overdue_task_weight: 0.5,
      credit_weight: 0.03,
      sleep_penalty_weight: 6,
      energy_penalty_weight: 5,
      mood_penalty_weight: 5,
      last_alert_at: null,
    };
    if (!weightsResult.data) {
      await supabase.from("burnout_model_weights").upsert({ user_id: user.id }, { onConflict: "user_id" });
    }

    const totalCredits = ((coursesResult.data as Array<{ credits: number }> | null) ?? []).reduce(
      (sum, row) => sum + (row.credits ?? 0),
      0,
    );

    const checkinPenalty = latestCheckin
      ? (latestCheckin.sleep_hours < 6 ? weights.sleep_penalty_weight : 0) +
        (latestCheckin.energy <= 2 ? weights.energy_penalty_weight : 0) +
        (latestCheckin.mood <= 2 ? weights.mood_penalty_weight : 0)
      : 0;

    const nextWorkloadIntensity = Number(
      Math.min(10, activeTasks.length * weights.active_task_weight + overdueTasks.length * weights.overdue_task_weight + totalCredits * weights.credit_weight).toFixed(1),
    );

    const computedProbability = Math.min(100, Math.round(nextWorkloadIntensity * 10 + overdueTasks.length * 5 + checkinPenalty));

    const recalculated = activeTasks.map((task) => ({
      ...task,
      workload: task.workload_impact ?? inferWorkload(task),
      needsUpdate: task.workload_impact == null,
    }));

    const updates = recalculated.filter((task) => task.needsUpdate);
    if (updates.length > 0) {
      await Promise.all(
        updates.map((task) =>
          supabase.from("tasks").update({ workload_impact: task.workload }).eq("id", task.id).eq("user_id", user.id),
        ),
      );
    }

    const tableMetrics = recalculated
      .sort((a, b) => b.workload - a.workload)
      .map((task) => ({
        taskId: task.id,
        taskName: task.title,
        contribution: task.workload,
        riskLevel: toTaskRiskLevel(task.workload),
      }));

    const urgency: DeadlineUrgency = dueSoonCount >= 3 ? "HIGH" : dueSoonCount >= 1 ? "MEDIUM" : "LOW";

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
      void logTelemetry("snapshot_upsert_failed", { message: upsertSnapshotError.message });
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
      void logTelemetry("snapshot_trend_failed", { message: trendError.message });
      return;
    }

    const confidence = Math.min(
      95,
      50 +
        (activeTasks.length > 0 ? 15 : 0) +
        ((trendRows ?? []).length >= 4 ? 15 : 0) +
        (latestCheckin ? 20 : 0),
    );

    const causes: string[] = [];
    if (overdueTasks.length > 0) causes.push(`${overdueTasks.length} overdue task(s)`);
    if (dueSoonCount >= 1) causes.push(`${dueSoonCount} due within 3 days`);
    if (latestCheckin && latestCheckin.sleep_hours < 6) causes.push("Low sleep signal");
    if (latestCheckin && latestCheckin.energy <= 2) causes.push("Low energy check-in");
    causes.push(`Model weights A:${weights.active_task_weight} O:${weights.overdue_task_weight} C:${weights.credit_weight}`);
    if (causes.length === 0) causes.push("No major stress signal detected");

    const historicalScoreMap = new Map<string, number>();
    interventions.forEach((item) => {
      const prev = historicalScoreMap.get(item.recommendation_key);
      const score = Number(item.outcome_7d ?? 0);
      if (prev == null) {
        historicalScoreMap.set(item.recommendation_key, score);
      } else {
        historicalScoreMap.set(item.recommendation_key, Number(((prev + score) / 2).toFixed(1)));
      }
    });

    setActiveTasksCount(activeTasks.length);
    setDeadlineUrgency(urgency);
    setWorkloadIntensity(nextWorkloadIntensity);
    setMetrics(tableMetrics);
    setTrend(buildLast7Days(todayIso, (trendRows as SnapshotRow[]) ?? []));
    setOverallRisk(probabilityToRisk(computedProbability));
    setRiskConfidence(confidence);
    setRiskCauses(causes);
    setCorrelationInsight(
      latestCheckin
        ? `Latest check-in (${latestCheckin.checkin_date}): mood ${latestCheckin.mood}/5, energy ${latestCheckin.energy}/5, sleep ${latestCheckin.sleep_hours}h.`
        : "No check-in yet. Add one to increase model confidence.",
    );

    setRecommendations((prev) =>
      prev
        .map((rec) => ({
          ...rec,
          historicalScore: Number(historicalScoreMap.get(rec.key) ?? rec.historicalScore),
          status: interventions.find((row) => row.recommendation_key === rec.key)?.status ?? rec.status,
        }))
        .sort((a, b) => b.historicalScore - a.historicalScore),
    );
    setModelWeights(weights);
    setRecoveryPlans(((recoveryResult.data as RecoveryPlanRow[] | null) ?? []).map((row) => ({ ...row, plan_payload: row.plan_payload ?? {} })));

    void logTelemetry("burnout_load_success", {
      activeTasks: activeTasks.length,
      overallRisk: probabilityToRisk(computedProbability),
      confidence,
    });

    setLoading(false);
  }, [logTelemetry, user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void loadBurnoutData(), [loadBurnoutData]);

  const handleSubmitCheckin = useCallback(async () => {
    if (!user) return;

    setCheckinSaving(true);
    setErrorMessage(null);
    const todayIso = dateToIso(new Date());

    const { error } = await supabase.from("burnout_checkins").upsert(
      {
        user_id: user.id,
        checkin_date: todayIso,
        mood: Number(checkinMood),
        energy: Number(checkinEnergy),
        sleep_hours: Number(checkinSleepHours),
        focus_quality: Number(checkinFocus),
        notes: checkinNotes.trim() || null,
      },
      { onConflict: "user_id,checkin_date" },
    );

    setCheckinSaving(false);
    if (error) {
      setErrorMessage(error.message);
      void logTelemetry("checkin_save_failed", { message: error.message });
      return;
    }

    void logTelemetry("checkin_saved", { mood: Number(checkinMood), energy: Number(checkinEnergy) });
    await loadBurnoutData();
  }, [checkinEnergy, checkinFocus, checkinMood, checkinNotes, checkinSleepHours, loadBurnoutData, logTelemetry, user]);

  const saveReportAsText = useCallback(
    (report: BurnoutReport) => {
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
        ...(report.recommendations.length > 0
          ? report.recommendations.map((item, idx) => `${idx + 1}. ${item}`)
          : ["No recommendations returned."]),
      ];

      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "burnout-report.txt";
      a.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

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
      void logTelemetry("report_generate_failed", { message: error.message });
      return;
    }

    const payload = data as Partial<BurnoutReport> | null;
    const report: BurnoutReport = {
      summary: payload?.summary ?? "No summary returned.",
      riskLevel: payload?.riskLevel ?? "MODERATE",
      recommendations: payload?.recommendations ?? [],
    };

    setReportSummary(report.summary);
    setReportRisk(report.riskLevel);

    const recommendationItems = report.recommendations
      .map((text) => ({
        key: recommendationKey(text),
        text,
        historicalScore: 0,
        status: "suggested" as const,
      }))
      .filter((item, idx, arr) => arr.findIndex((x) => x.key === item.key) === idx);

    setRecommendations(recommendationItems);
    saveReportAsText(report);
    void logTelemetry("report_generated", { recommendationCount: recommendationItems.length, risk: report.riskLevel });
    await loadBurnoutData();
  }, [loadBurnoutData, logTelemetry, saveReportAsText, user]);

  const handleAcceptRecommendation = useCallback(
    async (item: RecommendationItem) => {
      if (!user) return;

      const { error } = await supabase.from("intervention_events").upsert(
        {
          user_id: user.id,
          recommendation_key: item.key,
          recommendation_text: item.text,
          status: "accepted",
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,recommendation_key" },
      );

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setRecommendations((prev) => prev.map((row) => (row.key === item.key ? { ...row, status: "accepted" } : row)));
    },
    [user],
  );

  const handleCompleteRecommendation = useCallback(
    async (item: RecommendationItem) => {
      if (!user) return;

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 14);

      const { data: snapshots, error: snapshotsError } = await supabase
        .from("burnout_snapshots")
        .select("snapshot_date, probability")
        .eq("user_id", user.id)
        .gte("snapshot_date", dateToIso(fromDate))
        .order("snapshot_date", { ascending: true });

      if (snapshotsError) {
        setErrorMessage(snapshotsError.message);
        return;
      }

      const rows = (snapshots as SnapshotRow[]) ?? [];
      const latest = rows[rows.length - 1]?.probability ?? 0;
      const delta = (days: number) => {
        const target = new Date();
        target.setDate(target.getDate() - days);
        const targetIso = dateToIso(target);
        const found = rows.find((row) => row.snapshot_date >= targetIso);
        const base = found?.probability ?? latest;
        return Number((base - latest).toFixed(2));
      };

      const { error } = await supabase
        .from("intervention_events")
        .upsert(
          {
            user_id: user.id,
            recommendation_key: item.key,
            recommendation_text: item.text,
            status: "completed",
            accepted_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            outcome_3d: delta(3),
            outcome_7d: delta(7),
            outcome_14d: delta(14),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,recommendation_key" },
        );

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setRecommendations((prev) => prev.map((row) => (row.key === item.key ? { ...row, status: "completed" } : row)));
      await loadBurnoutData();
    },
    [loadBurnoutData, user],
  );

  const deadlineSubtext = useMemo(() => {
    if (deadlineUrgency === "HIGH") return "Many Due Soon";
    if (deadlineUrgency === "MEDIUM") return "Some Due Soon";
    return "On Track";
  }, [deadlineUrgency]);

  const diagnosticsText = useMemo(() => {
    if (trend.length === 0) return "No trend data available yet.";
    if (trend.every((item) => item.probability === 0)) return "Trend appears stale (all zeros).";
    return "Telemetry active. Burnout pipeline reporting normally.";
  }, [trend]);

  const applyEarlyWarningPlaybook = useCallback(async () => {
    if (!user || !modelWeights) return;

    const now = new Date();
    const lastAlert = modelWeights.last_alert_at ? new Date(modelWeights.last_alert_at) : null;
    if (lastAlert && now.getTime() - lastAlert.getTime() < 12 * 60 * 60 * 1000) {
      setErrorMessage("Alert recently sent. Cooldown active.");
      return;
    }

    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: user.id,
      type: "burnout_alert",
      title: "Burnout prevention playbook",
      body: "Prioritize deep-work block, reduce non-urgent load, and schedule recovery tasks today.",
      reference_type: "task",
    });
    if (notifError) {
      setErrorMessage(notifError.message);
      return;
    }

    await supabase
      .from("burnout_model_weights")
      .update({ last_alert_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("user_id", user.id);

    void logTelemetry("playbook_alert_sent", { risk: overallRisk });
    setErrorMessage(null);
  }, [logTelemetry, modelWeights, overallRisk, user]);

  const generateRecoveryPlan = useCallback(async () => {
    if (!user) return;
    setRecoveryPlanLoading(true);

    const topTasks = metrics.slice(0, 3);
    const today = new Date();
    const items = topTasks.map((task, idx) => {
      const day = new Date(today);
      day.setDate(today.getDate() + idx);
      return {
        day: day.toISOString().slice(0, 10),
        task: `Recovery: ${task.taskName}`,
        time: "19:00",
      };
    });

    if (items.length > 0) {
      await supabase.from("tasks").insert(
        items.map((item) => ({
          user_id: user.id,
          title: item.task,
          priority: "medium",
          status: "not_started",
          due_date: item.day,
        })),
      );

      await supabase.from("schedule_slots").insert(
        items.map((item) => ({
          user_id: user.id,
          day_of_week: ((new Date(`${item.day}T00:00:00`).getDay() + 6) % 7),
          start_time: item.time,
          end_time: "21:00",
          room: "Recovery Block",
          course_id: null,
        })),
      );
    }

    const beforeScore = workloadIntensity;
    const afterScore = Math.max(0, Number((workloadIntensity - 1.5).toFixed(2)));
    await supabase.from("burnout_recovery_plans").insert({
      user_id: user.id,
      before_score: beforeScore,
      after_score: afterScore,
      plan_payload: { items },
    });

    setRecoveryPlanLoading(false);
    void logTelemetry("recovery_plan_generated", { items: items.length, beforeScore, afterScore });
    await loadBurnoutData();
  }, [loadBurnoutData, logTelemetry, metrics, user, workloadIntensity]);

  const handleEscalationSave = useCallback(async () => {
    if (!user || !consentChecked || !contactDestination.trim()) return;
    setEscalationSaving(true);
    const messagePreview = [
      "I need support to rebalance my study workload.",
      shareSummary && reportSummary ? `Summary: ${reportSummary}` : null,
      shareRecommendations && recommendations.length > 0 ? `Top recommendation: ${recommendations[0].text}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await supabase.from("support_escalation_consents").insert({
      user_id: user.id,
      contact_channel: contactChannel,
      contact_destination: contactDestination.trim(),
      share_summary: shareSummary,
      share_recommendations: shareRecommendations,
      message_preview: messagePreview,
      consent_text: "User opted in manually. No automatic sending performed.",
    });

    setEscalationSaving(false);
    if (error) {
      setErrorMessage(error.message);
      void logTelemetry("escalation_save_failed", { message: error.message });
      return;
    }

    void logTelemetry("escalation_saved", { channel: contactChannel });
    setShowEscalation(false);
  }, [consentChecked, contactChannel, contactDestination, logTelemetry, recommendations, reportSummary, shareRecommendations, shareSummary, user]);

  return (
    <div className="space-y-6">
      <div className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-black text-xs uppercase tracking-wide text-gray-500">Current Risk Status</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`inline-block px-3 py-1 border-[3px] border-black font-black text-xs uppercase ${OVERALL_RISK_STYLE[overallRisk]}`}>
            {loading ? "..." : overallRisk}
          </span>
          <span className="font-black text-xs uppercase text-black">Confidence: {loading ? "..." : `${riskConfidence}%`}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {loading ? (
            <span className="font-black text-xs uppercase text-gray-400">Analyzing causes...</span>
          ) : (
            riskCauses.map((cause) => (
              <span key={cause} className="px-2 py-1 border-2 border-black bg-[#FFFDF7] font-black text-[10px] uppercase tracking-wide">
                {cause}
              </span>
            ))
          )}
        </div>
        <p className="mt-3 font-bold text-xs text-gray-600">{correlationInsight}</p>
      </div>

      <div className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-black text-xs uppercase tracking-wide text-gray-500">Diagnostics</p>
        <p className="mt-2 font-bold text-xs text-gray-700">{diagnosticsText}</p>
        {(overallRisk === "HIGH" || overallRisk === "CRITICAL") && (
          <div className="mt-3 space-y-2">
            <p className="font-black text-[10px] uppercase">Prevention Playbook</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 border-2 border-black bg-[#FFFDF7] font-black text-[10px] uppercase">Reschedule low-priority tasks</span>
              <span className="px-2 py-1 border-2 border-black bg-[#FFFDF7] font-black text-[10px] uppercase">Protect 2h deep-work block</span>
              <span className="px-2 py-1 border-2 border-black bg-[#FFFDF7] font-black text-[10px] uppercase">Take 30-min recovery break</span>
            </div>
            <button onClick={() => void applyEarlyWarningPlaybook()} className="border-2 border-black bg-[#FFC107] px-3 py-1.5 font-black text-[10px] uppercase">
              Send prevention alert
            </button>
          </div>
        )}
      </div>

      {errorMessage && <div className="border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs text-black">{errorMessage}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border-[3px] border-black bg-[#FFC107] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-black" strokeWidth={2.5} />
            <span className="font-black text-xs uppercase tracking-wide text-black">Active Tasks</span>
          </div>
          <p className="font-black text-4xl text-black">{loading ? "..." : activeTasksCount} <span className="text-lg">Active</span></p>
        </div>

        <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-black" strokeWidth={2.5} />
            <span className="font-black text-xs uppercase tracking-wide text-black">Upcoming Deadlines</span>
          </div>
          <p className="font-black text-4xl text-black">{loading ? "..." : deadlineUrgency} <span className="text-lg">{deadlineSubtext}</span></p>
        </div>

        <div className="border-[3px] border-black bg-[#FFB3C1] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-black" strokeWidth={2.5} />
            <span className="font-black text-xs uppercase tracking-wide text-black">Workload Intensity</span>
          </div>
          <p className="font-black text-4xl text-black">{loading ? "..." : workloadIntensity.toFixed(1)} <span className="text-lg">/ 10</span></p>
        </div>
      </div>

      <div className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4" strokeWidth={2.5} />
          <p className="font-black text-xs uppercase tracking-wide">Chart Legend</p>
        </div>
        <p className="font-bold text-xs text-gray-700">0-39% low risk, 40-64% moderate, 65-84% high, 85-100% critical.</p>
      </div>

      <BurnoutChart data={trend} />

      <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="font-black text-sm uppercase tracking-wide mb-3">Daily Mood & Energy Check-in</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="font-black text-xs uppercase">Mood (1-5)
            <input type="number" min={1} max={5} value={checkinMood} onChange={(e) => setCheckinMood(e.target.value)} className="mt-1 w-full border-2 border-black p-2 font-bold text-sm" />
          </label>
          <label className="font-black text-xs uppercase">Energy (1-5)
            <input type="number" min={1} max={5} value={checkinEnergy} onChange={(e) => setCheckinEnergy(e.target.value)} className="mt-1 w-full border-2 border-black p-2 font-bold text-sm" />
          </label>
          <label className="font-black text-xs uppercase">Sleep Hours
            <input type="number" min={0} max={24} step="0.5" value={checkinSleepHours} onChange={(e) => setCheckinSleepHours(e.target.value)} className="mt-1 w-full border-2 border-black p-2 font-bold text-sm" />
          </label>
          <label className="font-black text-xs uppercase">Focus (1-5)
            <input type="number" min={1} max={5} value={checkinFocus} onChange={(e) => setCheckinFocus(e.target.value)} className="mt-1 w-full border-2 border-black p-2 font-bold text-sm" />
          </label>
        </div>
        <label className="block mt-3 font-black text-xs uppercase">Optional notes
          <textarea value={checkinNotes} onChange={(e) => setCheckinNotes(e.target.value)} rows={2} className="mt-1 w-full border-2 border-black p-2 font-bold text-sm" placeholder="Anything affecting your focus today?" />
        </label>
        <button onClick={() => void handleSubmitCheckin()} disabled={checkinSaving} className="mt-3 border-[3px] border-black bg-[#B3FFB3] px-4 py-2 font-black text-xs uppercase disabled:opacity-70">
          {checkinSaving ? "Saving..." : "Save Check-in"}
        </button>
      </div>

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
              {!loading && metrics.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center font-black text-xs uppercase text-gray-500">No active tasks to analyze.</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center font-black text-xs uppercase text-gray-400">Loading workload analysis...</td>
                </tr>
              )}
              {!loading && metrics.map((m) => (
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
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-black text-sm uppercase tracking-wide">Recovery Plan Generator</h3>
          <button onClick={() => void generateRecoveryPlan()} disabled={recoveryPlanLoading || metrics.length === 0} className="border-[3px] border-black bg-[#B3FFB3] px-3 py-2 font-black text-xs uppercase disabled:opacity-60">
            {recoveryPlanLoading ? "Generating..." : "Generate 3-day plan"}
          </button>
        </div>
        {recoveryPlans.length > 0 ? (
          <div className="space-y-2 mb-4">
            {recoveryPlans.map((plan) => (
              <div key={plan.id} className="border-2 border-black bg-[#FFFDF7] p-3">
                <p className="font-black text-[10px] uppercase">Plan {new Date(plan.generated_at).toLocaleDateString()}</p>
                <p className="font-bold text-xs mt-1">Load score: {plan.before_score} → {plan.after_score}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-bold text-xs text-gray-500 mb-4">No recovery plan yet.</p>
        )}

        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-black text-sm uppercase tracking-wide">AI Burnout Report</h3>
          <button
            onClick={() => void handleGenerateReport()}
            disabled={reportLoading || !user}
            className="inline-flex items-center gap-2 border-[3px] border-black bg-[#FFC107] px-3 py-2 font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-60"
          >
            <FileDown className="w-4 h-4" strokeWidth={2.5} />
            {reportLoading ? "Generating..." : "Generate Report"}
          </button>
        </div>

        {reportSummary ? (
          <div className="space-y-3">
            <p className="font-bold text-sm text-black">{reportSummary}</p>
            {reportRisk && <p className="font-black text-xs uppercase">Report risk: {reportRisk}</p>}
          </div>
        ) : (
          <p className="font-bold text-xs text-gray-500">Generate report to get ranked actions and track intervention impact.</p>
        )}

        {recommendations.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-black text-xs uppercase tracking-wide">Recommended Actions (ranked by past effectiveness)</h4>
            {recommendations.map((item) => (
              <div key={item.key} className="border-2 border-black p-3 bg-[#FFFDF7]">
                <p className="font-bold text-sm text-black">{item.text}</p>
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  <span className="px-2 py-0.5 border-2 border-black bg-white font-black text-[10px] uppercase">History 7d: {item.historicalScore.toFixed(1)}</span>
                  <span className="px-2 py-0.5 border-2 border-black bg-[#B3D4FF] font-black text-[10px] uppercase">{item.status}</span>
                  {item.status === "suggested" && (
                    <button onClick={() => void handleAcceptRecommendation(item)} className="px-2 py-1 border-2 border-black bg-[#B3FFB3] font-black text-[10px] uppercase">
                      Accept
                    </button>
                  )}
                  {item.status !== "completed" && (
                    <button onClick={() => void handleCompleteRecommendation(item)} className="inline-flex items-center gap-1 px-2 py-1 border-2 border-black bg-[#FFC107] font-black text-[10px] uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {(overallRisk === "HIGH" || overallRisk === "CRITICAL") && (
          <div className="mt-4 border-2 border-black bg-[#FFF5F5] p-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" strokeWidth={2.5} />
              <p className="font-black text-xs uppercase">Need trusted support?</p>
            </div>
            <p className="mt-1 font-bold text-xs text-gray-700">
              Share only what you approve. This flow stores consent and never auto-sends messages.
            </p>
            <button
              onClick={() => setShowEscalation(true)}
              className="mt-2 border-[2px] border-black bg-[#FFC107] px-3 py-1.5 font-black text-[10px] uppercase"
            >
              Open support escalation
            </button>
          </div>
        )}
      </div>

      {showEscalation && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="p-3 border-b-[3px] border-black bg-[#FFC107] flex items-center justify-between">
              <p className="font-black text-xs uppercase">Support Escalation (Opt-in)</p>
              <button onClick={() => setShowEscalation(false)} className="p-1 border-2 border-black bg-white" aria-label="Close escalation modal">
                <X className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase mb-1">Channel</label>
                <select value={contactChannel} onChange={(e) => setContactChannel(e.target.value)} className="w-full border-2 border-black p-2 font-bold text-sm">
                  <option value="mentor">Mentor</option>
                  <option value="trusted_friend">Trusted Friend</option>
                  <option value="counselor">Counselor</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase mb-1">Destination (email/handle)</label>
                <input value={contactDestination} onChange={(e) => setContactDestination(e.target.value)} className="w-full border-2 border-black p-2 font-bold text-sm" />
              </div>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={shareSummary} onChange={(e) => setShareSummary(e.target.checked)} />
                <span className="font-black text-[10px] uppercase">Share summary</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={shareRecommendations} onChange={(e) => setShareRecommendations(e.target.checked)} />
                <span className="font-black text-[10px] uppercase">Share recommendations</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
                <span className="font-black text-[10px] uppercase">I explicitly consent to log this support request</span>
              </label>
              <button
                onClick={() => void handleEscalationSave()}
                disabled={escalationSaving || !consentChecked || !contactDestination.trim()}
                className="w-full border-[3px] border-black bg-[#B3FFB3] py-2 font-black text-xs uppercase disabled:opacity-60"
              >
                {escalationSaving ? "Saving..." : "Save consent (no auto-send)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
