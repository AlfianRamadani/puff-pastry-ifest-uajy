"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Search, FileText, Trash2, Plus, Timer } from "lucide-react";
import {
  getTasks,
  addTask,
  deleteTask,
  updateTask,
  formatDueDate,
  type Task,
  type Priority,
  type Status,
} from "./taskData";

type SortField = "DEADLINE" | "PRIORITY" | "NAME";

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

export default function MyTasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("DEADLINE");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setTasks(getTasks());
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTasks(deleteTask(id));
  }, []);

  const handleStatusToggle = useCallback((id: string, current: Status) => {
    const next: Status = current === "DONE" ? "NOT STARTED" : "DONE";
    const priority: Priority = next === "DONE" ? "DONE" : "MEDIUM";
    setTasks(updateTask(id, { status: next, priority }));
  }, []);

  const handleAddTask = useCallback(() => {
    if (!newName.trim()) return;
    const due = new Date();
    due.setDate(due.getDate() + 7);
    setTasks(
      addTask({
        name: newName.trim(),
        priority: "MEDIUM",
        status: "NOT STARTED",
        dueDate: due.toISOString().split("T")[0],
      })
    );
    setNewName("");
    setShowForm(false);
  }, [newName]);

  const filtered = useMemo(
    () =>
      tasks
        .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
          if (sortBy === "DEADLINE") return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          if (sortBy === "PRIORITY") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          return a.name.localeCompare(b.name);
        }),
    [tasks, search, sortBy]
  );

  return (
    <div className="space-y-4">
      {/* Header with CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="font-bold text-sm text-gray-500">
          {tasks.length} tasks total · {tasks.filter((t) => t.status !== "DONE").length} active
        </p>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#FFC107] border-[3px] border-black font-black text-xs uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2">
          <Timer className="w-4 h-4" strokeWidth={2.5} />
          Estimate Deadline
        </button>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="task-search" className="sr-only">Search tasks</label>
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
          <label htmlFor="task-sort" className="sr-only">Sort by</label>
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

      {/* Desktop Table */}
      <div className="hidden md:block border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        {filtered.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="border-b-[3px] border-black bg-gray-50">
              <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black">Name</th>
              <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-28">Priority</th>
              <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-32">Status</th>
              <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-28">Due Date</th>
              <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-20">Action</th>
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
                      <span className={`font-bold text-sm ${isDone ? "line-through text-gray-400" : "text-black"}`}>
                        {task.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 border-2 border-black font-black text-[10px] uppercase tracking-wide ${PRIORITY_CONFIG[task.priority].bg} ${PRIORITY_CONFIG[task.priority].text}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleStatusToggle(task.id, task.status)}
                      aria-label={`Mark ${task.name} as ${task.status === "DONE" ? "not started" : "done"}`}
                      className={`inline-block px-2.5 py-0.5 border-2 border-black font-black text-[10px] uppercase tracking-wide cursor-pointer transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black ${STATUS_CONFIG[task.status].bg} ${STATUS_CONFIG[task.status].text}`}
                    >
                      {task.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-bold text-sm text-gray-500">
                    {formatDueDate(task.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(task.id)}
                      aria-label={`Delete ${task.name}`}
                      className="p-2.5 text-black hover:bg-red-100 hover:text-red-600 border-2 border-transparent hover:border-black transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                    </button>
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

        {showForm ? (
          <div className="flex items-center gap-3 px-4 py-3 border-t-2 border-black bg-[#FFC107]/10">
            <label htmlFor="new-task-name" className="sr-only">New task name</label>
            <input
              id="new-task-name"
              type="text"
              placeholder="Task name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              className="flex-1 px-3 py-1.5 border-2 border-black font-bold text-sm outline-none focus:ring-2 focus:ring-[#FFC107]"
              autoFocus
            />
            <button onClick={handleAddTask} className="px-3 py-1.5 bg-[#FFC107] border-2 border-black font-black text-xs transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] outline-none focus-visible:ring-2 focus-visible:ring-black">
              Save
            </button>
            <button onClick={() => { setShowForm(false); setNewName(""); }} className="px-3 py-1.5 bg-white border-2 border-black font-black text-xs transition-colors duration-150 hover:bg-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-black">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 text-center font-black text-xs uppercase tracking-wide text-gray-400 hover:text-black hover:bg-gray-50 border-t-2 border-black transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset"
          >
            + New Page
          </button>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.map((task) => {
          const isDone = task.status === "DONE";
          return (
            <div key={task.id} className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start justify-between mb-2">
                <div className="flex gap-2">
                  <span className={`inline-block px-2 py-0.5 border-2 border-black font-black text-[10px] uppercase ${PRIORITY_CONFIG[task.priority].bg}`}>
                    {task.priority}
                  </span>
                  <button
                    onClick={() => handleStatusToggle(task.id, task.status)}
                    aria-label={`Mark ${task.name} as ${task.status === "DONE" ? "not started" : "done"}`}
                    className={`inline-block px-2 py-0.5 border-2 border-black font-black text-[10px] uppercase cursor-pointer transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black ${STATUS_CONFIG[task.status].bg} ${STATUS_CONFIG[task.status].text}`}
                  >
                    {task.status}
                  </button>
                </div>
                <button
                  onClick={() => handleDelete(task.id)}
                  aria-label={`Delete ${task.name}`}
                  className="p-2.5 text-black hover:text-red-600 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
              <p className={`font-bold text-sm ${isDone ? "line-through text-gray-400" : "text-black"}`}>
                {task.name}
              </p>
              <p className="font-black text-xs text-gray-500 uppercase tracking-wide mt-1">
                Due: {formatDueDate(task.dueDate)}
              </p>
            </div>
          );
        })}

        {showForm ? (
          <div className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-black text-xs uppercase tracking-wide mb-3">New Task</p>
            <label htmlFor="mobile-new-task" className="sr-only">New task name</label>
            <input
              id="mobile-new-task"
              type="text"
              placeholder="Task name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black font-bold text-sm mb-3 outline-none focus:ring-2 focus:ring-[#FFC107]"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleAddTask} className="flex-1 py-2 bg-[#FFC107] border-2 border-black font-black text-xs uppercase transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] outline-none focus-visible:ring-2 focus-visible:ring-black">
                Save
              </button>
              <button onClick={() => { setShowForm(false); setNewName(""); }} className="flex-1 py-2 bg-white border-2 border-black font-black text-xs uppercase transition-colors duration-150 hover:bg-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-black">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 py-3 border-[3px] border-dashed border-black font-black text-xs uppercase tracking-wide text-gray-400 hover:text-black hover:bg-gray-50 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            New Page
          </button>
        )}
      </div>
    </div>
  );
}
