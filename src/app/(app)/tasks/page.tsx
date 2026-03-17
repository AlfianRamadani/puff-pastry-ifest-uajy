"use client";

import React, { useState, useCallback, useEffect } from "react";
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
};

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
  };
}

export default function TasksPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "academic-load" ? "ACADEMIC LOAD" : "MY TASKS";
  const [activeTab, setActiveTab] = useState<TabName>(initialTab);
  const [courses, setCourses] = useState<Course[]>([]);
  const [targetGpa, setTargetGpa] = useState<number | null>(null);
  const [savingTargetGpa, setSavingTargetGpa] = useState(false);
  const [dateFilter, setDateFilter] = useState<string | null>(null);

  const loadAcademicData = useCallback(async () => {
    if (!user) {
      setCourses([]);
      setTargetGpa(null);
      return;
    }

    const [coursesResult, profileResult] = await Promise.all([
      supabase
        .from("courses")
        .select("id, name, type, credits")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("target_gpa")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (coursesResult.error) {
      throw coursesResult.error;
    }
    if (profileResult.error) {
      throw profileResult.error;
    }

    setCourses((coursesResult.data as CourseRow[]).map(mapCourse));
    setTargetGpa(profileResult.data?.target_gpa ?? 3.85);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAcademicData();
  }, [loadAcademicData]);

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
        throw error;
      }

      setCourses((prev) => [...prev, mapCourse(data as CourseRow)]);
    },
    [user],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user) return;

      const confirmed = window.confirm(
        "Deleting this course will also unlink its tasks and schedule slots. Continue?",
      );
      if (!confirmed) return;

      const previous = courses;
      setCourses((prev) => prev.filter((course) => course.id !== id));

      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        setCourses(previous);
        throw error;
      }
    },
    [courses, user],
  );

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
            totalSKS={getTotalSKS(courses)}
            courseCount={courses.length}
            targetGpa={targetGpa}
            onTargetGpaSave={handleTargetGpaSave}
            savingTargetGpa={savingTargetGpa}
          />
          <CourseTable courses={courses} onDelete={handleDelete} onAdd={handleAdd} />
          <CourseCards courses={courses} onDelete={handleDelete} onAdd={handleAdd} />
          <PeakHoursSchedule courses={courses} />
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
