export interface Course {
  id: string;
  name: string;
  type: "LECTURE" | "LAB" | "SEMINAR" | "ELECTIVE";
  sks: number;
}

export function getTotalSKS(courses: Course[]): number {
  return courses.reduce((sum, c) => sum + c.sks, 0);
}
