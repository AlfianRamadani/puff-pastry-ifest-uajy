"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { Course } from "./courseData";
import { useCourseForm } from "./useCourseForm";

interface CourseCardsProps {
  courses: Course[];
  onDelete: (id: string) => Promise<void> | void;
  onAdd: (course: Omit<Course, "id">) => Promise<void> | void;
  onUpdate: (id: string, course: Omit<Course, "id">) => Promise<void> | void;
  loading?: boolean;
}

export default function CourseCards({ courses, onDelete, onAdd, onUpdate, loading = false }: CourseCardsProps) {
  const { showForm, form, openForm, closeForm, handleSubmit, updateField, submitting } =
    useCourseForm(onAdd);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<Omit<Course, "id">>({ name: "", type: "LECTURE", sks: 3 });

  const startEdit = (course: Course) => {
    setEditingId(course.id);
    setEditingForm({ name: course.name, type: course.type, sks: course.sks });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingForm({ name: "", type: "LECTURE", sks: 3 });
  };

  const saveEdit = async () => {
    if (!editingId || !editingForm.name.trim()) return;
    await onUpdate(editingId, { ...editingForm, name: editingForm.name.trim() });
    cancelEdit();
  };

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
                  <option value="LECTURE">Lecture</option>
                  <option value="LAB">Lab</option>
                  <option value="SEMINAR">Seminar</option>
                  <option value="ELECTIVE">Elective</option>
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
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="flex-1 py-2 bg-[#FFC107] border-2 border-black font-black text-xs uppercase active:translate-x-[1px] active:translate-y-[1px] transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                {submitting ? "Saving..." : "Save"}
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
        {loading && (
          <div className="border-[3px] border-black bg-white p-4 text-center font-black text-xs uppercase text-gray-400">
            Loading courses...
          </div>
        )}
        {!loading && courses.length === 0 && (
          <div className="border-[3px] border-black bg-white p-4 text-center font-black text-xs uppercase text-gray-400">
            No courses yet.
          </div>
        )}
        {!loading && courses.map((course) => (
          <div
            key={course.id}
            className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {editingId === course.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingForm.name}
                      onChange={(e) => setEditingForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full border-2 border-black px-2 py-1 font-bold text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <select
                        value={editingForm.type}
                        onChange={(e) => setEditingForm((prev) => ({ ...prev, type: e.target.value as Course["type"] }))}
                        className="flex-1 border-2 border-black px-2 py-1 font-black text-[10px] uppercase"
                      >
                        <option value="LECTURE">Lecture</option>
                        <option value="LAB">Lab</option>
                        <option value="SEMINAR">Seminar</option>
                        <option value="ELECTIVE">Elective</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={editingForm.sks}
                        onChange={(e) => setEditingForm((prev) => ({ ...prev, sks: Number(e.target.value) }))}
                        className="w-20 border-2 border-black px-2 py-1 font-black text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <span
                      className={`inline-block px-2.5 py-0.5 border-2 border-black font-black text-[10px] uppercase tracking-wide mb-2 ${
                        course.type === "LECTURE"
                          ? "bg-[#FFB3C1] text-black"
                          : course.type === "LAB"
                            ? "bg-[#B3D4FF] text-black"
                            : course.type === "SEMINAR"
                              ? "bg-[#FFA6D6] text-black"
                              : "bg-[#C4B5FD] text-black"
                      }`}
                    >
                      {course.type}
                    </span>
                    <p className="font-bold text-sm text-black">{course.name}</p>
                    <p className="font-black text-xs text-gray-500 uppercase tracking-wide mt-1">
                      {course.sks} Credits
                    </p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                {editingId === course.id ? (
                  <>
                    <button onClick={() => void saveEdit()} className="p-2 border-2 border-black bg-[#B3FFB3]" aria-label="Save edit">
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                    <button onClick={cancelEdit} className="p-2 border-2 border-black bg-white" aria-label="Cancel edit">
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => startEdit(course)} className="p-2 border-2 border-black bg-white" aria-label={`Edit ${course.name}`}>
                    <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                )}
                <button
                  onClick={() => void onDelete(course.id)}
                  aria-label={`Delete ${course.name}`}
                  className="p-2.5 text-black hover:bg-red-100 hover:text-red-600 border-2 border-transparent hover:border-black transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
