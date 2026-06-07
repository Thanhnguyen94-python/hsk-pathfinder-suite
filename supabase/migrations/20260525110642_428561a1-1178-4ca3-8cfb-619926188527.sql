
-- 1. Schema additions
ALTER TABLE public.student_progress
  ADD COLUMN IF NOT EXISTS learning_mode text NOT NULL DEFAULT 'online'
    CHECK (learning_mode IN ('online','offline'));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS session_end_date timestamptz;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS birth_year integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','disabled'));

-- 2. Recurring booking RPC (student-scoped)
CREATE OR REPLACE FUNCTION public.create_recurring_bookings(
  p_class_id text,
  p_course_id text,
  p_start_date date,
  p_end_date date,
  p_start_time time,
  p_end_time time,
  p_weekdays int[]   -- 0=Sun ... 6=Sat
) RETURNS TABLE(created int, skipped int, slot_ids text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_student text := public.current_user_specific_id();
  v_day date;
  v_session_start timestamptz;
  v_session_end timestamptz;
  v_slot text;
  v_created int := 0;
  v_skipped int := 0;
  v_ids text[] := ARRAY[]::text[];
  v_remaining int;
BEGIN
  IF v_student IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_end_date < p_start_date THEN RAISE EXCEPTION 'End date before start date'; END IF;
  IF p_end_time <= p_start_time THEN RAISE EXCEPTION 'End time must be after start time'; END IF;

  SELECT remaining_sessions INTO v_remaining
    FROM public.student_progress
   WHERE student_id = v_student AND course_id = p_course_id;
  IF v_remaining IS NULL THEN RAISE EXCEPTION 'No active progress for course %', p_course_id; END IF;

  v_day := p_start_date;
  WHILE v_day <= p_end_date LOOP
    IF EXTRACT(DOW FROM v_day)::int = ANY(p_weekdays) THEN
      IF v_created >= v_remaining THEN
        v_skipped := v_skipped + 1;
      ELSE
        v_session_start := (v_day::text || ' ' || p_start_time::text)::timestamptz;
        v_session_end   := (v_day::text || ' ' || p_end_time::text)::timestamptz;
        v_slot := 'SLOT-' || to_char(v_day,'YYYYMMDD') || '-' || to_char(p_start_time,'HH24MI')
                  || '-' || substr(md5(random()::text),1,5);
        BEGIN
          INSERT INTO public.bookings(slot_id, class_id, student_id, session_date, session_end_date, status)
          VALUES (v_slot, p_class_id, v_student, v_session_start, v_session_end, 'pending');
          v_created := v_created + 1;
          v_ids := v_ids || v_slot;
        EXCEPTION WHEN unique_violation THEN
          v_skipped := v_skipped + 1;
        END;
      END IF;
    END IF;
    v_day := v_day + 1;
  END LOOP;

  PERFORM public.log_action('create_recurring_bookings',
    jsonb_build_object('class_id', p_class_id, 'course_id', p_course_id,
      'created', v_created, 'skipped', v_skipped,
      'start_date', p_start_date, 'end_date', p_end_date));

  RETURN QUERY SELECT v_created, v_skipped, v_ids;
END $$;

-- 3. Care directory: students
CREATE OR REPLACE FUNCTION public.get_care_students()
RETURNS TABLE(
  specific_id text, full_name text, email text,
  phone text, birth_year integer,
  status text, created_at timestamptz,
  courses jsonb
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.current_user_role() = 'logistics') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT u.specific_id, u.full_name, u.email,
    u.phone,
    u.birth_year,
    u.status, u.created_at,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'course_id', sp.course_id,
        'remaining', sp.remaining_sessions,
        'total', sp.total_sessions,
        'status', sp.status,
        'mode', sp.learning_mode
      )) FROM public.student_progress sp WHERE sp.student_id = u.specific_id
    ), '[]'::jsonb)
  FROM public.users u
  WHERE u.role = 'student'
  ORDER BY u.created_at DESC;
END $$;

-- 4. Care directory: staff
CREATE OR REPLACE FUNCTION public.get_care_staff()
RETURNS TABLE(
  specific_id text, full_name text, email text, role app_role,
  phone text, birth_year integer,
  status text, created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.current_user_role() = 'logistics') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT u.specific_id, u.full_name, u.email, u.role,
    u.phone,
    u.birth_year,
    u.status, u.created_at
  FROM public.users u
  WHERE u.role IN ('teacher','logistics','admin')
  ORDER BY u.role, u.created_at DESC;
END $$;

-- 5. Reveal sensitive field — admin only, audit logged
CREATE OR REPLACE FUNCTION public.reveal_user_pii(p_specific_id text, p_field text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_val text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_field NOT IN ('phone','birth_year') THEN RAISE EXCEPTION 'Field not allowed'; END IF;

  IF p_field = 'phone' THEN
    SELECT phone INTO v_val FROM public.users WHERE specific_id = p_specific_id;
  ELSE
    SELECT birth_year::text INTO v_val FROM public.users WHERE specific_id = p_specific_id;
  END IF;

  PERFORM public.log_action('reveal_pii',
    jsonb_build_object('target', p_specific_id, 'field', p_field));
  RETURN v_val;
END $$;
