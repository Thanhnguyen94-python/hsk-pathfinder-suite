
-- ===== Teacher ratings =====
CREATE TABLE public.teacher_ratings (
  rating_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  teacher_id text NOT NULL,
  slot_id text NOT NULL UNIQUE,
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ratings_teacher ON public.teacher_ratings(teacher_id);

ALTER TABLE public.teacher_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings read all auth" ON public.teacher_ratings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ratings insert own" ON public.teacher_ratings
  FOR INSERT TO authenticated
  WITH CHECK (student_id = public.current_user_specific_id());

CREATE POLICY "ratings admin manage" ON public.teacher_ratings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Validation trigger: only allow rating when the booking is confirmed and the session has happened
CREATE OR REPLACE FUNCTION public.validate_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b public.bookings;
BEGIN
  SELECT * INTO v_b FROM public.bookings WHERE slot_id = NEW.slot_id;
  IF v_b.slot_id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_b.student_id <> NEW.student_id THEN RAISE EXCEPTION 'Not your booking'; END IF;
  IF v_b.teacher_id IS NULL OR v_b.teacher_id <> NEW.teacher_id THEN
    RAISE EXCEPTION 'Teacher mismatch';
  END IF;
  IF v_b.session_date > now() THEN RAISE EXCEPTION 'Class not completed yet'; END IF;
  IF v_b.status NOT IN ('confirmed','pending') THEN
    RAISE EXCEPTION 'Cannot rate cancelled booking';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_validate_rating
  BEFORE INSERT ON public.teacher_ratings
  FOR EACH ROW EXECUTE FUNCTION public.validate_rating();

-- Top teachers (public homepage)
CREATE OR REPLACE FUNCTION public.get_top_teachers(p_limit int DEFAULT 3)
RETURNS TABLE(teacher_id text, full_name text, avg_stars numeric, total_reviews bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.specific_id, u.full_name,
         ROUND(AVG(r.stars)::numeric, 2) AS avg_stars,
         COUNT(*)::bigint AS total_reviews
  FROM public.teacher_ratings r
  JOIN public.users u ON u.specific_id = r.teacher_id
  WHERE u.role = 'teacher'
  GROUP BY u.specific_id, u.full_name
  HAVING COUNT(*) >= 1
  ORDER BY avg_stars DESC, total_reviews DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_top_teachers(int) TO anon, authenticated;

-- Teacher analytics (admin)
CREATE OR REPLACE FUNCTION public.get_teacher_analytics()
RETURNS TABLE(teacher_id text, full_name text, avg_stars numeric, total_reviews bigint, total_penalties bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.specific_id, u.full_name,
         COALESCE(ROUND(AVG(r.stars)::numeric, 2), 0) AS avg_stars,
         COUNT(r.rating_id)::bigint AS total_reviews,
         (SELECT COUNT(*) FROM public.teacher_penalties p WHERE p.teacher_id = u.specific_id)::bigint AS total_penalties
  FROM public.users u
  LEFT JOIN public.teacher_ratings r ON r.teacher_id = u.specific_id
  WHERE u.role = 'teacher'
  GROUP BY u.specific_id, u.full_name
  ORDER BY avg_stars DESC;
$$;

-- ===== HSK curriculum =====
CREATE TABLE public.hsk_chapters (
  chapter_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id text NOT NULL,
  title text NOT NULL,
  content text,
  pdf_url text,
  file_urls text[],
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hsk_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chapters read auth" ON public.hsk_chapters
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "chapters write logistics/admin" ON public.hsk_chapters
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.current_user_role() = 'logistics')
  WITH CHECK (public.is_admin() OR public.current_user_role() = 'logistics');

-- ===== Assignments =====
CREATE TABLE public.assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id text NOT NULL,
  title text NOT NULL,
  description text,
  deadline timestamptz NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments read auth" ON public.assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "assignments write logistics/admin" ON public.assignments
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.current_user_role() = 'logistics')
  WITH CHECK (public.is_admin() OR public.current_user_role() = 'logistics');

-- ===== Submissions =====
CREATE TABLE public.assignment_submissions (
  submission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(assignment_id) ON DELETE CASCADE,
  student_id text NOT NULL,
  submission_text text,
  submission_url text,
  score numeric,
  reviewer_comment text,
  reviewed_by text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE UNIQUE INDEX idx_one_submission ON public.assignment_submissions(assignment_id, student_id);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions read self/staff" ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (
    student_id = public.current_user_specific_id()
    OR public.is_admin()
    OR public.current_user_role() IN ('logistics','teacher')
  );
CREATE POLICY "submissions insert self" ON public.assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (student_id = public.current_user_specific_id());
CREATE POLICY "submissions update self or staff" ON public.assignment_submissions
  FOR UPDATE TO authenticated
  USING (
    student_id = public.current_user_specific_id()
    OR public.is_admin()
    OR public.current_user_role() = 'logistics'
  );
