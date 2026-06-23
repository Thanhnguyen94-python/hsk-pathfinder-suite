-- Session-level teacher ratings from students
-- Supports both booking rows and enrollment-generated class sessions.

CREATE TABLE IF NOT EXISTS public.teacher_session_ratings (
  rating_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  teacher_id text NOT NULL,
  class_id text NOT NULL,
  session_date timestamptz NOT NULL,
  slot_id text,
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_session_ratings_student_session
  ON public.teacher_session_ratings(student_id, class_id, session_date);

CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_session_ratings_slot
  ON public.teacher_session_ratings(slot_id)
  WHERE slot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teacher_session_ratings_teacher
  ON public.teacher_session_ratings(teacher_id);

ALTER TABLE public.teacher_session_ratings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teacher_session_ratings'
      AND policyname = 'teacher_session_ratings read auth'
  ) THEN
    CREATE POLICY "teacher_session_ratings read auth"
      ON public.teacher_session_ratings
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teacher_session_ratings'
      AND policyname = 'teacher_session_ratings insert own'
  ) THEN
    CREATE POLICY "teacher_session_ratings insert own"
      ON public.teacher_session_ratings
      FOR INSERT
      TO authenticated
      WITH CHECK (student_id = public.current_user_specific_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teacher_session_ratings'
      AND policyname = 'teacher_session_ratings update own'
  ) THEN
    CREATE POLICY "teacher_session_ratings update own"
      ON public.teacher_session_ratings
      FOR UPDATE
      TO authenticated
      USING (student_id = public.current_user_specific_id())
      WITH CHECK (student_id = public.current_user_specific_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teacher_session_ratings'
      AND policyname = 'teacher_session_ratings admin manage'
  ) THEN
    CREATE POLICY "teacher_session_ratings admin manage"
      ON public.teacher_session_ratings
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.teacher_rating_stats (
  teacher_id text PRIMARY KEY,
  avg_stars numeric(4,2) NOT NULL DEFAULT 0,
  total_reviews int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_rating_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teacher_rating_stats'
      AND policyname = 'teacher_rating_stats read auth'
  ) THEN
    CREATE POLICY "teacher_rating_stats read auth"
      ON public.teacher_rating_stats
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teacher_rating_stats'
      AND policyname = 'teacher_rating_stats admin manage'
  ) THEN
    CREATE POLICY "teacher_rating_stats admin manage"
      ON public.teacher_rating_stats
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.refresh_teacher_rating_stats(p_teacher_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric(4,2);
  v_total int;
BEGIN
  SELECT COALESCE(ROUND(AVG(stars)::numeric, 2), 0), COUNT(*)::int
    INTO v_avg, v_total
  FROM public.teacher_session_ratings
  WHERE teacher_id = p_teacher_id;

  IF v_total = 0 THEN
    DELETE FROM public.teacher_rating_stats WHERE teacher_id = p_teacher_id;
    RETURN;
  END IF;

  INSERT INTO public.teacher_rating_stats(teacher_id, avg_stars, total_reviews, updated_at)
  VALUES (p_teacher_id, v_avg, v_total, now())
  ON CONFLICT (teacher_id)
  DO UPDATE
     SET avg_stars = EXCLUDED.avg_stars,
         total_reviews = EXCLUDED.total_reviews,
         updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_teacher_rating_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_teacher_rating_stats(NEW.teacher_id);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_teacher_rating_stats(OLD.teacher_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_teacher_session_ratings_sync_stats
  ON public.teacher_session_ratings;

CREATE TRIGGER trg_teacher_session_ratings_sync_stats
  AFTER INSERT OR UPDATE OR DELETE
  ON public.teacher_session_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_teacher_rating_stats();

-- Backfill from legacy teacher_ratings + bookings when possible.
DO $$
BEGIN
  IF to_regclass('public.teacher_ratings') IS NOT NULL
     AND to_regclass('public.bookings') IS NOT NULL THEN
    INSERT INTO public.teacher_session_ratings(
      student_id,
      teacher_id,
      class_id,
      session_date,
      slot_id,
      stars,
      comment,
      created_at,
      updated_at
    )
    SELECT
      tr.student_id,
      tr.teacher_id,
      b.class_id,
      b.session_date,
      tr.slot_id,
      tr.stars,
      tr.comment,
      tr.created_at,
      tr.created_at
    FROM public.teacher_ratings tr
    JOIN public.bookings b ON b.slot_id = tr.slot_id
    WHERE b.class_id IS NOT NULL
      AND b.session_date IS NOT NULL
    ON CONFLICT (student_id, class_id, session_date)
    DO UPDATE SET
      stars = EXCLUDED.stars,
      comment = EXCLUDED.comment,
      slot_id = COALESCE(EXCLUDED.slot_id, public.teacher_session_ratings.slot_id),
      updated_at = now();
  END IF;
END$$;

-- Rebuild stats after backfill
INSERT INTO public.teacher_rating_stats(teacher_id, avg_stars, total_reviews, updated_at)
SELECT
  teacher_id,
  ROUND(AVG(stars)::numeric, 2) AS avg_stars,
  COUNT(*)::int AS total_reviews,
  now()
FROM public.teacher_session_ratings
GROUP BY teacher_id
ON CONFLICT (teacher_id)
DO UPDATE SET
  avg_stars = EXCLUDED.avg_stars,
  total_reviews = EXCLUDED.total_reviews,
  updated_at = now();
