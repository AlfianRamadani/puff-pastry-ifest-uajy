"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Search, FileText, Trash2, Plus, Timer, Sparkles, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type SortField = "DEADLINE" | "PRIORITY" | "NAME";
type Priority = "HIGH" | "MEDIUM" | "LOW" | "DONE";
type Status = "NOT STARTED" | "IN PROGRESS" | "OVERDUE" | "DONE";

type Task = {
  id: string;
  name: string;
  priority: Priority;
  status: Status;
  dueDate: string;
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
      .select("id, title, priority, status, due_date")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      setErrorMessage(error.message);
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
      };
    });

    setTasks(mapped);
    setLoading(false);
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

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user) return;
      const previous = tasks;
      setTasks((prev) => prev.filter((task) => task.id !== id));
      const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
      if (error) {
        setTasks(previous);
        setErrorMessage(error.message);
      }
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
        setErrorMessage(error.message);
      }
    },
    [tasks, user],
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

    const { data: createdRow, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: newName.trim(),
        priority: uiToDbPriority(newPriority),
        status: "not_started",
        due_date: due,
      })
      .select("id, title, priority, status, due_date")
      .single();

    if (error) {
      setErrorMessage(error.message);
      setSavingNew(false);
      return;
    }

    const createdTask: Task = {
      id: String((createdRow as { id: unknown }).id),
      name: String((createdRow as { title: unknown }).title),
      priority: dbToUiPriority(String((createdRow as { priority?: unknown }).priority ?? "medium"), "NOT STARTED"),
      status: dbToUiStatus(String((createdRow as { status?: unknown }).status ?? "not_started")),
      dueDate: String((createdRow as { due_date?: unknown }).due_date ?? ""),
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
          setErrorMessage(parsedPayload?.error ?? breakdownCallError?.message ?? "Task created but AI breakdown failed.");
        } else {
          setBreakdownTask(createdTask);
          setBreakdownResult(parsedPayload.breakdown);
          setBreakdownError(null);
          setContextFileName(createFileName);
          setContextFileText(createFileText);
          setBreakdownConfig((prev) => ({ ...prev, description: createDescription || prev.description }));
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Task created but AI breakdown failed.");
      }
    }

    resetCreateForm();
    setSavingNew(false);
    void loadTasks();
  }, [
    breakdownConfig.availableHoursPerWeek,
    breakdownConfig.complexity,
    breakdownConfig.deadlineStrictness,
    breakdownConfig.granularity,
    createDescription,
    createFileName,
    createFileText,
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to estimate deadlines.");
    }
  }, [loadTasks, tasks, user]);

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
      setBreakdownError(parsedPayload?.error ?? invokeError ?? "Failed to generate breakdown.");
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
        setBreakdownError(reminderError.message);
      }
    }
  }, [breakdownConfig, breakdownTask, contextFileText, user]);

  const filtered = useMemo(
    () =>
      tasks
        .filter((task) => task.name.toLowerCase().includes(search.toLowerCase()))
        .filter((task) => (dateFilter ? task.dueDate === dateFilter : true))
        .sort((a, b) => {
          if (sortBy === "DEADLINE") {
            return new Date(a.dueDate || "9999-12-31").getTime() - new Date(b.dueDate || "9999-12-31").getTime();
          }
          if (sortBy === "PRIORITY") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          return a.name.localeCompare(b.name);
        }),
    [dateFilter, search, sortBy, tasks],
  );

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

      {errorMessage && <div className="border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs">{errorMessage}</div>}

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
          </select>
        </div>
      </div>

      <div className="hidden md:block border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="font-black text-sm uppercase tracking-wide text-gray-400">Loading tasks...</p>
          </div>
        ) : filtered.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b-[3px] border-black bg-gray-50">
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
                return (
                  <tr key={task.id} className="border-b-2 border-black last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
                        <span className={`font-bold text-sm ${isDone ? "line-through text-gray-400" : "text-black"}`}>{task.name}</span>
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
              return (
                <div key={task.id} className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-2">
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
                                setBreakdownError(error.message);
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
