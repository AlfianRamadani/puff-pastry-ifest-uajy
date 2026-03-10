export interface BurnoutMetric {
  taskName: string;
  contribution: number;
  riskLevel: "CRITICAL" | "MODERATE" | "LOW";
}

export interface BurnoutTrend {
  day: string;
  probability: number;
}

export function getBurnoutTrend(): BurnoutTrend[] {
  return [
    { day: "Mon", probability: 35 },
    { day: "Tue", probability: 42 },
    { day: "Wed", probability: 55 },
    { day: "Thu", probability: 48 },
    { day: "Fri", probability: 62 },
    { day: "Sat", probability: 71 },
    { day: "Today", probability: 68 },
  ];
}

export function getBurnoutMetrics(): BurnoutMetric[] {
  return [
    { taskName: "Final Project Documentation", contribution: 85, riskLevel: "CRITICAL" },
    { taskName: "Neural Networks Homework", contribution: 72, riskLevel: "CRITICAL" },
    { taskName: "Review Pull Requests", contribution: 58, riskLevel: "MODERATE" },
    { taskName: "Finalize UI Kit for GRIT App", contribution: 45, riskLevel: "MODERATE" },
    { taskName: "Research User Flows", contribution: 30, riskLevel: "LOW" },
    { taskName: "Sketch Initial Concepts", contribution: 18, riskLevel: "LOW" },
  ];
}
