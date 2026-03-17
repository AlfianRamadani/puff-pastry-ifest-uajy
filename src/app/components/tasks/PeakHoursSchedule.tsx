"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
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

type DueTaskRow = {
  due_date: string;
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

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = minutesFromClock(startA);
  const aEnd = minutesFromClock(endA);
  const bStart = minutesFromClock(startB);
  const bEnd = minutesFromClock(endB);
  return aStart < bEnd && bStart < aEnd;
}

function colorByType(type: string | null): string {
  const normalized = (type ?? "").toUpperCase();
  if (normalized === "ELECTIVE") return "bg-[#B3D4FF]";
  if (normalized === "LAB") return "bg-[#5EEAD4]";
  if (normalized === "SEMINAR") return "bg-[#FFA6D6]";
  return "bg-[#FFC107]";
}

function dayOfWeekFromIsoDate(iso: string): number {
  const date = new Date(`${iso}T00:00:00`);
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function weekStartIso(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export default function PeakHoursSchedule({ courses }: { courses: Course[] }) {
  const { user } = useAuth();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingSlot, setSavingSlot] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [dueWeightByDay, setDueWeightByDay] = useState<number[]>(Array(7).fill(0));
  const [conflictingSlots, setConflictingSlots] = useState<ScheduleSlot[]>([]);
  const [replaceConflicts, setReplaceConflicts] = useState(false);

  const [form, setForm] = useState<NewSlotForm>({
    courseId: "",
    dayOfWeek: 0,
    startTime: "08:00",
    endTime: DEFAULT_END_TIME,
    room: "",
  });

  const loadSlots = useCallback(async () => {
    if (!user) {
      setSlots([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const today = new Date();
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    const [slotsResult, dueTasksResult] = await Promise.all([
      supabase
        .from("schedule_slots")
        .select("id, user_id, course_id, day_of_week, start_time, end_time, room, courses(name, color, type)")
        .eq("user_id", user.id)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("tasks")
        .select("due_date")
        .eq("user_id", user.id)
        .neq("status", "done")
        .gte("due_date", today.toISOString().slice(0, 10))
        .lte("due_date", sevenDaysLater.toISOString().slice(0, 10)),
    ]);

    setLoading(false);
    if (slotsResult.error || dueTasksResult.error) {
      setErrorMessage(slotsResult.error?.message ?? dueTasksResult.error?.message ?? "Failed loading schedule");
      return;
    }

    const nextSlots = ((slotsResult.data as ScheduleSlotRow[] | null) ?? []).map((slot) => ({
      ...slot,
      course: Array.isArray(slot.courses) ? (slot.courses[0] ?? null) : slot.courses,
      start_time: normalizeClock(slot.start_time),
      end_time: normalizeClock(slot.end_time),
    }));
    setSlots(nextSlots);

    const dueCounts = Array(7).fill(0);
    ((dueTasksResult.data as DueTaskRow[] | null) ?? []).forEach((task) => {
      if (!task.due_date) return;
      const dayIndex = dayOfWeekFromIsoDate(task.due_date);
      dueCounts[dayIndex] += 1;
    });
    setDueWeightByDay(dueCounts);

    setErrorMessage(null);
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void loadSlots(), [loadSlots]);

  const openCreate = useCallback(
    (dayOfWeek: number, startTime: string) => {
      setForm({
        courseId: courses[0]?.id ?? "",
        dayOfWeek,
        startTime,
        endTime: addOneHour(startTime),
        room: "",
      });
      setConflictingSlots([]);
      setReplaceConflicts(false);
      setShowForm(true);
    },
    [courses],
  );

  const conflictForForm = useCallback(
    (draft: NewSlotForm) =>
      slots.filter(
        (slot) =>
          slot.day_of_week === draft.dayOfWeek &&
          overlaps(slot.start_time, slot.end_time, draft.startTime, draft.endTime),
      ),
    [slots],
  );

  const suggestNextFreeBlock = useCallback(
    (dayOfWeek: number, fromTime: string): string => {
      for (const time of TIME_SLOTS) {
        if (minutesFromClock(time) < minutesFromClock(fromTime)) continue;
        const end = addOneHour(time);
        const hasConflict = slots.some(
          (slot) => slot.day_of_week === dayOfWeek && overlaps(slot.start_time, slot.end_time, time, end),
        );
        if (!hasConflict) return time;
      }
      return fromTime;
    },
    [slots],
  );

  const saveSlot = useCallback(async () => {
    if (!user || !form.courseId) return;

    if (minutesFromClock(form.endTime) <= minutesFromClock(form.startTime)) {
      setErrorMessage("End time must be later than start time.");
      return;
    }

    const conflicts = conflictForForm(form);
    if (conflicts.length > 0 && !replaceConflicts) {
      setConflictingSlots(conflicts);
      const names = conflicts.map((item) => item.course?.name ?? "Unknown course").join(", ");
      setErrorMessage(`Schedule conflict with: ${names}. Adjust time or choose replace old slots.`);
      return;
    }

    setSavingSlot(true);

    if (replaceConflicts && conflicts.length > 0) {
      const conflictIds = conflicts.map((slot) => slot.id);
      const { error: deleteConflictsError } = await supabase
        .from("schedule_slots")
        .delete()
        .in("id", conflictIds)
        .eq("user_id", user.id);
      if (deleteConflictsError) {
        setSavingSlot(false);
        setErrorMessage(deleteConflictsError.message);
        return;
      }
    }

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
    setReplaceConflicts(false);
    setConflictingSlots([]);
    setErrorMessage(null);
    await loadSlots();
  }, [conflictForForm, form, loadSlots, replaceConflicts, user]);

  const deleteSlot = useCallback(
    async (slotId: string) => {
      setDeletingId(slotId);
      const { error } = await supabase.from("schedule_slots").delete().eq("id", slotId);
      setDeletingId(null);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage(null);
      await loadSlots();
    },
    [loadSlots],
  );

  const densityByDay = useMemo(() => {
    const density = Array(7).fill(0);
    slots.forEach((slot) => {
      density[slot.day_of_week] += Math.max(1, minutesFromClock(slot.end_time) - minutesFromClock(slot.start_time)) / 60;
    });
    return density;
  }, [slots]);

  const heatByDay = useMemo(() => densityByDay.map((hours, idx) => Number((hours + dueWeightByDay[idx] * 0.7).toFixed(1))), [densityByDay, dueWeightByDay]);

  const suggestions = useMemo(() => {
    const all = DAYS.map((day, dayIdx) =>
      TIME_SLOTS.map((time) => {
        const occupied = slots.some((slot) => slot.day_of_week === dayIdx && overlaps(slot.start_time, slot.end_time, time, addOneHour(time)));
        const score = (occupied ? 5 : 0) + dueWeightByDay[dayIdx] * 0.7;
        return { day, time, score };
      }),
    ).flat();

    return all.sort((a, b) => a.score - b.score).slice(0, 3);
  }, [dueWeightByDay, slots]);

  useEffect(() => {
    if (!user) return;

    const all = DAYS.map((day, dayIdx) =>
      TIME_SLOTS.map((time) => {
        const occupied = slots.some((slot) => slot.day_of_week === dayIdx && overlaps(slot.start_time, slot.end_time, time, addOneHour(time)));
        const score = (occupied ? 5 : 0) + dueWeightByDay[dayIdx] * 0.7;
        return { day, time, score };
      }),
    ).flat();

    const overloadWindows = all.filter((item) => item.score >= 4.5).map((item) => `${item.day} ${item.time}`);

    void supabase.from("schedule_load_metrics").upsert(
      {
        user_id: user.id,
        week_start: weekStartIso(),
        peak_blocks: slots.length,
        avg_daily_load: Number((densityByDay.reduce((sum, val) => sum + val, 0) / 7).toFixed(2)),
        overload_windows: overloadWindows,
      },
      { onConflict: "user_id,week_start" },
    );
  }, [densityByDay, dueWeightByDay, slots, user]);

  const blocks = useMemo(
    () =>
      slots.map((slot) => ({
        ...slot,
        rowStart: Math.max(1, Math.floor((minutesFromClock(slot.start_time) - 8 * 60) / 60) + 1),
        rowEnd: Math.max(1, Math.floor((minutesFromClock(slot.end_time) - 8 * 60) / 60) + 1),
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

      <div className="mb-4 border-2 border-black bg-white p-3">
        <p className="font-black text-xs uppercase tracking-wide">Weekly Heatmap Insight</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map((day, idx) => (
            <span
              key={day}
              className={`px-2 py-1 border-2 border-black font-black text-[10px] uppercase ${heatByDay[idx] >= 5 ? "bg-[#FFB3C1]" : heatByDay[idx] >= 3 ? "bg-[#FFC107]" : "bg-[#B3FFB3]"}`}
            >
              {day}: {heatByDay[idx]}
            </span>
          ))}
        </div>
        {suggestions.length > 0 && (
          <p className="mt-2 font-bold text-xs text-gray-700">
            Suggested deep-work blocks: {suggestions.map((item) => `${item.day} ${item.time}`).join(" • ")}
          </p>
        )}
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
                const heat = heatByDay[day.id - 1];
                return (
                  <div
                    key={`${day.id}-${time}`}
                    onClick={() => openCreate(day.id - 1, time)}
                    className={`border-r-[3px] border-black last:border-r-0 p-1 flex items-center justify-center min-h-[45px] cursor-pointer transition-colors hover:bg-gray-100 ${isBreakTime && !slot ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#f3f4f6_5px,#f3f4f6_10px)]" : ""} ${day.isToday && !slot && !isBreakTime ? "bg-red-50/30" : ""} ${!slot && heat >= 5 ? "bg-[#FFE3E3]" : ""}`}
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
                onClick={() => {
                  setShowForm(false);
                  setReplaceConflicts(false);
                  setConflictingSlots([]);
                }}
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

            {conflictingSlots.length > 0 && (
              <div className="mt-4 border-2 border-black bg-[#FFF0F0] p-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
                  <p className="font-black text-[10px] uppercase">Conflict detected</p>
                </div>
                <p className="font-bold text-[11px] mt-1">
                  {conflictingSlots.map((slot) => `${slot.course?.name ?? "Unknown"} (${slot.start_time}-${slot.end_time})`).join(", ")}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      const suggested = suggestNextFreeBlock(form.dayOfWeek, form.startTime);
                      setForm((prev) => ({ ...prev, startTime: suggested, endTime: addOneHour(suggested) }));
                      setConflictingSlots([]);
                      setReplaceConflicts(false);
                      setErrorMessage(null);
                    }}
                    className="px-2 py-1 border-2 border-black bg-white font-black text-[10px] uppercase"
                  >
                    Auto adjust time
                  </button>
                  <button
                    onClick={() => setReplaceConflicts(true)}
                    className={`px-2 py-1 border-2 border-black font-black text-[10px] uppercase ${replaceConflicts ? "bg-[#B3FFB3]" : "bg-white"}`}
                  >
                    Replace old slot
                  </button>
                </div>
              </div>
            )}

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
