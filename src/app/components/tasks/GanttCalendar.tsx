"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Props = {
  dateFilter: string | null;
  onDateFilterChange: (date: string | null) => void;
};

type DueTask = {
  id: string;
  title: string;
  due_date: string;
};

export default function GanttCalendar({ dateFilter, onDateFilterChange }: Props) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<DueTask[]>([]);

  useEffect(() => {
    if (!user) return;
    const monthStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
    const monthEnd = format(addDays(startOfMonth(addMonths(currentDate, 1)), -1), "yyyy-MM-dd");

    const load = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, due_date")
        .eq("user_id", user.id)
        .not("due_date", "is", null)
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd);
      if (!error) {
        setTasks(((data as DueTask[] | null) ?? []));
      }
    };
    void load();
  }, [currentDate, user]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const calendarWeeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const weeks: Date[][] = [];
    let day = startDate;
    for (let week = 0; week < 6; week += 1) {
      const days: Date[] = [];
      for (let i = 0; i < 7; i += 1) {
        days.push(day);
        day = addDays(day, 1);
      }
      weeks.push(days);
    }
    return weeks;
  }, [currentDate]);

  const taskMap = useMemo(() => {
    const map = new Map<string, DueTask[]>();
    for (const task of tasks) {
      const bucket = map.get(task.due_date) ?? [];
      bucket.push(task);
      map.set(task.due_date, bucket);
    }
    return map;
  }, [tasks]);

  return (
    <div className="bg-white w-full font-sans mb-10">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-xl sm:text-3xl font-black text-black tracking-tighter uppercase">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex gap-1 sm:gap-2 shrink-0">
          <button onClick={prevMonth} className="bg-white border-[2px] sm:border-[3px] border-black p-1 hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={3} />
          </button>
          <button onClick={nextMonth} className="bg-white border-[2px] sm:border-[3px] border-black p-1 hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="bg-white border-[3px] sm:border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        <div className="grid grid-cols-7 border-b-[2px] sm:border-b-[4px] border-black bg-white">
          {["S", "M", "T", "W", "T", "F", "S"].map((dayName, idx) => (
            <div
              key={`${dayName}-${idx}`}
              className={`py-1.5 sm:py-3 text-center text-[10px] sm:text-sm font-black border-r-[1.5px] sm:border-r-[3px] border-black last:border-r-0 ${
                idx === 0 || idx === 6 ? "text-[#FF4D4D]" : "text-black"
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {calendarWeeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b-[1.5px] sm:border-b-[3px] border-black last:border-b-0">
            {week.map((day, dayIdx) => {
              const key = format(day, "yyyy-MM-dd");
              const dayTasks = taskMap.get(key) ?? [];
              const selected = dateFilter === key;
              const inMonth = isSameMonth(day, currentDate);
              return (
                <button
                  key={`${key}-${dayIdx}`}
                  onClick={() => onDateFilterChange(selected ? null : key)}
                  className={`relative min-h-[50px] sm:min-h-[100px] border-r-[1.5px] sm:border-r-[3px] border-black last:border-r-0 py-0.5 sm:py-1 px-1 text-left ${
                    !inMonth ? "bg-gray-100 text-black/30" : "bg-white"
                  } ${selected ? "bg-[#FFC107]/20" : ""}`}
                >
                  <span className="font-black text-[10px] sm:text-sm">{format(day, "d")}</span>
                  {dayTasks.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1">
                      {dayTasks.slice(0, 2).map((task) => (
                        <span
                          key={task.id}
                          className="block truncate border-[1.5px] sm:border-2 border-black bg-[#FFC107] px-1 py-[1px] text-[7px] sm:text-[9px] font-black uppercase"
                        >
                          {task.title}
                        </span>
                      ))}
                      {dayTasks.length > 2 && (
                        <span className="text-[8px] font-black text-black/60">+{dayTasks.length - 2} more</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
