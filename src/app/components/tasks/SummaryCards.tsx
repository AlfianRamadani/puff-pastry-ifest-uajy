"use client";

import { BookOpen, GraduationCap, Target } from "lucide-react";
import { useState } from "react";

interface SummaryCardsProps {
  totalSKS: number;
  courseCount: number;
  targetGpa: number | null;
  currentGpa: number | null;
  completedCredits: number;
  onTargetGpaSave: (next: number) => Promise<void> | void;
  savingTargetGpa?: boolean;
  loading?: boolean;
}

export default function SummaryCards({
  totalSKS,
  courseCount,
  targetGpa,
  currentGpa,
  completedCredits,
  onTargetGpaSave,
  savingTargetGpa = false,
  loading = false,
}: SummaryCardsProps) {
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState((targetGpa ?? 3.85).toFixed(2));

  const totalRequiredCredits = 144;
  const remainingCredits = Math.max(0, totalRequiredCredits - completedCredits);
  const projectedSemesters = Math.max(1, Math.ceil(remainingCredits / Math.max(1, totalSKS || 18)));
  const completionPercent = Math.min(100, Math.round((completedCredits / totalRequiredCredits) * 100));
  const warning = currentGpa != null && targetGpa != null && currentGpa < targetGpa ? "Behind target trajectory" : "On target track";

  return (
    <div className="space-y-4">
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
          {loading ? "..." : String(courseCount).padStart(2, "0")} <span className="text-lg">Courses</span>
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
          {loading ? "..." : (targetGpa ?? 3.85).toFixed(2)} <span className="text-lg">/ 4.0</span>
          {savingTargetGpa ? <span className="ml-2 text-xs font-black uppercase text-black/50">Saving...</span> : null}
        </p>
        {editingTarget ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={4}
              step={0.01}
              value={targetDraft}
              onChange={(e) => setTargetDraft(e.target.value)}
              className="w-20 border-2 border-black px-2 py-1 font-black text-xs"
            />
            <button
              onClick={() => {
                const parsed = Number(targetDraft);
                if (Number.isNaN(parsed) || parsed < 0 || parsed > 4) return;
                void onTargetGpaSave(parsed);
                setEditingTarget(false);
              }}
              className="px-2 py-1 border-2 border-black bg-[#B3FFB3] font-black text-[10px] uppercase"
            >
              Save
            </button>
            <button onClick={() => setEditingTarget(false)} className="px-2 py-1 border-2 border-black bg-white font-black text-[10px] uppercase">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setTargetDraft((targetGpa ?? 3.85).toFixed(2));
              setEditingTarget(true);
            }}
            className="mt-2 px-2 py-1 border-2 border-black bg-white font-black text-[10px] uppercase"
          >
            Edit Target
          </button>
        )}
      </div>
      </div>

      <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-black text-xs uppercase tracking-wide text-black mb-3">Academic Goal Tracking</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border-2 border-black p-3 bg-[#EEF6F6]">
            <p className="font-black text-[10px] uppercase">Current GPA</p>
            <p className="font-black text-xl mt-1">{loading ? "..." : (currentGpa ?? 0).toFixed(2)}</p>
          </div>
          <div className="border-2 border-black p-3 bg-[#EEF6F6]">
            <p className="font-black text-[10px] uppercase">Completed Credits</p>
            <p className="font-black text-xl mt-1">{loading ? "..." : completedCredits}</p>
          </div>
          <div className="border-2 border-black p-3 bg-[#EEF6F6]">
            <p className="font-black text-[10px] uppercase">Remaining Credits</p>
            <p className="font-black text-xl mt-1">{loading ? "..." : remainingCredits}</p>
          </div>
          <div className="border-2 border-black p-3 bg-[#EEF6F6]">
            <p className="font-black text-[10px] uppercase">Projected Terms</p>
            <p className="font-black text-xl mt-1">{loading ? "..." : projectedSemesters}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[25, 50, 75].map((step) => (
            <span
              key={step}
              className={`px-2 py-1 border-2 border-black font-black text-[10px] uppercase ${completionPercent >= step ? "bg-[#B3FFB3]" : "bg-white"}`}
            >
              {step}% Milestone
            </span>
          ))}
          <span className={`px-2 py-1 border-2 border-black font-black text-[10px] uppercase ${warning === "On target track" ? "bg-[#B3FFB3]" : "bg-[#FFB3C1]"}`}>
            {warning}
          </span>
        </div>
      </div>
    </div>
  );
}
