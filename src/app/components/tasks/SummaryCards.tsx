"use client";

import { BookOpen, GraduationCap, Target } from "lucide-react";

interface SummaryCardsProps {
  totalSKS: number;
  courseCount: number;
  targetGpa: number | null;
  onTargetGpaSave: (next: number) => Promise<void> | void;
  savingTargetGpa?: boolean;
}

export default function SummaryCards({
  totalSKS,
  courseCount,
  targetGpa,
  savingTargetGpa = false,
}: SummaryCardsProps) {
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
        <p className="font-black text-4xl text-black">{totalSKS} Credits</p>
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
          {String(courseCount).padStart(2, "0")} <span className="text-lg">Courses</span>
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
          {(targetGpa ?? 3.85).toFixed(2)} <span className="text-lg">/ 4.0</span>
          {savingTargetGpa ? <span className="ml-2 text-xs font-black uppercase text-black/50">Saving...</span> : null}
        </p>
      </div>
    </div>
  );
}
