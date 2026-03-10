"use client";

import React from "react";
import { BookOpen, GraduationCap, Target } from "lucide-react";

interface SummaryCardsProps {
  totalSKS: number;
  courseCount: number;
}

export default function SummaryCards({ totalSKS, courseCount }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total Semester Load — Hero */}
      <div className="border-[3px] border-black bg-[#FFC107] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-black" strokeWidth={2.5} />
          <span className="font-black text-xs uppercase tracking-wide text-black">
            Total Semester Load
          </span>
        </div>
        <p className="font-black text-4xl text-black">{totalSKS} SKS</p>
      </div>

      {/* Courses Taken */}
      <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="w-5 h-5 text-black" strokeWidth={2.5} />
          <span className="font-black text-xs uppercase tracking-wide text-black">
            Courses Taken
          </span>
        </div>
        <p className="font-black text-4xl text-black">
          {String(courseCount).padStart(2, "0")} <span className="text-lg">UNITS</span>
        </p>
      </div>

      {/* Target GPA */}
      <div className="border-[3px] border-black bg-[#B3D4FF] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-black" strokeWidth={2.5} />
          <span className="font-black text-xs uppercase tracking-wide text-black">
            Target GPA
          </span>
        </div>
        <p className="font-black text-4xl text-black">
          3.85 <span className="text-lg">/ 4.0</span>
        </p>
      </div>
    </div>
  );
}
