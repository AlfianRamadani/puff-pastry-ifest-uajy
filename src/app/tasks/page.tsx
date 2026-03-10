"use client";

import React, { useState, useCallback, useEffect } from "react";
import SubNavTabs, { type TabName } from "../components/tasks/SubNavTabs";
import SummaryCards from "../components/tasks/SummaryCards";
import CourseTable from "../components/tasks/CourseTable";
import CourseCards from "../components/tasks/CourseCards";
import {
  getCourses,
  addCourse,
  deleteCourse,
  getTotalSKS,
  type Course,
} from "../components/tasks/courseData";

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<TabName>("ACADEMIC LOAD");
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    setCourses(getCourses());
  }, []);

  const handleAdd = useCallback((course: Omit<Course, "id">) => {
    setCourses(addCourse(course));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setCourses(deleteCourse(id));
  }, []);

  return (
    <section className="space-y-6">
      <SubNavTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "ACADEMIC LOAD" && (
        <div className="space-y-6">
          <SummaryCards
            totalSKS={getTotalSKS(courses)}
            courseCount={courses.length}
          />
          <CourseTable
            courses={courses}
            onDelete={handleDelete}
            onAdd={handleAdd}
          />
          <CourseCards
            courses={courses}
            onDelete={handleDelete}
            onAdd={handleAdd}
          />
        </div>
      )}

      {activeTab === "MY TASKS" && (
        <div className="border-[3px] border-dashed border-black bg-white p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black text-sm uppercase tracking-wide text-gray-400">
            My Tasks — Coming Soon
          </p>
        </div>
      )}

      {activeTab === "BURNOUT ANALYSIS" && (
        <div className="border-[3px] border-dashed border-black bg-white p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black text-sm uppercase tracking-wide text-gray-400">
            Burnout Analysis — Coming Soon
          </p>
        </div>
      )}
    </section>
  );
}
