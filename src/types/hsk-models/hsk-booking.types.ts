export interface HSKSlot {
  slot_id: string;
  class_id?: string | null;
  course_name?: string | null;
  teacher_staff_code?: string | null;
  student_id?: string | null;
  teacher_id?: string | null;
  session_date: string;
  session_end_date?: string | null;
  actual_end_time?: string | null;
  status: string;
  teacher_name?: string | null;
  student_name?: string | null;
  teacher_note?: string | null;
  material_url?: string | null;
  is_enrollment_only?: boolean;
}

export interface HSKFixedClass {
  class_id: string;
  course_level: string;
  schedule: string[];
  teacher_id?: string;
}

export interface HSKCancellationRule {
  hoursUntilSession: number;
  isLate: boolean;
}
