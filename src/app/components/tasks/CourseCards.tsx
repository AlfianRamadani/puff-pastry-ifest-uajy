"use client";

import React from "react";
import { Trash2, Plus } from "lucide-react";
import type { Course } from "./courseData";
import { useCourseForm } from "./useCourseForm";

interface CourseCardsProps {
  courses: Course[];
  onDelete: (id: string) => void;
  onAdd: (course: Omit<Course, "id">) => void;
}

export default function CourseCards({ courses, onDelete, onAdd }: CourseCardsProps) {
  const { showForm, form, openForm, closeForm, handleSubmit, updateField } =
    useCourseForm(onAdd);

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-base uppercase tracking-wide text-black">
          Course List
        </h2>
        <button
          onClick={openForm}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#FFC107] border-[3px] border-black font-black text-xs uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Add Course
        </button>
      </div>

      {showForm && (
        <div className="mb-4 border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black text-xs uppercase tracking-wide mb-3 text-black">
            New Course
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="mobile-course-name" className="sr-only">Course name</label>
              <input
                id="mobile-course-name"
                type="text"
                placeholder="Course name..."
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full px-3 py-2 border-2 border-black font-bold text-sm outline-none focus:ring-2 focus:ring-[#FFC107]"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="mobile-course-type" className="sr-only">Course type</label>
                <select
                  id="mobile-course-type"
                  value={form.type}
                  onChange={(e) =>
                    updateField("type", e.target.value as Course["type"])
                  }
                  className="w-full px-3 py-2 border-2 border-black font-black text-xs uppercase outline-none focus:ring-2 focus:ring-[#FFC107]"
                >
                  <option value="THEORY">Lecture</option>
                  <option value="PRACTICUM">Lab</option>
                </select>
              </div>
              <div>
                <label htmlFor="mobile-course-sks" className="sr-only">Credits</label>
                <input
                  id="mobile-course-sks"
                  type="number"
                  min={1}
                  max={6}
                  value={form.sks}
                  onChange={(e) => updateField("sks", Number(e.target.value))}
                  className="w-20 px-3 py-2 border-2 border-black font-black text-sm outline-none focus:ring-2 focus:ring-[#FFC107]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                className="flex-1 py-2 bg-[#FFC107] border-2 border-black font-black text-xs uppercase active:translate-x-[1px] active:translate-y-[1px] transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                Save
              </button>
              <button
                onClick={closeForm}
                className="flex-1 py-2 bg-white border-2 border-black font-black text-xs uppercase hover:bg-gray-100 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course cards */}
      <div className="flex flex-col gap-3">
        {courses.map((course) => (
          <div
            key={course.id}
            className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <span
                  className={`inline-block px-2.5 py-0.5 border-2 border-black font-black text-[10px] uppercase tracking-wide mb-2 ${
                    course.type === "THEORY"
                      ? "bg-[#FFB3C1] text-black"
                      : "bg-[#B3D4FF] text-black"
                  }`}
                >
                  {course.type === "THEORY" ? "LECTURE" : "LAB"}
                </span>
                <p className="font-bold text-sm text-black">{course.name}</p>
                <p className="font-black text-xs text-gray-500 uppercase tracking-wide mt-1">
                  {course.sks} Credits
                </p>
              </div>
              <button
                onClick={() => onDelete(course.id)}
                aria-label={`Delete ${course.name}`}
                className="p-2.5 text-black hover:bg-red-100 hover:text-red-600 border-2 border-transparent hover:border-black transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                <Trash2 className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
