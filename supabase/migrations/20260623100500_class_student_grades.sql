-- Migration: class student grades per session
-- Lưu điểm 6 kỹ năng cho từng học viên theo từng buổi học trong lớp.

CREATE TABLE IF NOT EXISTS public.class_student_grades (
  grade_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id              text NOT NULL REFERENCES public.classes(class_id) ON DELETE CASCADE,
  session_date          timestamptz NOT NULL,
  student_id            text NOT NULL,
  listening             integer NOT NULL CHECK (listening BETWEEN 0 AND 100),
  speaking              integer NOT NULL CHECK (speaking BETWEEN 0 AND 100),
  reading               integer NOT NULL CHECK (reading BETWEEN 0 AND 100),
  writing               integer NOT NULL CHECK (writing BETWEEN 0 AND 100),
  vocabulary            integer NOT NULL CHECK (vocabulary BETWEEN 0 AND 100),
  grammar               integer NOT NULL CHECK (grammar BETWEEN 0 AND 100),
  general_comment       text,
  graded_by             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  graded_by_specific_id text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_student_grades_unique UNIQUE (class_id, session_date, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_student_grades_class_session
  ON public.class_student_grades (class_id, session_date);

CREATE INDEX IF NOT EXISTS idx_class_student_grades_student
  ON public.class_student_grades (student_id);

ALTER TABLE public.class_student_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_student_grades_read_authenticated" ON public.class_student_grades;
CREATE POLICY "class_student_grades_read_authenticated"
  ON public.class_student_grades
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "class_student_grades_write_admin_only" ON public.class_student_grades;
CREATE POLICY "class_student_grades_write_admin_only"
  ON public.class_student_grades
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.fn_class_student_grades_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_class_student_grades_set_updated_at ON public.class_student_grades;
CREATE TRIGGER trg_class_student_grades_set_updated_at
BEFORE UPDATE ON public.class_student_grades
FOR EACH ROW
EXECUTE FUNCTION public.fn_class_student_grades_set_updated_at();
