"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, CheckCircle, Clock, Flame, TrendingUp, Calendar, Star, ArrowRight } from "lucide-react";

// === TAMBAHAN: IMPORT KALENDER ===
import CustomCalendar from "../../components/landing/Calendar";

const STATS = [
  { label: "Tasks Done", value: "12", sub: "this week", icon: CheckCircle, bg: "bg-[#B3FFB3]" },
  { label: "Study Hours", value: "24", sub: "this week", icon: Clock, bg: "bg-[#B3D4FF]" },
  { label: "Streak", value: "7", sub: "days", icon: Flame, bg: "bg-[#FFC107]" },
  { label: "GPA", value: "3.85", sub: "current", icon: TrendingUp, bg: "bg-[#FFB3C1]" },
];

const UPCOMING = [
  { task: "Final Project Documentation", due: "Tomorrow", priority: "HIGH", color: "bg-[#FFB3C1]" },
  { task: "Neural Networks Homework", due: "Mar 12", priority: "MEDIUM", color: "bg-[#FFC107]" },
  { task: "Review Pull Requests", due: "Mar 14", priority: "LOW", color: "bg-[#B3FFB3]" },
];

const COURSES = [
  { name: "Software Engineering", credits: 4, grade: "A", color: "bg-[#B3D4FF]" },
  { name: "Neural Networks", credits: 3, grade: "A-", color: "bg-[#FFB3C1]" },
  { name: "Database Systems", credits: 3, grade: "B+", color: "bg-[#FFC107]" },
];

export default function Home() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-10">
      {/* Hero Greeting */}
      <div className="bg-[#FFC107] border-[3px] border-black p-5 sm:p-6 lg:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-black/60 mb-1">{greeting}</p>
            <h1 className="font-black text-xl sm:text-2xl lg:text-3xl text-black uppercase tracking-wide leading-tight">
              Welcome back, Alfian! 👋
            </h1>
            <p className="font-bold text-xs sm:text-sm text-black/70 mt-1 sm:mt-2">
              You have 5 tasks due this week. Keep up the momentum!
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Star className="w-6 h-6 sm:w-8 sm:h-8 text-black" strokeWidth={2.5} fill="black" />
            <div>
              <p className="font-black text-2xl sm:text-3xl text-black leading-none">7</p>
              <p className="font-black text-[10px] sm:text-xs text-black/60 uppercase">day streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div data-tour="dashboard-stats" className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} border-[2px] sm:border-[3px] border-black p-3 sm:p-4 lg:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
          >
            <div className="flex items-start gap-1.5 sm:gap-2 mb-2">
              <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black shrink-0 mt-0.5" strokeWidth={2.5} />
              {/* FIX: truncate diganti wrap agar label tidak terpotong */}
              <span className="font-black text-[10px] sm:text-xs text-black uppercase tracking-wide leading-tight break-words">{stat.label}</span>
            </div>
            <p className="font-black text-2xl sm:text-3xl lg:text-4xl text-black leading-none">
              {stat.value}
            </p>
            <p className="font-bold text-[10px] sm:text-xs text-black/50 uppercase mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">

        {/* Kolom Kiri */}
        <div className="xl:col-span-7 flex flex-col gap-4 sm:gap-6">

          {/* Upcoming Deadlines */}
          <div className="border-[2px] sm:border-[3px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b-[2px] sm:border-b-[3px] border-black bg-[#B3D4FF]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" strokeWidth={2.5} />
                <h2 className="font-black text-xs sm:text-sm text-black uppercase tracking-wide">Upcoming Deadlines</h2>
              </div>
              <span className="font-black text-[10px] sm:text-xs text-black/60 shrink-0 ml-2">{UPCOMING.length} tasks</span>
            </div>
            <div className="flex-1">
              {UPCOMING.map((item, i) => (
                <div
                  key={item.task}
                  className={`flex items-start gap-3 px-4 sm:px-5 py-3 sm:py-4 ${i < UPCOMING.length - 1 ? 'border-b-2 border-black' : ''}`}
                >
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${item.color} border-2 border-black shrink-0 mt-1`} />
                  {/* FIX: teks task tidak di-truncate, biarkan wrap */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-black leading-snug">{item.task}</p>
                    <p className="font-bold text-[10px] sm:text-xs text-gray-500 mt-0.5">{item.due}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 ${item.color} border-2 border-black font-black text-[10px] sm:text-xs uppercase`}>
                    {item.priority}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t-2 border-black mt-auto">
              <Link href="/tasks" className="flex items-center gap-1 font-black text-[10px] sm:text-xs text-black uppercase tracking-wide hover:underline outline-none focus-visible:ring-2 focus-visible:ring-black w-fit">
                View all tasks <ArrowRight className="w-3 h-3" strokeWidth={3} />
              </Link>
            </div>
          </div>

          {/* Course Overview */}
          <div className="border-[2px] sm:border-[3px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b-[2px] sm:border-b-[3px] border-black bg-[#B3FFB3]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" strokeWidth={2.5} />
                <h2 className="font-black text-xs sm:text-sm text-black uppercase tracking-wide">Course Overview</h2>
              </div>
              <span className="font-black text-[10px] sm:text-xs text-black/60 shrink-0 ml-2">{COURSES.length} active</span>
            </div>
            <div className="flex-1">
              {COURSES.map((course, i) => (
                <div key={course.name} className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 ${i < COURSES.length - 1 ? 'border-b-2 border-black' : ''}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 ${course.color} border-2 border-black flex items-center justify-center shrink-0`}>
                    <span className="font-black text-xs sm:text-sm text-black">{course.credits}</span>
                  </div>
                  {/* FIX: truncate dihapus, nama course bisa wrap */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-black leading-snug">{course.name}</p>
                    <p className="font-bold text-[10px] sm:text-xs text-gray-500">{course.credits} Credits</p>
                  </div>
                  <span className="px-2 sm:px-3 py-1 bg-[#FFC107] border-2 border-black font-black text-xs sm:text-sm text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                    {course.grade}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t-2 border-black mt-auto">
              <Link href="/tasks" className="flex items-center gap-1 font-black text-[10px] sm:text-xs text-black uppercase tracking-wide hover:underline outline-none focus-visible:ring-2 focus-visible:ring-black w-fit">
                View all courses <ArrowRight className="w-3 h-3" strokeWidth={3} />
              </Link>
            </div>
          </div>

        </div>

        {/* Kolom Kanan: Kalender */}
        <div className="xl:col-span-5 h-full mt-4 xl:mt-0">
          <div className="h-full">
            <CustomCalendar />
          </div>
        </div>

      </div>

      {/* Quick Motivation */}
      <div className="bg-[#7C5CFC] border-[2px] sm:border-[3px] border-black p-4 sm:p-5 lg:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-black text-[10px] sm:text-xs text-[#FFC107] uppercase tracking-widest mb-1">Daily Motivation</p>
        <p className="font-bold text-base sm:text-lg lg:text-xl text-white leading-snug">
          &ldquo;The only way to do great work is to love what you do.&rdquo;
        </p>
        <p className="font-bold text-xs sm:text-sm text-white/70 mt-1 sm:mt-2">— Steve Jobs</p>
      </div>

    </div>
  );
}