"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Course } from "./courseData";

type ScheduleSlotRow = {
  id: string;
  user_id: string;
  course_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  courses: {
    name: string;
    color: string | null;
    type: string | null;
  } | null;
};

type NewSlotForm = {
  courseId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"] as const;
const DEFAULT_END_TIME = "09:00";

function normalizeClock(value: string): string {
  return value.slice(0, 5);
}

function addOneHour(time: string): string {
  const [hour] = time.split(":").map(Number);
  const nextHour = Math.min(hour + 1, 17);
  return `${String(nextHour).padStart(2, "0")}:00`;
}

function minutesFromClock(time: string): number {
  const [hour, minute] = normalizeClock(time).split(":").map(Number);
  return hour * 60 + minute;
}

function toGridRowStart(time: string): number {
  const minutes = minutesFromClock(time);
  return Math.max(1, Math.floor((minutes - 8 * 60) / 60) + 1);
}

function toGridRowEnd(startTime: string, endTime: string): number {
  const start = toGridRowStart(startTime);
  const span = Math.max(1, Math.ceil((minutesFromClock(endTime) - minutesFromClock(startTime)) / 60));
  return start + span;
}

function colorByType(type: string | null): string {
  const normalized = (type ?? "").toUpperCase();
  if (normalized === "ELECTIVE") return "bg-[#B3D4FF]";
  if (normalized === "LAB") return "bg-[#5EEAD4]";
  if (normalized === "SEMINAR") return "bg-[#FFA6D6]";
  return "bg-[#FFC107]";
}

export default function PeakHoursSchedule({ courses }: { courses: Course[] }) {
  const { user } = useAuth();
  const [slots, setSlots] = useState<ScheduleSlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingSlot, setSavingSlot] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewSlotForm>({
    courseId: "",
    dayOfWeek: 0,
    startTime: "08:00",
    endTime: DEFAULT_END_TIME,
    room: "",
  });
  const [showForm, setShowForm] = useState(false);

  const loadSlots = useCallback(async () => {
    if (!user) {
      setSlots([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("schedule_slots")
      .select("id, user_id, course_id, day_of_week, start_time, end_time, room, courses(name, color, type)")
      .eq("user_id", user.id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    setLoading(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setErrorMessage(null);
    setSlots(((data as ScheduleSlotRow[] | null) ?? []).map((slot) => ({
      ...slot,
      start_time: normalizeClock(slot.start_time),
      end_time: normalizeClock(slot.end_time),
    })));
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void loadSlots(), [loadSlots]);

  const openCreate = useCallback((dayOfWeek: number, startTime: string) => {
    setForm({
      courseId: courses[0]?.id ?? "",
      dayOfWeek,
      startTime,
      endTime: addOneHour(startTime),
      room: "",
    });
    setShowForm(true);
  }, [courses]);

  const saveSlot = useCallback(async () => {
    if (!user || !form.courseId) return;
    if (minutesFromClock(form.endTime) <= minutesFromClock(form.startTime)) {
      setErrorMessage("End time must be later than start time.");
      return;
    }

    setSavingSlot(true);
    const { error } = await supabase.from("schedule_slots").insert({
      user_id: user.id,
      course_id: form.courseId,
      day_of_week: form.dayOfWeek,
      start_time: form.startTime,
      end_time: form.endTime,
      room: form.room || null,
    });
    setSavingSlot(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setShowForm(false);
    setErrorMessage(null);
    await loadSlots();
  }, [form, loadSlots, user]);

  const deleteSlot = useCallback(async (slotId: string) => {
    setDeletingId(slotId);
    const { error } = await supabase.from("schedule_slots").delete().eq("id", slotId);
    setDeletingId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setErrorMessage(null);
    await loadSlots();
  }, [loadSlots]);

  const blocks = useMemo(
    () =>
      slots.map((slot) => ({
        ...slot,
        rowStart: toGridRowStart(slot.start_time),
        rowEnd: toGridRowEnd(slot.start_time, slot.end_time),
      })),
    [slots],
  );

  return (
    <div className="w-full bg-[#EEF6F6] p-4 sm:p-6 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl sm:text-3xl font-black text-black uppercase tracking-tighter">
          Estimation of Peak Hours
        </h2>
        {loading && <span className="font-black text-xs uppercase text-black/60">Loading...</span>}
      </div>

      {errorMessage && (
        <div className="mb-4 border-2 border-black bg-[#FFB3C1] p-2 font-bold text-xs text-black">
          {errorMessage}
        </div>
      )}

      <div className="overflow-x-auto border-[3px] border-black bg-white">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] border-b-[3px] border-black bg-gray-50">
            <div className="border-r-[3px] border-black p-2" />
            {DAYS.map((day) => (
              <div key={day} className="border-r-[3px] last:border-r-0 border-black p-2 text-center font-black text-xs uppercase">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))]">
            <div className="grid grid-rows-9 border-r-[3px] border-black">
              {TIME_SLOTS.map((time) => (
                <div key={time} className="h-14 border-b-[3px] last:border-b-0 border-black px-2 flex items-center font-black text-xs bg-gray-50">
                  {time}
                </div>
              ))}
            </div>

            <div className="col-span-7 relative">
              <div className="grid grid-cols-7 grid-rows-9">
                {DAYS.map((_, dayIndex) =>
                  TIME_SLOTS.map((time) => (
                    <button
                      key={`${dayIndex}-${time}`}
                      onClick={() => openCreate(dayIndex, time)}
                      className="h-14 border-b-[3px] border-r-[3px] last:border-r-0 border-black bg-white hover:bg-gray-50 transition-colors"
                      aria-label={`Add slot on ${DAYS[dayIndex]} at ${time}`}
                    />
                  )),
                )}
              </div>

              <div className="pointer-events-none absolute inset-0 grid grid-cols-7 grid-rows-9">
                {blocks.map((slot) => (
                  <div
                    key={slot.id}
                    style={{
                      gridColumnStart: slot.day_of_week + 1,
                      gridRowStart: slot.rowStart,
                      gridRowEnd: slot.rowEnd,
                    }}
                    className={`pointer-events-auto m-1 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-2 ${colorByType(slot.courses?.type)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black text-[10px] uppercase leading-tight">{slot.courses?.name ?? "Unknown"}</p>
                        <p className="font-bold text-[10px] mt-1">{slot.start_time}–{slot.end_time}</p>
                        {slot.room && <p className="font-bold text-[10px] mt-1">Room: {slot.room}</p>}
                      </div>
                      <button
                        onClick={() => void deleteSlot(slot.id)}
                        disabled={deletingId === slot.id}
                        className="w-5 h-5 flex items-center justify-center border-2 border-black bg-white font-black text-[10px]"
                        aria-label="Delete slot"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2"><span className="w-3 h-3 border border-black bg-[#FFC107]" /><span className="font-black text-[10px]">LECTURE</span></div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 border border-black bg-[#B3D4FF]" /><span className="font-black text-[10px]">ELECTIVE</span></div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 border border-black bg-[#5EEAD4]" /><span className="font-black text-[10px]">LAB</span></div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 border border-black bg-[#FFA6D6]" /><span className="font-black text-[10px]">SEMINAR</span></div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md border-[3px] border-black bg-white p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase">Add Schedule Slot</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 border-2 border-black bg-white"
                aria-label="Close form"
              >
                <X className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-black text-[10px] uppercase mb-1">Course</label>
                <select
                  value={form.courseId}
                  onChange={(event) => setForm((prev) => ({ ...prev, courseId: event.target.value }))}
                  className="w-full border-2 border-black px-2 py-2 font-bold text-sm"
                >
                  {courses.length === 0 ? (
                    <option value="">No courses available</option>
                  ) : (
                    courses.map((course) => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-black text-[10px] uppercase mb-1">Day</label>
                  <select
                    value={form.dayOfWeek}
                    onChange={(event) => setForm((prev) => ({ ...prev, dayOfWeek: Number(event.target.value) }))}
                    className="w-full border-2 border-black px-2 py-2 font-bold text-sm"
                  >
                    {DAYS.map((day, index) => (
                      <option key={day} value={index}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-black text-[10px] uppercase mb-1">Start</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, startTime: event.target.value, endTime: addOneHour(event.target.value) }))
                    }
                    className="w-full border-2 border-black px-2 py-2 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-black text-[10px] uppercase mb-1">End</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
                    className="w-full border-2 border-black px-2 py-2 font-bold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black text-[10px] uppercase mb-1">Room (optional)</label>
                <input
                  type="text"
                  value={form.room}
                  onChange={(event) => setForm((prev) => ({ ...prev, room: event.target.value }))}
                  className="w-full border-2 border-black px-2 py-2 font-bold text-sm"
                />
              </div>
            </div>

            <button
              onClick={() => void saveSlot()}
              disabled={savingSlot || courses.length === 0}
              className="mt-4 w-full border-[3px] border-black bg-[#B3FFB3] py-2 font-black text-xs uppercase disabled:opacity-60"
            >
              {savingSlot ? "Saving..." : "Save Slot"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
