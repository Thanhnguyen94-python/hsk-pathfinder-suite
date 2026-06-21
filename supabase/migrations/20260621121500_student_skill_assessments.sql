-- Student skill assessments model (periodic teacher scoring)
-- Purpose:
-- 1) Normalize student skill data into assessment + score tables.
-- 2) Keep backward compatibility with existing session_evaluations writes.
-- 3) Provide stable RPC get_student_skills(p_student_id) for dashboard charts.

-- 0) Enum for 6 core HSK skills
DO $$
BEGIN
  CREATE TYPE public.student_skill_key AS ENUM (
    'listening',
    'speaking',
    'reading',
    'writing',
    'vocabulary',
    'grammar'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1) Parent table: one periodic assessment record
-- users.specific_id có thể là text hoặc uuid tuỳ môi trường -> tạo bảng theo kiểu thực tế
DO $$
DECLARE
  v_specific_id_type text;
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    SELECT format_type(a.atttypid, a.atttypmod)
      INTO v_specific_id_type
    FROM pg_attribute a
    WHERE a.attrelid = 'public.users'::regclass
      AND a.attname = 'specific_id'
      AND a.attnum > 0
      AND NOT a.attisdropped;
  END IF;

  IF v_specific_id_type IS NULL THEN
    v_specific_id_type := 'text';
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS public.student_skill_assessments (
        assessment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slot_id text NULL,
        student_id %s NOT NULL REFERENCES public.users(specific_id) ON DELETE CASCADE,
        teacher_id %s NOT NULL REFERENCES public.users(specific_id) ON DELETE CASCADE,
        assessment_date timestamptz NOT NULL DEFAULT now(),
        source text NOT NULL DEFAULT 'teacher_periodic_test'
          CHECK (source IN ('teacher_periodic_test', 'session_evaluation', 'manual_adjustment')),
        general_comment text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    $f$, v_specific_id_type, v_specific_id_type);
  ELSE
    CREATE TABLE IF NOT EXISTS public.student_skill_assessments (
      assessment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slot_id text NULL,
      student_id text NOT NULL,
      teacher_id text NOT NULL,
      assessment_date timestamptz NOT NULL DEFAULT now(),
      source text NOT NULL DEFAULT 'teacher_periodic_test'
        CHECK (source IN ('teacher_periodic_test', 'session_evaluation', 'manual_adjustment')),
      general_comment text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Add FK to bookings only when bookings table exists in this environment
DO $$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'student_skill_assessments_slot_id_fkey'
        AND conrelid = 'public.student_skill_assessments'::regclass
    ) THEN
      ALTER TABLE public.student_skill_assessments
        ADD CONSTRAINT student_skill_assessments_slot_id_fkey
        FOREIGN KEY (slot_id)
        REFERENCES public.bookings(slot_id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Ensure at most one assessment per slot (if slot-based)
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_skill_assessments_slot_id
  ON public.student_skill_assessments(slot_id)
  WHERE slot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_skill_assessments_student_date
  ON public.student_skill_assessments(student_id, assessment_date DESC);

CREATE INDEX IF NOT EXISTS idx_student_skill_assessments_teacher
  ON public.student_skill_assessments(teacher_id);

-- 2) Child table: one score per skill in each assessment
CREATE TABLE IF NOT EXISTS public.student_skill_scores (
  assessment_id uuid NOT NULL REFERENCES public.student_skill_assessments(assessment_id) ON DELETE CASCADE,
  skill_key public.student_skill_key NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assessment_id, skill_key)
);

CREATE INDEX IF NOT EXISTS idx_student_skill_scores_skill_key
  ON public.student_skill_scores(skill_key);

-- 3) RLS
ALTER TABLE public.student_skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skill_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_skill_assessments'
      AND policyname = 'skill_assessments_read'
  ) THEN
    CREATE POLICY "skill_assessments_read"
      ON public.student_skill_assessments
      FOR SELECT TO authenticated
      USING (
        student_id::text = public.current_user_specific_id()
        OR teacher_id::text = public.current_user_specific_id()
        OR public.is_admin()
        OR public.current_user_role() = 'logistics'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_skill_assessments'
      AND policyname = 'skill_assessments_write_teacher_admin'
  ) THEN
    CREATE POLICY "skill_assessments_write_teacher_admin"
      ON public.student_skill_assessments
      FOR ALL TO authenticated
      USING (
        public.is_admin()
        OR public.current_user_role() = 'teacher'
      )
      WITH CHECK (
        public.is_admin()
        OR public.current_user_role() = 'teacher'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_skill_scores'
      AND policyname = 'skill_scores_read'
  ) THEN
    CREATE POLICY "skill_scores_read"
      ON public.student_skill_scores
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.student_skill_assessments a
          WHERE a.assessment_id = student_skill_scores.assessment_id
            AND (
              a.student_id::text = public.current_user_specific_id()
              OR a.teacher_id::text = public.current_user_specific_id()
              OR public.is_admin()
              OR public.current_user_role() = 'logistics'
            )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_skill_scores'
      AND policyname = 'skill_scores_write_teacher_admin'
  ) THEN
    CREATE POLICY "skill_scores_write_teacher_admin"
      ON public.student_skill_scores
      FOR ALL TO authenticated
      USING (
        public.is_admin()
        OR public.current_user_role() = 'teacher'
      )
      WITH CHECK (
        public.is_admin()
        OR public.current_user_role() = 'teacher'
      );
  END IF;
END $$;

-- 4) Backfill from legacy session_evaluations (if exists)
DO $$
BEGIN
  IF to_regclass('public.session_evaluations') IS NOT NULL THEN
    -- 4.1 Parent rows
    INSERT INTO public.student_skill_assessments (
      assessment_id,
      slot_id,
      student_id,
      teacher_id,
      assessment_date,
      source,
      general_comment,
      created_at
    )
    SELECT
      se.evaluation_id,
      se.slot_id,
      se.student_id,
      se.teacher_id,
      se.created_at,
      'session_evaluation',
      se.general_comment,
      se.created_at
    FROM public.session_evaluations se
    ON CONFLICT (assessment_id) DO NOTHING;

    -- 4.2 Skill score rows
    INSERT INTO public.student_skill_scores (assessment_id, skill_key, score)
    SELECT se.evaluation_id, 'listening'::public.student_skill_key, se.listening_score FROM public.session_evaluations se
    UNION ALL
    SELECT se.evaluation_id, 'speaking'::public.student_skill_key, se.speaking_score FROM public.session_evaluations se
    UNION ALL
    SELECT se.evaluation_id, 'reading'::public.student_skill_key, se.reading_score FROM public.session_evaluations se
    UNION ALL
    SELECT se.evaluation_id, 'writing'::public.student_skill_key, se.writing_score FROM public.session_evaluations se
    UNION ALL
    SELECT se.evaluation_id, 'vocabulary'::public.student_skill_key, se.vocabulary_score FROM public.session_evaluations se
    UNION ALL
    SELECT se.evaluation_id, 'grammar'::public.student_skill_key, se.grammar_score FROM public.session_evaluations se
    ON CONFLICT (assessment_id, skill_key) DO NOTHING;
  END IF;
END $$;

-- 5) Keep compatibility: any new write to session_evaluations syncs to normalized tables
CREATE OR REPLACE FUNCTION public.sync_session_evaluation_to_student_skills()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.student_skill_assessments (
    assessment_id,
    slot_id,
    student_id,
    teacher_id,
    assessment_date,
    source,
    general_comment,
    created_at
  )
  VALUES (
    NEW.evaluation_id,
    NEW.slot_id,
    NEW.student_id,
    NEW.teacher_id,
    COALESCE(NEW.created_at, now()),
    'session_evaluation',
    NEW.general_comment,
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (assessment_id) DO UPDATE
    SET slot_id = EXCLUDED.slot_id,
        student_id = EXCLUDED.student_id,
        teacher_id = EXCLUDED.teacher_id,
        assessment_date = EXCLUDED.assessment_date,
        general_comment = EXCLUDED.general_comment;

  INSERT INTO public.student_skill_scores (assessment_id, skill_key, score)
  VALUES
    (NEW.evaluation_id, 'listening', NEW.listening_score),
    (NEW.evaluation_id, 'speaking', NEW.speaking_score),
    (NEW.evaluation_id, 'reading', NEW.reading_score),
    (NEW.evaluation_id, 'writing', NEW.writing_score),
    (NEW.evaluation_id, 'vocabulary', NEW.vocabulary_score),
    (NEW.evaluation_id, 'grammar', NEW.grammar_score)
  ON CONFLICT (assessment_id, skill_key) DO UPDATE
    SET score = EXCLUDED.score;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.session_evaluations') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_session_eval_to_student_skills ON public.session_evaluations;
    CREATE TRIGGER trg_sync_session_eval_to_student_skills
    AFTER INSERT OR UPDATE ON public.session_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_session_evaluation_to_student_skills();
  END IF;
END $$;

-- 6) Unified RPC for FE charts/lookup
CREATE OR REPLACE FUNCTION public.get_student_skills(p_student_id text)
RETURNS TABLE(
  skill text,
  avg_score numeric,
  session_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH skill_keys AS (
    SELECT unnest(ARRAY[
      'listening'::text,
      'speaking'::text,
      'reading'::text,
      'writing'::text,
      'vocabulary'::text,
      'grammar'::text
    ]) AS skill
  ),
  agg AS (
    SELECT
      s.skill_key::text AS skill,
      ROUND(AVG(s.score)::numeric, 1) AS avg_score,
      COUNT(*)::int AS session_count
    FROM public.student_skill_scores s
    JOIN public.student_skill_assessments a
      ON a.assessment_id = s.assessment_id
    WHERE a.student_id::text = p_student_id
    GROUP BY s.skill_key
  )
  SELECT
    k.skill,
    COALESCE(a.avg_score, 0)::numeric AS avg_score,
    COALESCE(a.session_count, 0)::int AS session_count
  FROM skill_keys k
  LEFT JOIN agg a ON a.skill = k.skill
  ORDER BY CASE k.skill
    WHEN 'listening' THEN 1
    WHEN 'speaking' THEN 2
    WHEN 'reading' THEN 3
    WHEN 'writing' THEN 4
    WHEN 'vocabulary' THEN 5
    WHEN 'grammar' THEN 6
    ELSE 99
  END;
$$;
