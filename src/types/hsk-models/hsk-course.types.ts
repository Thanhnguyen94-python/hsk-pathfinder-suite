export type HSKLevel = "HSK 1" | "HSK 2" | "HSK 3" | "HSK 4" | "HSK 5" | "HSK 6";

export interface HSKLesson {
  lesson_id: string;
  title: string;
  description?: string;
  completed?: boolean;
}

export interface HSKAssignment {
  assignment_id: string;
  course_id: string;
  title: string;
  description?: string;
  deadline: string;
  submitted?: boolean;
  score?: number;
}

export interface HSKCourse {
  level: HSKLevel;
  lessons: HSKLesson[];
  assignments: HSKAssignment[];
}
