export interface Course {
  id: string;
  name: string;
  type: "THEORY" | "PRACTICUM";
  sks: number;
}

const STORAGE_KEY = "puff_pastry_courses";

const DEFAULT_COURSES: Course[] = [
  { id: "1", name: "Artificial Intelligence", type: "THEORY", sks: 3 },
  { id: "2", name: "Database Systems", type: "THEORY", sks: 3 },
  { id: "3", name: "Web Programming Lab", type: "PRACTICUM", sks: 2 },
  { id: "4", name: "Data Structures & Algorithms", type: "THEORY", sks: 4 },
  { id: "5", name: "Computer Networks Lab", type: "PRACTICUM", sks: 2 },
  { id: "6", name: "Software Engineering", type: "THEORY", sks: 3 },
  { id: "7", name: "Operating Systems", type: "THEORY", sks: 3 },
  { id: "8", name: "Mobile App Development Lab", type: "PRACTICUM", sks: 2 },
  { id: "9", name: "Statistics", type: "THEORY", sks: 2 },
];

let cached: Course[] | null = null;

function loadCourses(): Course[] {
  if (cached) return cached;
  if (typeof window === "undefined") return DEFAULT_COURSES;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COURSES));
    cached = DEFAULT_COURSES;
    return cached;
  }

  cached = JSON.parse(raw) as Course[];
  return cached;
}

function saveCourses(courses: Course[]) {
  cached = courses;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  }
}

export function getCourses(): Course[] {
  return loadCourses();
}

export function addCourse(course: Omit<Course, "id">): Course[] {
  const courses = loadCourses();
  const newCourse: Course = { ...course, id: Date.now().toString() };
  const updated = [...courses, newCourse];
  saveCourses(updated);
  return updated;
}

export function deleteCourse(id: string): Course[] {
  const courses = loadCourses();
  const updated = courses.filter((c) => c.id !== id);
  saveCourses(updated);
  return updated;
}

export function getTotalSKS(courses: Course[]): number {
  return courses.reduce((sum, c) => sum + c.sks, 0);
}
