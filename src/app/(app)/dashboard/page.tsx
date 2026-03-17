"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle, Clock, Flame, TrendingUp, Calendar, Star, ArrowRight } from "lucide-react";
import { addDays, format, isTomorrow, parseISO, startOfWeek, getDayOfYear } from "date-fns";
import CustomCalendar from "../../components/landing/Calendar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type DashboardStats = {
  tasksDone: number;
  studyHours: number;
  streak: number;
  gpa: string;
};

type UpcomingTask = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string | null;
};

type CourseItem = {
  id: string;
  name: string;
  credits: number;
  grade: string | null;
  color: string | null;
};

function getDueLabel(dueDate: string | null) {
  if (!dueDate) return "No due date";
  const parsed = parseISO(dueDate);
  if (isTomorrow(parsed)) return "Tomorrow";
  return format(parsed, "MMM d");
}

function getPriorityStyle(priority: string | null) {
  const value = (priority ?? "low").toLowerCase();
  if (value === "high") return { label: "HIGH", color: "bg-[#FFB3C1]" };
  if (value === "medium") return { label: "MEDIUM", color: "bg-[#FFC107]" };
  return { label: "LOW", color: "bg-[#B3FFB3]" };
}

export default function Home() {
  const { user, profile } = useAuth();
  const [statsLoading, setStatsLoading] = useState(true);
  const [listsLoading, setListsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dueThisWeek, setDueThisWeek] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [upcoming, setUpcoming] = useState<UpcomingTask[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    tasksDone: 0,
    studyHours: 0,
    streak: 0,
    gpa: "0.00",
  });

  useEffect(() => {
    if (!user) return;

    const loadDashboard = async () => {
      setStatsLoading(true);
      setListsLoading(true);
      setErrorMessage(null);

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const todayDate = format(new Date(), "yyyy-MM-dd");
      const weekStartDate = format(weekStart, "yyyy-MM-dd");
      const weekEndDate = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const [
        tasksDoneResult,
        logsResult,
        streakResult,
        dueThisWeekResult,
        upcomingResult,
        coursesResult,
      ] = await Promise.all([
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "done")
          .gte("updated_at", weekStart.toISOString()),
        supabase
          .from("study_logs")
          .select("duration_minutes")
          .eq("user_id", user.id)
          .gte("logged_date", weekStartDate),
        supabase.from("streaks").select("current_streak").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .neq("status", "done")
          .gte("due_date", todayDate)
          .lte("due_date", weekEndDate),
        supabase
          .from("tasks")
          .select("id, title, priority, due_date")
          .eq("user_id", user.id)
          .neq("status", "done")
          .gte("due_date", todayDate)
          .order("due_date", { ascending: true })
          .limit(3),
        supabase
          .from("courses")
          .select("id, name, credits, grade, color", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(3),
      ]);

      const firstError =
        tasksDoneResult.error ??
        logsResult.error ??
        streakResult.error ??
        dueThisWeekResult.error ??
        upcomingResult.error ??
        coursesResult.error;

      if (firstError) {
        setErrorMessage(firstError.message);
        setStatsLoading(false);
        setListsLoading(false);
        return;
      }

      const totalStudyMinutes = (logsResult.data ?? []).reduce(
        (sum, item) => sum + (item.duration_minutes ?? 0),
        0,
      );

      setStats({
        tasksDone: tasksDoneResult.count ?? 0,
        studyHours: Number((totalStudyMinutes / 60).toFixed(1)),
        streak: streakResult.data?.current_streak ?? 0,
        gpa: Number(profile?.current_gpa ?? 0).toFixed(2),
      });
      setDueThisWeek(dueThisWeekResult.count ?? 0);
      setUpcoming(upcomingResult.data ?? []);
      setCourses(coursesResult.data ?? []);
      setCourseCount(coursesResult.count ?? 0);
      setStatsLoading(false);
      setListsLoading(false);
    };

    void loadDashboard();
  }, [profile?.current_gpa, user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const displayName = profile?.full_name ?? "Student";
  const quoteOptions = useMemo(
    () => [
      { quote: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
      { quote: "The expert in anything was once a beginner.", author: "Helen Hayes" },
      { quote: "Dream big. Start small. Act now.", author: "Robin Sharma" },
      { quote: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
      { quote: "What we learn with pleasure we never forget.", author: "Alfred Mercier" },
      { quote: "Don’t watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
      { quote: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
      { quote: "The future depends on what you do today.", author: "Mahatma Gandhi" },
      { quote: "Your habits will determine your future.", author: "Jack Canfield" },
      { quote: "Small progress is still progress.", author: "Anonymous" },
    ],
    [],
  );
  const dailyQuote = quoteOptions[getDayOfYear(new Date()) % quoteOptions.length];
  const statItems = [
    { label: "Tasks Done", value: stats.tasksDone, sub: "this week", icon: CheckCircle, bg: "bg-[#B3FFB3]" },
    { label: "Study Hours", value: stats.studyHours, sub: "this week", icon: Clock, bg: "bg-[#B3D4FF]" },
    { label: "Streak", value: stats.streak, sub: "days", icon: Flame, bg: "bg-[#FFC107]" },
    { label: "GPA", value: stats.gpa, sub: "current", icon: TrendingUp, bg: "bg-[#FFB3C1]" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-10">
      {errorMessage && (
        <div className="border-[3px] border-black bg-[#FFB3C1] px-4 py-3">
          <p className="font-black text-xs uppercase tracking-wide text-black">Error: {errorMessage}</p>
        </div>
      )}

      <div className="bg-[#FFC107] border-[3px] border-black p-5 sm:p-6 lg:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-black/60 mb-1">{greeting}</p>
            <h1 className="font-black text-xl sm:text-2xl lg:text-3xl text-black uppercase tracking-wide leading-tight">
              Welcome back, {displayName}! 👋
            </h1>
            <p className="font-bold text-xs sm:text-sm text-black/70 mt-1 sm:mt-2">
              You have {statsLoading ? "..." : dueThisWeek} tasks due this week. Keep up the momentum!
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Star className="w-6 h-6 sm:w-8 sm:h-8 text-black" strokeWidth={2.5} fill="black" />
            <div>
              <p className="font-black text-2xl sm:text-3xl text-black leading-none">{statsLoading ? "..." : stats.streak}</p>
              <p className="font-black text-[10px] sm:text-xs text-black/60 uppercase">day streak</p>
            </div>
          </div>
        </div>
      </div>

      <div data-tour="dashboard-stats" className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {statItems.map((stat) => (
          <div key={stat.label} className={`${stat.bg} border-[2px] sm:border-[3px] border-black p-3 sm:p-4 lg:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
            <div className="flex items-start gap-1.5 sm:gap-2 mb-2">
              <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black shrink-0 mt-0.5" strokeWidth={2.5} />
              <span className="font-black text-[10px] sm:text-xs text-black uppercase tracking-wide leading-tight break-words">{stat.label}</span>
            </div>
            <p className="font-black text-2xl sm:text-3xl lg:text-4xl text-black leading-none">{statsLoading ? "..." : stat.value}</p>
            <p className="font-bold text-[10px] sm:text-xs text-black/50 uppercase mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
        <div className="xl:col-span-7 flex flex-col gap-4 sm:gap-6">
          <div className="border-[2px] sm:border-[3px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b-[2px] sm:border-b-[3px] border-black bg-[#B3D4FF]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" strokeWidth={2.5} />
                <h2 className="font-black text-xs sm:text-sm text-black uppercase tracking-wide">Upcoming Deadlines</h2>
              </div>
              <span className="font-black text-[10px] sm:text-xs text-black/60 shrink-0 ml-2">{listsLoading ? "..." : upcoming.length} tasks</span>
            </div>
            <div className="flex-1">
              {!listsLoading && upcoming.length === 0 && (
                <div className="px-4 sm:px-5 py-4">
                  <p className="font-black text-xs uppercase tracking-wide text-black/50">No upcoming deadlines!</p>
                </div>
              )}
              {upcoming.map((item, i) => {
                const priority = getPriorityStyle(item.priority);
                return (
                  <div key={item.id} className={`flex items-start gap-3 px-4 sm:px-5 py-3 sm:py-4 ${i < upcoming.length - 1 ? "border-b-2 border-black" : ""}`}>
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${priority.color} border-2 border-black shrink-0 mt-1`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs sm:text-sm text-black leading-snug">{item.title}</p>
                      <p className="font-bold text-[10px] sm:text-xs text-gray-500 mt-0.5">{getDueLabel(item.due_date)}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 ${priority.color} border-2 border-black font-black text-[10px] sm:text-xs uppercase`}>{priority.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t-2 border-black mt-auto">
              <Link href="/tasks" className="flex items-center gap-1 font-black text-[10px] sm:text-xs text-black uppercase tracking-wide hover:underline outline-none focus-visible:ring-2 focus-visible:ring-black w-fit">
                View all tasks <ArrowRight className="w-3 h-3" strokeWidth={3} />
              </Link>
            </div>
          </div>

          <div className="border-[2px] sm:border-[3px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b-[2px] sm:border-b-[3px] border-black bg-[#B3FFB3]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" strokeWidth={2.5} />
                <h2 className="font-black text-xs sm:text-sm text-black uppercase tracking-wide">Course Overview</h2>
              </div>
              <span className="font-black text-[10px] sm:text-xs text-black/60 shrink-0 ml-2">{listsLoading ? "..." : courseCount} active</span>
            </div>
            <div className="flex-1">
              {!listsLoading && courses.length === 0 && (
                <div className="px-4 sm:px-5 py-4">
                  <p className="font-black text-xs uppercase tracking-wide text-black/50">Add your first course in Tasks - Academic Load</p>
                </div>
              )}
              {courses.map((course, i) => (
                <div key={course.id} className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 ${i < courses.length - 1 ? "border-b-2 border-black" : ""}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 ${course.color ?? "bg-[#B3D4FF]"} border-2 border-black flex items-center justify-center shrink-0`}>
                    <span className="font-black text-xs sm:text-sm text-black">{course.credits}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-black leading-snug">{course.name}</p>
                    <p className="font-bold text-[10px] sm:text-xs text-gray-500">{course.credits} Credits</p>
                  </div>
                  <span className="px-2 sm:px-3 py-1 bg-[#FFC107] border-2 border-black font-black text-xs sm:text-sm text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                    {course.grade ?? "-"}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t-2 border-black mt-auto">
              <Link href="/tasks?tab=academic-load" className="flex items-center gap-1 font-black text-[10px] sm:text-xs text-black uppercase tracking-wide hover:underline outline-none focus-visible:ring-2 focus-visible:ring-black w-fit">
                View all courses <ArrowRight className="w-3 h-3" strokeWidth={3} />
              </Link>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 h-full mt-4 xl:mt-0">
          <div className="h-full">
            <CustomCalendar />
          </div>
        </div>
      </div>

      <div className="bg-[#7C5CFC] border-[2px] sm:border-[3px] border-black p-4 sm:p-5 lg:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-black text-[10px] sm:text-xs text-[#FFC107] uppercase tracking-widest mb-1">Daily Motivation</p>
        <p className="font-bold text-base sm:text-lg lg:text-xl text-white leading-snug">
          &ldquo;{dailyQuote.quote}&rdquo;
        </p>
        <p className="font-bold text-xs sm:text-sm text-white/70 mt-1 sm:mt-2">- {dailyQuote.author}</p>
      </div>
    </div>
  );
}
