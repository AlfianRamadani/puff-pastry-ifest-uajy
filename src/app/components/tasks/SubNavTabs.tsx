"use client";

import React from "react";

const TABS = ["MY TASKS", "ACADEMIC LOAD", "BURNOUT ANALYSIS"] as const;
export type TabName = (typeof TABS)[number];

interface SubNavTabsProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

export default function SubNavTabs({ activeTab, onTabChange }: SubNavTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Task sections"
      className="flex gap-0 border-[3px] border-black bg-white w-fit shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
    >
      {TABS.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab)}
            className={`relative px-4 py-2.5 font-black text-xs uppercase tracking-wide border-r-[3px] border-black last:border-r-0 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset ${
              isActive
                ? "bg-[#FFC107] text-black"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {tab}
            {isActive && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-black rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
