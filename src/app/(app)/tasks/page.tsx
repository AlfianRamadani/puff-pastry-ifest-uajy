"use client";

import React, { useState, useCallback, useEffect } from "react";
import SubNavTabs, { type TabName } from "@/app/components/tasks/SubNavTabs";
import SummaryCards from "@/app/components/tasks/SummaryCards";
import CourseTable from "@/app/components/tasks/CourseTable";
import CourseCards from "@/app/components/tasks/CourseCards";
import MyTasksTab from "@/app/components/tasks/MyTasksTab";
import BurnoutAnalysisTab from "@/app/components/tasks/BurnoutAnalysisTab";
import {
  getCourses,
  addCourse,
  deleteCourse,
  getTotalSKS,
  type Course,
} from "@/app/components/tasks/courseData";

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<TabName>("MY TASKS");
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

      {activeTab === "MY TASKS" && (
        <div
          role="tabpanel"
          id="panel-my-tasks"
          aria-labelledby="tab-my-tasks"
        >
          <MyTasksTab />
        </div>
      )}

      {activeTab === "ACADEMIC LOAD" && (
        <div
          role="tabpanel"
          id="panel-academic-load"
          aria-labelledby="tab-academic-load"
          className="space-y-6"
        >
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
