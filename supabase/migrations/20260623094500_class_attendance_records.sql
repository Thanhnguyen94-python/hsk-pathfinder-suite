-- Migration: class attendance records
-- Mục tiêu: lưu điểm danh theo từng buổi học của từng học viên trong lớp,
-- phục vụ truy vết quá trình tham gia học và báo cáo sau này.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'attendance_status'
  ) THEN
    CREATE TYPE public.attendance_status AS ENUM (
      'present',
      'absent_excused',
      'absent_unexcused'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.class_attendance_records (
  attendance_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id              text NOT NULL REFERENCES public.classes(class_id) ON DELETE CASCADE,
  session_date          timestamptz NOT NULL,
  student_id            text NOT NULL,
  attendance_status     public.attendance_status NOT NULL,
  excuse_reason         text,
  marked_by             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  marked_by_specific_id text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_attendance_unique UNIQUE (class_id, session_date, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_attendance_class_session
  ON public.class_attendance_records (class_id, session_date);

CREATE INDEX IF NOT EXISTS idx_class_attendance_student
  ON public.class_attendance_records (student_id);

CREATE INDEX IF NOT EXISTS idx_class_attendance_status
  ON public.class_attendance_records (attendance_status);

ALTER TABLE public.class_attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_read_authenticated" ON public.class_attendance_records;
CREATE POLICY "attendance_read_authenticated"
  ON public.class_attendance_records
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "attendance_write_admin_only" ON public.class_attendance_records;
CREATE POLICY "attendance_write_admin_only"
  ON public.class_attendance_records
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.fn_class_attendance_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_class_attendance_set_updated_at ON public.class_attendance_records;
CREATE TRIGGER trg_class_attendance_set_updated_at
BEFORE UPDATE ON public.class_attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.fn_class_attendance_set_updated_at();
