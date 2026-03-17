"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import SubNavTabs, { type TabName } from "@/app/components/tasks/SubNavTabs";
import SummaryCards from "@/app/components/tasks/SummaryCards";
import CourseTable from "@/app/components/tasks/CourseTable";
import CourseCards from "@/app/components/tasks/CourseCards";
import MyTasksTab from "@/app/components/tasks/MyTasksTab";
import BurnoutAnalysisTab from "@/app/components/tasks/BurnoutAnalysisTab";
import { getTotalSKS, type Course } from "@/app/components/tasks/courseData";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

import GanttCalendar from "@/app/components/tasks/GanttCalendar"; 
import PeakHoursSchedule from "@/app/components/tasks/PeakHoursSchedule";

type CourseRow = {
  id: string;
  name: string;
  type: string | null;
  credits: number;
  grade: string | null;
  semester: string | null;
};

type CourseCsvDraft = {
  name: string;
  type: Course["type"];
  sks: number;
  semester: string;
  rowNumber: number;
};

type ScheduleCsvDraft = {
  courseName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  rowNumber: number;
};

type UndoAction =
  | { kind: "delete"; course: Course }
  | { kind: "update"; previous: Course };

function toCourseType(value: string | null): Course["type"] {
  const normalized = (value ?? "").toUpperCase();
  if (normalized === "LAB" || normalized === "SEMINAR" || normalized === "ELECTIVE") {
    return normalized;
  }

  return "LECTURE";
}

function getCurrentSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? 1 : 2;
  return `${year}-${half}`;
}

function mapCourse(row: CourseRow): Course {
  return {
    id: row.id,
    name: row.name,
    type: toCourseType(row.type),
    sks: row.credits,
    semester: row.semester,
  };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "\"") {
      const next = line[i + 1];
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

function toCsvCell(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

export default function TasksPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "academic-load" ? "ACADEMIC LOAD" : "MY TASKS";
  const [activeTab, setActiveTab] = useState<TabName>(initialTab);
  const [courses, setCourses] = useState<Course[]>([]);
  const [targetGpa, setTargetGpa] = useState<number | null>(null);
  const [currentGpa, setCurrentGpa] = useState<number | null>(null);
  const [completedCredits, setCompletedCredits] = useState(0);
  const [savingTargetGpa, setSavingTargetGpa] = useState(false);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [academicLoading, setAcademicLoading] = useState(true);
  const [academicError, setAcademicError] = useState<string | null>(null);
  const [academicSuccess, setAcademicSuccess] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [creditCap, setCreditCap] = useState(24);
  const [autoTemplateTasks, setAutoTemplateTasks] = useState(true);
  const [csvDrafts, setCsvDrafts] = useState<CourseCsvDraft[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [scheduleDrafts, setScheduleDrafts] = useState<ScheduleCsvDraft[]>([]);
  const [scheduleCsvErrors, setScheduleCsvErrors] = useState<string[]>([]);
  const [importingCsv, setImportingCsv] = useState(false);

  const loadAcademicData = useCallback(async () => {
    if (!user) {
      setCourses([]);
      setTargetGpa(null);
       setCurrentGpa(null);
      setCompletedCredits(0);
      setAcademicLoading(false);
      return;
    }

    setAcademicLoading(true);
    setAcademicError(null);
    const [coursesResult, profileResult] = await Promise.all([
      supabase
        .from("courses")
        .select("id, name, type, credits, grade, semester")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("target_gpa, current_gpa")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (coursesResult.error) {
      setAcademicError(coursesResult.error.message);
      setAcademicLoading(false);
      return;
    }
    if (profileResult.error) {
      setAcademicError(profileResult.error.message);
      setAcademicLoading(false);
      return;
    }

    const rows = (coursesResult.data as CourseRow[]) ?? [];
    setCourses(rows.map(mapCourse));
    const semesterSet = Array.from(new Set(rows.map((row) => row.semester).filter(Boolean))) as string[];
    if (semesterSet.length > 0 && semesterFilter === "all") {
      setSemesterFilter(semesterSet[0]);
    }
    setCompletedCredits(rows.filter((row) => row.grade && row.grade.trim().length > 0).reduce((sum, row) => sum + row.credits, 0));
    setTargetGpa(profileResult.data?.target_gpa ?? 3.85);
    setCurrentGpa(profileResult.data?.current_gpa ?? null);
    setAcademicLoading(false);
  }, [semesterFilter, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAcademicData();
  }, [loadAcademicData]);

  useEffect(() => {
    if (!undoAction) return;
    const timer = window.setTimeout(() => setUndoAction(null), 5000);
    return () => window.clearTimeout(timer);
  }, [undoAction]);

  useEffect(() => {
    if (!academicSuccess) return;
    const timer = window.setTimeout(() => setAcademicSuccess(null), 2500);
    return () => window.clearTimeout(timer);
  }, [academicSuccess]);

  const handleAdd = useCallback(
    async (course: Omit<Course, "id">) => {
      if (!user) return;

      const { data, error } = await supabase
        .from("courses")
        .insert({
          user_id: user.id,
          name: course.name,
          type: course.type.toLowerCase(),
          credits: course.sks,
          semester: getCurrentSemester(),
        })
        .select("id, name, type, credits")
        .single();

      if (error) {
        setAcademicError(error.message);
        return;
      }

      const inserted = data as CourseRow;
      const mapped = mapCourse(inserted);
      setCourses((prev) => [...prev, mapped]);

      if (autoTemplateTasks) {
        const now = new Date();
        const plusDays = (days: number) => {
          const d = new Date(now);
          d.setDate(now.getDate() + days);
          return d.toISOString().slice(0, 10);
        };
        const templateTasks = [
          { title: `${mapped.name} - Weekly Reading`, priority: "medium", due_date: plusDays(3) },
          { title: `${mapped.name} - Assignment Prep`, priority: "high", due_date: plusDays(7) },
          { title: `${mapped.name} - Exam Review`, priority: "high", due_date: plusDays(14) },
        ];
        const { error: templateError } = await supabase.from("tasks").insert(
          templateTasks.map((task) => ({
            user_id: user.id,
            course_id: mapped.id,
            title: task.title,
            priority: task.priority,
            status: "not_started",
            due_date: task.due_date,
          })),
        );
        if (templateError) {
          setAcademicError(`Course saved, but template tasks failed: ${templateError.message}`);
        }
      }

      setAcademicError(null);
      setAcademicSuccess(autoTemplateTasks ? "Course added with template tasks." : "Course added.");
    },
    [autoTemplateTasks, user],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user) return;

      const confirmed = window.confirm(
        "Deleting this course will also unlink its tasks and schedule slots. Continue?",
      );
      if (!confirmed) return;

      const removed = courses.find((course) => course.id === id);
      if (!removed) return;
      setCourses((prev) => prev.filter((course) => course.id !== id));

      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        setCourses((prev) => [...prev, removed]);
        setAcademicError(error.message);
        return;
      }
      setUndoAction({ kind: "delete", course: removed });
      setAcademicError(null);
      setAcademicSuccess("Course deleted. Undo available for 5 seconds.");
    },
    [courses, user],
  );

  const handleUpdate = useCallback(
    async (id: string, next: Omit<Course, "id">) => {
      if (!user) return;
      const previous = courses.find((course) => course.id === id);
      if (!previous) return;

      setCourses((prev) => prev.map((course) => (course.id === id ? { id, ...next } : course)));
      const { error } = await supabase
        .from("courses")
        .update({
          name: next.name,
          type: next.type.toLowerCase(),
          credits: next.sks,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        setCourses((prev) => prev.map((course) => (course.id === id ? previous : course)));
        setAcademicError(error.message);
        return;
      }

      setUndoAction({ kind: "update", previous });
      setAcademicError(null);
      setAcademicSuccess("Course updated. Undo available for 5 seconds.");
    },
    [courses, user],
  );

  const handleUndo = useCallback(async () => {
    if (!undoAction || !user) return;

    if (undoAction.kind === "update") {
      const prev = undoAction.previous;
      setCourses((list) => list.map((course) => (course.id === prev.id ? prev : course)));
      await supabase
        .from("courses")
        .update({
          name: prev.name,
          type: prev.type.toLowerCase(),
          credits: prev.sks,
        })
        .eq("id", prev.id)
        .eq("user_id", user.id);
    }

    if (undoAction.kind === "delete") {
      const course = undoAction.course;
      setCourses((list) => [...list, course]);
      await supabase.from("courses").insert({
        id: course.id,
        user_id: user.id,
        name: course.name,
        type: course.type.toLowerCase(),
        credits: course.sks,
        semester: getCurrentSemester(),
      });
    }

    setUndoAction(null);
    setAcademicSuccess("Undo applied.");
  }, [undoAction, user]);

  const semesterOptions = useMemo(() => {
    const options = Array.from(new Set(courses.map((course) => course.semester).filter(Boolean)));
    return options as string[];
  }, [courses]);

  const visibleCourses = useMemo(
    () => (semesterFilter === "all" ? courses : courses.filter((course) => (course.semester ?? "") === semesterFilter)),
    [courses, semesterFilter],
  );

  const semesterCredits = useMemo(() => getTotalSKS(visibleCourses), [visibleCourses]);
  const isOverCap = semesterCredits > creditCap;

  const handleTargetGpaSave = useCallback(
    async (next: number) => {
      if (!user) return;
      setSavingTargetGpa(true);
      const { error } = await supabase
        .from("profiles")
        .update({ target_gpa: next })
        .eq("id", user.id);

      setSavingTargetGpa(false);
      if (error) {
        throw error;
      }

      setTargetGpa(next);
    },
    [user],
  );

  const handleCourseCsvFile = useCallback(async (file: File | null) => {
    if (!file) {
      setCsvDrafts([]);
      setCsvErrors([]);
      setScheduleDrafts([]);
      setScheduleCsvErrors([]);
      return;
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) {
      setCsvDrafts([]);
      setCsvErrors(["CSV must include a header and at least one row."]);
      return;
    }

    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const isCourseCsv = ["name", "type", "credits", "semester"].every((key) => header.includes(key));
    const isScheduleCsv = ["course_name", "day_of_week", "start_time", "end_time"].every((key) => header.includes(key));

    if (!isCourseCsv && !isScheduleCsv) {
      setCsvDrafts([]);
      setCsvErrors([]);
      setScheduleDrafts([]);
      setScheduleCsvErrors(["CSV columns not recognized. Use course columns or schedule columns."]);
      return;
    }

    if (isCourseCsv) {
      const idx = {
        name: header.indexOf("name"),
        type: header.indexOf("type"),
        credits: header.indexOf("credits"),
        semester: header.indexOf("semester"),
      };
      const nextDrafts: CourseCsvDraft[] = [];
      const nextErrors: string[] = [];
      const duplicateGuard = new Set<string>();
      for (let i = 1; i < lines.length; i += 1) {
        const row = parseCsvLine(lines[i]);
        const name = (row[idx.name] ?? "").trim();
        const typeRaw = (row[idx.type] ?? "").trim().toUpperCase();
        const credits = Number(row[idx.credits] ?? "");
        const semester = (row[idx.semester] ?? "").trim();
        const type = typeRaw === "LAB" || typeRaw === "SEMINAR" || typeRaw === "ELECTIVE" ? typeRaw : "LECTURE";
        if (!name || !semester || !Number.isFinite(credits) || credits <= 0) {
          nextErrors.push(`Row ${i + 1}: invalid name/semester/credits.`);
          continue;
        }
        const key = `${name.toLowerCase()}::${semester.toLowerCase()}`;
        if (duplicateGuard.has(key)) {
          nextErrors.push(`Row ${i + 1}: duplicate course key (name+semester).`);
          continue;
        }
        duplicateGuard.add(key);
        nextDrafts.push({ name, type, sks: Math.round(credits), semester, rowNumber: i + 1 });
      }
      setCsvDrafts(nextDrafts);
      setCsvErrors(nextErrors);
      setScheduleDrafts([]);
      setScheduleCsvErrors([]);
      return;
    }

    const idx = {
      courseName: header.indexOf("course_name"),
      dayOfWeek: header.indexOf("day_of_week"),
      startTime: header.indexOf("start_time"),
      endTime: header.indexOf("end_time"),
      room: header.indexOf("room"),
    };
    const nextDrafts: ScheduleCsvDraft[] = [];
    const nextErrors: string[] = [];
    const duplicateGuard = new Set<string>();
    for (let i = 1; i < lines.length; i += 1) {
      const row = parseCsvLine(lines[i]);
      const courseName = (row[idx.courseName] ?? "").trim();
      const dayOfWeek = Number(row[idx.dayOfWeek] ?? "");
      const startTime = (row[idx.startTime] ?? "").trim();
      const endTime = (row[idx.endTime] ?? "").trim();
      const room = idx.room >= 0 ? (row[idx.room] ?? "").trim() : "";
      if (!courseName || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !startTime || !endTime) {
        nextErrors.push(`Row ${i + 1}: invalid course/day/time values.`);
        continue;
      }
      const key = `${dayOfWeek}::${startTime}::${endTime}`;
      if (duplicateGuard.has(key)) {
        nextErrors.push(`Row ${i + 1}: duplicate day+time combination.`);
        continue;
      }
      duplicateGuard.add(key);
      nextDrafts.push({ courseName, dayOfWeek, startTime, endTime, room: room || null, rowNumber: i + 1 });
    }
    setScheduleDrafts(nextDrafts);
    setScheduleCsvErrors(nextErrors);
    setCsvDrafts([]);
    setCsvErrors([]);
  }, []);

  const handleImportCsv = useCallback(async () => {
    if (!user || importingCsv) return;
    setImportingCsv(true);
    setAcademicError(null);

    if (csvDrafts.length > 0) {
      const existingKeys = new Set(
        courses.map((course) => `${course.name.toLowerCase()}::${(course.semester ?? "").toLowerCase()}`),
      );
      const insertable = csvDrafts.filter((draft) => !existingKeys.has(`${draft.name.toLowerCase()}::${draft.semester.toLowerCase()}`));
      if (insertable.length === 0) {
        setImportingCsv(false);
        setAcademicError("All imported rows are duplicates of existing courses.");
        return;
      }

      const { error } = await supabase.from("courses").insert(
        insertable.map((draft) => ({
          user_id: user.id,
          name: draft.name,
          type: draft.type.toLowerCase(),
          credits: draft.sks,
          semester: draft.semester,
        })),
      );

      setImportingCsv(false);
      if (error) {
        setAcademicError(error.message);
        return;
      }
      setCsvDrafts([]);
      setCsvErrors([]);
      setAcademicSuccess(`Imported ${insertable.length} courses.`);
      void loadAcademicData();
      return;
    }

    if (scheduleDrafts.length > 0) {
      const courseByName = new Map(courses.map((course) => [course.name.toLowerCase(), course.id]));
      const existingSlots = new Set<string>();
      const { data: currentSlots, error: slotError } = await supabase
        .from("schedule_slots")
        .select("day_of_week,start_time,end_time")
        .eq("user_id", user.id);
      if (slotError) {
        setImportingCsv(false);
        setAcademicError(slotError.message);
        return;
      }
      ((currentSlots ?? []) as Array<{ day_of_week: number; start_time: string; end_time: string }>).forEach((slot) => {
        existingSlots.add(`${slot.day_of_week}::${slot.start_time}::${slot.end_time}`);
      });

      const insertable = scheduleDrafts
        .map((draft) => ({
          user_id: user.id,
          course_id: courseByName.get(draft.courseName.toLowerCase()) ?? null,
          day_of_week: draft.dayOfWeek,
          start_time: draft.startTime,
          end_time: draft.endTime,
          room: draft.room,
        }))
        .filter((draft) => !existingSlots.has(`${draft.day_of_week}::${draft.start_time}::${draft.end_time}`));

      if (insertable.length === 0) {
        setImportingCsv(false);
        setAcademicError("All imported schedule rows are duplicates of existing day+time slots.");
        return;
      }

      const { error } = await supabase.from("schedule_slots").insert(insertable);
      setImportingCsv(false);
      if (error) {
        setAcademicError(error.message);
        return;
      }
      setScheduleDrafts([]);
      setScheduleCsvErrors([]);
      setAcademicSuccess(`Imported ${insertable.length} schedule slot(s).`);
      return;
    }

    setImportingCsv(false);
    setAcademicError("No valid CSV rows to import.");
  }, [courses, csvDrafts, importingCsv, loadAcademicData, scheduleDrafts, user]);

  const handleExportCoursesCsv = useCallback(() => {
    const header = ["name", "type", "credits", "semester"];
    const lines = [
      header.join(","),
      ...visibleCourses.map((course) =>
        [toCsvCell(course.name), toCsvCell(course.type), String(course.sks), toCsvCell(course.semester ?? "")]
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `academic-courses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [visibleCourses]);

  const handleExportIcs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("academic_events")
      .select("title, event_date, event_time, location, type")
      .eq("user_id", user.id)
      .order("event_date", { ascending: true });
    if (error) {
      setAcademicError(error.message);
      return;
    }
    const toUtc = (date: string, time?: string | null) => {
      const iso = `${date}T${(time ?? "09:00:00").slice(0, 8)}`;
      return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };
    const rows = (data ?? []) as Array<{ title: string; event_date: string; event_time?: string | null; location?: string | null; type?: string | null }>;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PuffPastry//AcademicLoad//EN",
      ...rows.flatMap((event, index) => [
        "BEGIN:VEVENT",
        `UID:${index + 1}-${event.event_date}-${event.title.replace(/\s+/g, "-")}@puffpastry`,
        `DTSTAMP:${toUtc(event.event_date, event.event_time)}`,
        `DTSTART:${toUtc(event.event_date, event.event_time)}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.type ?? "academic-event"}`,
        `LOCATION:${event.location ?? ""}`,
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `academic-events-${new Date().toISOString().slice(0, 10)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setAcademicSuccess(`Exported ${rows.length} events to ICS.`);
  }, [user]);

  return (
    <section className="space-y-6">
      <SubNavTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {academicError && (
        <div className="border-[3px] border-black bg-[#FFB3C1] px-4 py-3 flex items-center justify-between gap-3">
          <p className="font-black text-xs uppercase tracking-wide">Academic Load Error: {academicError}</p>
          <button
            onClick={() => void loadAcademicData()}
            className="px-3 py-1.5 border-2 border-black bg-white font-black text-[10px] uppercase"
          >
            Retry
          </button>
        </div>
      )}

      {academicSuccess && (
        <div className="border-[3px] border-black bg-[#B3FFB3] px-4 py-3 flex items-center justify-between gap-3">
          <p className="font-black text-xs uppercase tracking-wide">{academicSuccess}</p>
          {undoAction && (
            <button
              onClick={() => void handleUndo()}
              className="px-3 py-1.5 border-2 border-black bg-white font-black text-[10px] uppercase"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* TAB 1: MY TASKS */}
      {activeTab === "MY TASKS" && (
        <div
          role="tabpanel"
          id="panel-my-tasks"
          aria-labelledby="tab-my-tasks"
          className="space-y-8" 
        >
          <MyTasksTab dateFilter={dateFilter} />
          <GanttCalendar dateFilter={dateFilter} onDateFilterChange={setDateFilter} />
        </div>
      )}

      {/* TAB 2: ACADEMIC LOAD */}
      {activeTab === "ACADEMIC LOAD" && (
        <div
          role="tabpanel"
          id="panel-academic-load"
          aria-labelledby="tab-academic-load"
          className="space-y-6 sm:space-y-8"
        >
          <SummaryCards
            totalSKS={semesterCredits}
            courseCount={visibleCourses.length}
            targetGpa={targetGpa}
            currentGpa={currentGpa}
            completedCredits={completedCredits}
            onTargetGpaSave={handleTargetGpaSave}
            savingTargetGpa={savingTargetGpa}
            loading={academicLoading}
          />

          <div className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
              <div>
                <p className="font-black text-xs uppercase tracking-wide text-gray-500">Semester Planner</p>
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  <label className="font-black text-[11px] uppercase">Semester</label>
                  <select
                    value={semesterFilter}
                    onChange={(event) => setSemesterFilter(event.target.value)}
                    className="border-2 border-black px-2 py-1 font-black text-xs uppercase"
                  >
                    <option value="all">All</option>
                    {semesterOptions.map((semester) => (
                      <option key={semester} value={semester}>
                        {semester}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="font-black text-[11px] uppercase">Credit Cap</label>
                <input
                  type="number"
                  min={12}
                  max={32}
                  value={creditCap}
                  onChange={(event) => setCreditCap(Number(event.target.value))}
                  className="mt-1 w-20 border-2 border-black px-2 py-1 font-black text-sm"
                />
              </div>
            </div>
            <label className="mt-3 inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoTemplateTasks}
                onChange={(event) => setAutoTemplateTasks(event.target.checked)}
                className="w-4 h-4 border-2 border-black"
              />
              <span className="font-black text-[11px] uppercase">Auto-generate course template tasks</span>
            </label>
            <p className={`mt-3 font-black text-xs uppercase ${isOverCap ? "text-[#D62828]" : "text-[#2A9D8F]"}`}>
              {semesterCredits} credits planned {isOverCap ? `• Over cap by ${semesterCredits - creditCap}` : "• Within cap"}
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={handleExportCoursesCsv}
                className="px-3 py-2 border-2 border-black bg-white font-black text-[11px] uppercase"
              >
                Export Courses CSV
              </button>
              <button
                onClick={() => void handleExportIcs()}
                className="px-3 py-2 border-2 border-black bg-white font-black text-[11px] uppercase"
              >
                Export Events ICS
              </button>
              <button
                onClick={() => document.getElementById("course-csv-input")?.click()}
                className="px-3 py-2 border-2 border-black bg-[#FFC107] font-black text-[11px] uppercase"
              >
                Import Courses CSV
              </button>
            </div>
            <input
              id="course-csv-input"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void handleCourseCsvFile(event.target.files?.[0] ?? null)}
              className="hidden"
            />
            {(csvDrafts.length > 0 || csvErrors.length > 0 || scheduleDrafts.length > 0 || scheduleCsvErrors.length > 0) && (
              <div className="mt-3 border-2 border-black p-3 bg-[#FFFDF7] space-y-2">
                <p className="font-black text-[11px] uppercase">
                  CSV Preview: {csvDrafts.length + scheduleDrafts.length} valid row(s), {csvErrors.length + scheduleCsvErrors.length} error(s)
                </p>
                {(csvErrors.length > 0 || scheduleCsvErrors.length > 0) && (
                  <ul className="list-disc ml-4 text-[11px] font-bold text-[#D62828]">
                    {[...csvErrors, ...scheduleCsvErrors].slice(0, 5).map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                )}
                {csvDrafts.length > 0 && (
                  <div className="text-[11px] font-bold text-black/80">
                    Ready to import: {csvDrafts.slice(0, 5).map((row) => `${row.name} (${row.semester})`).join(", ")}
                    {csvDrafts.length > 5 ? " ..." : ""}
                  </div>
                )}
                {scheduleDrafts.length > 0 && (
                  <div className="text-[11px] font-bold text-black/80">
                    Schedule rows:{" "}
                    {scheduleDrafts
                      .slice(0, 5)
                      .map((row) => `${row.courseName} [${row.dayOfWeek} ${row.startTime}-${row.endTime}]`)
                      .join(", ")}
                    {scheduleDrafts.length > 5 ? " ..." : ""}
                  </div>
                )}
                <button
                  onClick={() => void handleImportCsv()}
                  disabled={importingCsv || (csvDrafts.length === 0 && scheduleDrafts.length === 0)}
                  className="px-3 py-2 border-2 border-black bg-[#B3FFB3] font-black text-[11px] uppercase disabled:opacity-60"
                >
                  {importingCsv ? "Importing..." : "Import Valid Rows"}
                </button>
              </div>
            )}
          </div>

          <CourseTable courses={visibleCourses} onDelete={handleDelete} onAdd={handleAdd} onUpdate={handleUpdate} loading={academicLoading} />
          <CourseCards courses={visibleCourses} onDelete={handleDelete} onAdd={handleAdd} onUpdate={handleUpdate} loading={academicLoading} />
          <PeakHoursSchedule courses={visibleCourses} />
        </div>
      )}

      {/* TAB 3: BURNOUT ANALYSIS */}
      {activeTab === "BURNOUT ANALYSIS" && (
        <div
          role="tabpanel"
          id="panel-burnout-analysis"
          aria-labelledby="tab-burnout-analysis"
        >
          <BurnoutAnalysisTab />
        </div>
      )}
    </section>
  );
}
