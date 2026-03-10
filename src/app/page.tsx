"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, CheckCircle, Clock, Flame, TrendingUp, Calendar, Star, ArrowRight } from "lucide-react";

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
    <div className="space-y-6 max-w-5xl">
      {/* Hero Greeting */}
      <div className="bg-[#FFC107] border-[3px] border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-black text-xs uppercase tracking-widest text-black/60 mb-1">{greeting}</p>
            <h1 className="font-black text-2xl sm:text-3xl text-black uppercase tracking-wide">
              Welcome back, Alfian! 👋
            </h1>
            <p className="font-bold text-sm text-black/70 mt-2">
              You have 5 tasks due this week. Keep up the momentum!
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Star className="w-8 h-8 text-black" strokeWidth={2.5} fill="black" />
            <div>
              <p className="font-black text-3xl text-black leading-none">7</p>
              <p className="font-black text-xs text-black/60 uppercase">day streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} border-[3px] border-black p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-black" strokeWidth={2.5} />
              <span className="font-black text-xs text-black uppercase tracking-wide">{stat.label}</span>
            </div>
            <p className="font-black text-3xl sm:text-4xl text-black leading-none">
              {stat.value}
            </p>
            <p className="font-bold text-xs text-black/50 uppercase mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Upcoming Deadlines */}
        <div className="border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between px-5 py-4 border-b-[3px] border-black bg-[#B3D4FF]">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-black" strokeWidth={2.5} />
              <h2 className="font-black text-sm text-black uppercase tracking-wide">Upcoming Deadlines</h2>
            </div>
            <span className="font-black text-xs text-black/60">{UPCOMING.length} tasks</span>
          </div>
          <div>
            {UPCOMING.map((item, i) => (
              <div
                key={item.task}
                className={`flex items-center gap-3 px-5 py-4 ${i < UPCOMING.length - 1 ? 'border-b-2 border-black' : ''}`}
              >
                <div className={`w-3 h-3 ${item.color} border-2 border-black shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-black truncate">{item.task}</p>
                  <p className="font-bold text-xs text-gray-500">{item.due}</p>
                </div>
                <span className={`px-2 py-0.5 ${item.color} border-2 border-black font-black text-xs uppercase shrink-0`}>
                  {item.priority}
                </span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t-2 border-black">
            <Link href="/tasks" className="flex items-center gap-1 font-black text-xs text-black uppercase tracking-wide hover:underline outline-none focus-visible:ring-2 focus-visible:ring-black">
              View all tasks <ArrowRight className="w-3 h-3" strokeWidth={3} />
            </Link>
          </div>
        </div>

        {/* Course Overview */}
        <div className="border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between px-5 py-4 border-b-[3px] border-black bg-[#B3FFB3]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-black" strokeWidth={2.5} />
              <h2 className="font-black text-sm text-black uppercase tracking-wide">Course Overview</h2>
            </div>
            <span className="font-black text-xs text-black/60">{COURSES.length} active</span>
          </div>
          <div>
            {COURSES.map((course, i) => (
              <div
                key={course.name}
                className={`flex items-center gap-3 px-5 py-4 ${i < COURSES.length - 1 ? 'border-b-2 border-black' : ''}`}
              >
                <div className={`w-10 h-10 ${course.color} border-2 border-black flex items-center justify-center shrink-0`}>
                  <span className="font-black text-sm text-black">{course.credits}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-black truncate">{course.name}</p>
                  <p className="font-bold text-xs text-gray-500">{course.credits} SKS</p>
                </div>
                <span className="px-3 py-1 bg-[#FFC107] border-2 border-black font-black text-sm text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {course.grade}
                </span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t-2 border-black">
            <Link href="/tasks" className="flex items-center gap-1 font-black text-xs text-black uppercase tracking-wide hover:underline outline-none focus-visible:ring-2 focus-visible:ring-black">
              View academic load <ArrowRight className="w-3 h-3" strokeWidth={3} />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Motivation */}
      <div className="bg-black border-[3px] border-black p-5 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
        <p className="font-black text-xs text-[#FFC107] uppercase tracking-widest mb-1">Daily Motivation</p>
        <p className="font-bold text-lg sm:text-xl text-white leading-snug">
          &ldquo;The only way to do great work is to love what you do.&rdquo;
        </p>
        <p className="font-bold text-sm text-white/50 mt-2">— Steve Jobs</p>
      </div>
    </div>
  );
}
