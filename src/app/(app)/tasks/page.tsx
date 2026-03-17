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
