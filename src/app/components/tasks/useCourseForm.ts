"use client";

import { useState, useCallback } from "react";
import type { Course } from "./courseData";

const EMPTY_FORM = { name: "", type: "LECTURE" as Course["type"], sks: 3 };

export function useCourseForm(onAdd: (course: Omit<Course, "id">) => Promise<void> | void) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const openForm = useCallback(() => setShowForm(true), []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setForm(EMPTY_FORM);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await onAdd({ name: form.name.trim(), type: form.type, sks: form.sks });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }, [form, onAdd]);

  const updateField = useCallback(
    <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return { showForm, form, openForm, closeForm, handleSubmit, updateField, submitting };
}
