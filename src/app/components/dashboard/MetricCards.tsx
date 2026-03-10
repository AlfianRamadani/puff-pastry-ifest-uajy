"use client";

import React, { useMemo } from "react";
import { Zap, CheckCircle, Clock } from "lucide-react";
import { getStudyMetrics } from "./studyData";

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  bgColor,
}) => (
  <div
    className={`${bgColor} border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 md:p-5 flex flex-col gap-3`}
  >
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 md:w-10 md:h-10 bg-white border-2 border-black flex items-center justify-center rounded-sm shrink-0">
        {icon}
      </div>
      <span className="font-bold text-xs md:text-sm text-black uppercase tracking-wide">
        {label}
      </span>
    </div>
    <span className="font-black text-2xl md:text-3xl text-black">{value}</span>
  </div>
);

const MetricCards: React.FC = () => {
  const metrics = useMemo(() => getStudyMetrics(), []);

  const cards: MetricCardProps[] = [
    {
      icon: <Zap className="w-4 h-4 md:w-5 md:h-5 text-black" strokeWidth={2.5} />,
      label: "Most Productive",
      value: metrics.mostProductiveTime,
      bgColor: "bg-white",
    },
    {
      icon: <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-black" strokeWidth={2.5} />,
      label: "Tasks Completed",
      value: String(metrics.tasksCompleted).padStart(2, "0"),
      bgColor: "bg-[#8FFFE1]",
    },
    {
      icon: <Clock className="w-4 h-4 md:w-5 md:h-5 text-black" strokeWidth={2.5} />,
      label: "Uncompleted",
      value: String(metrics.uncompleted).padStart(2, "0"),
      bgColor: "bg-[#FFC107]",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} />
      ))}
    </div>
  );
};

export default MetricCards;
