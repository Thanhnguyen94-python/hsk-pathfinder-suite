-- Migration to link assignments to slot_id and add student session skill evaluations

-- 1. Add slot_id link to assignments if it doesn't exist
ALTER TABLE public.assignments 
  ADD COLUMN IF NOT EXISTS slot_id text REFERENCES public.bookings(slot_id) ON DELETE SET NULL;

-- 2. Create session evaluations table
CREATE TABLE IF NOT EXISTS public.session_evaluations (
  evaluation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id text NOT NULL REFERENCES public.bookings(slot_id) ON DELETE CASCADE UNIQUE,
  student_id text NOT NULL REFERENCES public.users(specific_id) ON DELETE CASCADE,
  teacher_id text NOT NULL REFERENCES public.users(specific_id) ON DELETE CASCADE,
  listening_score integer NOT NULL CHECK (listening_score BETWEEN 0 AND 100),
  speaking_score integer NOT NULL CHECK (speaking_score BETWEEN 0 AND 100),
  reading_score integer NOT NULL CHECK (reading_score BETWEEN 0 AND 100),
  writing_score integer NOT NULL CHECK (writing_score BETWEEN 0 AND 100),
  vocabulary_score integer NOT NULL CHECK (vocabulary_score BETWEEN 0 AND 100),
  grammar_score integer NOT NULL CHECK (grammar_score BETWEEN 0 AND 100),
  general_comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_evaluations ENABLE ROW LEVEL SECURITY;

-- Create policies for session_evaluations
CREATE POLICY "evaluations read self" ON public.session_evaluations
  FOR SELECT TO authenticated 
  USING (
    student_id = public.current_user_specific_id() 
    OR teacher_id = public.current_user_specific_id() 
    OR public.is_admin()
  );

CREATE POLICY "evaluations write teacher/admin" ON public.session_evaluations
  FOR ALL TO authenticated
  USING (
    public.is_admin() 
    OR public.current_user_role() = 'teacher'
  )
  WITH CHECK (
    public.is_admin() 
    OR public.current_user_role() = 'teacher'
  );

-- 3. Create RPC function to compute average student skills
CREATE OR REPLACE FUNCTION public.get_student_skills(p_student_id text)
RETURNS TABLE(
  skill text,
  score numeric
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 'Nghe'::text, ROUND(COALESCE(AVG(listening_score), 0)::numeric, 1) FROM public.session_evaluations WHERE student_id = p_student_id
  UNION ALL
  SELECT 'Nói'::text, ROUND(COALESCE(AVG(speaking_score), 0)::numeric, 1) FROM public.session_evaluations WHERE student_id = p_student_id
  UNION ALL
  SELECT 'Đọc'::text, ROUND(COALESCE(AVG(reading_score), 0)::numeric, 1) FROM public.session_evaluations WHERE student_id = p_student_id
  UNION ALL
  SELECT 'Viết'::text, ROUND(COALESCE(AVG(writing_score), 0)::numeric, 1) FROM public.session_evaluations WHERE student_id = p_student_id
  UNION ALL
  SELECT 'Từ vựng'::text, ROUND(COALESCE(AVG(vocabulary_score), 0)::numeric, 1) FROM public.session_evaluations WHERE student_id = p_student_id
  UNION ALL
  SELECT 'Ngữ pháp'::text, ROUND(COALESCE(AVG(grammar_score), 0)::numeric, 1) FROM public.session_evaluations WHERE student_id = p_student_id;
END;
$$;
