"use client";

import { useState, useCallback } from "react";
import type { Course } from "./courseData";

const EMPTY_FORM = { name: "", type: "THEORY" as Course["type"], sks: 3 };

export function useCourseForm(onAdd: (course: Omit<Course, "id">) => void) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const openForm = useCallback(() => setShowForm(true), []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setForm(EMPTY_FORM);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) return;
    onAdd({ name: form.name.trim(), type: form.type, sks: form.sks });
    setForm(EMPTY_FORM);
    setShowForm(false);
  }, [form, onAdd]);

  const updateField = useCallback(
    <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return { showForm, form, openForm, closeForm, handleSubmit, updateField };
}
