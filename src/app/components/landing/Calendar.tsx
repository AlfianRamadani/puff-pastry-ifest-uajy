"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type EventType = "exam" | "homework" | "lab" | "seminar" | "other";

type CourseOption = {
  id: string;
  name: string;
};

type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  time: string;
  location: string;
  type: EventType;
  courseId: string | null;
  style: string;
  tagStyle: string;
  tagText: string;
};

type ModalFormData = {
  title: string;
  time: string;
  location: string;
  type: EventType;
  courseId: string;
};

type ModalState = {
  isOpen: boolean;
  selectedDate: Date;
  x: number;
  y: number;
};

type DetailState = {
  isOpen: boolean;
  event: CalendarEvent | null;
  x: number;
  y: number;
  confirmingDelete: boolean;
};

const TYPE_STYLE: Record<EventType, { card: string; tag: string; text: string }> = {
  exam: { card: "bg-white", tag: "bg-[#FFC107] text-black", text: "EXAM" },
  homework: { card: "bg-[#B3D4FF]", tag: "bg-white text-black", text: "HOMEWORK" },
  lab: { card: "bg-[#5EEAD4]", tag: "bg-white text-black", text: "LAB" },
  seminar: { card: "bg-[#FFA6D6]", tag: "bg-white text-black", text: "SEMINAR" },
  other: { card: "bg-[#EDE7FF]", tag: "bg-white text-black", text: "OTHER" },
};

const EventPopover = ({
  modalState,
  onClose,
  onSave,
  saving,
  courses,
}: {
  modalState: ModalState;
  onClose: () => void;
  onSave: (formData: ModalFormData) => Promise<void>;
  saving: boolean;
  courses: CourseOption[];
}) => {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<EventType>("other");
  const [courseId, setCourseId] = useState("none");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    setFormError(null);
    await onSave({
      title: title.trim(),
      time,
      location: location.trim(),
      type,
      courseId,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/20 p-3 sm:p-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="absolute w-[min(92vw,360px)] bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        style={{
          left: `clamp(12px, ${modalState.x}px, calc(100vw - 380px))`,
          top: `clamp(12px, ${modalState.y}px, calc(100vh - 420px))`,
        }}
      >
        <div className="flex items-center justify-between p-3 border-b-[3px] border-black bg-[#FFC107]">
          <h3 className="font-black text-xs uppercase tracking-wide">Add Event · {format(modalState.selectedDate, "MMM dd")}</h3>
          <button onClick={onClose} className="p-1 border-2 border-black bg-white" aria-label="Close add event popover">
            <X className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="p-3 space-y-3">
          {formError && (
            <div className="border-2 border-black bg-[#FFB3C1] px-2 py-1.5">
              <p className="font-black text-[10px] uppercase">{formError}</p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full border-[2px] border-black p-2 font-bold text-sm"
              placeholder="e.g. Calculus Midterm"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-black uppercase mb-1">Time</label>
              <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="w-full border-[2px] border-black p-2 font-bold text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase mb-1">Type</label>
              <select value={type} onChange={(event) => setType(event.target.value as EventType)} className="w-full border-[2px] border-black p-2 font-black text-xs uppercase">
                <option value="exam">Exam</option>
                <option value="homework">Homework</option>
                <option value="lab">Lab</option>
                <option value="seminar">Seminar</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full border-[2px] border-black p-2 font-bold text-sm"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase mb-1">Course</label>
            <select value={courseId} onChange={(event) => setCourseId(event.target.value)} className="w-full border-[2px] border-black p-2 font-bold text-sm">
              <option value="none">No course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full border-[3px] border-black bg-[#B3FFB3] py-2 font-black text-xs uppercase tracking-wide disabled:opacity-70"
          >
            {saving ? "Saving..." : "Add Event"}
          </button>
        </form>
      </div>
    </div>
  );
};

const EventDetailPopover = ({
  detailState,
  deleting,
  onClose,
  onDelete,
}: {
  detailState: DetailState;
  deleting: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) => {
  if (!detailState.event) return null;
  const event = detailState.event;

  return (
    <div className="fixed inset-0 z-[100] bg-black/20 p-3 sm:p-4" onClick={onClose}>
      <div
        onClick={(evt) => evt.stopPropagation()}
        className="absolute w-[min(92vw,320px)] bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        style={{
          left: `clamp(12px, ${detailState.x}px, calc(100vw - 340px))`,
          top: `clamp(12px, ${detailState.y}px, calc(100vh - 280px))`,
        }}
      >
        <div className="p-3 border-b-[3px] border-black bg-[#B3D4FF] flex items-center justify-between">
          <h3 className="font-black text-xs uppercase tracking-wide">Event Details</h3>
          <button onClick={onClose} className="p-1 border-2 border-black bg-white" aria-label="Close event details">
            <X className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>

        <div className="p-3 space-y-3">
          <div>
            <p className="font-black text-xs uppercase">{event.title}</p>
            <p className="font-bold text-[11px] uppercase text-black/70 mt-1">
              {event.time} • {event.location}
            </p>
            <p className="font-bold text-[11px] uppercase text-black/70 mt-1">{format(parseISO(event.date), "MMM dd, yyyy")}</p>
          </div>

          {!detailState.confirmingDelete ? (
            <button
              onClick={() => void onDelete()}
              disabled={deleting}
              className="w-full py-2 border-[3px] border-black bg-[#FFB3C1] font-black text-xs uppercase tracking-wide disabled:opacity-70 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              {deleting ? "Deleting..." : "Delete Event"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const CustomCalendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    selectedDate: new Date(),
    x: 24,
    y: 24,
  });
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [detailState, setDetailState] = useState<DetailState>({
    isOpen: false,
    event: null,
    x: 24,
    y: 24,
    confirmingDelete: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const monthStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

    const loadCalendarData = async () => {
      setErrorMessage(null);
      const [eventsResult, coursesResult] = await Promise.all([
        supabase
          .from("calendar_events")
          .select("id, title, event_date, event_time, location, type, course_id")
          .eq("user_id", user.id)
          .gte("event_date", monthStart)
          .lte("event_date", monthEnd)
          .order("event_date", { ascending: true }),
        supabase.from("courses").select("id, name").eq("user_id", user.id).order("name", { ascending: true }),
      ]);

      const firstError = eventsResult.error ?? coursesResult.error;
      if (firstError) {
        setErrorMessage(firstError.message);
        return;
      }

      const mappedEvents = (eventsResult.data ?? []).map((entry) => {
        const eventType = (entry.type ?? "other") as EventType;
        const style = TYPE_STYLE[eventType] ?? TYPE_STYLE.other;
        return {
          id: entry.id,
          date: entry.event_date,
          title: entry.title ?? "Untitled Event",
          time: entry.event_time ?? "--:--",
          location: entry.location ?? "No location",
          type: eventType,
          courseId: entry.course_id ?? null,
          style: style.card,
          tagStyle: style.tag,
          tagText: style.text,
        } satisfies CalendarEvent;
      });

      setEvents(mappedEvents);
      setCourses(coursesResult.data ?? []);
    };

    void loadCalendarData();
  }, [currentDate, user]);

  const eventsByDate = useMemo<Record<string, CalendarEvent[]>>(() => {
    const dict: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      if (!dict[event.date]) dict[event.date] = [];
      dict[event.date].push(event);
    });
    return dict;
  }, [events]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleEmptyCellClick = (event: React.MouseEvent<HTMLDivElement>, day: Date) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setModalState({
      isOpen: true,
      selectedDate: day,
      x: rect.left,
      y: rect.bottom + 8,
    });
  };

  const handleEventClick = (event: React.MouseEvent<HTMLDivElement>, selectedEvent: CalendarEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setDetailState({
      isOpen: true,
      event: selectedEvent,
      x: rect.left,
      y: rect.bottom + 8,
      confirmingDelete: true,
    });
  };

  const handleSaveEvent = async (formData: ModalFormData) => {
    if (!user) return;

    setSavingEvent(true);
    setErrorMessage(null);
    const optimisticId = `temp-${Date.now()}`;
    const style = TYPE_STYLE[formData.type] ?? TYPE_STYLE.other;
    const optimisticEvent: CalendarEvent = {
      id: optimisticId,
      date: format(modalState.selectedDate, "yyyy-MM-dd"),
      title: formData.title,
      time: formData.time || "--:--",
      location: formData.location || "No location",
      type: formData.type,
      courseId: formData.courseId === "none" ? null : formData.courseId,
      style: style.card,
      tagStyle: style.tag,
      tagText: style.text,
    };
    setEvents((prev) => [...prev, optimisticEvent]);

    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        user_id: user.id,
        title: formData.title,
        event_date: format(modalState.selectedDate, "yyyy-MM-dd"),
        event_time: formData.time || null,
        location: formData.location || null,
        type: formData.type,
        course_id: formData.courseId === "none" ? null : formData.courseId,
      })
      .select("id, title, event_date, event_time, location, type, course_id")
      .single();

    setSavingEvent(false);
    if (error) {
      setEvents((prev) => prev.filter((item) => item.id !== optimisticId));
      setErrorMessage(error.message);
      return;
    }

    const savedType = (data.type ?? "other") as EventType;
    const savedStyle = TYPE_STYLE[savedType] ?? TYPE_STYLE.other;
    setEvents((prev) =>
      prev.map((item) =>
        item.id === optimisticId
          ? {
              id: data.id,
              date: data.event_date,
              title: data.title ?? "Untitled Event",
              time: data.event_time ?? "--:--",
              location: data.location ?? "No location",
              type: savedType,
              courseId: data.course_id ?? null,
              style: savedStyle.card,
              tagStyle: savedStyle.tag,
              tagText: savedStyle.text,
            }
          : item,
      ),
    );
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleDeleteEvent = async () => {
    const selectedEvent = detailState.event;
    if (!user || !selectedEvent) return;

    setDeletingEvent(true);
    setErrorMessage(null);
    setEvents((prev) => prev.filter((item) => item.id !== selectedEvent.id));

    const { error } = await supabase.from("calendar_events").delete().eq("id", selectedEvent.id).eq("user_id", user.id);
    setDeletingEvent(false);

    if (error) {
      setEvents((prev) => [...prev, selectedEvent].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()));
      setErrorMessage(error.message);
      return;
    }

    setDetailState((prev) => ({ ...prev, isOpen: false, event: null }));
  };

  const calendarGrid = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const rows = [];
    let day = startDate;

    for (let week = 0; week < 6; week++) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const formattedDate = format(cloneDay, "d");
        const dateKey = format(cloneDay, "yyyy-MM-dd");
        const dayEvents = eventsByDate[dateKey] ?? [];
        const currentEvent = dayEvents[0] ?? null;
        const isCurrentMonth = isSameMonth(cloneDay, monthStart);
        const isDayToday = isToday(cloneDay);

        days.push(
          <div
            key={dateKey}
            onClick={(event) => {
              if (!isCurrentMonth) return;
              if (currentEvent) {
                handleEventClick(event, currentEvent);
                return;
              }
              handleEmptyCellClick(event, cloneDay);
            }}
            className={`relative flex flex-col p-1 sm:p-2 min-h-[3.5rem] sm:min-h-[5rem] md:min-h-[6rem] transition-all
              ${!isCurrentMonth ? "text-gray-300 pointer-events-none" : "text-black cursor-pointer hover:-translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"}
              ${isDayToday && !currentEvent ? "bg-[#2D3748] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-[2px] sm:border-[3px] border-black" : ""}
              ${currentEvent ? `border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${currentEvent.style}` : ""}
              ${!currentEvent && !isDayToday && isCurrentMonth ? "border border-transparent hover:border-black" : ""}
            `}
          >
            <span className={`font-bold text-xs sm:text-base ${isDayToday && !currentEvent ? "text-white" : "text-black"}`}>{formattedDate}</span>

            {isDayToday && !currentEvent && <span className="hidden sm:block text-[9px] font-bold text-gray-300 mt-1 uppercase">Today</span>}

            {currentEvent && (
              <div className={`mt-auto w-full border-[1.5px] sm:border-2 border-black px-0.5 py-[1px] sm:p-0.5 text-[7px] sm:text-[9px] leading-none font-black truncate ${currentEvent.tagStyle}`}>
                {currentEvent.tagText}
              </div>
            )}
          </div>,
        );
        day = addDays(day, 1);
      }

      rows.push(
        <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-4 mb-1 sm:mb-2 lg:mb-4 w-full" key={`week-${week}`}>
          {days}
        </div>,
      );
    }

    return rows;
  }, [currentDate, eventsByDate]);

  const currentMonthEvents = events
    .filter((event) => isSameMonth(parseISO(event.date), currentDate))
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  return (
    <div className="relative w-full h-full bg-white border-[2px] sm:border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-sans flex flex-col">
      {errorMessage && (
        <div className="mx-3 mt-3 border-[2px] border-black bg-[#FFB3C1] px-3 py-2">
          <p className="font-black text-[10px] uppercase tracking-wide">{errorMessage}</p>
        </div>
      )}

      <div className="bg-[#FFB3C1] border-b-[2px] sm:border-b-[3px] border-black p-3 sm:p-4 flex items-center justify-between">
        <h2 className="text-base sm:text-xl font-black text-black tracking-wide uppercase truncate">{format(currentDate, "MMMM yyyy")}</h2>
        <div className="flex gap-1.5 sm:gap-2 shrink-0">
          <button onClick={prevMonth} className="bg-white border-[2px] sm:border-[3px] border-black p-1 hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-black" strokeWidth={3} />
          </button>
          <button onClick={nextMonth} className="bg-white border-[2px] sm:border-[3px] border-black p-1 hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-black" strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="p-2 sm:p-4 flex-none">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-4 mb-2 sm:mb-4">
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((dayName) => (
            <div key={dayName} className="text-center text-[8px] sm:text-[10px] font-black text-gray-400 tracking-wider">
              {dayName}
            </div>
          ))}
        </div>
        <div>{calendarGrid}</div>
      </div>

      <div className="mt-auto p-3 sm:p-4 border-t-[2px] sm:border-t-[3px] border-black bg-white">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 text-black">
          <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
          <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase">Upcoming Deadlines</h3>
        </div>

        <div className="flex flex-col gap-2 sm:gap-3 max-h-[135px] sm:max-h-[150px] overflow-y-auto pr-2">
          {currentMonthEvents.map((event) => (
            <div
              key={event.id}
              onClick={(evt) => handleEventClick(evt, event)}
              className="flex bg-[#EEF6F6] border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0 cursor-pointer"
            >
              <div className="bg-white border-r-[2px] sm:border-r-[3px] border-black p-2 flex flex-col items-center justify-center min-w-[50px] sm:min-w-[65px]">
                <span className="text-[8px] sm:text-[10px] font-black text-black uppercase">{format(parseISO(event.date), "MMM")}</span>
                <span className="text-sm sm:text-xl font-black text-black">{format(parseISO(event.date), "dd")}</span>
              </div>
              <div className="p-2 sm:p-3 flex flex-col justify-center bg-white w-full">
                <h4 className="font-bold text-[10px] sm:text-sm text-black leading-tight mb-0.5">{event.title}</h4>
                <p className="text-[8px] sm:text-[10px] font-bold text-gray-500 tracking-wide uppercase">
                  {event.time} • {event.location}
                </p>
              </div>
            </div>
          ))}
          {currentMonthEvents.length === 0 && (
            <div className="text-[10px] sm:text-xs font-bold text-gray-400 p-3 border-2 border-dashed border-gray-300 w-full text-center shrink-0">
              No deadlines this month! 🎉
            </div>
          )}
        </div>
      </div>

      {modalState.isOpen && (
        <EventPopover
          modalState={modalState}
          onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
          onSave={handleSaveEvent}
          saving={savingEvent}
          courses={courses}
        />
      )}

      {detailState.isOpen && (
        <EventDetailPopover
          detailState={detailState}
          deleting={deletingEvent}
          onClose={() => setDetailState((prev) => ({ ...prev, isOpen: false, event: null }))}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
};

export default CustomCalendar;
