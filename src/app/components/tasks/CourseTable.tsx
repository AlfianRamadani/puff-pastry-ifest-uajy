"use client";

import React from "react";
import { Trash2, Plus } from "lucide-react";
import type { Course } from "./courseData";
import { useCourseForm } from "./useCourseForm";

interface CourseTableProps {
  courses: Course[];
  onDelete: (id: string) => void;
  onAdd: (course: Omit<Course, "id">) => void;
}

export default function CourseTable({ courses, onDelete, onAdd }: CourseTableProps) {
  const { showForm, form, openForm, closeForm, handleSubmit, updateField } =
    useCourseForm(onAdd);

  return (
    <div className="hidden md:block">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg uppercase tracking-wide text-black">
          Course List
        </h2>
        <button
          onClick={openForm}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFC107] border-[3px] border-black font-black text-xs uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Add Course
        </button>
      </div>

      <div className="border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b-[3px] border-black bg-gray-50">
              <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-12">
                #
              </th>
              <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black">
                Course Name
              </th>
              <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-32">
                Type
              </th>
              <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-20">
                Credits
              </th>
              <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide text-black w-20">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course, idx) => (
              <tr
                key={course.id}
                className="border-b-2 border-black last:border-b-0"
              >
                <td className="px-4 py-3 font-bold text-sm text-gray-500">
                  {String(idx + 1).padStart(2, "0")}
                </td>
                <td className="px-4 py-3 font-bold text-sm text-black">
                  {course.name}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-3 py-1 border-2 border-black font-black text-[10px] uppercase tracking-wide ${
                      course.type === "THEORY"
                        ? "bg-[#FFB3C1] text-black"
                        : "bg-[#B3D4FF] text-black"
                    }`}
                  >
                    {course.type === "THEORY" ? "LECTURE" : "LAB"}
                  </span>
                </td>
                <td className="px-4 py-3 font-black text-sm text-black">
                  {course.sks}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onDelete(course.id)}
                    aria-label={`Delete ${course.name}`}
                    className="p-2.5 text-black hover:bg-red-100 hover:text-red-600 border-2 border-transparent hover:border-black transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </td>
              </tr>
            ))}

            {/* Inline add form */}
            {showForm && (
              <tr className="border-b-2 border-black bg-[#FFC107]/10">
                <td className="px-4 py-3 font-bold text-sm text-gray-400">
                  {String(courses.length + 1).padStart(2, "0")}
                </td>
                <td className="px-4 py-3">
                  <label htmlFor="course-name" className="sr-only">Course name</label>
                  <input
                    id="course-name"
                    type="text"
                    placeholder="Course name..."
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="w-full px-3 py-1.5 border-2 border-black font-bold text-sm outline-none focus:ring-2 focus:ring-[#FFC107]"
                    autoFocus
                  />
                </td>
                <td className="px-4 py-3">
                  <label htmlFor="course-type" className="sr-only">Course type</label>
                  <select
                    id="course-type"
                    value={form.type}
                    onChange={(e) =>
                      updateField("type", e.target.value as Course["type"])
                    }
                    className="px-3 py-1.5 border-2 border-black font-black text-[10px] uppercase outline-none focus:ring-2 focus:ring-[#FFC107]"
                  >
                    <option value="THEORY">Lecture</option>
                    <option value="PRACTICUM">Lab</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <label htmlFor="course-sks" className="sr-only">Credits</label>
                  <input
                    id="course-sks"
                    type="number"
                    min={1}
                    max={6}
                    value={form.sks}
                    onChange={(e) =>
                      updateField("sks", Number(e.target.value))
                    }
                    className="w-16 px-3 py-1.5 border-2 border-black font-black text-sm outline-none focus:ring-2 focus:ring-[#FFC107]"
                  />
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={handleSubmit}
                    className="px-3 py-1.5 bg-[#FFC107] border-2 border-black font-black text-xs active:translate-x-[1px] active:translate-y-[1px] transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
                  >
                    Save
                  </button>
                  <button
                    onClick={closeForm}
                    className="px-3 py-1.5 bg-white border-2 border-black font-black text-xs hover:bg-gray-100 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Add Another Row link */}
        {!showForm && (
          <button
            onClick={openForm}
            className="w-full py-3 text-center font-black text-xs uppercase tracking-wide text-gray-400 hover:text-black hover:bg-gray-50 border-t-2 border-black transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset"
          >
            + Add Another Row
          </button>
        )}
      </div>
    </div>
  );
}
