
-- =========================================================
-- ENUMS
-- =========================================================
create type public.app_role as enum ('admin', 'logistics', 'teacher', 'student', 'care');
create type public.progress_status as enum ('active', 'frozen', 'expired');
create type public.class_type as enum ('online_1_1', 'offline_group');
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled_valid', 'cancelled_late');

-- =========================================================
-- USERS (linked 1:1 to auth.users by id)
-- =========================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  specific_id text not null unique,
  full_name text not null,
  email text not null unique,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Security-definer helper to fetch role without triggering recursive RLS
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.current_user_specific_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select specific_id from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create policy "users read self" on public.users
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "users insert self" on public.users
  for insert to authenticated
  with check (id = auth.uid());

create policy "users update self or admin" on public.users
  for update to authenticated
  using (id = auth.uid() or public.is_admin());

-- =========================================================
-- COURSES
-- =========================================================
create table public.courses (
  course_id text primary key,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);
alter table public.courses enable row level security;

create policy "courses read all" on public.courses for select to authenticated using (true);
create policy "courses admin write" on public.courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- STUDENT PROGRESS
-- =========================================================
create table public.student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references public.users(specific_id) on delete cascade,
  course_id text not null references public.courses(course_id) on delete restrict,
  total_sessions int not null default 15,
  remaining_sessions int not null default 15,
  status public.progress_status not null default 'active',
  freeze_start_date timestamptz,
  expiry_date timestamptz not null default (now() + interval '180 days'),
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);
alter table public.student_progress enable row level security;

create policy "progress read self or admin" on public.student_progress for select to authenticated
  using (student_id = public.current_user_specific_id() or public.is_admin() or public.current_user_role() in ('teacher','logistics'));
create policy "progress admin write" on public.student_progress for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- CLASSES
-- =========================================================
create table public.classes (
  class_id text primary key,
  course_id text not null references public.courses(course_id) on delete restrict,
  type public.class_type not null,
  teacher_id text references public.users(specific_id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.classes enable row level security;

create policy "classes read all auth" on public.classes for select to authenticated using (true);
create policy "classes admin write" on public.classes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Junction for offline group enrollment
create table public.class_enrollments (
  class_id text not null references public.classes(class_id) on delete cascade,
  student_id text not null references public.users(specific_id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (class_id, student_id)
);
alter table public.class_enrollments enable row level security;
create policy "enrollments read self/admin" on public.class_enrollments for select to authenticated
  using (student_id = public.current_user_specific_id() or public.is_admin() or public.current_user_role() in ('teacher','logistics'));
create policy "enrollments admin write" on public.class_enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- BOOKINGS
-- =========================================================
create table public.bookings (
  slot_id text primary key,
  class_id text not null references public.classes(class_id) on delete cascade,
  student_id text not null references public.users(specific_id) on delete cascade,
  teacher_id text references public.users(specific_id) on delete set null,
  session_date timestamptz not null,
  status public.booking_status not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;

create policy "bookings read self" on public.bookings for select to authenticated
  using (
    student_id = public.current_user_specific_id()
    or teacher_id = public.current_user_specific_id()
    or public.is_admin()
    or public.current_user_role() = 'logistics'
  );

-- Inserts/updates are mediated by SECURITY DEFINER functions below, but we still
-- allow students to create their own pending slots and admins to manage everything.
create policy "bookings insert self" on public.bookings for insert to authenticated
  with check (student_id = public.current_user_specific_id() or public.is_admin());
create policy "bookings update admin" on public.bookings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- TEACHER PENALTIES
-- =========================================================
create table public.teacher_penalties (
  penalty_id uuid primary key default gen_random_uuid(),
  teacher_id text not null references public.users(specific_id) on delete cascade,
  slot_id text not null references public.bookings(slot_id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.teacher_penalties enable row level security;

create policy "penalties read self/admin" on public.teacher_penalties for select to authenticated
  using (teacher_id = public.current_user_specific_id() or public.is_admin());
create policy "penalties admin write" on public.teacher_penalties for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- AUDIT LOGS
-- =========================================================
create table public.audit_logs (
  log_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_specific_id text,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;

create policy "audit admin only" on public.audit_logs for select to authenticated
  using (public.is_admin());
-- writes occur exclusively through SECURITY DEFINER functions

create or replace function public.log_action(
  p_action text,
  p_details jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs(user_id, user_specific_id, action, details)
  values (auth.uid(), public.current_user_specific_id(), p_action, p_details);
end;
$$;

-- =========================================================
-- BUSINESS LOGIC
-- =========================================================

-- Rule A.1: Teacher claims a pending 1-1 slot
create or replace function public.claim_slot(p_slot_id text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_specific text;
  v_role public.app_role;
  v_booking public.bookings;
begin
  v_teacher_specific := public.current_user_specific_id();
  v_role := public.current_user_role();
  if v_role <> 'teacher' then
    raise exception 'Only teachers can claim slots';
  end if;

  update public.bookings
     set teacher_id = v_teacher_specific,
         status = 'confirmed'
   where slot_id = p_slot_id
     and status = 'pending'
     and teacher_id is null
  returning * into v_booking;

  if v_booking.slot_id is null then
    raise exception 'Slot % is not available to claim', p_slot_id;
  end if;

  perform public.log_action('claim_slot',
    jsonb_build_object('slot_id', p_slot_id, 'teacher_id', v_teacher_specific));
  return v_booking;
end;
$$;

-- Rule A.2: Student cancels their booking with 6-hour validation
create or replace function public.student_cancel_booking(p_slot_id text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text := public.current_user_specific_id();
  v_booking public.bookings;
  v_class public.classes;
  v_hours numeric;
  v_new_status public.booking_status;
begin
  select * into v_booking from public.bookings where slot_id = p_slot_id;
  if v_booking.slot_id is null then
    raise exception 'Booking % not found', p_slot_id;
  end if;
  if v_booking.student_id <> v_caller and not public.is_admin() then
    raise exception 'You cannot cancel another student''s booking';
  end if;
  if v_booking.status not in ('pending','confirmed') then
    raise exception 'Booking is already %', v_booking.status;
  end if;

  v_hours := extract(epoch from (v_booking.session_date - now())) / 3600.0;

  if v_hours >= 6 then
    v_new_status := 'cancelled_valid';
  else
    v_new_status := 'cancelled_late';
  end if;

  update public.bookings
     set status = v_new_status
   where slot_id = p_slot_id
  returning * into v_booking;

  if v_new_status = 'cancelled_late' then
    select * into v_class from public.classes where class_id = v_booking.class_id;
    update public.student_progress
       set remaining_sessions = greatest(remaining_sessions - 1, 0)
     where student_id = v_booking.student_id
       and course_id = v_class.course_id;
  end if;

  perform public.log_action('student_cancel_booking',
    jsonb_build_object(
      'slot_id', p_slot_id,
      'hours_until_session', v_hours,
      'new_status', v_new_status
    ));
  return v_booking;
end;
$$;

-- Rule A.3: Teacher cancels — penalty if < 6h
create or replace function public.teacher_cancel_booking(p_slot_id text, p_reason text default 'Teacher cancellation')
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text := public.current_user_specific_id();
  v_booking public.bookings;
  v_hours numeric;
  v_late boolean;
begin
  select * into v_booking from public.bookings where slot_id = p_slot_id;
  if v_booking.slot_id is null then
    raise exception 'Booking % not found', p_slot_id;
  end if;
  if v_booking.teacher_id <> v_caller and not public.is_admin() then
    raise exception 'You cannot cancel a slot you do not teach';
  end if;
  if v_booking.status not in ('pending','confirmed') then
    raise exception 'Booking is already %', v_booking.status;
  end if;

  v_hours := extract(epoch from (v_booking.session_date - now())) / 3600.0;
  v_late := v_hours < 6;

  -- Slot returns to pending pool, teacher detached
  update public.bookings
     set status = 'pending',
         teacher_id = null
   where slot_id = p_slot_id
  returning * into v_booking;

  if v_late then
    insert into public.teacher_penalties(teacher_id, slot_id, reason)
    values (v_caller, p_slot_id,
            coalesce(p_reason,'') || ' (cancelled ' || round(v_hours,2)::text || 'h before session)');
  end if;

  perform public.log_action('teacher_cancel_booking',
    jsonb_build_object(
      'slot_id', p_slot_id,
      'hours_until_session', v_hours,
      'penalty_issued', v_late
    ));
  return v_booking;
end;
$$;

-- Rule B.1: Freeze a course
create or replace function public.freeze_course(p_student_id text, p_course_id text)
returns public.student_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text := public.current_user_specific_id();
  v_row public.student_progress;
begin
  if p_student_id <> v_caller and not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  update public.student_progress
     set status = 'frozen',
         freeze_start_date = now()
   where student_id = p_student_id and course_id = p_course_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Progress record not found';
  end if;

  perform public.log_action('freeze_course',
    jsonb_build_object('student_id', p_student_id, 'course_id', p_course_id));
  return v_row;
end;
$$;

create or replace function public.unfreeze_course(p_student_id text, p_course_id text)
returns public.student_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text := public.current_user_specific_id();
  v_row public.student_progress;
begin
  if p_student_id <> v_caller and not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  update public.student_progress
     set status = 'active',
         freeze_start_date = null
   where student_id = p_student_id and course_id = p_course_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Progress record not found';
  end if;

  perform public.log_action('unfreeze_course',
    jsonb_build_object('student_id', p_student_id, 'course_id', p_course_id));
  return v_row;
end;
$$;

-- Rule B.2: Background expirer for 30-day freeze
create or replace function public.expire_stale_freezes()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  with updated as (
    update public.student_progress
       set status = 'expired',
           remaining_sessions = 0
     where status = 'frozen'
       and freeze_start_date is not null
       and now() - freeze_start_date > interval '30 days'
    returning id
  )
  select count(*) into v_count from updated;

  if v_count > 0 then
    perform public.log_action('expire_stale_freezes',
      jsonb_build_object('records_expired', v_count));
  end if;
  return v_count;
end;
$$;

-- Rule C.1: Admin assigns student to offline class
create or replace function public.assign_student_to_offline_class(p_student_id text, p_class_id text)
returns public.class_enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.classes;
  v_row public.class_enrollments;
begin
  if not public.is_admin() then
    raise exception 'Only admins can assign students';
  end if;
  select * into v_class from public.classes where class_id = p_class_id;
  if v_class.class_id is null then
    raise exception 'Class % not found', p_class_id;
  end if;
  if v_class.type <> 'offline_group' then
    raise exception 'Class % is not an offline group class', p_class_id;
  end if;

  insert into public.class_enrollments(class_id, student_id)
  values (p_class_id, p_student_id)
  on conflict (class_id, student_id) do nothing
  returning * into v_row;

  perform public.log_action('assign_student_to_offline_class',
    jsonb_build_object('student_id', p_student_id, 'class_id', p_class_id));

  if v_row.class_id is null then
    select * into v_row from public.class_enrollments
      where class_id = p_class_id and student_id = p_student_id;
  end if;
  return v_row;
end;
$$;

-- Auto-create public.users row when a new auth.users is created
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_specific text;
  v_full_name text;
  v_role public.app_role;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1));
  v_role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'student');
  v_specific := coalesce(
    new.raw_user_meta_data->>'specific_id',
    case v_role
      when 'student' then 'HV-' || to_char(now(),'YY') || '-' || lpad((floor(random()*9999)+1)::text,4,'0')
      when 'teacher' then 'GV-' || to_char(now(),'YY') || '-' || lpad((floor(random()*9999)+1)::text,4,'0')
      when 'logistics' then 'LG-' || to_char(now(),'YY') || '-' || lpad((floor(random()*9999)+1)::text,4,'0')
      when 'care' then 'CS-' || to_char(now(),'YY') || '-' || lpad((floor(random()*9999)+1)::text,4,'0')
      else 'AD-' || to_char(now(),'YY') || '-' || lpad((floor(random()*9999)+1)::text,4,'0')
    end
  );

  insert into public.users(id, specific_id, full_name, email, role)
  values (new.id, v_specific, v_full_name, new.email, v_role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =========================================================
-- SEED COURSES
-- =========================================================
insert into public.courses(course_id, title, description) values
 ('KH-HSK1','HSK 1','Sơ cấp 1 - 150 từ vựng nền tảng'),
 ('KH-HSK2','HSK 2','Sơ cấp 2 - 300 từ vựng giao tiếp cơ bản'),
 ('KH-HSK3','HSK 3','Trung cấp 1 - 600 từ vựng'),
 ('KH-HSK4','HSK 4','Trung cấp 2 - 1200 từ vựng'),
 ('KH-HSK5','HSK 5','Cao cấp 1 - 2500 từ vựng'),
 ('KH-HSK6','HSK 6','Cao cấp 2 - 5000+ từ vựng')
on conflict do nothing;
