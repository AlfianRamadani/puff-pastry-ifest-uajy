"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, format, getDay, isSameMonth, startOfDay, startOfMonth, startOfWeek, subMonths } from "date-fns";
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
  priority: string | null;
};

function getThemeColor(priority: string | null): string {
  const normalized = (priority ?? "medium").toLowerCase();
  if (normalized === "high") return "bg-[#FFA6D6]";
  if (normalized === "low") return "bg-[#5EEAD4]";
  return "bg-[#FFC107]";
}

export default function GanttCalendar({ dateFilter, onDateFilterChange }: Props) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<DueTask[]>([]);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const monthStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
    const monthEnd = format(addDays(startOfMonth(addMonths(currentDate, 1)), -1), "yyyy-MM-dd");

    const load = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, due_date, priority")
        .eq("user_id", user.id)
        .not("due_date", "is", null)
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd);
      if (!error) {
        setTasks((data as DueTask[] | null) ?? []);
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
        <h2 className="text-xl sm:text-3xl font-black text-black tracking-tighter uppercase">{format(currentDate, "MMMM yyyy")}</h2>
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
            {week.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayTasks = taskMap.get(key) ?? [];
              const inMonth = isSameMonth(day, currentDate);
              const dayOfWeek = getDay(day);
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const selected = dateFilter === key;

              return (
                <div
                  key={day.toString()}
                  onClick={() => onDateFilterChange(selected ? null : key)}
                  className={`relative min-h-[50px] sm:min-h-[100px] border-r-[1.5px] sm:border-r-[3px] border-black last:border-r-0 py-0.5 sm:py-1 flex flex-col gap-0.5 sm:gap-1 cursor-pointer transition-colors ${
                    !inMonth ? "bg-gray-100/50" : selected ? "bg-[#FFF0C2]" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`text-center font-bold text-[9px] sm:text-sm mb-0.5 sm:mb-1 ${
                      !inMonth ? "text-gray-300" : isWeekend ? "text-[#FF4D4D]" : "text-black"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  <div className="flex flex-col gap-[1px] sm:gap-1 w-full mt-auto mb-0.5 sm:mb-1">
                    {dayTasks.slice(0, 3).map((task) => {
                      const dayStart = startOfDay(day);
                      const dueDate = startOfDay(new Date(`${task.due_date}T00:00:00`));
                      const isStart = dayStart.getTime() === dueDate.getTime();
                      const isEnd = isStart;

                      return (
                        <div
                          key={task.id}
                          className={`${getThemeColor(task.priority)} border-y-[1.5px] sm:border-y-[2px] border-black text-[6px] sm:text-xs font-black text-black px-0.5 sm:px-1 py-[1px] sm:py-0.5 truncate ${
                            isStart ? "border-l-[1.5px] sm:border-l-[2px] ml-0.5 sm:ml-1" : "-ml-[1.5px] sm:-ml-[2px]"
                          } ${isEnd ? "border-r-[1.5px] sm:border-r-[2px] mr-0.5 sm:mr-1" : "-mr-[1.5px] sm:-mr-[2px]"}`}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && <span className="text-[8px] font-black text-black/60 px-1">+{dayTasks.length - 3} more</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
