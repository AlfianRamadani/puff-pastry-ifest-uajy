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
  courses:
    | {
        name: string;
        color: string | null;
        type: string | null;
      }
    | {
        name: string;
        color: string | null;
        type: string | null;
      }[]
    | null;
};

type ScheduleSlot = Omit<ScheduleSlotRow, "courses"> & {
  course: {
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
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
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
    setSlots(
      ((data as ScheduleSlotRow[] | null) ?? []).map((slot) => ({
        ...slot,
        course: Array.isArray(slot.courses) ? (slot.courses[0] ?? null) : slot.courses,
        start_time: normalizeClock(slot.start_time),
        end_time: normalizeClock(slot.end_time),
      })),
    );
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

  const todayIndex = new Date().getDay();
  const dayHeaders = DAYS.map((name, idx) => ({ id: idx + 1, name, isToday: todayIndex === (idx + 1 === 7 ? 0 : idx + 1) }));

  return (
    <div className="w-full bg-[#EEF6F6] p-4 sm:p-6 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-sans">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <h2 className="text-xl sm:text-3xl font-black text-black uppercase tracking-tighter">Estimation of Peak Hours</h2>
        {loading && <span className="font-black text-xs uppercase text-black/60">Loading...</span>}
      </div>

      {errorMessage && <div className="mb-4 border-2 border-black bg-[#FFB3C1] p-2 font-bold text-xs">{errorMessage}</div>}

      <div className="w-full overflow-x-auto bg-white border-[3px] border-black scrollbar-hide">
        <div className="min-w-[750px]">
          <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b-[3px] border-black bg-white sticky top-0 z-20">
            <div className="border-r-[3px] border-black p-2 bg-gray-100 sticky left-0 z-30" />
            {dayHeaders.map((day) => (
              <div key={day.id} className={`border-r-[3px] border-black last:border-r-0 p-2 flex flex-col items-center justify-center font-black text-xs sm:text-sm tracking-wide ${day.isToday ? "bg-[#FF4D4D] text-white" : "text-black bg-white"}`}>
                <span>{day.name}</span>
                {day.isToday && <span className="text-[8px] uppercase tracking-widest opacity-80 mt-0.5">Today</span>}
              </div>
            ))}
          </div>

          {TIME_SLOTS.map((time, idx) => (
            <div key={time} className={`grid grid-cols-[70px_repeat(7,1fr)] ${idx !== TIME_SLOTS.length - 1 ? "border-b-[3px] border-black" : ""}`}>
              <div className="border-r-[3px] border-black p-2 flex items-center justify-center font-black text-xs text-black bg-gray-50 sticky left-0 z-10 shadow-[2px_0px_0px_0px_rgba(0,0,0,0.1)]">
                {time}
              </div>

              {dayHeaders.map((day) => {
                const slot = blocks.find((block) => block.day_of_week === day.id - 1 && block.start_time === time);
                const isBreakTime = time === "12:00";
                return (
                  <div
                    key={`${day.id}-${time}`}
                    onClick={() => openCreate(day.id - 1, time)}
                    className={`border-r-[3px] border-black last:border-r-0 p-1 flex items-center justify-center min-h-[45px] cursor-pointer transition-colors hover:bg-gray-100 ${isBreakTime && !slot ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#f3f4f6_5px,#f3f4f6_10px)]" : ""} ${day.isToday && !slot && !isBreakTime ? "bg-red-50/30" : ""}`}
                  >
                    {slot && (
                      <div className={`w-full h-full flex flex-col items-center justify-center px-1 py-1 border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] transition-transform ${colorByType(slot.course?.type ?? null)}`}>
                        <span className="font-black text-[9px] sm:text-[10px] text-black uppercase text-center leading-tight line-clamp-2">
                          {slot.course?.name ?? "Unknown"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteSlot(slot.id);
                          }}
                          disabled={deletingId === slot.id}
                          className="mt-1 w-4 h-4 border border-black bg-white text-[10px] font-black leading-none"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-4 sm:mt-5 px-1">
        {[{ label: "MAJOR COURSE", color: "bg-[#FFC107]" }, { label: "ELECTIVE", color: "bg-[#B3D4FF]" }, { label: "LAB / PRACTICUM", color: "bg-[#5EEAD4]" }, { label: "SEMINAR", color: "bg-[#FFA6D6]" }].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 sm:w-4 sm:h-4 border-[2px] border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${item.color}`} />
            <span className="font-black text-[9px] sm:text-xs text-black uppercase tracking-wide">{item.label}</span>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black uppercase text-black">Add Class</h3>
              <button
                onClick={() => setShowForm(false)}
                className="hover:bg-red-100 p-1 border-2 border-transparent hover:border-black transition-all"
                aria-label="Close form"
              >
                <X className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Course</label>
                <select
                  value={form.courseId}
                  onChange={(event) => setForm((prev) => ({ ...prev, courseId: event.target.value }))}
                  className="w-full bg-[#EEF6F6] border-[3px] border-black p-2 font-bold text-sm"
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
                  <label className="block text-xs font-black uppercase mb-1">Day</label>
                  <select
                    value={form.dayOfWeek}
                    onChange={(event) => setForm((prev) => ({ ...prev, dayOfWeek: Number(event.target.value) }))}
                    className="w-full bg-white border-[2px] border-black p-2 font-bold text-sm"
                  >
                    {DAYS.map((day, index) => (
                      <option key={day} value={index}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Start</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, startTime: event.target.value, endTime: addOneHour(event.target.value) }))
                    }
                    className="w-full bg-white border-[2px] border-black p-2 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">End</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
                    className="w-full bg-white border-[2px] border-black p-2 font-bold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Room</label>
                <input
                  type="text"
                  value={form.room}
                  onChange={(event) => setForm((prev) => ({ ...prev, room: event.target.value }))}
                  className="w-full bg-white border-[2px] border-black p-2 font-bold text-sm"
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => void saveSlot()}
                disabled={savingSlot || courses.length === 0}
                className="w-full bg-[#B3FFB3] border-[3px] border-black p-2 font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-60"
              >
                {savingSlot ? "Saving..." : "Add to Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
