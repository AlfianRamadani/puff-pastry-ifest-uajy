"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Search, FileText, Trash2, Plus, Timer, Sparkles, X, CheckSquare2, Square } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type SortField = "DEADLINE" | "PRIORITY" | "NAME" | "SMART";
type Priority = "HIGH" | "MEDIUM" | "LOW" | "DONE";
type Status = "NOT STARTED" | "IN PROGRESS" | "OVERDUE" | "DONE";
type ViewMode = "LIST" | "KANBAN";

type Task = {
  id: string;
  name: string;
  priority: Priority;
  status: Status;
  dueDate: string;
  courseId: string | null;
  reminderProfile: ReminderProfile;
  reminderOffsets: number[];
  reminderMuted: boolean;
  reminderSnoozeUntil: string | null;
  recurrenceRule: Record<string, unknown> | null;
  recurrenceSeriesId: string | null;
  recurrenceParentId: string | null;
  recurrenceActive: boolean;
};

type CourseOption = {
  id: string;
  name: string;
};

type ReminderProfile = "standard" | "focus" | "quiet" | "mute";

type TaskActivity = {
  id: string;
  actionType: string;
  detail: string;
  createdAt: string;
};

type Subtask = {
  id: string;
  taskId: string;
  title: string;
  status: "pending" | "in_progress" | "done";
  progress: number;
  orderIndex: number;
  dueDate: string | null;
};

type BreakdownStep = {
  order: number;
  title: string;
  details: string;
  estimatedMinutes: number;
  acceptanceCriteria: string;
  status: "pending" | "done";
};

type TaskBreakdown = {
  id: string;
  objective: string;
  assumptions: string[];
  estimatedTotalHours: number;
  riskLevel: "low" | "medium" | "high";
  confidence: number;
  followUpQuestions: string[];
  steps: BreakdownStep[];
};

type BreakdownConfig = {
  description: string;
  complexity: "low" | "medium" | "high";
  availableHoursPerWeek: number;
  granularity: "coarse" | "normal" | "detailed";
  deadlineStrictness: "flexible" | "balanced" | "strict";
};

const PRIORITY_CONFIG: Record<Priority, { bg: string; text: string }> = {
  HIGH: { bg: "bg-[#FFB3C1]", text: "text-black" },
  MEDIUM: { bg: "bg-white", text: "text-black" },
  LOW: { bg: "bg-[#B3FFB3]", text: "text-black" },
  DONE: { bg: "bg-gray-200", text: "text-gray-500" },
};

const STATUS_CONFIG: Record<Status, { bg: string; text: string }> = {
  "NOT STARTED": { bg: "bg-white", text: "text-black" },
  "IN PROGRESS": { bg: "bg-[#FFC107]", text: "text-black" },
  OVERDUE: { bg: "bg-[#FF4444]", text: "text-white" },
  DONE: { bg: "bg-[#B3FFB3]", text: "text-black" },
};

const PRIORITY_ORDER: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2, DONE: 3 };
const DEFAULT_BREAKDOWN_CONFIG: BreakdownConfig = {
  description: "",
  complexity: "medium",
  availableHoursPerWeek: 10,
  granularity: "normal",
  deadlineStrictness: "balanced",
};

function sanitizeErrorMessage(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  const normalized = raw.toLowerCase();
  if (normalized.includes("jwt") || normalized.includes("token") || normalized.includes("internal")) {
    return fallback;
  }
  return raw;
}

function dbToUiStatus(value: string | null): Status {
  const status = (value ?? "not_started").toLowerCase();
  if (status === "done") return "DONE";
  if (status === "in_progress") return "IN PROGRESS";
  if (status === "overdue") return "OVERDUE";
  return "NOT STARTED";
}

function uiToDbStatus(value: Status): string {
  if (value === "DONE") return "done";
  if (value === "IN PROGRESS") return "in_progress";
  if (value === "OVERDUE") return "overdue";
  return "not_started";
}

function dbToUiPriority(value: string | null, status: Status): Priority {
  if (status === "DONE") return "DONE";
  const priority = (value ?? "medium").toLowerCase();
  if (priority === "high") return "HIGH";
  if (priority === "low") return "LOW";
  return "MEDIUM";
}

function uiToDbPriority(value: Priority): string {
  if (value === "HIGH") return "high";
  if (value === "LOW") return "low";
  return "medium";
}

function formatDueDate(dateStr: string): string {
  if (!dateStr) return "No due date";
  const due = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays === -1) return "Tomorrow";
  if (diffDays < 0) return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${diffDays}d ago`;
}

async function invokeWithAuth(fnName: string, body: Record<string, unknown>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No active session");
  }

  return supabase.functions.invoke(fnName, {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
}

export default function MyTasksTab({ dateFilter }: { dateFilter?: string | null }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("DEADLINE");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("MEDIUM");
  const [newDueDate, setNewDueDate] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingNew, setSavingNew] = useState(false);
  const [breakdownTask, setBreakdownTask] = useState<Task | null>(null);
  const [breakdownConfig, setBreakdownConfig] = useState<BreakdownConfig>(DEFAULT_BREAKDOWN_CONFIG);
  const [generatingBreakdown, setGeneratingBreakdown] = useState(false);
  const [loadingExistingBreakdown, setLoadingExistingBreakdown] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [breakdownResult, setBreakdownResult] = useState<TaskBreakdown | null>(null);
  const [contextFileName, setContextFileName] = useState<string>("");
  const [contextFileText, setContextFileText] = useState<string>("");
  const [createDescription, setCreateDescription] = useState("");
  const [createFileName, setCreateFileName] = useState("");
  const [createFileText, setCreateFileText] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [bulkPriority, setBulkPriority] = useState<Priority>("MEDIUM");
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkCourseId, setBulkCourseId] = useState<string>("__KEEP__");
  const [bulkReminderProfile, setBulkReminderProfile] = useState<ReminderProfile>("standard");
  const [viewMode, setViewMode] = useState<ViewMode>("LIST");
  const [burnoutSignal, setBurnoutSignal] = useState(0);
  const [workloadSignal, setWorkloadSignal] = useState(0);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailActivities, setDetailActivities] = useState<TaskActivity[]>([]);
  const [detailChecklist, setDetailChecklist] = useState<BreakdownStep[]>([]);
  const [detailComment, setDetailComment] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [subtasksByTask, setSubtasksByTask] = useState<Record<string, Subtask[]>>({});
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const [newSubtaskTitleByTask, setNewSubtaskTitleByTask] = useState<Record<string, string>>({});
  const [newRecurrenceMode, setNewRecurrenceMode] = useState<"none" | "daily" | "weekly" | "weekdays" | "monthly">("none");
  const [newRecurrenceWeekdays, setNewRecurrenceWeekdays] = useState<number[]>([1, 3, 5]);
  const [newRecurrenceEndDate, setNewRecurrenceEndDate] = useState("");
  const [newReminderOffsets, setNewReminderOffsets] = useState<number[]>([24, 6, 1]);
  const [detailReminderOffsets, setDetailReminderOffsets] = useState<number[]>([24, 6, 1]);
  const [detailReminderMuted, setDetailReminderMuted] = useState(false);
  const [detailSnoozeHours, setDetailSnoozeHours] = useState(6);

  const loadTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, priority, status, due_date, course_id, reminder_profile, reminder_offsets, reminder_muted, reminder_snooze_until, recurrence_rule, recurrence_series_id, recurrence_parent_id, recurrence_active")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      setErrorMessage(sanitizeErrorMessage(error.message, "Failed to load tasks. Please retry."));
      setLoading(false);
      return;
    }

    const mapped: Task[] = (data ?? []).map((item) => {
      const status = dbToUiStatus(item.status);
      return {
        id: item.id,
        name: item.title,
        status,
        priority: dbToUiPriority(item.priority, status),
        dueDate: item.due_date ?? "",
        courseId: item.course_id ?? null,
        reminderProfile: ((item.reminder_profile ?? "standard") as ReminderProfile),
        reminderOffsets: Array.isArray(item.reminder_offsets) ? item.reminder_offsets.map((x: unknown) => Number(x)).filter(Number.isFinite) : [24, 6, 1],
        reminderMuted: Boolean(item.reminder_muted),
        reminderSnoozeUntil: item.reminder_snooze_until ?? null,
        recurrenceRule: (item.recurrence_rule as Record<string, unknown> | null) ?? null,
        recurrenceSeriesId: item.recurrence_series_id ?? null,
        recurrenceParentId: item.recurrence_parent_id ?? null,
        recurrenceActive: Boolean(item.recurrence_active),
      };
    });

    setTasks(mapped);
    setSelectedTaskIds((prev) => prev.filter((id) => mapped.some((task) => task.id === id)));
    setLoading(false);
  }, [user]);

  const loadCourses = useCallback(async () => {
    if (!user) {
      setCourses([]);
      return;
    }
    const { data, error } = await supabase.from("courses").select("id, name").eq("user_id", user.id).order("name");
    if (error) {
      setErrorMessage(sanitizeErrorMessage(error.message, "Failed to load courses for bulk assignment."));
      return;
    }
    setCourses((data ?? []) as CourseOption[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTasks();
    const channel = supabase
      .channel(`tasks-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` }, () => {
        void loadTasks();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadTasks, user]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCourses();
  }, [loadCourses, user]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!user) return;
    const loadSignals = async () => {
      const [burnoutResult, workloadResult] = await Promise.all([
        supabase
          .from("burnout_snapshots")
          .select("probability")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("schedule_load_metrics")
          .select("avg_daily_load")
          .eq("user_id", user.id)
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setBurnoutSignal(Number((burnoutResult.data as { probability?: number } | null)?.probability ?? 0));
      setWorkloadSignal(Number((workloadResult.data as { avg_daily_load?: number } | null)?.avg_daily_load ?? 0));
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSignals();
  }, [user]);

  const logTaskActivity = useCallback(
    async (taskId: string, actionType: string, detail: string, metadata: Record<string, unknown> = {}) => {
      if (!user) return;
      await supabase.from("task_activities").insert({
        task_id: taskId,
        user_id: user.id,
        action_type: actionType,
        detail,
        metadata,
      });
    },
    [user],
  );

  const loadSubtasks = useCallback(
    async (taskIds: string[]) => {
      if (!user || taskIds.length === 0) {
        setSubtasksByTask({});
        return;
      }
      const { data, error } = await supabase
        .from("task_subtasks")
        .select("id, task_id, title, status, progress, order_index, due_date")
        .eq("user_id", user.id)
        .in("task_id", taskIds)
        .order("order_index", { ascending: true });
      if (error) {
        setErrorMessage(sanitizeErrorMessage(error.message, "Failed to load subtasks."));
        return;
      }
      const grouped: Record<string, Subtask[]> = {};
      ((data ?? []) as Array<{ id: string; task_id: string; title: string; status: string; progress: number; order_index: number; due_date: string | null }>)
        .forEach((row) => {
          if (!grouped[row.task_id]) grouped[row.task_id] = [];
          grouped[row.task_id].push({
            id: row.id,
            taskId: row.task_id,
            title: row.title,
            status: (row.status as Subtask["status"]) ?? "pending",
            progress: Number(row.progress ?? 0),
            orderIndex: Number(row.order_index ?? 1),
            dueDate: row.due_date,
          });
        });
      setSubtasksByTask(grouped);
    },
    [user],
  );

  useEffect(() => {
    if (!user) return;
    const ids = tasks.map((task) => task.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSubtasks(ids);
  }, [loadSubtasks, tasks, user]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user) return;
      const previous = tasks;
      setTasks((prev) => prev.filter((task) => task.id !== id));
      const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
      if (error) {
        setTasks(previous);
        setErrorMessage(sanitizeErrorMessage(error.message, "Failed to delete task. Please try again."));
        return;
      }
      setSuccessMessage("Task deleted.");
    },
    [tasks, user],
  );

  const handleFieldUpdate = useCallback(
    async (id: string, patch: Partial<Task>) => {
      if (!user) return;
      const previous = tasks;
      setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)));

      const payload: Record<string, string | null> = {};
      if (patch.status) payload.status = uiToDbStatus(patch.status);
      if (patch.priority) payload.priority = uiToDbPriority(patch.priority);
      if (Object.prototype.hasOwnProperty.call(patch, "dueDate")) payload.due_date = patch.dueDate ? patch.dueDate : null;

      const { error } = await supabase.from("tasks").update(payload).eq("id", id).eq("user_id", user.id);
      if (error) {
        setTasks(previous);
        setErrorMessage(sanitizeErrorMessage(error.message, "Task update failed. Please retry."));
        return;
      }
      await logTaskActivity(id, "field_update", "Task field updated.", patch);
      setSuccessMessage("Task updated.");
    },
    [logTaskActivity, tasks, user],
  );

  const handleStatusToggle = useCallback(
    async (id: string, current: Status) => {
      const next: Status = current === "DONE" ? "NOT STARTED" : "DONE";
      const priority: Priority = next === "DONE" ? "DONE" : "MEDIUM";
      await handleFieldUpdate(id, { status: next, priority });
    },
    [handleFieldUpdate],
  );

  const resetCreateForm = useCallback(() => {
    setNewName("");
    setNewPriority("MEDIUM");
    setNewDueDate("");
    setCreateDescription("");
    setCreateFileName("");
    setCreateFileText("");
    setNewRecurrenceMode("none");
    setNewRecurrenceWeekdays([1, 3, 5]);
    setNewRecurrenceEndDate("");
    setNewReminderOffsets([24, 6, 1]);
    setShowForm(false);
  }, []);

  const handleCreateFileChange = useCallback(async (file: File | null) => {
    if (!file) {
      setCreateFileName("");
      setCreateFileText("");
      return;
    }
    setCreateFileName(file.name);
    const text = await file.text();
    setCreateFileText(text.slice(0, 12000));
  }, []);

  const handleAddTask = useCallback(async (withBreakdown = false) => {
    if (!user || !newName.trim() || savingNew) return;
    setSavingNew(true);
    const due =
      newDueDate ||
      (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split("T")[0];
      })();

    const recurrenceRule =
      newRecurrenceMode === "none"
        ? null
        : {
            frequency: newRecurrenceMode,
            weekdays: newRecurrenceMode === "weekdays" ? newRecurrenceWeekdays : [],
            skip_dates: [],
          };
    const recurrenceSeriesId = recurrenceRule ? crypto.randomUUID() : null;

    const { data: createdRow, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: newName.trim(),
        priority: uiToDbPriority(newPriority),
        status: "not_started",
        due_date: due,
        reminder_offsets: newReminderOffsets,
        reminder_muted: false,
        recurrence_rule: recurrenceRule,
        recurrence_series_id: recurrenceSeriesId,
        recurrence_active: Boolean(recurrenceRule),
        recurrence_end_date: newRecurrenceEndDate || null,
      })
      .select("id, title, priority, status, due_date, course_id, reminder_profile, reminder_offsets, reminder_muted, reminder_snooze_until, recurrence_rule, recurrence_series_id, recurrence_parent_id, recurrence_active")
      .single();

    if (error) {
      setErrorMessage(sanitizeErrorMessage(error.message, "Failed to create task. Please try again."));
      setSavingNew(false);
      return;
    }

    const createdTask: Task = {
      id: String((createdRow as { id: unknown }).id),
      name: String((createdRow as { title: unknown }).title),
      priority: dbToUiPriority(String((createdRow as { priority?: unknown }).priority ?? "medium"), "NOT STARTED"),
      status: dbToUiStatus(String((createdRow as { status?: unknown }).status ?? "not_started")),
      dueDate: String((createdRow as { due_date?: unknown }).due_date ?? ""),
      courseId: ((createdRow as { course_id?: unknown }).course_id as string | null) ?? null,
      reminderProfile: ((createdRow as { reminder_profile?: unknown }).reminder_profile as ReminderProfile | null) ?? "standard",
      reminderOffsets: (((createdRow as { reminder_offsets?: unknown }).reminder_offsets as number[] | null) ?? [24, 6, 1]),
      reminderMuted: Boolean((createdRow as { reminder_muted?: unknown }).reminder_muted ?? false),
      reminderSnoozeUntil: ((createdRow as { reminder_snooze_until?: unknown }).reminder_snooze_until as string | null) ?? null,
      recurrenceRule: ((createdRow as { recurrence_rule?: unknown }).recurrence_rule as Record<string, unknown> | null) ?? null,
      recurrenceSeriesId: ((createdRow as { recurrence_series_id?: unknown }).recurrence_series_id as string | null) ?? null,
      recurrenceParentId: ((createdRow as { recurrence_parent_id?: unknown }).recurrence_parent_id as string | null) ?? null,
      recurrenceActive: Boolean((createdRow as { recurrence_active?: unknown }).recurrence_active ?? false),
    };

    if (withBreakdown) {
      const bodyPayload = {
          taskId: createdTask.id,
          description: createDescription,
          complexity: breakdownConfig.complexity,
          availableHoursPerWeek: breakdownConfig.availableHoursPerWeek,
          granularity: breakdownConfig.granularity,
          deadlineStrictness: breakdownConfig.deadlineStrictness,
          medium: newPriority,
          deadline: due,
          contextFileText: createFileText || null,
      };
      try {
        const { data: payload, error: breakdownCallError } = await invokeWithAuth("task-breakdown", bodyPayload);
        const parsedPayload = (payload ?? null) as { breakdown?: TaskBreakdown; error?: string } | null;
        if (breakdownCallError || !parsedPayload?.breakdown) {
          setErrorMessage(
            sanitizeErrorMessage(
              parsedPayload?.error ?? breakdownCallError?.message,
              "Task created, but AI breakdown failed.",
            ),
          );
        } else {
          setBreakdownTask(createdTask);
          setBreakdownResult(parsedPayload.breakdown);
          setBreakdownError(null);
          setContextFileName(createFileName);
          setContextFileText(createFileText);
          setBreakdownConfig((prev) => ({ ...prev, description: createDescription || prev.description }));
        }
      } catch (error) {
        setErrorMessage(sanitizeErrorMessage(error instanceof Error ? error.message : null, "Task created, but AI breakdown failed."));
      }
    }

    resetCreateForm();
    setSavingNew(false);
    await logTaskActivity(createdTask.id, "created", "Task created.", { withBreakdown });
    setSuccessMessage(withBreakdown ? "Task created. Breakdown ready." : "Task created.");
    void loadTasks();
  }, [
    breakdownConfig.availableHoursPerWeek,
    breakdownConfig.complexity,
    breakdownConfig.deadlineStrictness,
    breakdownConfig.granularity,
    createDescription,
    createFileName,
    createFileText,
    newRecurrenceEndDate,
    newRecurrenceMode,
    newRecurrenceWeekdays,
    newReminderOffsets,
    logTaskActivity,
    loadTasks,
    newDueDate,
    newName,
    newPriority,
    resetCreateForm,
    savingNew,
    user,
  ]);

  const handleEstimateDeadline = useCallback(async () => {
    if (!user) return;
    setErrorMessage(null);
    const now = new Date();
    const active = tasks.filter((task) => task.status !== "DONE");

    if (active.length === 0) return;

    const updates = active.map(async (task) => {
      const days = task.priority === "HIGH" ? 3 : task.priority === "MEDIUM" ? 7 : 14;
      const est = new Date(now);
      est.setDate(est.getDate() + days);
      const dueDate = est.toISOString().split("T")[0];
      const { error } = await supabase
        .from("tasks")
        .update({ due_date: dueDate })
        .eq("id", task.id)
        .eq("user_id", user.id);
      if (error) throw error;
    });

    try {
      await Promise.all(updates);
      await loadTasks();
    } catch (error) {
      setErrorMessage(sanitizeErrorMessage(error instanceof Error ? error.message : null, "Failed to estimate deadlines."));
    }
  }, [loadTasks, tasks, user]);

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  }, []);

  const handleSelectVisible = useCallback(
    (visibleIds: string[]) => {
      if (visibleIds.length === 0) return;
      const allSelected = visibleIds.every((id) => selectedTaskIds.includes(id));
      if (allSelected) {
        setSelectedTaskIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
        return;
      }
      setSelectedTaskIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    },
    [selectedTaskIds],
  );

  const applyBulkPatch = useCallback(
    async (patch: { status?: Status; priority?: Priority; dueDate?: string; courseId?: string | null; reminderProfile?: ReminderProfile }) => {
      if (!user || selectedTaskIds.length === 0) return;
      const previous = tasks;
      setBulkSaving(true);
      setErrorMessage(null);

      setTasks((prev) =>
        prev.map((task) => (selectedTaskIds.includes(task.id) ? { ...task, ...patch } : task)),
      );

      const payload: Record<string, string | null> = {};
      if (patch.status) payload.status = uiToDbStatus(patch.status);
      if (patch.priority) payload.priority = uiToDbPriority(patch.priority);
      if (Object.prototype.hasOwnProperty.call(patch, "dueDate")) payload.due_date = patch.dueDate ? patch.dueDate : null;
      if (Object.prototype.hasOwnProperty.call(patch, "courseId")) payload.course_id = patch.courseId ?? null;
      if (patch.reminderProfile) payload.reminder_profile = patch.reminderProfile;

      const { error } = await supabase.from("tasks").update(payload).in("id", selectedTaskIds).eq("user_id", user.id);
      setBulkSaving(false);
      if (error) {
        setTasks(previous);
        setErrorMessage(sanitizeErrorMessage(error.message, "Bulk update failed. Please retry."));
        return;
      }
      await Promise.all(
        selectedTaskIds.map((taskId) => logTaskActivity(taskId, "bulk_update", "Bulk update applied.", payload)),
      );
      setSuccessMessage(`Bulk update applied to ${selectedTaskIds.length} tasks.`);
      setSelectedTaskIds([]);
    },
    [logTaskActivity, selectedTaskIds, tasks, user],
  );

  const handleBulkDelete = useCallback(async () => {
    if (!user || selectedTaskIds.length === 0) return;
    const confirmed = window.confirm(`Delete ${selectedTaskIds.length} selected tasks? This action cannot be undone.`);
    if (!confirmed) return;

    const previous = tasks;
    setBulkSaving(true);
    setTasks((prev) => prev.filter((task) => !selectedTaskIds.includes(task.id)));
    const { error } = await supabase.from("tasks").delete().in("id", selectedTaskIds).eq("user_id", user.id);
    setBulkSaving(false);
    if (error) {
      setTasks(previous);
      setErrorMessage(sanitizeErrorMessage(error.message, "Bulk delete failed. Please retry."));
      return;
    }
    setSuccessMessage(`${selectedTaskIds.length} tasks deleted.`);
    setSelectedTaskIds([]);
  }, [selectedTaskIds, tasks, user]);

  const toggleExpandSubtasks = useCallback((taskId: string) => {
    setExpandedTaskIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  }, []);

  const handleAddSubtask = useCallback(
    async (taskId: string) => {
      if (!user) return;
      const title = (newSubtaskTitleByTask[taskId] ?? "").trim();
      if (!title) return;
      const nextOrder = (subtasksByTask[taskId]?.length ?? 0) + 1;
      const { error } = await supabase.from("task_subtasks").insert({
        task_id: taskId,
        user_id: user.id,
        title,
        status: "pending",
        progress: 0,
        order_index: nextOrder,
      });
      if (error) {
        setErrorMessage(sanitizeErrorMessage(error.message, "Failed to add subtask."));
        return;
      }
      setNewSubtaskTitleByTask((prev) => ({ ...prev, [taskId]: "" }));
      await logTaskActivity(taskId, "subtask_add", "Added subtask", { title });
      await loadSubtasks(tasks.map((task) => task.id));
      await loadTasks();
    },
    [loadSubtasks, loadTasks, logTaskActivity, newSubtaskTitleByTask, subtasksByTask, tasks, user],
  );

  const handleSubtaskUpdate = useCallback(
    async (taskId: string, subtaskId: string, patch: Partial<Subtask>) => {
      const payload: Record<string, unknown> = {};
      if (patch.title !== undefined) payload.title = patch.title;
      if (patch.status !== undefined) payload.status = patch.status;
      if (patch.progress !== undefined) payload.progress = patch.progress;
      if (patch.orderIndex !== undefined) payload.order_index = patch.orderIndex;
      if (Object.prototype.hasOwnProperty.call(patch, "dueDate")) payload.due_date = patch.dueDate ?? null;
      const { error } = await supabase.from("task_subtasks").update(payload).eq("id", subtaskId);
      if (error) {
        setErrorMessage(sanitizeErrorMessage(error.message, "Failed to update subtask."));
        return;
      }
      await logTaskActivity(taskId, "subtask_update", "Updated subtask", payload as Record<string, unknown>);
      await loadSubtasks(tasks.map((task) => task.id));
      await loadTasks();
    },
    [loadSubtasks, loadTasks, logTaskActivity, tasks],
  );

  const handleSubtaskMove = useCallback(
    async (taskId: string, subtaskId: string, direction: "up" | "down") => {
      const list = subtasksByTask[taskId] ?? [];
      const idx = list.findIndex((item) => item.id === subtaskId);
      if (idx < 0) return;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return;
      const current = list[idx];
      const target = list[targetIdx];
      await Promise.all([
        handleSubtaskUpdate(taskId, current.id, { orderIndex: target.orderIndex }),
        handleSubtaskUpdate(taskId, target.id, { orderIndex: current.orderIndex }),
      ]);
    },
    [handleSubtaskUpdate, subtasksByTask],
  );

  const openBreakdownModal = useCallback(async (task: Task) => {
    setBreakdownTask(task);
    setBreakdownConfig((prev) => ({
      ...prev,
      description: prev.description || `Task context for "${task.name}"`,
    }));
    setBreakdownError(null);
    setBreakdownResult(null);
    setContextFileName("");
    setContextFileText("");
    setLoadingExistingBreakdown(true);

    const { data, error } = await supabase
      .from("task_breakdowns")
      .select("id, objective, assumptions, estimated_total_hours, risk_level, confidence, follow_up_questions, task_breakdown_steps(order_index, title, details, estimated_minutes, acceptance_criteria, status)")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLoadingExistingBreakdown(false);
    if (error || !data) {
      return;
    }

    const steps = ((data as {
      task_breakdown_steps?: Array<{
        order_index: number;
        title: string;
        details: string;
        estimated_minutes: number;
        acceptance_criteria: string;
        status: "pending" | "done";
      }>;
    }).task_breakdown_steps ?? [])
      .sort((a, b) => a.order_index - b.order_index)
      .map((step) => ({
        order: step.order_index,
        title: step.title,
        details: step.details,
        estimatedMinutes: step.estimated_minutes,
        acceptanceCriteria: step.acceptance_criteria,
        status: step.status ?? "pending",
      }));

    setBreakdownResult({
      id: String((data as { id?: unknown }).id ?? ""),
      objective: String((data as { objective?: unknown }).objective ?? ""),
      assumptions: ((data as { assumptions?: unknown }).assumptions as string[] | null) ?? [],
      estimatedTotalHours: Number((data as { estimated_total_hours?: unknown }).estimated_total_hours ?? 0),
      riskLevel: ((data as { risk_level?: unknown }).risk_level as "low" | "medium" | "high" | null) ?? "medium",
      confidence: Number((data as { confidence?: unknown }).confidence ?? 0.75),
      followUpQuestions: ((data as { follow_up_questions?: unknown }).follow_up_questions as string[] | null) ?? [],
      steps,
    });
  }, []);

  const handleContextFileChange = useCallback(async (file: File | null) => {
    if (!file) {
      setContextFileName("");
      setContextFileText("");
      return;
    }

    setContextFileName(file.name);
    const text = await file.text();
    setContextFileText(text.slice(0, 12000));
  }, []);

  const handleGenerateBreakdown = useCallback(async () => {
    if (!breakdownTask || !user) return;
    setGeneratingBreakdown(true);
    setBreakdownError(null);

    const bodyPayload = {
        taskId: breakdownTask.id,
        ...breakdownConfig,
        medium: breakdownTask.priority,
        deadline: breakdownTask.dueDate || null,
        contextFileText: contextFileText || null,
    };
    let parsedPayload: { breakdown?: TaskBreakdown; error?: string } | null = null;
    let invokeError: string | null = null;
    try {
      const { data: payload, error } = await invokeWithAuth("task-breakdown", bodyPayload);
      parsedPayload = (payload ?? null) as { breakdown?: TaskBreakdown; error?: string } | null;
      if (error) {
        invokeError = error.message;
      }
    } catch (error) {
      invokeError = error instanceof Error ? error.message : "Failed to generate breakdown.";
    }

    setGeneratingBreakdown(false);
    if (invokeError || !parsedPayload?.breakdown) {
      setBreakdownError(
        sanitizeErrorMessage(parsedPayload?.error ?? invokeError, "Failed to generate breakdown. Please retry."),
      );
      return;
    }

    setBreakdownResult(parsedPayload.breakdown);
    if (breakdownTask.dueDate) {
      const { error: reminderError } = await supabase.from("notifications").insert({
        user_id: user.id,
        type: "task",
        title: "Deadline reminder linked",
        body: `${breakdownTask.name} deadline is ${breakdownTask.dueDate}. Breakdown is ready.`,
        reference_id: breakdownTask.id,
        reference_type: "task",
      });
      if (reminderError) {
        setBreakdownError(sanitizeErrorMessage(reminderError.message, "Breakdown generated, but reminder save failed."));
      } else {
        setSuccessMessage("Breakdown generated and reminder linked.");
      }
    }
  }, [breakdownConfig, breakdownTask, contextFileText, user]);

  const openTaskDetailModal = useCallback(
    async (task: Task) => {
      setDetailTask(task);
      setDetailComment("");
      setAttachmentName("");
      setAttachmentUrl("");
      setDetailChecklist([]);
      setDetailReminderOffsets(task.reminderOffsets.length > 0 ? task.reminderOffsets : [24, 6, 1]);
      setDetailReminderMuted(task.reminderMuted);
      const { data, error } = await supabase
        .from("task_activities")
        .select("id, action_type, detail, created_at")
        .eq("task_id", task.id)
        .eq("user_id", user?.id ?? "")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        setErrorMessage(sanitizeErrorMessage(error.message, "Failed to load task timeline."));
        return;
      }
      setDetailActivities(
        ((data ?? []) as Array<{ id: string; action_type: string; detail: string | null; created_at: string }>).map((item) => ({
          id: item.id,
          actionType: item.action_type,
          detail: item.detail ?? item.action_type,
          createdAt: item.created_at,
        })),
      );

      const { data: subtaskData } = await supabase
        .from("task_subtasks")
        .select("order_index, title, progress, status")
        .eq("task_id", task.id)
        .eq("user_id", user?.id ?? "")
        .order("order_index", { ascending: true });
      const steps = ((subtaskData ?? []) as Array<{ order_index: number; title: string; progress: number; status: "pending" | "in_progress" | "done" }>).map((step) => ({
        order: step.order_index,
        title: step.title,
        details: "",
        estimatedMinutes: 15,
        acceptanceCriteria: `Progress ${step.progress}%`,
        status: (step.status === "done" ? "done" : "pending") as "pending" | "done",
      }));
      setDetailChecklist(steps);
    },
    [user?.id],
  );

  const handleAddDetailComment = useCallback(async () => {
    if (!detailTask || !detailComment.trim()) return;
    await logTaskActivity(detailTask.id, "comment", detailComment.trim());
    setDetailActivities((prev) => [
      {
        id: `${Date.now()}`,
        actionType: "comment",
        detail: detailComment.trim(),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setDetailComment("");
  }, [detailComment, detailTask, logTaskActivity]);

  const handleAddAttachmentLink = useCallback(async () => {
    if (!detailTask || !attachmentName.trim() || !attachmentUrl.trim()) return;
    const detail = `${attachmentName.trim()} → ${attachmentUrl.trim()}`;
    await logTaskActivity(detailTask.id, "attachment", detail, { url: attachmentUrl.trim(), name: attachmentName.trim() });
    setDetailActivities((prev) => [
      { id: `${Date.now()}`, actionType: "attachment", detail, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setAttachmentName("");
    setAttachmentUrl("");
  }, [attachmentName, attachmentUrl, detailTask, logTaskActivity]);

  const handleSaveReminderSettings = useCallback(async () => {
    if (!detailTask || !user) return;
    const { error } = await supabase
      .from("tasks")
      .update({
        reminder_offsets: detailReminderOffsets,
        reminder_muted: detailReminderMuted,
      })
      .eq("id", detailTask.id)
      .eq("user_id", user.id);
    if (error) {
      setErrorMessage(sanitizeErrorMessage(error.message, "Failed to save reminder settings."));
      return;
    }
    await logTaskActivity(detailTask.id, "reminder_update", "Reminder settings updated.", {
      reminder_offsets: detailReminderOffsets,
      reminder_muted: detailReminderMuted,
    });
    setSuccessMessage("Reminder settings saved.");
    await loadTasks();
  }, [detailReminderMuted, detailReminderOffsets, detailTask, loadTasks, logTaskActivity, user]);

  const handleSnoozeReminder = useCallback(async () => {
    if (!detailTask || !user) return;
    const until = new Date(Date.now() + detailSnoozeHours * 3600 * 1000).toISOString();
    const { error } = await supabase
      .from("tasks")
      .update({ reminder_snooze_until: until })
      .eq("id", detailTask.id)
      .eq("user_id", user.id);
    if (error) {
      setErrorMessage(sanitizeErrorMessage(error.message, "Failed to snooze reminders."));
      return;
    }
    await logTaskActivity(detailTask.id, "reminder_snooze", `Snoozed reminders for ${detailSnoozeHours}h`, { until });
    setSuccessMessage(`Reminder snoozed for ${detailSnoozeHours}h.`);
    await loadTasks();
  }, [detailSnoozeHours, detailTask, loadTasks, logTaskActivity, user]);

  const handleSkipNextOccurrence = useCallback(async () => {
    if (!detailTask || !user || !detailTask.recurrenceActive || !detailTask.recurrenceRule) return;
    const skipDate = detailTask.dueDate || new Date().toISOString().slice(0, 10);
    const existing = Array.isArray(detailTask.recurrenceRule.skip_dates) ? detailTask.recurrenceRule.skip_dates.map(String) : [];
    const nextRule = {
      ...detailTask.recurrenceRule,
      skip_dates: Array.from(new Set([...existing, skipDate])),
    };
    const rootId = detailTask.recurrenceParentId ?? detailTask.id;
    const { error } = await supabase
      .from("tasks")
      .update({ recurrence_rule: nextRule })
      .eq("id", rootId)
      .eq("user_id", user.id);
    if (error) {
      setErrorMessage(sanitizeErrorMessage(error.message, "Failed to skip next occurrence."));
      return;
    }
    await logTaskActivity(detailTask.id, "recurrence_skip", "Skipped one occurrence.", { skipDate });
    setSuccessMessage("Next occurrence skipped.");
    await loadTasks();
  }, [detailTask, loadTasks, logTaskActivity, user]);

  const handleEndSeries = useCallback(async () => {
    if (!detailTask || !user || !detailTask.recurrenceSeriesId) return;
    const { error } = await supabase
      .from("tasks")
      .update({
        recurrence_active: false,
        recurrence_end_date: new Date().toISOString().slice(0, 10),
      })
      .eq("recurrence_series_id", detailTask.recurrenceSeriesId)
      .eq("user_id", user.id);
    if (error) {
      setErrorMessage(sanitizeErrorMessage(error.message, "Failed to end recurring series."));
      return;
    }
    await logTaskActivity(detailTask.id, "recurrence_end", "Recurring series ended.", { series: detailTask.recurrenceSeriesId });
    setSuccessMessage("Recurring series ended.");
    await loadTasks();
  }, [detailTask, loadTasks, logTaskActivity, user]);

  const scoredTasks = useMemo(() => {
    const now = new Date();
    const priorityBoost: Record<Priority, number> = { HIGH: 30, MEDIUM: 20, LOW: 10, DONE: 0 };
    return tasks.map((task) => {
      if (task.status === "DONE") return { ...task, score: -1, suggestedPriority: task.priority };
      const dueDays = task.dueDate ? Math.max(0, Math.ceil((new Date(task.dueDate).getTime() - now.getTime()) / 86400000)) : 30;
      const dueUrgency = Math.max(0, 35 - dueDays * 3);
      const burnoutBoost = burnoutSignal * 0.2;
      const workloadBoost = workloadSignal * 1.8;
      const score = dueUrgency + priorityBoost[task.priority] + burnoutBoost + workloadBoost;
      const suggestedPriority: Priority = score >= 75 ? "HIGH" : score >= 45 ? "MEDIUM" : "LOW";
      return { ...task, score, suggestedPriority };
    });
  }, [burnoutSignal, tasks, workloadSignal]);

  const focusNext = useMemo(
    () => scoredTasks.filter((task) => task.status !== "DONE").sort((a, b) => b.score - a.score).slice(0, 5),
    [scoredTasks],
  );

  const handleApplyFocusSuggestions = useCallback(async () => {
    if (!user || focusNext.length === 0) return;
    for (const task of focusNext) {
      await handleFieldUpdate(task.id, { priority: task.suggestedPriority });
      await supabase.from("task_prioritization_feedback").insert({
        user_id: user.id,
        task_id: task.id,
        suggestion_score: task.score,
        suggested_priority: uiToDbPriority(task.suggestedPriority),
        decision: "accepted",
      });
    }
    setSortBy("SMART");
    setSuccessMessage("Focus Next priorities applied.");
  }, [focusNext, handleFieldUpdate, user]);

  const handleDismissFocusSuggestions = useCallback(async () => {
    if (!user || focusNext.length === 0) return;
    await supabase.from("task_prioritization_feedback").insert(
      focusNext.map((task) => ({
        user_id: user.id,
        task_id: task.id,
        suggestion_score: task.score,
        suggested_priority: uiToDbPriority(task.suggestedPriority),
        decision: "rejected",
      })),
    );
    setSuccessMessage("Focus suggestions dismissed.");
  }, [focusNext, user]);

  const subtaskProgressByTask = useMemo(() => {
    const out: Record<string, { total: number; done: number; percent: number }> = {};
    for (const [taskId, items] of Object.entries(subtasksByTask)) {
      const total = items.length;
      const done = items.filter((item) => item.status === "done").length;
      out[taskId] = { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
    }
    return out;
  }, [subtasksByTask]);

  const filtered = useMemo(
    () =>
      scoredTasks
        .filter((task) => task.name.toLowerCase().includes(search.toLowerCase()))
        .filter((task) => (dateFilter ? task.dueDate === dateFilter : true))
        .sort((a, b) => {
          if (sortBy === "DEADLINE") {
            return new Date(a.dueDate || "9999-12-31").getTime() - new Date(b.dueDate || "9999-12-31").getTime();
          }
          if (sortBy === "PRIORITY") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          if (sortBy === "SMART") return b.score - a.score;
          return a.name.localeCompare(b.name);
        }),
    [dateFilter, scoredTasks, search, sortBy],
  );
  const visibleTaskIds = filtered.map((task) => task.id);
  const allVisibleSelected = visibleTaskIds.length > 0 && visibleTaskIds.every((id) => selectedTaskIds.includes(id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="font-bold text-sm text-gray-500">
          {tasks.length} tasks total · {tasks.filter((t) => t.status !== "DONE").length} active
        </p>
        <button
          onClick={() => void handleEstimateDeadline()}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFC107] border-[3px] border-black font-black text-xs uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        >
          <Timer className="w-4 h-4" strokeWidth={2.5} />
          Estimate Deadline
        </button>
      </div>

      {errorMessage && (
        <div className="border-[3px] border-black bg-[#FFB3C1] p-3 flex items-center justify-between gap-3">
          <p className="font-bold text-xs">{errorMessage}</p>
          <button
            onClick={() => void loadTasks()}
            className="px-3 py-1.5 border-2 border-black bg-white font-black text-[10px] uppercase"
          >
            Retry
          </button>
        </div>
      )}
      {successMessage && (
        <div className="border-[3px] border-black bg-[#B3FFB3] p-3">
          <p className="font-bold text-xs uppercase">{successMessage}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="task-search" className="sr-only">
            Search tasks
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={2.5} />
          <input
            id="task-search"
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-[3px] border-black font-bold text-sm outline-none focus:ring-2 focus:ring-[#FFC107] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white flex">
            <button
              onClick={() => setViewMode("LIST")}
              className={`px-3 py-2 font-black text-[10px] uppercase ${viewMode === "LIST" ? "bg-[#FFC107]" : "bg-white"}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("KANBAN")}
              className={`px-3 py-2 font-black text-[10px] uppercase border-l-2 border-black ${viewMode === "KANBAN" ? "bg-[#FFC107]" : "bg-white"}`}
            >
              Kanban
            </button>
          </div>
          <label htmlFor="task-sort" className="sr-only">
            Sort by
          </label>
          <select
            id="task-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="px-4 py-2.5 border-[3px] border-black font-black text-xs uppercase tracking-wide outline-none focus:ring-2 focus:ring-[#FFC107] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <option value="DEADLINE">Sort by: Deadline</option>
            <option value="PRIORITY">Sort by: Priority</option>
            <option value="NAME">Sort by: Name</option>
            <option value="SMART">Sort by: Smart Focus</option>
          </select>
        </div>
      </div>

      {focusNext.length > 0 && (
        <div className="border-[3px] border-black bg-[#FFF8D6] p-3 space-y-2">
          <p className="font-black text-xs uppercase">Focus Next (Workload-aware)</p>
          <div className="flex flex-wrap gap-2">
            {focusNext.map((task) => (
              <span key={task.id} className="px-2 py-1 border-2 border-black bg-white font-black text-[10px] uppercase">
                {task.name} · {Math.round(task.score)}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleApplyFocusSuggestions()}
              className="px-3 py-2 border-2 border-black bg-[#B3FFB3] font-black text-[11px] uppercase"
            >
              Apply suggestion
            </button>
            <button
              onClick={() => void handleDismissFocusSuggestions()}
              className="px-3 py-2 border-2 border-black bg-white font-black text-[11px] uppercase"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {selectedTaskIds.length > 0 && (
        <div className="border-[3px] border-black bg-[#FFFDF7] p-3 sm:p-4 space-y-3">
          <p className="font-black text-xs uppercase tracking-wide">
            {selectedTaskIds.length} tasks selected · Bulk actions
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <button
              disabled={bulkSaving}
              onClick={() => void applyBulkPatch({ status: "DONE", priority: "DONE" })}
              className="px-3 py-2 border-2 border-black bg-[#B3FFB3] font-black text-[11px] uppercase disabled:opacity-60"
            >
              Mark done
            </button>
            <button
              disabled={bulkSaving}
              onClick={() => void applyBulkPatch({ status: "NOT STARTED", priority: "MEDIUM" })}
              className="px-3 py-2 border-2 border-black bg-white font-black text-[11px] uppercase disabled:opacity-60"
            >
              Reset status
            </button>
            <button
              disabled={bulkSaving}
              onClick={() => void handleBulkDelete()}
              className="px-3 py-2 border-2 border-black bg-[#FFB3C1] font-black text-[11px] uppercase disabled:opacity-60"
            >
              Delete selected
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <select
              value={bulkPriority}
              onChange={(event) => setBulkPriority(event.target.value as Priority)}
              className="border-2 border-black px-2 py-2 font-black text-xs uppercase"
            >
              <option value="HIGH">Priority: High</option>
              <option value="MEDIUM">Priority: Medium</option>
              <option value="LOW">Priority: Low</option>
            </select>
            <button
              disabled={bulkSaving}
              onClick={() => void applyBulkPatch({ priority: bulkPriority })}
              className="px-3 py-2 border-2 border-black bg-white font-black text-[11px] uppercase disabled:opacity-60"
            >
              Apply priority
            </button>
            <input
              type="date"
              value={bulkDueDate}
              onChange={(event) => setBulkDueDate(event.target.value)}
              className="border-2 border-black px-2 py-2 font-black text-xs"
            />
            <button
              disabled={bulkSaving || !bulkDueDate}
              onClick={() => void applyBulkPatch({ dueDate: bulkDueDate })}
              className="px-3 py-2 border-2 border-black bg-white font-black text-[11px] uppercase disabled:opacity-60"
            >
              Apply due date
            </button>
            <select
              value={bulkCourseId}
              onChange={(event) => setBulkCourseId(event.target.value)}
              className="border-2 border-black px-2 py-2 font-black text-xs"
            >
              <option value="__KEEP__">Course: Keep current</option>
              <option value="__NONE__">Course: Unassign</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  Course: {course.name}
                </option>
              ))}
            </select>
            <button
              disabled={bulkSaving || bulkCourseId === "__KEEP__"}
              onClick={() => void applyBulkPatch({ courseId: bulkCourseId === "__NONE__" ? null : bulkCourseId })}
              className="px-3 py-2 border-2 border-black bg-white font-black text-[11px] uppercase disabled:opacity-60"
            >
              Apply course
            </button>
            <select
              value={bulkReminderProfile}
              onChange={(event) => setBulkReminderProfile(event.target.value as ReminderProfile)}
              className="border-2 border-black px-2 py-2 font-black text-xs uppercase"
            >
              <option value="standard">Reminder: Standard</option>
              <option value="focus">Reminder: Focus</option>
              <option value="quiet">Reminder: Quiet</option>
              <option value="mute">Reminder: Mute</option>
            </select>
            <button
              disabled={bulkSaving}
              onClick={() => void applyBulkPatch({ reminderProfile: bulkReminderProfile })}
              className="px-3 py-2 border-2 border-black bg-white font-black text-[11px] uppercase disabled:opacity-60"
            >
              Apply reminder
            </button>
          </div>
        </div>
      )}

      {viewMode === "LIST" && (
      <>
      <div className="hidden md:block border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="font-black text-sm uppercase tracking-wide text-gray-400">Loading tasks...</p>
          </div>
        ) : filtered.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b-[3px] border-black bg-gray-50">
                <th className="text-left px-3 py-3 font-black text-xs uppercase tracking-wide text-black w-10">
                  <button
                    onClick={() => handleSelectVisible(visibleTaskIds)}
                    aria-label={allVisibleSelected ? "Deselect visible tasks" : "Select visible tasks"}
                    className="p-1"
                  >
                    {allVisibleSelected ? <CheckSquare2 className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black">Name</th>
                <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-28">Priority</th>
                <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-32">Status</th>
                <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-28">Due Date</th>
                <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-40">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const isDone = task.status === "DONE";
                const subtaskSummary = subtaskProgressByTask[task.id] ?? { total: 0, done: 0, percent: 0 };
                const expanded = expandedTaskIds.includes(task.id);
                const subtasks = subtasksByTask[task.id] ?? [];
                return (
                  <React.Fragment key={task.id}>
                  <tr className="border-b-2 border-black">
                    <td className="px-3 py-3 align-top">
                      <button
                        onClick={() => toggleTaskSelection(task.id)}
                        aria-label={selectedTaskIds.includes(task.id) ? `Deselect ${task.name}` : `Select ${task.name}`}
                        className="p-1"
                      >
                        {selectedTaskIds.includes(task.id) ? (
                          <CheckSquare2 className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
                        <div className="flex-1">
                          <span className={`font-bold text-sm ${isDone ? "line-through text-gray-400" : "text-black"}`}>{task.name}</span>
                          {subtaskSummary.total > 0 && (
                            <div className="mt-1 space-y-1">
                              <p className="font-black text-[10px] uppercase text-black/60">
                                Subtasks: {subtaskSummary.done}/{subtaskSummary.total}
                              </p>
                              <div className="h-2 border-2 border-black bg-white">
                                <div className="h-full bg-[#FFC107]" style={{ width: `${subtaskSummary.percent}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 border-2 border-black font-black text-xs uppercase tracking-wide ${PRIORITY_CONFIG[task.priority].bg} ${PRIORITY_CONFIG[task.priority].text}`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void handleStatusToggle(task.id, task.status)}
                        aria-label={`Mark ${task.name} as ${task.status === "DONE" ? "not started" : "done"}`}
                        className={`inline-block px-2.5 py-0.5 border-2 border-black font-black text-xs uppercase tracking-wide cursor-pointer transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black ${STATUS_CONFIG[task.status].bg} ${STATUS_CONFIG[task.status].text}`}
                      >
                        {task.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-bold text-sm text-gray-500">{formatDueDate(task.dueDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleExpandSubtasks(task.id)}
                          aria-label={expanded ? `Collapse subtasks for ${task.name}` : `Expand subtasks for ${task.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 border-2 border-black bg-white font-black text-[10px] uppercase hover:bg-gray-100"
                        >
                          {expanded ? "Hide Sub" : "Subtasks"}
                        </button>
                        <button
                          onClick={() => void openTaskDetailModal(task)}
                          aria-label={`Detail ${task.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 border-2 border-black bg-white font-black text-[10px] uppercase hover:bg-gray-100"
                        >
                          Detail
                        </button>
                        <button
                          onClick={() => void openBreakdownModal(task)}
                          aria-label={`Breakdown ${task.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 border-2 border-black bg-[#FFC107] font-black text-[10px] uppercase hover:bg-[#FFD54F]"
                        >
                          <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                          AI
                        </button>
                        <button
                          onClick={() => void handleDelete(task.id)}
                          aria-label={`Delete ${task.name}`}
                          className="p-2.5 text-black hover:bg-red-100 hover:text-red-600 border-2 border-transparent hover:border-black transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b-2 border-black bg-[#FFFDF7]">
                      <td />
                      <td colSpan={5} className="px-4 py-3">
                        <div className="space-y-2">
                          {subtasks.length === 0 && <p className="font-bold text-xs text-black/50">No subtasks yet.</p>}
                          {subtasks.map((subtask, index) => (
                            <div key={subtask.id} className="border-2 border-black p-2 bg-white">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={subtask.status === "done"}
                                  onChange={(event) =>
                                    void handleSubtaskUpdate(task.id, subtask.id, {
                                      status: event.target.checked ? "done" : "in_progress",
                                      progress: event.target.checked ? 100 : 50,
                                    })
                                  }
                                  className="h-4 w-4 border-2 border-black"
                                />
                                <input
                                  value={subtask.title}
                                  onChange={(event) => void handleSubtaskUpdate(task.id, subtask.id, { title: event.target.value })}
                                  className="flex-1 border-2 border-black px-2 py-1 font-bold text-xs"
                                />
                                <button
                                  onClick={() => void handleSubtaskMove(task.id, subtask.id, "up")}
                                  disabled={index === 0}
                                  className="px-2 py-1 border-2 border-black font-black text-[10px] uppercase disabled:opacity-40"
                                >
                                  Up
                                </button>
                                <button
                                  onClick={() => void handleSubtaskMove(task.id, subtask.id, "down")}
                                  disabled={index === subtasks.length - 1}
                                  className="px-2 py-1 border-2 border-black font-black text-[10px] uppercase disabled:opacity-40"
                                >
                                  Down
                                </button>
                              </div>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input
                              value={newSubtaskTitleByTask[task.id] ?? ""}
                              onChange={(event) =>
                                setNewSubtaskTitleByTask((prev) => ({ ...prev, [task.id]: event.target.value }))
                              }
                              placeholder="Add subtask..."
                              className="flex-1 border-2 border-black px-2 py-1 font-bold text-xs"
                            />
                            <button
                              onClick={() => void handleAddSubtask(task.id)}
                              className="px-3 py-1 border-2 border-black bg-[#FFC107] font-black text-[11px] uppercase"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <p className="font-black text-sm uppercase tracking-wide text-gray-400">
              {search ? "No tasks match your search" : "No tasks yet"}
            </p>
          </div>
        )}

        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 text-center font-black text-xs uppercase tracking-wide text-gray-500 hover:text-black hover:bg-gray-50 border-t-2 border-black transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset"
        >
          + New Task
        </button>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {loading ? (
          <div className="border-[3px] border-black bg-white p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-black text-sm uppercase tracking-wide text-gray-400">Loading tasks...</p>
          </div>
        ) : (
          <>
            {filtered.length === 0 && (
              <div className="border-[3px] border-black bg-white p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="font-black text-sm uppercase tracking-wide text-gray-400">
                  {search ? "No tasks match your search" : "No tasks yet"}
                </p>
              </div>
            )}
            {filtered.map((task) => {
              const isDone = task.status === "DONE";
              const subtaskSummary = subtaskProgressByTask[task.id] ?? { total: 0, done: 0, percent: 0 };
              const expanded = expandedTaskIds.includes(task.id);
              const subtasks = subtasksByTask[task.id] ?? [];
              return (
                <div key={task.id} className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-2 items-start">
                      <button
                        onClick={() => toggleTaskSelection(task.id)}
                        aria-label={selectedTaskIds.includes(task.id) ? `Deselect ${task.name}` : `Select ${task.name}`}
                        className="p-1 border-2 border-black bg-white"
                      >
                        {selectedTaskIds.includes(task.id) ? (
                          <CheckSquare2 className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <span
                        className={`inline-block px-2 py-0.5 border-2 border-black font-black text-xs uppercase ${PRIORITY_CONFIG[task.priority].bg}`}
                      >
                        {task.priority}
                      </span>
                      <button
                        onClick={() => void handleStatusToggle(task.id, task.status)}
                        aria-label={`Mark ${task.name} as ${task.status === "DONE" ? "not started" : "done"}`}
                        className={`inline-block px-2 py-0.5 border-2 border-black font-black text-xs uppercase cursor-pointer transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black ${STATUS_CONFIG[task.status].bg} ${STATUS_CONFIG[task.status].text}`}
                      >
                        {task.status}
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => void openTaskDetailModal(task)}
                        aria-label={`Detail ${task.name}`}
                        className="p-2 text-black bg-white border-2 border-black"
                      >
                        <FileText className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => void openBreakdownModal(task)}
                        aria-label={`Breakdown ${task.name}`}
                        className="p-2 text-black bg-[#FFC107] border-2 border-black"
                      >
                        <Sparkles className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => void handleDelete(task.id)}
                        aria-label={`Delete ${task.name}`}
                        className="p-2.5 text-black hover:text-red-600 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                  <p className={`font-bold text-sm ${isDone ? "line-through text-gray-400" : "text-black"}`}>{task.name}</p>
                  <p className="font-black text-xs text-gray-500 uppercase tracking-wide mt-1">Due: {formatDueDate(task.dueDate)}</p>
                  {subtaskSummary.total > 0 && (
                    <div className="mt-2">
                      <p className="font-black text-[10px] uppercase text-black/60">
                        Subtasks: {subtaskSummary.done}/{subtaskSummary.total}
                      </p>
                      <div className="mt-1 h-2 border-2 border-black bg-white">
                        <div className="h-full bg-[#FFC107]" style={{ width: `${subtaskSummary.percent}%` }} />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => toggleExpandSubtasks(task.id)}
                    className="mt-2 px-2 py-1 border-2 border-black bg-white font-black text-[10px] uppercase"
                  >
                    {expanded ? "Hide Subtasks" : "Subtasks"}
                  </button>
                  {expanded && (
                    <div className="mt-2 space-y-2">
                      {subtasks.map((subtask, index) => (
                        <div key={subtask.id} className="border-2 border-black p-2 bg-[#FFFDF7]">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={subtask.status === "done"}
                              onChange={(event) =>
                                void handleSubtaskUpdate(task.id, subtask.id, {
                                  status: event.target.checked ? "done" : "in_progress",
                                  progress: event.target.checked ? 100 : 50,
                                })
                              }
                              className="h-4 w-4 border-2 border-black"
                            />
                            <input
                              value={subtask.title}
                              onChange={(event) => void handleSubtaskUpdate(task.id, subtask.id, { title: event.target.value })}
                              className="flex-1 border-2 border-black px-2 py-1 font-bold text-xs"
                            />
                            <button
                              onClick={() => void handleSubtaskMove(task.id, subtask.id, "up")}
                              disabled={index === 0}
                              className="px-1 py-1 border-2 border-black font-black text-[10px] uppercase disabled:opacity-40"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => void handleSubtaskMove(task.id, subtask.id, "down")}
                              disabled={index === subtasks.length - 1}
                              className="px-1 py-1 border-2 border-black font-black text-[10px] uppercase disabled:opacity-40"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          value={newSubtaskTitleByTask[task.id] ?? ""}
                          onChange={(event) => setNewSubtaskTitleByTask((prev) => ({ ...prev, [task.id]: event.target.value }))}
                          placeholder="Add subtask..."
                          className="flex-1 border-2 border-black px-2 py-1 font-bold text-xs"
                        />
                        <button
                          onClick={() => void handleAddSubtask(task.id)}
                          className="px-2 py-1 border-2 border-black bg-[#FFC107] font-black text-[10px] uppercase"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 py-3 border-[3px] border-dashed border-black font-black text-xs uppercase tracking-wide text-gray-500 hover:text-black hover:bg-gray-50 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New Task
        </button>
      </div>
      </>
      )}

      {viewMode === "KANBAN" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {(["NOT STARTED", "IN PROGRESS", "OVERDUE", "DONE"] as Status[]).map((columnStatus) => (
            <div
              key={columnStatus}
              className="border-[3px] border-black bg-white p-3 min-h-[220px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              onDragOver={(event) => event.preventDefault()}
              onDrop={async (event) => {
                const taskId = event.dataTransfer.getData("text/task-id");
                if (!taskId) return;
                const moved = filtered.find((task) => task.id === taskId);
                if (!moved || moved.status === columnStatus) return;
                const nextPriority = columnStatus === "DONE" ? "DONE" : moved.priority === "DONE" ? "MEDIUM" : moved.priority;
                await handleFieldUpdate(taskId, { status: columnStatus, priority: nextPriority });
              }}
            >
              <p className="font-black text-xs uppercase mb-2">{columnStatus}</p>
              <div className="space-y-2">
                {filtered
                  .filter((task) => task.status === columnStatus)
                  .map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)}
                      className="border-2 border-black p-2 bg-[#FFFDF7] space-y-1"
                    >
                      <p className="font-black text-xs">{task.name}</p>
                      <p className="font-bold text-[11px] uppercase text-black/60">{formatDueDate(task.dueDate)}</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => void openTaskDetailModal(task)}
                          className="px-2 py-1 border-2 border-black bg-white font-black text-[10px] uppercase"
                        >
                          Detail
                        </button>
                        <button
                          onClick={() => void openBreakdownModal(task)}
                          className="px-2 py-1 border-2 border-black bg-[#FFC107] font-black text-[10px] uppercase"
                        >
                          AI
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b-[3px] border-black bg-[#FFC107] flex items-center justify-between">
              <h3 className="font-black text-sm sm:text-base uppercase">New Task</h3>
              <button
                onClick={resetCreateForm}
                className="p-1 border-2 border-black bg-white"
                aria-label="Close new task modal"
              >
                <X className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Task Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleAddTask(false)}
                  className="w-full border-[3px] border-black p-2 font-bold text-sm"
                  placeholder="e.g. UI assignment week 4"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Medium</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as Priority)}
                    className="w-full border-2 border-black p-2 font-black text-xs uppercase"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Deadline</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full border-2 border-black p-2 font-bold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Recurring</label>
                  <select
                    value={newRecurrenceMode}
                    onChange={(event) => setNewRecurrenceMode(event.target.value as "none" | "daily" | "weekly" | "weekdays" | "monthly")}
                    className="w-full border-2 border-black p-2 font-black text-xs uppercase"
                  >
                    <option value="none">No recurrence</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="weekdays">Custom weekdays</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Series End Date</label>
                  <input
                    type="date"
                    value={newRecurrenceEndDate}
                    onChange={(event) => setNewRecurrenceEndDate(event.target.value)}
                    className="w-full border-2 border-black p-2 font-bold text-sm"
                  />
                </div>
              </div>

              {newRecurrenceMode === "weekdays" && (
                <div>
                  <p className="block text-xs font-black uppercase mb-1">Weekdays</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { d: 0, label: "Sun" },
                      { d: 1, label: "Mon" },
                      { d: 2, label: "Tue" },
                      { d: 3, label: "Wed" },
                      { d: 4, label: "Thu" },
                      { d: 5, label: "Fri" },
                      { d: 6, label: "Sat" },
                    ].map((day) => (
                      <label key={day.d} className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={newRecurrenceWeekdays.includes(day.d)}
                          onChange={(event) =>
                            setNewRecurrenceWeekdays((prev) =>
                              event.target.checked ? Array.from(new Set([...prev, day.d])) : prev.filter((item) => item !== day.d),
                            )
                          }
                          className="h-4 w-4 border-2 border-black"
                        />
                        <span className="font-black text-[10px] uppercase">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="block text-xs font-black uppercase mb-1">Reminder Offsets</p>
                <div className="flex gap-3">
                  {[24, 6, 1].map((offset) => (
                    <label key={offset} className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={newReminderOffsets.includes(offset)}
                        onChange={(event) =>
                          setNewReminderOffsets((prev) =>
                            event.target.checked ? Array.from(new Set([...prev, offset])).sort((a, b) => b - a) : prev.filter((item) => item !== offset),
                          )
                        }
                        className="h-4 w-4 border-2 border-black"
                      />
                      <span className="font-black text-[10px] uppercase">{offset}h</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full border-2 border-black p-2 font-bold text-sm"
                  placeholder="Describe task context for structured breakdown..."
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Task Explanation File</label>
                <input
                  type="file"
                  accept=".txt,.pdf,.docs,.docx,.md,.json,.csv,.log,text/plain"
                  onChange={(event) => void handleCreateFileChange(event.target.files?.[0] ?? null)}
                  className="w-full border-2 border-black p-2 text-xs font-bold"
                />
                {createFileName && <p className="text-[11px] font-bold mt-1">Attached: {createFileName}</p>}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => void handleAddTask(false)}
                  disabled={savingNew}
                  className="flex-1 py-2 bg-white border-[3px] border-black font-black text-xs uppercase"
                >
                  {savingNew ? "Saving..." : "Create Task"}
                </button>
                <button
                  onClick={() => void handleAddTask(true)}
                  disabled={savingNew}
                  className="flex-1 py-2 bg-[#FFC107] border-[3px] border-black font-black text-xs uppercase"
                >
                  {savingNew ? "Saving..." : "Create + Structured Breakdown"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailTask && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b-[3px] border-black bg-[#FFC107] flex items-center justify-between">
              <h3 className="font-black text-sm sm:text-base uppercase">Task Detail · {detailTask.name}</h3>
              <button onClick={() => setDetailTask(null)} className="p-1 border-2 border-black bg-white" aria-label="Close">
                <X className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="border-2 border-black p-2">
                  <p className="text-[10px] uppercase font-black">Priority</p>
                  <p className="font-bold text-xs">{detailTask.priority}</p>
                </div>
                <div className="border-2 border-black p-2">
                  <p className="text-[10px] uppercase font-black">Status</p>
                  <p className="font-bold text-xs">{detailTask.status}</p>
                </div>
                <div className="border-2 border-black p-2">
                  <p className="text-[10px] uppercase font-black">Due</p>
                  <p className="font-bold text-xs">{detailTask.dueDate || "No due date"}</p>
                </div>
              </div>
              <div className="border-2 border-black p-3 bg-[#FFFDF7] space-y-2">
                <p className="font-black text-xs uppercase">Reminder Controls</p>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={detailReminderMuted}
                    onChange={(event) => setDetailReminderMuted(event.target.checked)}
                    className="h-4 w-4 border-2 border-black"
                  />
                  <span className="font-black text-[11px] uppercase">Mute reminders</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {[24, 6, 1].map((offset) => (
                    <label key={offset} className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={detailReminderOffsets.includes(offset)}
                        onChange={(event) =>
                          setDetailReminderOffsets((prev) =>
                            event.target.checked ? Array.from(new Set([...prev, offset])).sort((a, b) => b - a) : prev.filter((item) => item !== offset),
                          )
                        }
                        className="h-4 w-4 border-2 border-black"
                      />
                      <span className="font-black text-[10px] uppercase">{offset}h</span>
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void handleSaveReminderSettings()}
                    className="px-3 py-1 border-2 border-black bg-white font-black text-[11px] uppercase"
                  >
                    Save Reminder
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={48}
                    value={detailSnoozeHours}
                    onChange={(event) => setDetailSnoozeHours(Number(event.target.value) || 1)}
                    className="w-20 border-2 border-black px-2 py-1 font-black text-xs"
                  />
                  <button
                    onClick={() => void handleSnoozeReminder()}
                    className="px-3 py-1 border-2 border-black bg-white font-black text-[11px] uppercase"
                  >
                    Snooze
                  </button>
                </div>
              </div>
              {detailTask.recurrenceActive && (
                <div className="border-2 border-black p-3 bg-[#FFFDF7] space-y-2">
                  <p className="font-black text-xs uppercase">Recurring Series</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void handleSkipNextOccurrence()}
                      className="px-3 py-1 border-2 border-black bg-white font-black text-[11px] uppercase"
                    >
                      Skip occurrence
                    </button>
                    <button
                      onClick={() => void handleEndSeries()}
                      className="px-3 py-1 border-2 border-black bg-[#FFB3C1] font-black text-[11px] uppercase"
                    >
                      End series
                    </button>
                  </div>
                </div>
              )}
              <div className="border-2 border-black p-3 bg-[#FFFDF7]">
                <p className="font-black text-xs uppercase">Comments</p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={detailComment}
                    onChange={(event) => setDetailComment(event.target.value)}
                    placeholder="Add comment..."
                    className="flex-1 border-2 border-black px-2 py-1 font-bold text-xs"
                  />
                  <button
                    onClick={() => void handleAddDetailComment()}
                    className="px-3 py-1 border-2 border-black bg-white font-black text-[11px] uppercase"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="border-2 border-black p-3 bg-[#FFFDF7]">
                <p className="font-black text-xs uppercase">Attachments</p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    value={attachmentName}
                    onChange={(event) => setAttachmentName(event.target.value)}
                    placeholder="Name"
                    className="border-2 border-black px-2 py-1 font-bold text-xs"
                  />
                  <input
                    value={attachmentUrl}
                    onChange={(event) => setAttachmentUrl(event.target.value)}
                    placeholder="https://..."
                    className="border-2 border-black px-2 py-1 font-bold text-xs"
                  />
                  <button
                    onClick={() => void handleAddAttachmentLink()}
                    className="px-3 py-1 border-2 border-black bg-white font-black text-[11px] uppercase"
                  >
                    Link
                  </button>
                </div>
              </div>
              <div className="border-2 border-black p-3 bg-[#FFFDF7]">
                <p className="font-black text-xs uppercase mb-2">Subtask Checklist</p>
                <div className="space-y-2">
                  {detailChecklist.length === 0 && <p className="font-bold text-xs text-black/50">No subtasks yet.</p>}
                  {detailChecklist.map((step) => (
                    <label key={`${step.order}-${step.title}`} className="flex items-start gap-2 border-2 border-black p-2 bg-white">
                      <input type="checkbox" checked={step.status === "done"} readOnly className="mt-1 h-4 w-4 border-2 border-black" />
                      <span>
                        <span className="font-black text-xs uppercase">Step {step.order}</span>
                        <span className="block font-bold text-xs">{step.title}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="border-2 border-black p-3 bg-[#FFFDF7]">
                <p className="font-black text-xs uppercase mb-2">Activity Timeline</p>
                <div className="space-y-2">
                  {detailActivities.length === 0 && <p className="font-bold text-xs text-black/50">No activity yet.</p>}
                  {detailActivities.map((activity) => (
                    <div key={activity.id} className="border-2 border-black p-2 bg-white">
                      <p className="font-black text-[10px] uppercase">
                        {activity.actionType} · {new Date(activity.createdAt).toLocaleString()}
                      </p>
                      <p className="font-bold text-xs mt-1">{activity.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {breakdownTask && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b-[3px] border-black bg-[#FFC107] flex items-center justify-between">
              <h3 className="font-black text-sm sm:text-base uppercase">AI Breakdown · {breakdownTask.name}</h3>
              <button onClick={() => setBreakdownTask(null)} className="p-1 border-2 border-black bg-white" aria-label="Close">
                <X className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {breakdownError && <div className="border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs">{breakdownError}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="border-2 border-black p-2 bg-[#FFFDF7]">
                  <p className="text-[10px] font-black uppercase">Medium</p>
                  <p className="text-xs font-bold mt-1">{breakdownTask.priority}</p>
                </div>
                <div className="border-2 border-black p-2 bg-[#FFFDF7]">
                  <p className="text-[10px] font-black uppercase">Deadline</p>
                  <p className="text-xs font-bold mt-1">{breakdownTask.dueDate || "No due date"}</p>
                </div>
                <div className="border-2 border-black p-2 bg-[#FFFDF7]">
                  <p className="text-[10px] font-black uppercase">Status</p>
                  <p className="text-xs font-bold mt-1">{breakdownTask.status}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={breakdownConfig.description}
                  onChange={(event) => setBreakdownConfig((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full border-[3px] border-black p-2 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Task Explanation File</label>
                <input
                  type="file"
                  accept=".txt,.pdf,.docs,.docx,.md,.json,.csv,.log,text/plain"
                  onChange={(event) => void handleContextFileChange(event.target.files?.[0] ?? null)}
                  className="w-full border-2 border-black p-2 text-xs font-bold"
                />
                {contextFileName && <p className="text-[11px] font-bold mt-1">Attached: {contextFileName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">Complexity</label>
                  <select
                    value={breakdownConfig.complexity}
                    onChange={(event) =>
                      setBreakdownConfig((prev) => ({ ...prev, complexity: event.target.value as BreakdownConfig["complexity"] }))
                    }
                    className="w-full border-2 border-black px-2 py-2 font-black text-xs uppercase"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">Hours/Week</label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={breakdownConfig.availableHoursPerWeek}
                    onChange={(event) =>
                      setBreakdownConfig((prev) => ({ ...prev, availableHoursPerWeek: Number(event.target.value) || 1 }))
                    }
                    className="w-full border-2 border-black px-2 py-2 font-black text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1">Granularity</label>
                  <select
                    value={breakdownConfig.granularity}
                    onChange={(event) =>
                      setBreakdownConfig((prev) => ({ ...prev, granularity: event.target.value as BreakdownConfig["granularity"] }))
                    }
                    className="w-full border-2 border-black px-2 py-2 font-black text-xs uppercase"
                  >
                    <option value="coarse">Coarse</option>
                    <option value="normal">Normal</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => void handleGenerateBreakdown()}
                disabled={generatingBreakdown}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFC107] border-[3px] border-black font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4" strokeWidth={2.5} />
                {generatingBreakdown ? "Generating..." : "Generate Breakdown"}
              </button>

              {loadingExistingBreakdown && <p className="font-black text-xs uppercase text-black/50">Loading latest breakdown...</p>}

              {breakdownResult && (
                <div className="border-[3px] border-black p-3 space-y-3 bg-[#FFFDF7]">
                  <p className="font-black text-xs uppercase">Objective</p>
                  <p className="font-bold text-sm">{breakdownResult.objective}</p>
                  <p className="font-black text-xs uppercase">
                    Estimation: {breakdownResult.estimatedTotalHours}h · Risk: {breakdownResult.riskLevel} · Confidence:{" "}
                    {Math.round(breakdownResult.confidence * 100)}%
                  </p>
                  <div className="space-y-2">
                    {breakdownResult.steps.map((step) => (
                      <div key={`${step.order}-${step.title}`} className="border-2 border-black p-2 bg-white">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={step.status === "done"}
                            className="mt-1 h-4 w-4 border-2 border-black"
                            onChange={async (event) => {
                              const isChecked = event.target.checked;
                              if (!breakdownResult.id) return;
                              const { error } = await supabase
                                .from("task_breakdown_steps")
                                .update({ status: isChecked ? "done" : "pending", progress: isChecked ? 100 : 0 })
                                .eq("task_breakdown_id", breakdownResult.id)
                                .eq("order_index", step.order);
                              if (error) {
                                setBreakdownError(sanitizeErrorMessage(error.message, "Failed to update breakdown step."));
                                return;
                              }
                              const updatedSteps: BreakdownStep[] = breakdownResult.steps.map((item) =>
                                item.order === step.order
                                  ? { ...item, status: (isChecked ? "done" : "pending") as "pending" | "done" }
                                  : item,
                              );
                              setBreakdownResult({ ...breakdownResult, steps: updatedSteps });
                              await loadTasks();
                            }}
                          />
                          <div>
                            <p className="font-black text-xs uppercase">
                              Step {step.order} · {step.estimatedMinutes} min
                            </p>
                            <p className="font-black text-sm mt-1">{step.title}</p>
                            <p className="font-bold text-xs mt-1 text-black/70">{step.details}</p>
                            <p className="font-bold text-[11px] mt-1">Done criteria: {step.acceptanceCriteria}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
