export type Priority = "HIGH" | "MEDIUM" | "LOW" | "DONE";
export type Status = "NOT STARTED" | "IN PROGRESS" | "OVERDUE" | "DONE";

export interface Task {
  id: string;
  name: string;
  priority: Priority;
  status: Status;
  dueDate: string;
}

const STORAGE_KEY = "puff_pastry_tasks";

const DEFAULT_TASKS: Task[] = [
  { id: "1", name: "Finalize UI Kit for GRIT App", priority: "HIGH", status: "IN PROGRESS", dueDate: "2026-03-10" },
  { id: "2", name: "Research User Flows", priority: "MEDIUM", status: "NOT STARTED", dueDate: "2026-03-12" },
  { id: "3", name: "Review Pull Requests", priority: "HIGH", status: "OVERDUE", dueDate: "2026-03-08" },
  { id: "4", name: "Sketch Initial Concepts", priority: "LOW", status: "NOT STARTED", dueDate: "2026-03-15" },
  { id: "5", name: "Final Project Documentation", priority: "HIGH", status: "IN PROGRESS", dueDate: "2026-03-09" },
  { id: "6", name: "Neural Networks Homework", priority: "MEDIUM", status: "OVERDUE", dueDate: "2026-03-07" },
  { id: "7", name: "Database ER Diagram", priority: "LOW", status: "DONE", dueDate: "2026-03-05" },
  { id: "8", name: "Weekly Standup Notes", priority: "DONE", status: "DONE", dueDate: "2026-03-06" },
];

let cached: Task[] | null = null;

function loadTasks(): Task[] {
  if (cached) return cached;
  if (typeof window === "undefined") return DEFAULT_TASKS;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TASKS));
    cached = DEFAULT_TASKS;
    return cached;
  }

  cached = JSON.parse(raw) as Task[];
  return cached;
}

function saveTasks(tasks: Task[]) {
  cached = tasks;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }
}

export function getTasks(): Task[] {
  return loadTasks();
}

export function addTask(task: Omit<Task, "id">): Task[] {
  const tasks = loadTasks();
  const newTask: Task = { ...task, id: Date.now().toString() };
  const updated = [...tasks, newTask];
  saveTasks(updated);
  return updated;
}

export function deleteTask(id: string): Task[] {
  const tasks = loadTasks();
  const updated = tasks.filter((t) => t.id !== id);
  saveTasks(updated);
  return updated;
}

export function updateTask(id: string, patch: Partial<Omit<Task, "id">>): Task[] {
  const tasks = loadTasks();
  const updated = tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
  saveTasks(updated);
  return updated;
}

export function formatDueDate(dateStr: string): string {
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
