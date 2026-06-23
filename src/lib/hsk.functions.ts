import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AppRole = "admin" | "logistics" | "teacher" | "student" | "care";

const ROLE_ALIASES: Record<string, AppRole> = {
  admin: "admin",
  logistics: "logistics",
  teacher: "teacher",
  student: "student",
  care: "care",
};

const normalizeRole = (role: unknown): AppRole | string => {
  const value = String(role ?? "").trim().toLowerCase();
  return ROLE_ALIASES[value] ?? value;
};

const getCurrentUserRow = async (context: any) => {
  if (!context?.userId) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, role, specific_id, full_name, email, status, student_account_type")
    .eq("id", context.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error(`User profile not found in public.users for auth ID: ${context.userId}`);
  }

  return data;
};

const assertAdminContext = async (context: any) => {
  const me = await getCurrentUserRow(context);
  if (normalizeRole(me.role) !== "admin") {
    throw new Error("Forbidden");
  }
  return me;
};

const assertAdminOrCareContext = async (context: any) => {
  const me = await getCurrentUserRow(context);
  const role = normalizeRole(me.role);
  if (role !== "admin" && role !== "care") {
    throw new Error("Forbidden");
  }
  return me;
};

// ---------- Bookings ----------

export const claimSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slotId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("claim_slot", {
      p_slot_id: data.slotId,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const studentCancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slotId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("student_cancel_booking", {
      p_slot_id: data.slotId,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const teacherCancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ slotId: z.string().min(1), reason: z.string().max(500).optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("teacher_cancel_booking", {
      p_slot_id: data.slotId,
      p_reason: data.reason ?? "Teacher cancellation",
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slotId: z.string().min(1),
        classId: z.string().min(1),
        sessionDate: z.string(), // ISO
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: me, error: meErr } = await supabase
      .from("users")
      .select("specific_id")
      .single();
    if (meErr || !me) throw new Error(meErr?.message ?? "User not found");

    const { data: row, error } = await supabase
      .from("bookings")
      .insert({
        slot_id: data.slotId,
        class_id: data.classId,
        student_id: me.specific_id,
        session_date: data.sessionDate,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Freeze ----------

export const freezeCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ studentId: z.string().min(1), courseId: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("freeze_course", {
      p_student_id: data.studentId,
      p_course_id: data.courseId,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const unfreezeCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ studentId: z.string().min(1), courseId: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("unfreeze_course", {
      p_student_id: data.studentId,
      p_course_id: data.courseId,
    });
    if (error) throw new Error(error.message);
    return row;
  });

// Run on each authenticated session/login to enforce 30-day expiry.
export const expireStaleFreezes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("expire_stale_freezes");
    if (error) throw new Error(error.message);
    return { expired: data ?? 0 };
  });

// ---------- Admin ----------

export const assignStudentToOfflineClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ studentId: z.string().min(1), classId: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Perform the enrollment directly via the service-role client to avoid
    // RPC/schema-cache issues that can occur when calling DB functions via
    // different sessions. This mirrors the behavior of the DB function
    // `assign_student_to_offline_class` but does the work here so we can be
    // robust in dev environments.
    // Note: don't rely on querying information_schema via the REST client
    // (some Supabase/PostgREST setups hide it). Instead, attempt the
    // enrollment operation and map undefined-table errors to a clear
    // actionable message directing the operator to run DB migrations.
    // Validate class exists and is offline_group
    const { data: cls, error: clsErr } = await supabaseAdmin
      .from("classes")
      .select("*")
      .eq("class_id", data.classId)
      .maybeSingle();
    if (clsErr) throw new Error(clsErr.message);
    if (!cls || !cls.class_id) throw new Error(`Class ${data.classId} not found`);
    // Validate target user exists and is a student.
    // Accept input as specific_id/id/staff_code, then normalize to specific_id when possible.
    const rawStudentId = String(data.studentId ?? "").trim();
    const { data: targetUser, error: targetErr } = await supabaseAdmin
      .from("users")
      .select("id, specific_id, role, staff_code")
      .or(`specific_id.eq.${rawStudentId},id.eq.${rawStudentId},staff_code.eq.${rawStudentId}`)
      .maybeSingle();
    if (targetErr) throw new Error(targetErr.message);
    if (!targetUser) throw new Error("Không tìm thấy học viên với mã đã nhập");
    if (targetUser.role !== "student") {
      throw new Error("Chỉ được thêm tài khoản có vai trò học viên vào lớp học");
    }
    const normalizedStudentId = String(targetUser.specific_id ?? targetUser.id ?? rawStudentId);
    // NOTE: previously we required cls.type === 'offline_group'. Relax that
    // restriction so admins can assign students to classes regardless of the
    // stored type value (some environments/migrations use different type
    // names). If you want to re-enable strict checking, restore the guard.

    // Try to insert enrollment (allow conflict)
    const { data: ins, error: insErr } = await supabaseAdmin
      .from("class_enrollments")
      .insert({ class_id: data.classId, student_id: normalizedStudentId })
      .select()
      .maybeSingle();
    // Map missing table errors to a helpful message
    if (insErr) {
      const m = String(insErr.message ?? insErr);
      if (m.includes('Could not find the table') || m.includes('does not exist') || m.includes('relation') || m.includes('42P01')) {
        throw new Error("Database schema missing: table 'public.class_enrollments' not found. Run the SQL migrations in supabase/migrations to create enrollment tables and triggers.");
      }
    }
    let v_row = ins ?? null;
    if (insErr) {
      // If conflict or other error, attempt to read existing enrollment
      const { data: existing, error: exErr } = await supabaseAdmin
        .from("class_enrollments")
        .select("*")
        .match({ class_id: data.classId, student_id: normalizedStudentId })
        .maybeSingle();
      if (exErr) {
        const m = String(exErr.message ?? exErr);
        if (m.includes('Could not find the table') || m.includes('does not exist') || m.includes('relation') || m.includes('42P01')) {
          throw new Error("Database schema missing: table 'public.class_enrollments' not found. Run the SQL migrations in supabase/migrations to create enrollment tables and triggers.");
        }
        throw new Error(exErr.message);
      }
      v_row = existing ?? null;
    }

    // After inserting (or finding existing) enrollment, ensure classes.current_students
    // reflects the actual number of enrollments. Use a reliable count query so we
    // don't double-increment when DB triggers are present.
    if (ins || v_row) {
      try {
        // Use head:true to request count without returning rows
        const { count } = await supabaseAdmin
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', data.classId);
        const newCount = Number(count ?? 0) || 0;
        await supabaseAdmin.from('classes').update({ current_students: newCount }).eq('class_id', data.classId);
      } catch (e) {
        // ignore failures; trigger-based counting is preferred
      }
    }

    // insert audit log (mirrors public.log_action)
    try {
      await supabaseAdmin.from("audit_logs").insert({
        user_id: context.userId ?? null,
        user_specific_id: null,
        action: "assign_student_to_offline_class",
        details: { student_id: normalizedStudentId, class_id: data.classId },
      });
    } catch (lErr: any) {
      // ignore logging errors
    }

    // write class_events (student_added)
    try {
      const { data: actor } = await supabaseAdmin.from("users").select("specific_id").eq("id", context.userId).maybeSingle();
      await supabaseAdmin.from("class_events").insert({
        class_id: data.classId,
        event_type: "student_added",
        actor_id: context.userId ?? null,
        actor_specific_id: actor?.specific_id ?? null,
        details: { student_id: normalizedStudentId, note: "Admin gán học viên vào lớp" },
        new_value: { student_id: normalizedStudentId, class_id: data.classId },
        source: "app",
      });
    } catch (evErr) {
      // ignore class_events errors — table may not exist until migration runs
    }

    return v_row;
  });


export const getAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [logs, users] = await Promise.all([
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("users").select("specific_id, full_name"),
    ]);
    if (logs.error) throw new Error(logs.error.message);
    const nameMap = new Map((users.data ?? []).map((u: any) => [u.specific_id, u.full_name]));
    return (logs.data ?? []).map((l: any) => ({
      ...l,
      user_full_name: l.user_specific_id ? nameMap.get(l.user_specific_id) ?? null : null,
    }));
  });


// ---------- Auth role lookup (bypasses RLS via service role) ----------

/**
 * Đọc role của user hiện tại bằng supabaseAdmin (service key) — bypass RLS.
 * Dùng sau khi signInWithPassword để lấy role và redirect đúng dashboard.
 */
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("role, full_name, specific_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      role: normalizeRole(data?.role) || "student",
      fullName: (data?.full_name as string) ?? null,
      specificId: (data?.specific_id as string) ?? null,
    };
  });

// ---------- Dashboard reads ----------

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, specific_id, staff_code, full_name, email, role, student_account_type")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const claims = (context?.claims ?? {}) as any;
    const claimEmail = typeof claims?.email === "string" ? claims.email : null;
    const claimRole =
      typeof claims?.user_metadata?.role === "string"
        ? claims.user_metadata.role
        : typeof claims?.app_metadata?.role === "string"
          ? claims.app_metadata.role
          : null;
    const claimFullName =
      typeof claims?.user_metadata?.full_name === "string"
        ? claims.user_metadata.full_name
        : typeof claims?.user_metadata?.name === "string"
          ? claims.user_metadata.name
          : null;

    return {
      id: data?.id ?? context.userId,
      specific_id: data?.specific_id ?? null,
      staff_code: data?.staff_code ?? null,
      full_name: data?.full_name ?? claimFullName,
      email: data?.email ?? claimEmail,
      role: normalizeRole(data?.role ?? claimRole ?? "student"),
      student_account_type: data?.student_account_type ?? null,
    };
  });

export const getStudentDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("specific_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me?.specific_id) throw new Error("User profile not found");

    const [progress, bookings] = await Promise.all([
      supabaseAdmin
        .from("student_progress")
        .select("*")
        .eq("student_id", me.specific_id),
      supabaseAdmin
        .from("bookings")
        .select("*")
        .eq("student_id", me.specific_id)
        .order("session_date", { ascending: true })
        .limit(200),
    ]);

    const isMissingTableError = (message: string) =>
      message.includes("Could not find the table") ||
      message.includes("does not exist") ||
      message.includes("42P01");

    if (progress.error && !isMissingTableError(String(progress.error.message ?? progress.error))) {
      throw new Error(progress.error.message);
    }
    if (bookings.error && !isMissingTableError(String(bookings.error.message ?? bookings.error))) {
      throw new Error(bookings.error.message);
    }

    // Try richest enrollment payload first; fallback to schema-tolerant shapes.
    let enrollmentsRows: any[] = [];
    {
      const rich = await supabaseAdmin
        .from("class_enrollments")
        .select(`class_id, enrolled_at, classes ( class_name, course_id, type, teacher_id, start_date, end_date, start_time, end_time, schedule_days )`)
        .eq("student_id", me.specific_id);

      if (!rich.error) {
        enrollmentsRows = rich.data ?? [];
      } else {
        const basicJoin = await supabaseAdmin
          .from("class_enrollments")
          .select(`class_id, enrolled_at, classes(*)`)
          .eq("student_id", me.specific_id);

        if (!basicJoin.error) {
          enrollmentsRows = basicJoin.data ?? [];
        } else {
          const bare = await supabaseAdmin
            .from("class_enrollments")
            .select("class_id, enrolled_at")
            .eq("student_id", me.specific_id);

          if (bare.error && !isMissingTableError(String(bare.error.message ?? bare.error))) {
            throw new Error(bare.error.message);
          }
          enrollmentsRows = bare.data ?? [];
        }
      }
    }

    const teacherIds = Array.from(
      new Set([
        ...(bookings.data ?? []).map((b: any) => b.teacher_id).filter(Boolean),
        ...enrollmentsRows.map((r: any) => r?.classes?.teacher_id).filter(Boolean),
      ]),
    ) as string[];
    const users = teacherIds.length
      ? await supabaseAdmin
          .from("users")
          .select("specific_id, full_name, staff_code")
          .in("specific_id", teacherIds)
      : { data: [], error: null };
    if (users.error) throw new Error(users.error.message);

    const nameMap = new Map((users.data ?? []).map((u: any) => [u.specific_id, u.full_name]));
    const teacherCodeMap = new Map((users.data ?? []).map((u: any) => [u.specific_id, u.staff_code]));
    return {
      progress: progress.data ?? [],
      bookings: (bookings.data ?? []).map((b: any) => ({
        ...b,
        teacher_name: b.teacher_id ? nameMap.get(b.teacher_id) ?? null : null,
        teacher_staff_code: b.teacher_id ? teacherCodeMap.get(b.teacher_id) ?? null : null,
      })),
      enrollments: enrollmentsRows.map((row: any) => ({
        class_id: row.class_id,
        enrolled_at: row.enrolled_at,
        class_name: row.classes?.class_name ?? null,
        course_id: row.classes?.course_id ?? null,
        class_type: row.classes?.type ?? null,
        teacher_id: row.classes?.teacher_id ?? null,
        teacher_name: row.classes?.teacher_id ? nameMap.get(row.classes.teacher_id) ?? null : null,
        teacher_staff_code: row.classes?.teacher_id ? teacherCodeMap.get(row.classes.teacher_id) ?? null : null,
        start_date: row.classes?.start_date ?? null,
        end_date: row.classes?.end_date ?? null,
        start_time: row.classes?.start_time ?? null,
        end_time: row.classes?.end_time ?? null,
        schedule_days: row.classes?.schedule_days ?? null,
        total_lessons: row.classes?.total_lessons ?? null,
      })),
    };
  });


export const getTeacherDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("id, specific_id, staff_code")
      .eq("id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me?.specific_id) throw new Error("User profile not found");

    const isMissingTableError = (message: string) =>
      message.includes("Could not find the table") ||
      message.includes("does not exist") ||
      message.includes("42P01");

    const teacherKeys = Array.from(
      new Set([me.specific_id, me.id, me.staff_code].filter(Boolean)),
    ) as string[];
    const normalizeKey = (value: unknown) => String(value ?? "").trim().toLowerCase();
    const teacherKeySet = new Set(teacherKeys.map((k) => normalizeKey(k)).filter(Boolean));
    const matchTeacherKey = (value: unknown) => teacherKeySet.has(normalizeKey(value));

    const classesQuery =
      teacherKeys.length <= 1
        ? supabaseAdmin
            .from("classes")
            .select("*")
            .eq("teacher_id", teacherKeys[0] ?? me.specific_id)
            .order("start_date", { ascending: true })
        : supabaseAdmin
            .from("classes")
            .select("*")
            .or(teacherKeys.map((key) => `teacher_id.eq.${key}`).join(","))
            .order("start_date", { ascending: true });

    const [pending, mine, penalties, classesRes] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select("*")
        .eq("status", "pending")
        .is("teacher_id", null)
        .order("session_date", { ascending: true }),
      supabaseAdmin
        .from("bookings")
        .select("*")
        .in("teacher_id", teacherKeys)
        .order("session_date", { ascending: true }),
      supabaseAdmin
        .from("teacher_penalties")
        .select("*")
        .in("teacher_id", teacherKeys)
        .order("created_at", { ascending: false }),
      classesQuery,
    ]);

    const pendingMissing = pending.error
      ? isMissingTableError(String(pending.error.message ?? pending.error))
      : false;
    const mineMissing = mine.error
      ? isMissingTableError(String(mine.error.message ?? mine.error))
      : false;
    const penaltiesMissing = penalties.error
      ? isMissingTableError(String(penalties.error.message ?? penalties.error))
      : false;

    if (pending.error && !pendingMissing) throw new Error(pending.error.message);
    if (mine.error && !mineMissing) throw new Error(mine.error.message);
    if (penalties.error && !penaltiesMissing) throw new Error(penalties.error.message);
    if (classesRes.error && !isMissingTableError(String(classesRes.error.message ?? classesRes.error))) {
      throw new Error(classesRes.error.message);
    }

    const pendingRows = pendingMissing ? [] : (pending.data ?? []);
    const mineRowsBase = mineMissing ? [] : (mine.data ?? []);
    const penaltiesBase = penaltiesMissing ? [] : (penalties.data ?? []);

    let classes = classesRes.data ?? [];
    if (classes.length === 0) {
      const classesFallback = await supabaseAdmin
        .from("classes")
        .select("*")
        .not("teacher_id", "is", null)
        .order("start_date", { ascending: true });
      if (classesFallback.error && !isMissingTableError(String(classesFallback.error.message ?? classesFallback.error))) {
        throw new Error(classesFallback.error.message);
      }
      classes = (classesFallback.data ?? []).filter((row: any) => matchTeacherKey(row.teacher_id));
    }

    let mineRowsRaw = mineRowsBase;
    if (mineRowsRaw.length === 0) {
      const mineFallback = await supabaseAdmin
        .from("bookings")
        .select("*")
        .not("teacher_id", "is", null)
        .order("session_date", { ascending: true });
      if (mineFallback.error && !isMissingTableError(String(mineFallback.error.message ?? mineFallback.error))) {
        throw new Error(mineFallback.error.message);
      }
      if (!mineFallback.error) {
        mineRowsRaw = (mineFallback.data ?? []).filter((row: any) => matchTeacherKey(row.teacher_id));
      }
    }

    let penaltyRows = penaltiesBase;
    if (penaltyRows.length === 0) {
      const penaltiesFallback = await supabaseAdmin
        .from("teacher_penalties")
        .select("*")
        .not("teacher_id", "is", null)
        .order("created_at", { ascending: false });
      if (penaltiesFallback.error && !isMissingTableError(String(penaltiesFallback.error.message ?? penaltiesFallback.error))) {
        throw new Error(penaltiesFallback.error.message);
      }
      if (!penaltiesFallback.error) {
        penaltyRows = (penaltiesFallback.data ?? []).filter((row: any) => matchTeacherKey(row.teacher_id));
      }
    }

    const classIds = Array.from(new Set(classes.map((c: any) => c.class_id).filter(Boolean)));

    let classEnrollments: any[] = [];
    if (classIds.length > 0) {
      const enrollments = await supabaseAdmin
        .from("class_enrollments")
        .select("class_id, student_id, enrolled_at")
        .in("class_id", classIds);
      if (enrollments.error && !isMissingTableError(String(enrollments.error.message ?? enrollments.error))) {
        throw new Error(enrollments.error.message);
      }
      classEnrollments = enrollments.data ?? [];
    }

    const studentIds = Array.from(
      new Set([
        ...pendingRows.map((b: any) => b.student_id).filter(Boolean),
        ...mineRowsRaw.map((b: any) => b.student_id).filter(Boolean),
        ...classEnrollments.map((e: any) => e.student_id).filter(Boolean),
      ]),
    ) as string[];

    const users = studentIds.length
      ? await supabaseAdmin.from("users").select("id, specific_id, staff_code, full_name")
      : { data: [], error: null };
    if (users.error) throw new Error(users.error.message);

    const toKey = (v: unknown) => String(v ?? "").trim();
    const studentIdSet = new Set(studentIds.map((v) => toKey(v)).filter(Boolean));
    const nameMap = new Map<string, string | null>();
    const codeMap = new Map<string, string | null>();
    for (const u of users.data ?? []) {
      const keys = [toKey(u.specific_id), toKey(u.id), toKey(u.staff_code)].filter(Boolean);
      if (!keys.some((key) => studentIdSet.has(key))) continue;
      const displayCode = (u.staff_code as string | null) ?? (u.specific_id as string | null) ?? null;
      for (const key of keys) {
        if (!nameMap.has(key)) nameMap.set(key, u.full_name ?? null);
        if (!codeMap.has(key)) codeMap.set(key, displayCode);
      }
    }
    const enrichBooking = (b: any) => ({
      ...b,
      student_name: nameMap.get(toKey(b.student_id)) ?? null,
      student_code: codeMap.get(toKey(b.student_id)) ?? (b.student_id ?? null),
    });

    const normalizeScheduleDays = (raw: any): Set<number> => {
      const src = Array.isArray(raw)
        ? raw.map((v: any) => Number(v)).filter((v: number) => !Number.isNaN(v))
        : [];
      const out = new Set<number>();
      for (const n of src) {
        if (n >= 0 && n <= 6) out.add(n);
        if (n >= 1 && n <= 7) out.add(n % 7);
        if (n >= 2 && n <= 8) out.add((n - 1) % 7);
      }
      return out;
    };

    const normalizeTimeValue = (value?: string | null) => {
      const raw = String(value ?? "").trim();
      if (!raw) return "00:00:00";
      const m = raw.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
      if (!m) return raw;
      const hh = String(Math.max(0, Math.min(23, Number(m[1])))).padStart(2, "0");
      const mm = String(Math.max(0, Math.min(59, Number(m[2])))).padStart(2, "0");
      const ss = String(Math.max(0, Math.min(59, Number(m[3] ?? "0")))).padStart(2, "0");
      return `${hh}:${mm}:${ss}`;
    };

    const parseDateOnly = (value?: string | null) => {
      const raw = String(value ?? "").trim();
      if (!raw) return new Date();

      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const d = new Date(`${raw}T00:00:00`);
        if (!Number.isNaN(d.getTime())) return d;
      }

      let d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;

      const dm = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dm) {
        const day = dm[1].padStart(2, "0");
        const month = dm[2].padStart(2, "0");
        d = new Date(`${dm[3]}-${month}-${day}T00:00:00`);
        if (!Number.isNaN(d.getTime())) return d;
      }

      return new Date();
    };

    const makeIsoLike = (date: Date, hhmmss?: string | null) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}T${normalizeTimeValue(hhmmss)}`;
    };

    const getBookingKey = (classId?: string | null, studentId?: string | null, sessionDate?: string | null) => {
      const ts = sessionDate ? new Date(sessionDate).getTime() : NaN;
      return `${classId ?? ""}|${studentId ?? ""}|${Number.isFinite(ts) ? ts : sessionDate ?? ""}`;
    };

    const mineRows = mineRowsRaw.map(enrichBooking);
    const existingKeys = new Set(
      mineRows.map((row: any) => getBookingKey(row.class_id, row.student_id, row.session_date)),
    );

    const studentsByClassFromBookings = new Map<string, Array<{ student_id: string; enrolled_at?: string | null }>>();
    for (const row of mineRowsRaw) {
      const classId = String(row?.class_id ?? "");
      const studentId = String(row?.student_id ?? "");
      if (!classId || !studentId) continue;
      const current = studentsByClassFromBookings.get(classId) ?? [];
      if (!current.some((x) => String(x.student_id) === studentId)) {
        current.push({ student_id: studentId, enrolled_at: row?.created_at ?? null });
      }
      studentsByClassFromBookings.set(classId, current);
    }

    const enrollmentsByClass = new Map<string, any[]>();
    for (const row of classEnrollments) {
      const classId = String(row.class_id ?? "");
      if (!classId) continue;
      const current = enrollmentsByClass.get(classId) ?? [];
      current.push(row);
      enrollmentsByClass.set(classId, current);
    }

    const generatedRows: any[] = [];
    for (const cls of classes) {
      const classId = String(cls.class_id ?? "");
      if (!classId) continue;

      const studentsFromEnrollments = enrollmentsByClass.get(classId) ?? [];
      const studentsFromBookings = studentsByClassFromBookings.get(classId) ?? [];
      const students =
        studentsFromEnrollments.length > 0
          ? studentsFromEnrollments
          : studentsFromBookings.length > 0
            ? studentsFromBookings
            : [{ student_id: null, enrolled_at: null }];

      const totalLessons = Math.max(1, Number(cls.total_lessons ?? 15));
      const baseDate = cls.start_date
        ? parseDateOnly(String(cls.start_date))
        : new Date();
      const scheduleSet = normalizeScheduleDays(cls.schedule_days);
      const useAnyDay = scheduleSet.size === 0;

      const lessonDates: Date[] = [];
      const cursor = new Date(baseDate);
      cursor.setHours(0, 0, 0, 0);
      let guard = 0;
      while (lessonDates.length < totalLessons && guard < 1200) {
        guard += 1;
        const weekday = cursor.getDay();
        if (useAnyDay || scheduleSet.has(weekday)) {
          lessonDates.push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      for (const student of students) {
        const studentId = student?.student_id ? String(student.student_id) : null;
        for (let index = 0; index < lessonDates.length; index += 1) {
          const date = lessonDates[index];
          const sessionDate = makeIsoLike(date, cls.start_time ?? "00:00:00");
          const key = getBookingKey(classId, studentId, sessionDate);
          if (existingKeys.has(key)) continue;

          generatedRows.push({
            slot_id: `${classId}-${studentId ?? "NO-STUDENT"}-L${String(index + 1).padStart(2, "0")}`,
            class_id: classId,
            course_name: cls.class_name ?? classId,
            student_id: studentId,
            teacher_id: me.specific_id,
            session_date: sessionDate,
            session_end_date: cls.end_time ? makeIsoLike(date, cls.end_time) : null,
            status: cls.status === "completed" ? "completed" : "confirmed",
            student_name: studentId ? nameMap.get(toKey(studentId)) ?? null : "Chưa gán học viên",
            student_code: studentId ? codeMap.get(toKey(studentId)) ?? studentId : null,
            is_enrollment_only: true,
          });
        }
      }
    }

    const myBookings = [...mineRows, ...generatedRows].sort((a: any, b: any) =>
      String(a.session_date ?? "").localeCompare(String(b.session_date ?? "")),
    );

    return {
      pendingSlots: pendingRows.map(enrichBooking),
      myBookings,
      penalties: penaltyRows,
    };
  });


// ---------- Ratings ----------

export const rateTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slotId: z.string().min(1),
        teacherId: z.string().min(1),
        stars: z.number().int().min(1).max(5),
        comment: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabaseAdmin
      .from("users")
      .select("specific_id")
      .eq("id", userId)
      .maybeSingle();
    if (!me) throw new Error("User not found");
    const { data: row, error } = await supabase
      .from("teacher_ratings")
      .insert({
        slot_id: data.slotId,
        teacher_id: data.teacherId,
        student_id: me.specific_id,
        stars: data.stars,
        comment: data.comment ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase.rpc("log_action", {
      p_action: "rate_teacher",
      p_details: { slot_id: data.slotId, stars: data.stars } as any,
    } as any);
    return row;
  });

export const getMyRatings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("specific_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me?.specific_id) return [];

    const { data, error } = await supabaseAdmin
      .from("teacher_ratings")
      .select("slot_id, stars, comment, created_at, teacher_id")
      .eq("student_id", me.specific_id);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getTeacherAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [analytics, ratings, users] = await Promise.all([
      supabase.rpc("get_teacher_analytics"),
      supabase
        .from("teacher_ratings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("users").select("specific_id, full_name"),
    ]);
    if (analytics.error) throw new Error(analytics.error.message);
    const nameMap = new Map((users.data ?? []).map((u: any) => [u.specific_id, u.full_name]));
    return {
      teachers: analytics.data ?? [],
      ratings: (ratings.data ?? []).map((r: any) => ({
        ...r,
        teacher_name: nameMap.get(r.teacher_id) ?? null,
        student_name: nameMap.get(r.student_id) ?? null,
      })),
    };
  });


// ---------- Curriculum (HSK chapters) ----------

export const listChapters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hsk_chapters")
      .select("*")
      .order("course_id", { ascending: true })
      .order("order_index", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        chapterId: z.string().uuid().optional(),
        courseId: z.string().min(1).max(50),
        title: z.string().min(1).max(200),
        content: z.string().max(20000).optional(),
        fileUrls: z.array(z.string().max(500)).optional(),
        orderIndex: z.number().int().min(0).max(999).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      course_id: data.courseId,
      title: data.title,
      content: data.content ?? null,
      file_urls: data.fileUrls ?? null,
      order_index: data.orderIndex,
      updated_at: new Date().toISOString(),
    };
    const q = data.chapterId
      ? context.supabase
          .from("hsk_chapters")
          .update(payload)
          .eq("chapter_id", data.chapterId)
          .select()
          .single()
      : context.supabase.from("hsk_chapters").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chapterId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("hsk_chapters")
      .delete()
      .eq("chapter_id", data.chapterId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Assignments ----------

export const listAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("assignments")
      .select("*")
      .order("deadline", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("specific_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me?.specific_id) return [];

    const { data: progressRows, error: progressErr } = await supabaseAdmin
      .from("student_progress")
      .select("course_id")
      .eq("student_id", me.specific_id);
    if (progressErr) {
      const msg = String(progressErr.message ?? progressErr);
      if (
        msg.includes("Could not find the table") ||
        msg.includes("does not exist") ||
        msg.includes("42P01")
      ) {
        return [];
      }
      throw new Error(progressErr.message);
    }

    const courseIds = Array.from(
      new Set((progressRows ?? []).map((r: any) => String(r.course_id)).filter(Boolean)),
    );
    if (courseIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from("assignments")
      .select("*")
      .in("course_id", courseIds)
      .order("deadline", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        courseId: z.string().min(1).max(50),
        title: z.string().min(1).max(200),
        description: z.string().max(5000).optional(),
        deadline: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await supabaseAdmin
      .from("users")
      .select("specific_id")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: row, error } = await context.supabase
      .from("assignments")
      .insert({
        course_id: data.courseId,
        title: data.title,
        description: data.description ?? null,
        deadline: data.deadline,
        created_by: me?.specific_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ assignmentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("assignments")
      .delete()
      .eq("assignment_id", data.assignmentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Submissions ----------

export const listSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [subs, users] = await Promise.all([
      supabase
        .from("assignment_submissions")
        .select("*, assignments(title, course_id, deadline)")
        .order("submitted_at", { ascending: false }),
      supabase.from("users").select("specific_id, full_name"),
    ]);
    if (subs.error) throw new Error(subs.error.message);
    const nameMap = new Map((users.data ?? []).map((u: any) => [u.specific_id, u.full_name]));
    return (subs.data ?? []).map((s: any) => ({
      ...s,
      student_name: nameMap.get(s.student_id) ?? null,
    }));
  });

export const listMySubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("specific_id, full_name")
      .eq("id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me?.specific_id) return [];

    const { data, error } = await supabaseAdmin
      .from("assignment_submissions")
      .select("*, assignments(title, course_id, deadline)")
      .eq("student_id", me.specific_id)
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map((s: any) => ({
      ...s,
      student_name: me.full_name ?? null,
    }));
  });


export const submitAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        assignmentId: z.string().uuid(),
        text: z.string().max(10000).optional(),
        url: z.string().url().max(500).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await supabaseAdmin
      .from("users")
      .select("specific_id")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: row, error } = await context.supabase
      .from("assignment_submissions")
      .upsert(
        {
          assignment_id: data.assignmentId,
          student_id: me!.specific_id,
          submission_text: data.text ?? null,
          submission_url: data.url || null,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "assignment_id,student_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const gradeSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        submissionId: z.string().uuid(),
        score: z.number().min(0).max(100),
        comment: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await supabaseAdmin
      .from("users")
      .select("specific_id")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: row, error } = await context.supabase
      .from("assignment_submissions")
      .update({
        score: data.score,
        reviewer_comment: data.comment ?? null,
        reviewed_by: me?.specific_id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("submission_id", data.submissionId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });


// ---------- Recurring bookings ----------

export const createRecurringBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        classId: z.string().min(1).max(50),
        courseId: z.string().min(1).max(50),
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("create_recurring_bookings", {
      p_class_id: data.classId,
      p_course_id: data.courseId,
      p_start_date: data.startDate,
      p_end_date: data.endDate,
      p_start_time: data.startTime + ":00",
      p_end_time: data.endTime + ":00",
      p_weekdays: data.weekdays,
    });
    if (error) throw new Error(error.message);
    const r = Array.isArray(row) ? row[0] : row;
    return {
      created: r?.created ?? 0,
      skipped: r?.skipped ?? 0,
      slotIds: r?.slot_ids ?? [],
    };
  });

// ---------- Classes admin CRUD ----------
export const getAllClassesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminContext(context);
    const { data, error } = await supabaseAdmin.from("classes").select("*");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

  // Get a single class details (admin)
  export const getClassDetailsAdmin = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .inputValidator((d) => z.object({ classId: z.string().min(1) }).parse(d))
    .handler(async ({ data, context }) => {
      await assertAdminContext(context);
      const { data: row, error } = await supabaseAdmin.from("classes").select("*").eq("class_id", data.classId).maybeSingle();
      if (error) throw new Error(error.message);
      return row ?? null;
    });

  // List enrollments (students) for a class
  export const getClassEnrollmentsAdmin = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .inputValidator((d) => z.object({ classId: z.string().min(1) }).parse(d))
    .handler(async ({ data, context }) => {
      await assertAdminContext(context);
      // Query enrollments — if the table doesn't exist the client may return
      // a descriptive error (map that to a migration guidance message).
      const { data: rows, error } = await supabaseAdmin
        .from("class_enrollments")
        .select(`student_id, enrolled_at, users ( specific_id, full_name, staff_code )`)
        .eq("class_id", data.classId);
      if (error) {
        const m = String(error.message ?? error);
        if (m.includes('Could not find the table') || m.includes('does not exist') || m.includes('relation') || m.includes('42P01')) {
          throw new Error("Database schema missing: table 'public.class_enrollments' not found. Run the SQL migrations in supabase/migrations to create enrollment tables and triggers.");
        }
        throw new Error(error.message);
      }
      // normalize
      return (rows ?? []).map((r: any) => ({ student_id: r.student_id, enrolled_at: r.enrolled_at, full_name: r.users?.full_name ?? null, specific_id: r.users?.specific_id ?? null, staff_code: r.users?.staff_code ?? null }));
    });

  // List classes that a student is enrolled in
  export const getStudentEnrollmentsAdmin = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .inputValidator((d) => z.object({ studentId: z.string().min(1) }).parse(d))
    .handler(async ({ data, context }) => {
      await assertAdminContext(context);
      // Query classes that student is enrolled in. Map missing-table errors
      // to a clear migration guidance message so the operator can apply
      // the SQL migrations if needed.
      const { data: rows, error } = await supabaseAdmin
        .from("class_enrollments")
        .select(`class_id, enrolled_at, classes ( class_name, schedule_days, start_time, end_time, max_students, teacher_id )`)
        .eq("student_id", data.studentId);
      if (error) {
        const m = String(error.message ?? error);
        if (m.includes('Could not find the table') || m.includes('does not exist') || m.includes('relation') || m.includes('42P01')) {
          throw new Error("Database schema missing: table 'public.class_enrollments' not found. Run the SQL migrations in supabase/migrations to create enrollment tables and triggers.");
        }
        throw new Error(error.message);
      }
      return (rows ?? []).map((r: any) => ({ class_id: r.class_id, enrolled_at: r.enrolled_at, class_name: r.classes?.class_name ?? null, schedule_days: r.classes?.schedule_days ?? null, start_time: r.classes?.start_time ?? null, end_time: r.classes?.end_time ?? null, max_students: r.classes?.max_students ?? null }));
    });

  // Simple student search suggestions (admin)
  export const getStudentSuggestionsAdmin = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .inputValidator((d) => z.object({ q: z.string().optional() }).parse(d))
    .handler(async ({ data, context }) => {
      await assertAdminContext(context);
      const q = String(data.q ?? "").trim();
      if (!q) return [];
      const like = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      const [bySpecific, byStaff, byName] = await Promise.all([
        supabaseAdmin.from("users").select("specific_id, full_name, staff_code").eq("role", "student").ilike("specific_id", like).limit(30),
        supabaseAdmin.from("users").select("specific_id, full_name, staff_code").eq("role", "student").ilike("staff_code", like).limit(30),
        supabaseAdmin.from("users").select("specific_id, full_name, staff_code").eq("role", "student").ilike("full_name", like).limit(30),
      ]);
      if (bySpecific.error) throw new Error(bySpecific.error.message);
      if (byStaff.error) throw new Error(byStaff.error.message);
      if (byName.error) throw new Error(byName.error.message);

      const merged = [
        ...(bySpecific.data ?? []),
        ...(byStaff.data ?? []),
        ...(byName.data ?? []),
      ];

      const map = new Map<string, any>();
      for (const r of merged) {
        const key = String(r.staff_code ?? r.specific_id ?? "");
        if (!key) continue;
        if (!map.has(key)) map.set(key, r);
      }
      return Array.from(map.values()).slice(0, 30);
    });

  // Remove a student from a class (admin)
  export const removeStudentFromClassAdmin = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((d) => z.object({ classId: z.string().min(1), studentId: z.string().min(1) }).parse(d))
    .handler(async ({ data, context }) => {
      await assertAdminContext(context);
      // Attempt delete; surface a helpful message when the enrollment table
      // is missing in the DB (common when migrations haven't been applied).
      const { data: delData, error } = await supabaseAdmin.from("class_enrollments").delete().eq("class_id", data.classId).eq("student_id", data.studentId).select().maybeSingle();
      if (error) {
        const m = String(error.message ?? error);
        if (m.includes('Could not find the table') || m.includes('does not exist') || m.includes('relation') || m.includes('42P01')) {
          throw new Error("Database schema missing: table 'public.class_enrollments' not found. Run the SQL migrations in supabase/migrations to create enrollment tables and triggers.");
        }
        throw new Error(error.message);
      }
      // If a row was deleted, recompute the correct current_students count from
      // the enrollments table and set it. This avoids double-decrement when DB
      // triggers also maintain the count.
      if (delData) {
        try {
          const { count } = await supabaseAdmin
            .from('class_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', data.classId);
          const newCount = Number(count ?? 0) || 0;
          await supabaseAdmin.from('classes').update({ current_students: newCount }).eq('class_id', data.classId);
        } catch (e) {
          // ignore
        }
      }
      // write class_events (student_removed)
      try {
        const { data: actor } = await supabaseAdmin.from("users").select("specific_id").eq("id", context.userId).maybeSingle();
        await supabaseAdmin.from("class_events").insert({
          class_id: data.classId,
          event_type: "student_removed",
          actor_id: context.userId ?? null,
          actor_specific_id: actor?.specific_id ?? null,
          details: { student_id: data.studentId, note: "Admin xoá học viên khỏi lớp" },
          previous_value: { student_id: data.studentId, class_id: data.classId },
          source: "app",
        });
      } catch (evErr) {
        // ignore class_events errors — table may not exist until migration runs
      }
      return { ok: true };
    });

export const createClassAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        classId: z.string().min(1).max(100),
        className: z.string().min(1),
        totalLessons: z.number().int().min(1).default(15),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        scheduleDays: z.array(z.number().int().min(0).max(6)).optional(),
        maxStudents: z.number().int().min(1).default(10),
        teacherId: z.string().optional(),
        roomLink: z.string().optional(),
        status: z.enum(["pending", "active", "completed"]).default("pending"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminContext(context);

    const payload = {
      class_id: data.classId,
      class_name: data.className,
      total_lessons: data.totalLessons,
      start_date: data.startDate ?? null,
      end_date: data.endDate ?? null,
      start_time: data.startTime ?? null,
      end_time: data.endTime ?? null,
      schedule_days: data.scheduleDays ?? null,
      max_students: data.maxStudents,
      teacher_id: data.teacherId ?? null,
      room_link: data.roomLink ?? null,
      status: data.status,
    };
    const { data: row, error } = await supabaseAdmin.from("classes").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateClassAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        classId: z.string().min(1).max(100),
        updates: z.record(z.any()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await assertAdminContext(context);

    const updates: any = {};
    const allowed = [
      "class_name",
      "total_lessons",
      "start_date",
      "end_date",
      "start_time",
      "end_time",
      "schedule_days",
      "max_students",
      "teacher_id",
      "room_link",
      "status",
    ];
    for (const k of Object.keys(data.updates ?? {})) {
      if (allowed.includes(k)) updates[k] = (data.updates as any)[k];
    }

    // pre-fetch old teacher_id to capture previous value in class_events
    let oldTeacherId: string | null = null;
    if ("teacher_id" in updates) {
      try {
        const { data: old } = await supabaseAdmin.from("classes").select("teacher_id").eq("class_id", data.classId).maybeSingle();
        oldTeacherId = old?.teacher_id ?? null;
      } catch (e) { /* ignore */ }
    }

    const { data: row, error } = await supabaseAdmin
      .from("classes")
      .update(updates)
      .eq("class_id", data.classId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // write class_events when teacher changed
    if ("teacher_id" in updates && oldTeacherId !== updates.teacher_id) {
      // Resolve staff_code + full_name for display labels
      let oldTeacherLabel: string | null = oldTeacherId;
      let newTeacherLabel: string | null = updates.teacher_id ?? null;
      try {
        if (oldTeacherId) {
          const { data: oldT } = await supabaseAdmin
            .from("users").select("staff_code, full_name").eq("id", oldTeacherId).maybeSingle();
          if (oldT?.staff_code) {
            oldTeacherLabel = oldT.full_name
              ? `${oldT.staff_code} — ${oldT.full_name}`
              : oldT.staff_code;
          }
        }
        if (updates.teacher_id) {
          // teacher_id passed from UI may be staff_code or UUID
          let newT: any = null;
          const { data: byCode } = await supabaseAdmin
            .from("users").select("staff_code, full_name").eq("staff_code", updates.teacher_id).maybeSingle();
          if (byCode) {
            newT = byCode;
          } else {
            const { data: byId } = await supabaseAdmin
              .from("users").select("staff_code, full_name").eq("id", updates.teacher_id).maybeSingle();
            newT = byId ?? null;
          }
          if (newT?.staff_code) {
            newTeacherLabel = newT.full_name
              ? `${newT.staff_code} — ${newT.full_name}`
              : newT.staff_code;
          }
        }
      } catch (e) { /* ignore lookup errors */ }

      try {
        await supabaseAdmin.from("class_events").insert({
          class_id: data.classId,
          event_type: "teacher_changed",
          actor_id: context.userId ?? null,
          actor_specific_id: (me as any).specific_id ?? null,
          details: {
            old_teacher: oldTeacherLabel,
            new_teacher: newTeacherLabel,
            note: "Admin đổi giáo viên lớp học",
          },
          previous_value: { teacher_id: oldTeacherId },
          new_value: { teacher_id: updates.teacher_id },
          source: "app",
        });
      } catch (evErr) {
        // ignore class_events errors — table may not exist until migration runs
      }
    }

    return row;
  });

export const deleteClassAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ classId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminContext(context);

    const { data: row, error } = await supabaseAdmin.from("classes").delete().eq("class_id", data.classId).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Class Events ----------

export const getClassEventsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      classId: z.string().min(1),
      limit: z.number().int().min(1).max(500).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdminContext(context);
    const { data: rows, error } = await supabaseAdmin.rpc("get_class_events", {
      p_class_id: data.classId,
      p_limit: data.limit ?? 100,
    });
    if (error) {
      // gracefully return empty when table / function not yet migrated
      const m = String(error.message ?? error);
      if (m.includes("does not exist") || m.includes("42P01") || m.includes("Could not find")) {
        return [];
      }
      throw new Error(error.message);
    }
    return rows ?? [];
  });

export const createClassEventAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      classId: z.string().min(1),
      eventType: z.string().min(1).max(100),
      details: z.record(z.any()).optional(),
      previousValue: z.record(z.any()).optional(),
      newValue: z.record(z.any()).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const me = await assertAdminContext(context);
    const { error } = await supabaseAdmin.from("class_events").insert({
      class_id: data.classId,
      event_type: data.eventType,
      actor_id: context.userId ?? null,
      actor_specific_id: (me as any).specific_id ?? null,
      details: data.details ?? {},
      previous_value: data.previousValue ?? null,
      new_value: data.newValue ?? null,
      source: "app",
    });
    if (error) {
      const m = String(error.message ?? error);
      if (m.includes("does not exist") || m.includes("42P01")) {
        return { ok: false, skipped: true };
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

// ---------- Customer Care directory ----------

export const getCareStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_care_students");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCareStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_care_staff");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createCareUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().min(1),
        role: z.enum(["student", "teacher", "logistics", "care"]),
        studentAccountType: z.enum(["online", "offline"]).optional(),
        staff_code: z.string().optional(),
        phone: z.string().min(6).max(32),
        birthDate: z.string().optional(),
        birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
        status: z.enum(["active", "disabled"]).default("active"),
      }).superRefine((value, ctx) => {
        if (value.role === "student" && !value.studentAccountType) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["studentAccountType"], message: "Student account type is required for students" });
        }
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await assertAdminOrCareContext(context);
    if (!me) {
      throw new Error(`User profile not found in public.users for auth ID: ${context.userId}. Please check database.`);
    }

    const { data: authResult, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Tự động xác nhận email
      user_metadata: {
        full_name: data.fullName,
        role: data.role,
        ...(data.studentAccountType ? { student_account_type: data.studentAccountType } : {}),
      },
    });

    if (error) throw new Error(error.message);
    if (!authResult?.user) throw new Error("Unable to create user account");

    const updatePayload: Record<string, unknown> = {
      id: authResult.user.id,
      full_name: data.fullName,
      email: data.email,
      status: data.status,
      role: data.role,
      student_account_type: data.role === "student" ? data.studentAccountType : null,
      // set staff_code either from caller or generated by DB RPC for safety
      staff_code: undefined,
    };
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.birthDate !== undefined) updatePayload.birth_year = data.birthDate;
    else if (data.birthYear !== undefined) updatePayload.birth_year = data.birthYear;

    // Use upsert so we create the public.users row if it doesn't already exist.
    // Try upsert; if DB column is DATE and we provided an integer year, retry with YYYY-01-01 string
    let userRow: any = null;
    try {
      // If caller didn't provide staff_code, request one from DB function
      if (!data || (data as any).staff_code === undefined) {
        const prefixMap: Record<string, string> = {
          student: 'ST',
          teacher: 'TC',
          logistics: 'LG',
          care: 'CR',
          admin: 'AD',
        };
        const pfx = prefixMap[data.role as string] ?? 'ST';
        try {
          const { data: generated, error: rpcErr } = await supabaseAdmin.rpc('next_staff_code', { p_prefix: pfx });
          if (!rpcErr && generated) updatePayload.staff_code = String(generated);
        } catch (e) {
          // ignore — we'll continue without staff_code
        }
      } else {
        updatePayload.staff_code = (data as any).staff_code;
      }
      const res = await supabaseAdmin.from("users").upsert(updatePayload, { onConflict: "id" }).select().maybeSingle();
      if (res.error) throw res.error;
      userRow = res.data;
    } catch (e) {
      const msg = (e as any)?.message ?? String(e);
      // If we sent an integer but DB expects date, retry with YYYY-01-01
      if (updatePayload.birth_year !== undefined && /invalid input syntax for type date/i.test(msg)) {
        try {
          const retryPayload = { ...updatePayload, birth_year: `${updatePayload.birth_year}-01-01` };
          const res2 = await supabaseAdmin.from("users").upsert(retryPayload, { onConflict: "id" }).select().maybeSingle();
          if (res2.error) throw res2.error;
          userRow = res2.data;
        } catch (e2) {
          throw new Error((e2 as any)?.message ?? String(e2));
        }
      } else if (updatePayload.birth_year !== undefined && /invalid input syntax for type integer/i.test(msg)) {
        // If we sent a date string but DB expects integer year, extract year and retry
        try {
          const by = updatePayload.birth_year;
          const dt = new Date(String(by));
          const year = Number.isNaN(dt.getFullYear() as any) ? null : dt.getFullYear();
          if (year === null || Number.isNaN(year)) throw new Error('Cannot extract year from birth_date');
          const retryPayload = { ...updatePayload, birth_year: year };
          const res2 = await supabaseAdmin.from("users").upsert(retryPayload, { onConflict: "id" }).select().maybeSingle();
          if (res2.error) throw res2.error;
          userRow = res2.data;
        } catch (e2) {
          throw new Error((e2 as any)?.message ?? String(e2));
        }
      } else {
        throw new Error(msg);
      }
    }
    // write audit log
    try {
      const { data: adminProfile } = await supabaseAdmin.from("users").select("specific_id").eq("id", context.userId).maybeSingle();
      await supabaseAdmin.from("audit_logs").insert({
        action: "create_user",
        details: { new_user_id: userRow?.id ?? authResult.user.id, email: data.email, role: data.role },
        user_id: context.userId,
        user_specific_id: adminProfile?.specific_id ?? null,
      });
    } catch (e) {
      console.warn("Failed to write audit log for createCareUser:", (e as any)?.message ?? e);
    }

    return { specificId: userRow?.specific_id ?? authResult.user.user_metadata?.specific_id ?? null };
  });

export const revealUserPii = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        specificId: z.string().min(1).max(50),
        field: z.enum(["phone", "birth_year"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: value, error } = await context.supabase.rpc("reveal_user_pii", {
      p_specific_id: data.specificId,
      p_field: data.field,
    });
    if (error) throw new Error(error.message);
    return { value: value ?? null };
  });

// ---------- Admin user management (list / update / delete) ----------

export const getAllUsersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminContext(context);

    // Use service client to bypass RLS and return all public.users rows
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, specific_id, staff_code, full_name, email, role, status, phone, birth_year, student_account_type, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().min(1),
        fullName: z.string().optional(),
        role: z.string().optional(),
        status: z.string().optional(),
        phone: z.string().optional(),
        birthDate: z.string().optional(),
        birthYear: z.number().int().optional(),
        studentAccountType: z.enum(["online", "offline"]).nullable().optional(),
        password: z.string().min(6).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, fullName, role, status, phone, birthDate, birthYear, password, studentAccountType } = data;

    // Update auth metadata and/or password via service client when available
    try {
      if (password || fullName || role) {
        const adminApi = (supabaseAdmin as any)?.auth?.admin;
        if (adminApi && typeof adminApi.updateUserById === "function") {
          const updatePayload: any = {};
          if (password) updatePayload.password = password;
          if (fullName || role)
            updatePayload.user_metadata = {
              ...(fullName ? { full_name: fullName } : {}),
              ...(role ? { role } : {}),
              ...(studentAccountType !== undefined ? { student_account_type: studentAccountType } : {}),
            };
          // call updateUserById on service client
          await adminApi.updateUserById(id, updatePayload);
        } else if (adminApi && typeof adminApi.updateUser === "function") {
          // fallback name
          const updatePayload: any = {};
          if (password) updatePayload.password = password;
          if (fullName || role)
            updatePayload.user_metadata = {
              ...(fullName ? { full_name: fullName } : {}),
              ...(role ? { role } : {}),
              ...(studentAccountType !== undefined ? { student_account_type: studentAccountType } : {}),
            };
          await adminApi.updateUser(id, updatePayload as any);
        }
      }
    } catch (e) {
      // Non-fatal here — continue to update public users table, but surface error if no rows updated later.
      console.warn("Admin auth update failed:", (e as any)?.message ?? e);
    }

    const { data: currentUser } = await supabaseAdmin
      .from("users")
      .select("role, student_account_type")
      .eq("id", id)
      .maybeSingle();

    const updatePayload: Record<string, unknown> = {};
    if (fullName !== undefined) updatePayload.full_name = fullName;
    if (role !== undefined) updatePayload.role = role;
    if (status !== undefined) updatePayload.status = status;
    if (phone !== undefined) updatePayload.phone = phone;
    if (birthDate !== undefined) updatePayload.birth_year = birthDate;
    else if (birthYear !== undefined) updatePayload.birth_year = birthYear;
    if (studentAccountType !== undefined) updatePayload.student_account_type = studentAccountType;
    else if ((role ?? currentUser?.role) === "student" && currentUser?.student_account_type != null && !("student_account_type" in updatePayload)) {
      updatePayload.student_account_type = currentUser.student_account_type;
    }

    if (Object.keys(updatePayload).length === 0) return { ok: true };

    // Verify caller is admin via service client and then use service client to update public.users
    await assertAdminContext(context);

    // Try update; if column is DATE and birth_year is integer, retry using a YYYY-01-01 string
    let row: any = null;
    try {
      const res = await supabaseAdmin.from("users").update(updatePayload).eq("id", id).select().maybeSingle();
      if (res.error) throw res.error;
      row = res.data;
    } catch (e) {
      const msg = (e as any)?.message ?? String(e);
      if (updatePayload.birth_year !== undefined && /invalid input syntax for type date/i.test(msg)) {
        try {
          const retryPayload = { ...updatePayload, birth_year: `${updatePayload.birth_year}-01-01` };
          const res2 = await supabaseAdmin.from("users").update(retryPayload).eq("id", id).select().maybeSingle();
          if (res2.error) throw res2.error;
          row = res2.data;
        } catch (e2) {
          throw new Error((e2 as any)?.message ?? String(e2));
        }
      } else if (updatePayload.birth_year !== undefined && /invalid input syntax for type integer/i.test(msg)) {
        try {
          const by = updatePayload.birth_year;
          const dt = new Date(String(by));
          const year = Number.isNaN(dt.getFullYear() as any) ? null : dt.getFullYear();
          if (year === null || Number.isNaN(year)) throw new Error('Cannot extract year from birth_date');
          const retryPayload = { ...updatePayload, birth_year: year };
          const res2 = await supabaseAdmin.from("users").update(retryPayload).eq("id", id).select().maybeSingle();
          if (res2.error) throw res2.error;
          row = res2.data;
        } catch (e2) {
          throw new Error((e2 as any)?.message ?? String(e2));
        }
      } else {
        throw new Error(msg);
      }
    }
    // audit log
    try {
      const { data: adminProfile } = await supabaseAdmin.from("users").select("specific_id").eq("id", context.userId).maybeSingle();
      await supabaseAdmin.from("audit_logs").insert({
        action: "update_user",
        details: { target_id: id, changes: updatePayload },
        user_id: context.userId,
        user_specific_id: adminProfile?.specific_id ?? null,
      });
    } catch (e) {
      console.warn("Failed to write audit log for updateUserAdmin:", (e as any)?.message ?? e);
    }

    return row ?? { ok: true };
  });

export const deleteUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { id } = data;

    // Try to delete auth user via service client if available
    try {
      const adminApi = (supabaseAdmin as any)?.auth?.admin;
      if (adminApi && typeof adminApi.deleteUser === "function") {
        await adminApi.deleteUser(id);
      } else if (adminApi && typeof adminApi.deleteUserById === "function") {
        await adminApi.deleteUserById(id);
      } else if (adminApi && typeof adminApi.removeUser === "function") {
        await adminApi.removeUser(id as any);
      }
    } catch (e) {
      console.warn("Admin auth delete failed (continuing to remove public row):", (e as any)?.message ?? e);
    }

    const { error } = await context.supabase.from("users").delete().eq("id", id);
    if (error) throw new Error(error.message);
    // audit log for deletion
    try {
      const { data: adminProfile } = await supabaseAdmin.from("users").select("specific_id").eq("id", context.userId).maybeSingle();
      await supabaseAdmin.from("audit_logs").insert({
        action: "delete_user",
        details: { target_id: id },
        user_id: context.userId,
        user_specific_id: adminProfile?.specific_id ?? null,
      });
    } catch (e) {
      console.warn("Failed to write audit log for deleteUserAdmin:", (e as any)?.message ?? e);
    }

    return { ok: true };
  });

// ---------- Teacher: student skill lookup & evaluation ----------

export const getStudentSkillsById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ studentId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Verify student exists
    const { data: student, error: stuErr } = await supabase
      .from("users")
      .select("specific_id, full_name, role")
      .eq("specific_id", data.studentId)
      .eq("role", "student")
      .maybeSingle();
    if (stuErr) throw new Error(stuErr.message);
    if (!student) return null; // not found — caller will show "no student"

    const { data: skills, error } = await supabase.rpc("get_student_skills", {
      p_student_id: data.studentId,
    });
    if (error) throw new Error(error.message);
    return { student, skills: skills ?? [] };
  });

export const submitEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slotId: z.string().min(1),
        studentId: z.string().min(1),
        listening: z.number().int().min(0).max(100),
        speaking: z.number().int().min(0).max(100),
        reading: z.number().int().min(0).max(100),
        writing: z.number().int().min(0).max(100),
        vocabulary: z.number().int().min(0).max(100),
        grammar: z.number().int().min(0).max(100),
        generalComment: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Resolve teacher id from auth session
    const { data: me, error: meErr } = await supabase
      .from("users")
      .select("specific_id")
      .single();
    if (meErr || !me) throw new Error(meErr?.message ?? "Teacher profile not found");

    // Verify the slot is confirmed and belongs to this teacher
    const { data: slot, error: slotErr } = await supabase
      .from("bookings")
      .select("slot_id, teacher_id, student_id, status, session_date")
      .eq("slot_id", data.slotId)
      .maybeSingle();
    if (slotErr) throw new Error(slotErr.message);
    if (!slot) throw new Error("Slot không tồn tại");
    if (slot.teacher_id !== me.specific_id)
      throw new Error("Bạn không phải giáo viên dạy buổi học này");
    if (slot.status !== "confirmed")
      throw new Error("Chỉ có thể đánh giá buổi học đã được xác nhận");
    if (slot.student_id !== data.studentId)
      throw new Error("Học viên không khớp với buổi học này");

    // Insert — UNIQUE(slot_id) prevents duplicate evaluations per session
    const { data: row, error } = await supabase
      .from("session_evaluations")
      .insert({
        slot_id: data.slotId,
        student_id: data.studentId,
        teacher_id: me.specific_id,
        listening_score: data.listening,
        speaking_score: data.speaking,
        reading_score: data.reading,
        writing_score: data.writing,
        vocabulary_score: data.vocabulary,
        grammar_score: data.grammar,
        general_comment: data.generalComment ?? null,
      })
      .select()
      .single();
    if (error) {
      // Unique violation → already evaluated
      if (error.code === "23505")
        throw new Error("Bạn đã đánh giá học viên này cho buổi học này rồi");
      throw new Error(error.message);
    }
    return row;
  });

export const getStudentSkills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("specific_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (meErr || !me) throw new Error(meErr?.message ?? "User profile not found");
    const { data, error } = await context.supabase.rpc("get_student_skills", {
      p_student_id: me.specific_id,
    });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
