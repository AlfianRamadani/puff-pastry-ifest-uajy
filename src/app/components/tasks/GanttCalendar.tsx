"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
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
  due_date: string;
};

export default function GanttCalendar({ dateFilter, onDateFilterChange }: Props) {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dueTasks, setDueTasks] = useState<DueTask[]>([]);

  useEffect(() => {
    if (!user) return;

    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const loadDueDates = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, due_date")
        .eq("user_id", user.id)
        .not("due_date", "is", null)
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd);

      if (!error) {
        setDueTasks((data as DueTask[]) ?? []);
      }
    };

    void loadDueDates();
  }, [currentMonth, user]);

  const dueCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of dueTasks) {
      const key = task.due_date;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [dueTasks]);

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const rows: Date[][] = [];
    let cursor = gridStart;
    for (let w = 0; w < 6; w += 1) {
      const row: Date[] = [];
      for (let d = 0; d < 7; d += 1) {
        row.push(cursor);
        cursor = addDays(cursor, 1);
      }
      rows.push(row);
    }
    return rows;
  }, [currentMonth]);

  return (
    <div className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-black text-sm uppercase tracking-wide">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))} className="border-2 border-black bg-white p-1">
            <ChevronLeft className="h-4 w-4" strokeWidth={3} />
          </button>
          <button type="button" onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))} className="border-2 border-black bg-white p-1">
            <ChevronRight className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
          <div key={day} className="text-center text-[10px] font-black text-black/50">
            {day}
          </div>
        ))}
      </div>

      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="mb-1 grid grid-cols-7 gap-1">
          {week.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const count = dueCountByDate.get(key) ?? 0;
            const selected = dateFilter === key;
            const inMonth = isSameMonth(day, currentMonth);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onDateFilterChange(selected ? null : key)}
                className={`min-h-[52px] border p-1 text-left ${
                  inMonth ? "border-black/20" : "border-black/10 text-black/30"
                } ${selected ? "border-black bg-[#FFC107]" : "bg-white"} ${isToday(day) ? "ring-2 ring-black" : ""}`}
              >
                <p className="text-[10px] font-black">{format(day, "d")}</p>
                {count > 0 && <p className="mt-1 text-[9px] font-black">{count} due</p>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
