"use client";

export interface StudyDayData {
  day: string;
  hours: number;
}

export interface StudyMetrics {
  mostProductiveTime: string;
  tasksCompleted: number;
  uncompleted: number;
}

export type Timeframe = "Day" | "Week" | "Month" | "Sem";

const STORAGE_KEY = "puff_pastry_study_data";

const SEED_DATA: Record<Timeframe, StudyDayData[]> = {
  Day: [
    { day: "6AM", hours: 1 },
    { day: "9AM", hours: 3 },
    { day: "12PM", hours: 2 },
    { day: "3PM", hours: 4 },
    { day: "6PM", hours: 3 },
    { day: "9PM", hours: 2 },
    { day: "12AM", hours: 1 },
  ],
  Week: [
    { day: "Mon", hours: 3 },
    { day: "Tue", hours: 5 },
    { day: "Wed", hours: 4 },
    { day: "Thu", hours: 7 },
    { day: "Fri", hours: 6 },
    { day: "Sat", hours: 4 },
    { day: "Sun", hours: 2 },
  ],
  Month: [
    { day: "W1", hours: 18 },
    { day: "W2", hours: 24 },
    { day: "W3", hours: 20 },
    { day: "W4", hours: 28 },
  ],
  Sem: [
    { day: "Sep", hours: 60 },
    { day: "Oct", hours: 75 },
    { day: "Nov", hours: 85 },
    { day: "Dec", hours: 70 },
    { day: "Jan", hours: 90 },
  ],
};

const SEED_METRICS: StudyMetrics = {
  mostProductiveTime: "10:00 AM",
  tasksCompleted: 24,
  uncompleted: 7,
};

function seedIfNeeded(): void {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ chartData: SEED_DATA, metrics: SEED_METRICS })
    );
  }
}

export function getStudyChartData(timeframe: Timeframe): StudyDayData[] {
  seedIfNeeded();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.chartData[timeframe] ?? SEED_DATA[timeframe];
    }
  } catch {
    // fallback to seed
  }
  return SEED_DATA[timeframe];
}

export function getStudyMetrics(): StudyMetrics {
  seedIfNeeded();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.metrics ?? SEED_METRICS;
    }
  } catch {
    // fallback to seed
  }
  return SEED_METRICS;
}
