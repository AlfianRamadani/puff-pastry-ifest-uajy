"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Search, FileText, Trash2, Plus, Timer } from "lucide-react";
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!user) return;
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

  const handleDelete = useCallback(async (id: string) => {
    if (!user) return;
    const previous = tasks;
    setTasks((prev) => prev.filter((task) => task.id !== id));
    const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      setTasks(previous);
      setErrorMessage(error.message);
    }
    setPendingDeleteId(null);
  }, [tasks, user]);

  const handleFieldUpdate = useCallback(async (id: string, patch: Partial<Task>) => {
    if (!user) return;
    const previous = tasks;
    setUpdatingTaskId(id);
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
    setUpdatingTaskId(null);
  }, [tasks, user]);

  const handleAddTask = useCallback(async () => {
    if (!user || !newName.trim() || savingNew) return;
    setSavingNew(true);
    const due = newDueDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: newName.trim(),
      priority: uiToDbPriority(newPriority),
      status: "not_started",
      due_date: due,
    });
    if (error) {
      setErrorMessage(error.message);
      setSavingNew(false);
      return;
    }
    setNewName("");
    setNewPriority("MEDIUM");
    setNewDueDate("");
    setShowForm(false);
    setSavingNew(false);
    void loadTasks();
  }, [loadTasks, newDueDate, newName, newPriority, savingNew, user]);

  const handleStatusToggle = useCallback(async (task: Task) => {
    const nextStatus: Status = task.status === "DONE" ? "NOT STARTED" : "DONE";
    await handleFieldUpdate(task.id, {
      status: nextStatus,
      priority: nextStatus === "DONE" ? "DONE" : "MEDIUM",
    });
  }, [handleFieldUpdate]);

  const handleEstimateDeadline = useCallback(async () => {
    if (!user) return;
    setErrorMessage("Deadline estimate UI is temporarily disabled to preserve original layout.");
  }, [user]);

  const filtered = useMemo(() => {
    return tasks
      .filter((task) => task.name.toLowerCase().includes(search.toLowerCase()))
      .filter((task) => (dateFilter ? task.dueDate === dateFilter : true))
      .sort((a, b) => {
        if (sortBy === "DEADLINE") return new Date(a.dueDate || "9999-12-31").getTime() - new Date(b.dueDate || "9999-12-31").getTime();
        if (sortBy === "PRIORITY") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        return a.name.localeCompare(b.name);
      });
  }, [dateFilter, search, sortBy, tasks]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="font-bold text-sm text-gray-500">{tasks.length} tasks total · {tasks.filter((task) => task.status !== "DONE").length} active</p>
        <button
          onClick={() => void handleEstimateDeadline()}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFC107] border-[3px] border-black font-black text-xs uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          <Timer className="w-4 h-4" strokeWidth={2.5} />
          Estimate Deadline
        </button>
      </div>

      {errorMessage && <div className="border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs">{errorMessage}</div>}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={2.5} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-[3px] border-black font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortField)} className="px-4 py-2.5 border-[3px] border-black font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <option value="DEADLINE">Sort by: Deadline</option>
          <option value="PRIORITY">Sort by: Priority</option>
          <option value="NAME">Sort by: Name</option>
        </select>
      </div>

      <div className="hidden md:block border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center font-black text-xs uppercase text-black/50">Loading tasks...</div>
        ) : filtered.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b-[3px] border-black bg-gray-50">
                <th className="text-left px-4 py-3 font-black text-xs uppercase">Name</th>
                <th className="text-left px-4 py-3 font-black text-xs uppercase w-28">Priority</th>
                <th className="text-left px-4 py-3 font-black text-xs uppercase w-36">Status</th>
                <th className="text-left px-4 py-3 font-black text-xs uppercase w-28">Due Date</th>
                <th className="text-left px-4 py-3 font-black text-xs uppercase w-20">Delete</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={task.id} className="border-b-2 border-black last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
                      <span className={`font-bold text-sm ${task.status === "DONE" ? "line-through text-gray-400" : "text-black"}`}>{task.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 border-2 border-black font-black text-xs uppercase tracking-wide ${PRIORITY_CONFIG[task.priority].bg} ${PRIORITY_CONFIG[task.priority].text}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void handleStatusToggle(task)}
                      disabled={updatingTaskId === task.id}
                      className={`inline-block px-2.5 py-0.5 border-2 border-black font-black text-xs uppercase tracking-wide ${STATUS_CONFIG[task.status].bg} ${STATUS_CONFIG[task.status].text}`}
                    >
                      {task.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-bold text-sm text-gray-500">
                    {formatDueDate(task.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    {pendingDeleteId === task.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => void handleDelete(task.id)} className="px-2 py-1 border-2 border-black bg-[#FFB3C1] font-black text-[10px] uppercase">Yes</button>
                        <button onClick={() => setPendingDeleteId(null)} className="px-2 py-1 border-2 border-black bg-white font-black text-[10px] uppercase">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setPendingDeleteId(task.id)} className="p-2.5 border-2 border-transparent hover:border-black hover:bg-red-100">
                        <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <p className="font-black text-sm uppercase tracking-wide text-gray-400">{search ? "No tasks match your search" : "No tasks yet"}</p>
          </div>
        )}

        {showForm ? (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t-2 border-black bg-[#FFC107]/10">
            <input type="text" placeholder="Task name..." value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 min-w-[120px] px-3 py-1.5 border-2 border-black font-bold text-sm" />
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as Priority)} className="px-3 py-1.5 border-2 border-black font-black text-xs uppercase">
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="px-3 py-1.5 border-2 border-black font-bold text-sm" />
            <button disabled={savingNew} onClick={() => void handleAddTask()} className="px-3 py-1.5 bg-[#FFC107] border-2 border-black font-black text-xs">{savingNew ? "Saving..." : "Save"}</button>
            <button onClick={() => { setShowForm(false); setNewName(""); setNewPriority("MEDIUM"); setNewDueDate(""); }} className="px-3 py-1.5 bg-white border-2 border-black font-black text-xs">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="w-full py-3 text-center font-black text-xs uppercase tracking-wide text-gray-500 hover:text-black hover:bg-gray-50 border-t-2 border-black">
            + New Task
          </button>
        )}
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map((task) => (
          <div key={task.id} className="border-[3px] border-black bg-white p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-black text-xs uppercase">{task.name}</p>
            <p className="font-bold text-[10px] text-black/60 mt-1">{formatDueDate(task.dueDate)}</p>
            <div className="mt-2 flex gap-2">
              <span className={`px-2 py-1 border-2 border-black font-black text-[10px] ${PRIORITY_CONFIG[task.priority].bg}`}>{task.priority}</span>
              <span className={`px-2 py-1 border-2 border-black font-black text-[10px] ${STATUS_CONFIG[task.status].bg} ${STATUS_CONFIG[task.status].text}`}>{task.status}</span>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setShowForm((prev) => !prev)} className="md:hidden w-full border-[3px] border-black bg-[#FFC107] py-3 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" strokeWidth={3} /> New Task
      </button>
    </div>
  );
}
