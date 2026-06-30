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
    .select("id, role, specific_id, full_name, email, status, student_account_type, avatar_url")
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

const HSK_MATERIALS_BUCKET = "hsk-materials";
const HSK_ACCOUNT_IMAGES_BUCKET = "hsk-account-images";

const toSessionKey = (classId?: string | null, sessionDate?: string | null) => {
  const ts = sessionDate ? new Date(sessionDate).getTime() : NaN;
  return `${classId ?? ""}|${Number.isFinite(ts) ? ts : sessionDate ?? ""}`;
};

const extractHskLevel = (classId?: string | null, courseId?: string | null) => {
  const source = `${String(classId ?? "")} ${String(courseId ?? "")}`;
  const m = source.match(/HSK\s*([1-9])/i);
  return m ? Number(m[1]) : null;
};

const normalizeLessonMaterials = (raw: any) => {
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .filter((x: any) => x && (x.url || x.name))
    .map((x: any) => ({
      name: String(x.name ?? "Tài liệu"),
      url: String(x.url ?? ""),
      storage_path: x.storage_path ? String(x.storage_path) : null,
      mime_type: x.mime_type ? String(x.mime_type) : null,
      size: Number.isFinite(Number(x.size)) ? Number(x.size) : null,
      uploaded_at: x.uploaded_at ? String(x.uploaded_at) : null,
    }))
    .filter((x: any) => Boolean(x.url));
};

const getFirstLessonMaterialUrl = (raw: any) => {
  const list = normalizeLessonMaterials(raw);
  return list[0]?.url ?? "";
};

const sanitizeFileName = (name: string) =>
  String(name ?? "file")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 160);

const decodeBase64ToBytes = (base64: string): Uint8Array => {
  const raw = String(base64 ?? "").trim();
  if (!raw) return new Uint8Array();

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(raw, "base64"));
  }

  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const uploadAccountImage = async ({
  userId,
  fileName,
  contentType,
  base64,
}: {
  userId: string;
  fileName: string;
  contentType: string;
  base64: string;
}) => {
  if (!contentType.startsWith("image/")) {
    throw new Error("File ảnh tài khoản không hợp lệ.");
  }

  const bytes = decodeBase64ToBytes(base64);
  if (!bytes?.length) throw new Error("Nội dung ảnh tài khoản rỗng.");
  if (bytes.length > 2 * 1024 * 1024) throw new Error("Ảnh tài khoản không được vượt quá 2MB.");

  const extension = sanitizeFileName(fileName).split(".").pop() || "jpg";
  const storagePath = `${userId}/${Date.now()}.${extension}`;
  const uploadRes = await supabaseAdmin.storage.from(HSK_ACCOUNT_IMAGES_BUCKET).upload(storagePath, bytes, {
    cacheControl: "3600",
    upsert: true,
    contentType,
  });
  if (uploadRes.error) throw new Error(uploadRes.error.message);

  return supabaseAdmin.storage.from(HSK_ACCOUNT_IMAGES_BUCKET).getPublicUrl(storagePath).data.publicUrl;
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
      .select("id, specific_id, staff_code, full_name, email, role, student_account_type, avatar_url")
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
      avatar_url: data?.avatar_url ?? null,
    };
  });

const getSessionMaterialUrlMap = async (classIds: string[]) => {
  const cleanClassIds = Array.from(new Set((classIds ?? []).map((x) => String(x ?? "").trim()).filter(Boolean)));
  const out = new Map<string, string>();
  if (cleanClassIds.length === 0) return out;

  const { data, error } = await supabaseAdmin
    .from("class_session_material_map")
    .select("class_id, session_date, lesson_id, hsk_lessons ( lesson_id, materials )")
    .in("class_id", cleanClassIds);

  if (error) {
    const msg = String(error.message ?? error);
    if (msg.includes("Could not find the table") || msg.includes("does not exist") || msg.includes("42P01")) {
      return out;
    }
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const url = getFirstLessonMaterialUrl((row as any)?.hsk_lessons?.materials);
    if (!url) continue;
    const key = toSessionKey((row as any).class_id, (row as any).session_date);
    if (!out.has(key)) out.set(key, url);
  }

  return out;
};

export const getStudentDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("id, specific_id, staff_code")
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

    const studentKeys = Array.from(
      new Set([
        String(me.specific_id ?? "").trim(),
        String((me as any).id ?? "").trim(),
        String((me as any).staff_code ?? "").trim(),
      ].filter(Boolean)),
    );

    const gradeRowsRes = await supabaseAdmin
      .from("class_student_grades")
      .select("class_id, session_date, student_id, general_comment");
    if (gradeRowsRes.error && !isMissingTableError(String(gradeRowsRes.error.message ?? gradeRowsRes.error))) {
      throw new Error(gradeRowsRes.error.message);
    }
    const gradeRows = (gradeRowsRes.data ?? []).filter((r: any) =>
      studentKeys.includes(String(r.student_id ?? "").trim()),
    );

    const evalRowsRes = await supabaseAdmin
      .from("session_evaluations")
      .select("slot_id, student_id, general_comment");
    if (evalRowsRes.error && !isMissingTableError(String(evalRowsRes.error.message ?? evalRowsRes.error))) {
      throw new Error(evalRowsRes.error.message);
    }
    const evalRows = (evalRowsRes.data ?? []).filter((r: any) =>
      studentKeys.includes(String(r.student_id ?? "").trim()),
    );

    const gradeNoteBySession = new Map<string, string>();
    for (const row of gradeRows) {
      const note = String((row as any).general_comment ?? "").trim();
      if (!note) continue;
      const key = toSessionKey((row as any).class_id, (row as any).session_date);
      if (key && !gradeNoteBySession.has(key)) {
        gradeNoteBySession.set(key, note);
      }
    }

    const evalNoteBySlot = new Map<string, string>();
    for (const row of evalRows) {
      const slotId = String((row as any).slot_id ?? "").trim();
      const note = String((row as any).general_comment ?? "").trim();
      if (!slotId || !note) continue;
      if (!evalNoteBySlot.has(slotId)) {
        evalNoteBySlot.set(slotId, note);
      }
    }

    const users = teacherIds.length
      ? await supabaseAdmin
          .from("users")
          .select("specific_id, full_name, staff_code")
          .in("specific_id", teacherIds)
      : { data: [], error: null };
    if (users.error) throw new Error(users.error.message);

    const classIdsForMaterialMap = Array.from(
      new Set([
        ...(bookings.data ?? []).map((b: any) => String(b.class_id ?? "").trim()).filter(Boolean),
        ...enrollmentsRows.map((r: any) => String(r?.class_id ?? "").trim()).filter(Boolean),
      ]),
    );
    const sessionMaterialMap = await getSessionMaterialUrlMap(classIdsForMaterialMap);

    const nameMap = new Map((users.data ?? []).map((u: any) => [u.specific_id, u.full_name]));
    const teacherCodeMap = new Map((users.data ?? []).map((u: any) => [u.specific_id, u.staff_code]));
    return {
      progress: progress.data ?? [],
      bookings: (bookings.data ?? []).map((b: any) => ({
        ...b,
        material_url:
          String((b as any).material_url ?? "").trim() ||
          sessionMaterialMap.get(toSessionKey(b.class_id, b.session_date)) ||
          null,
        teacher_name: b.teacher_id ? nameMap.get(b.teacher_id) ?? null : null,
        teacher_staff_code: b.teacher_id ? teacherCodeMap.get(b.teacher_id) ?? null : null,
        teacher_note:
          b.teacher_note ??
          evalNoteBySlot.get(String(b.slot_id ?? "").trim()) ??
          gradeNoteBySession.get(toSessionKey(b.class_id, b.session_date)) ??
          null,
      })),
      sessionNotes: gradeRows
        .map((row: any) => ({
          class_id: row.class_id ?? null,
          session_date: row.session_date ?? null,
          teacher_note: row.general_comment ?? null,
        }))
        .filter((row: any) => row.class_id && row.session_date && String(row.teacher_note ?? "").trim().length > 0),
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

    const [teacherProfileRes, teacherRatingStatsRes, teacherSessionRatingsRes, teacherRatingsLegacyRes] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("full_name, staff_code, specific_id")
        .eq("id", context.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("teacher_rating_stats")
        .select("teacher_id, avg_stars, total_reviews")
        .in("teacher_id", teacherKeys),
      supabaseAdmin
        .from("teacher_session_ratings")
        .select("teacher_id, stars")
        .in("teacher_id", teacherKeys),
      supabaseAdmin
        .from("teacher_ratings")
        .select("teacher_id, stars")
        .in("teacher_id", teacherKeys),
    ]);

    if (teacherProfileRes.error) throw new Error(teacherProfileRes.error.message);
    if (teacherRatingStatsRes.error && !isMissingTableError(String(teacherRatingStatsRes.error.message ?? teacherRatingStatsRes.error))) {
      throw new Error(teacherRatingStatsRes.error.message);
    }
    if (teacherSessionRatingsRes.error && !isMissingTableError(String(teacherSessionRatingsRes.error.message ?? teacherSessionRatingsRes.error))) {
      throw new Error(teacherSessionRatingsRes.error.message);
    }
    if (teacherRatingsLegacyRes.error && !isMissingTableError(String(teacherRatingsLegacyRes.error.message ?? teacherRatingsLegacyRes.error))) {
      throw new Error(teacherRatingsLegacyRes.error.message);
    }

    const teacherStatsRows = teacherRatingStatsRes.data ?? [];
    const teacherSessionRows = teacherSessionRatingsRes.data ?? [];
    const teacherLegacyRows = teacherRatingsLegacyRes.data ?? [];

    let totalReviews = 0;
    let starSum = 0;
    if (teacherStatsRows.length > 0) {
      for (const row of teacherStatsRows as any[]) {
        const count = Number(row.total_reviews ?? 0);
        const avg = Number(row.avg_stars ?? 0);
        if (count > 0) {
          totalReviews += count;
          starSum += avg * count;
        }
      }
    } else if (teacherSessionRows.length > 0) {
      totalReviews = teacherSessionRows.length;
      starSum = teacherSessionRows.reduce((sum: number, row: any) => sum + Number(row.stars ?? 0), 0);
    } else {
      totalReviews = teacherLegacyRows.length;
      starSum = teacherLegacyRows.reduce((sum: number, row: any) => sum + Number(row.stars ?? 0), 0);
    }
    const avgStars = totalReviews > 0 ? Math.round((starSum / totalReviews) * 10) / 10 : 0;

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

    const classIds: string[] = Array.from(
      new Set<string>(classes.map((c: any) => String(c.class_id ?? "").trim()).filter(Boolean) as string[]),
    );

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

    const mineRows = mineRowsRaw.map(enrichBooking);
    const existingSessionKeys = new Set(
      mineRows.map((row: any) => {
        const ts = row?.session_date ? new Date(row.session_date).getTime() : NaN;
        return `${row?.class_id ?? ""}|${Number.isFinite(ts) ? ts : row?.session_date ?? ""}`;
      }),
    );

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

      for (let index = 0; index < lessonDates.length; index += 1) {
        const date = lessonDates[index];
        const sessionDate = makeIsoLike(date, cls.start_time ?? "00:00:00");
        const ts = new Date(sessionDate).getTime();
        const sessionKey = `${classId}|${Number.isFinite(ts) ? ts : sessionDate}`;
        if (existingSessionKeys.has(sessionKey)) continue;

        generatedRows.push({
          slot_id: `${classId}-L${String(index + 1).padStart(2, "0")}`,
          class_id: classId,
          course_name: cls.class_name ?? classId,
          teacher_id: me.specific_id,
          session_date: sessionDate,
          session_end_date: cls.end_time ? makeIsoLike(date, cls.end_time) : null,
          status: cls.status === "completed" ? "completed" : "confirmed",
          is_enrollment_only: true,
        });
      }
    }

    const mergedRows = [...mineRows, ...generatedRows];
    const sessionMap = new Map<string, any>();
    for (const row of mergedRows) {
      const ts = row?.session_date ? new Date(row.session_date).getTime() : NaN;
      const key = `${row?.class_id ?? ""}|${Number.isFinite(ts) ? ts : row?.session_date ?? ""}`;
      const existing = sessionMap.get(key);
      if (!existing) {
        sessionMap.set(key, row);
        continue;
      }
      const existingScore = existing?.is_enrollment_only ? 0 : 1;
      const nextScore = row?.is_enrollment_only ? 0 : 1;
      if (nextScore > existingScore) {
        sessionMap.set(key, row);
      }
    }

    const myBookings = Array.from(sessionMap.values()).sort((a: any, b: any) =>
      String(a.session_date ?? "").localeCompare(String(b.session_date ?? "")),
    );

    const sessionMaterialMap = await getSessionMaterialUrlMap(classIds);

    const classStudentCountMap = new Map<string, number>();
    for (const [classId, rows] of enrollmentsByClass.entries()) {
      const unique = new Set((rows ?? []).map((r: any) => String(r.student_id ?? "")).filter(Boolean));
      classStudentCountMap.set(classId, unique.size);
    }

    const requiredCountMap = new Map<string, number>();
    const mineParticipants = new Map<string, Set<string>>();
    for (const row of mineRowsRaw) {
      const ts = row?.session_date ? new Date(row.session_date).getTime() : NaN;
      const key = `${row?.class_id ?? ""}|${Number.isFinite(ts) ? ts : row?.session_date ?? ""}`;
      if (!mineParticipants.has(key)) mineParticipants.set(key, new Set<string>());
      const sid = String(row?.student_id ?? "").trim();
      if (sid) mineParticipants.get(key)?.add(sid);
    }

    for (const row of myBookings) {
      const ts = row?.session_date ? new Date(row.session_date).getTime() : NaN;
      const key = `${row?.class_id ?? ""}|${Number.isFinite(ts) ? ts : row?.session_date ?? ""}`;
      const participantCount = mineParticipants.get(key)?.size ?? 0;
      const classCount = classStudentCountMap.get(String(row?.class_id ?? "")) ?? 0;
      const singleFallback = row?.student_id ? 1 : 0;
      const required = Math.max(participantCount, classCount, singleFallback);
      requiredCountMap.set(key, required);
    }

    const attendanceCountMap = new Map<string, number>();
    const gradingCountMap = new Map<string, number>();

    if (classIds.length > 0) {
      const [attendanceRows, gradingRows] = await Promise.all([
        supabaseAdmin
          .from("class_attendance_records")
          .select("class_id, session_date, student_id")
          .in("class_id", classIds),
        supabaseAdmin
          .from("class_student_grades")
          .select("class_id, session_date, student_id")
          .in("class_id", classIds),
      ]);

      const attendanceMissing = attendanceRows.error
        ? isMissingTableError(String(attendanceRows.error.message ?? attendanceRows.error))
        : false;
      const gradingMissing = gradingRows.error
        ? isMissingTableError(String(gradingRows.error.message ?? gradingRows.error))
        : false;
      if (attendanceRows.error && !attendanceMissing) throw new Error(attendanceRows.error.message);
      if (gradingRows.error && !gradingMissing) throw new Error(gradingRows.error.message);

      const attendanceSets = new Map<string, Set<string>>();
      for (const row of attendanceRows.data ?? []) {
        const ts = row?.session_date ? new Date(row.session_date).getTime() : NaN;
        const key = `${row?.class_id ?? ""}|${Number.isFinite(ts) ? ts : row?.session_date ?? ""}`;
        if (!attendanceSets.has(key)) attendanceSets.set(key, new Set<string>());
        const sid = String(row?.student_id ?? "").trim();
        if (sid) attendanceSets.get(key)?.add(sid);
      }
      for (const [k, set] of attendanceSets.entries()) attendanceCountMap.set(k, set.size);

      const gradingSets = new Map<string, Set<string>>();
      for (const row of gradingRows.data ?? []) {
        const ts = row?.session_date ? new Date(row.session_date).getTime() : NaN;
        const key = `${row?.class_id ?? ""}|${Number.isFinite(ts) ? ts : row?.session_date ?? ""}`;
        if (!gradingSets.has(key)) gradingSets.set(key, new Set<string>());
        const sid = String(row?.student_id ?? "").trim();
        if (sid) gradingSets.get(key)?.add(sid);
      }
      for (const [k, set] of gradingSets.entries()) gradingCountMap.set(k, set.size);
    }

    const myBookingsWithFlags = myBookings.map((row: any) => {
      const ts = row?.session_date ? new Date(row.session_date).getTime() : NaN;
      const key = `${row?.class_id ?? ""}|${Number.isFinite(ts) ? ts : row?.session_date ?? ""}`;
      const required = requiredCountMap.get(key) ?? 0;
      const attendanceCount = attendanceCountMap.get(key) ?? 0;
      const gradingCount = gradingCountMap.get(key) ?? 0;
      const mappedMaterialUrl = sessionMaterialMap.get(toSessionKey(row?.class_id, row?.session_date)) ?? "";
      return {
        ...row,
        material_url: String((row as any).material_url ?? "").trim() || mappedMaterialUrl || null,
        attendance_done: required > 0 ? attendanceCount >= required : attendanceCount > 0,
        grading_done: required > 0 ? gradingCount >= required : gradingCount > 0,
      };
    });

    return {
      pendingSlots: pendingRows.map(enrichBooking),
      myBookings: myBookingsWithFlags,
      penalties: penaltyRows,
      teacherProfile: {
        full_name: teacherProfileRes.data?.full_name ?? null,
        staff_code:
          teacherProfileRes.data?.staff_code ?? teacherProfileRes.data?.specific_id ?? me.specific_id,
        avg_stars: avgStars,
        total_reviews: totalReviews,
      },
    };
  });

export const getClassSessionAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        classId: z.string().min(1),
        sessionDate: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await getCurrentUserRow(context);
    const role = normalizeRole(me.role);
    const isAdmin = role === "admin";

    const { data: classRow, error: classErr } = await supabaseAdmin
      .from("classes")
      .select("class_id, teacher_id")
      .eq("class_id", data.classId)
      .maybeSingle();
    if (classErr) throw new Error(classErr.message);
    if (!classRow) throw new Error("Class not found");

    const toKey = (v: unknown) => String(v ?? "").trim().toLowerCase();
    const teacherKeys = new Set([toKey(me.id), toKey(me.specific_id), toKey((me as any).staff_code)]);
    if (!isAdmin && !teacherKeys.has(toKey(classRow.teacher_id))) {
      throw new Error("Forbidden");
    }

    const parsedSession = new Date(data.sessionDate);
    if (Number.isNaN(parsedSession.getTime())) throw new Error("Invalid sessionDate");
    const sessionIso = parsedSession.toISOString();

    const { data: enrollmentRows, error: enrollmentErr } = await supabaseAdmin
      .from("class_enrollments")
      .select("student_id")
      .eq("class_id", data.classId);
    if (enrollmentErr) {
      const m = String(enrollmentErr.message ?? enrollmentErr);
      if (!m.includes("Could not find the table") && !m.includes("does not exist") && !m.includes("42P01")) {
        throw new Error(enrollmentErr.message);
      }
    }
    const studentIds = Array.from(
      new Set((enrollmentRows ?? []).map((r: any) => String(r.student_id ?? "")).filter(Boolean)),
    ) as string[];

    const users = studentIds.length
      ? await supabaseAdmin.from("users").select("id, specific_id, staff_code, full_name")
      : { data: [], error: null };
    if (users.error) throw new Error(users.error.message);

    const idSet = new Set(studentIds.map((v) => String(v).trim()));
    const profileMap = new Map<string, { full_name: string | null; staff_code: string | null; specific_id: string | null }>();
    for (const u of users.data ?? []) {
      const keys = [u.id, u.specific_id, u.staff_code].map((v: any) => String(v ?? "").trim()).filter(Boolean);
      if (!keys.some((k) => idSet.has(k))) continue;
      const profile = {
        full_name: (u.full_name as string | null) ?? null,
        staff_code: (u.staff_code as string | null) ?? null,
        specific_id: (u.specific_id as string | null) ?? null,
      };
      for (const key of keys) {
        if (!profileMap.has(key)) profileMap.set(key, profile);
      }
    }

    const { data: attendanceRows, error: attendanceErr } = await supabaseAdmin
      .from("class_attendance_records")
      .select("student_id, attendance_status, excuse_reason")
      .eq("class_id", data.classId)
      .eq("session_date", sessionIso);
    if (attendanceErr) {
      const m = String(attendanceErr.message ?? attendanceErr);
      if (!m.includes("Could not find the table") && !m.includes("does not exist") && !m.includes("42P01")) {
        throw new Error(attendanceErr.message);
      }
    }
    const attendanceMap = new Map<string, { attendance_status: string | null; excuse_reason: string | null }>(
      (attendanceRows ?? []).map((r: any) => [
        String(r.student_id ?? ""),
        {
          attendance_status: r.attendance_status ?? null,
          excuse_reason: r.excuse_reason ?? null,
        },
      ]),
    );

    return studentIds.map((studentId: string) => {
      const p = profileMap.get(studentId) ?? { full_name: null, staff_code: null, specific_id: studentId };
      const a = attendanceMap.get(studentId);
      return {
        student_id: studentId,
        full_name: p.full_name,
        staff_code: p.staff_code ?? p.specific_id,
        attendance_status: a?.attendance_status ?? null,
        excuse_reason: a?.excuse_reason ?? null,
      };
    });
  });

export const saveClassSessionAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        classId: z.string().min(1),
        sessionDate: z.string().min(1),
        records: z
          .array(
            z.object({
              studentId: z.string().min(1),
              attendanceStatus: z.enum(["present", "absent_excused", "absent_unexcused"]),
              excuseReason: z.string().max(1000).optional(),
            }),
          )
          .default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await getCurrentUserRow(context);
    const role = normalizeRole(me.role);
    const isAdmin = role === "admin";

    const { data: classRow, error: classErr } = await supabaseAdmin
      .from("classes")
      .select("class_id, teacher_id")
      .eq("class_id", data.classId)
      .maybeSingle();
    if (classErr) throw new Error(classErr.message);
    if (!classRow) throw new Error("Class not found");

    const toKey = (v: unknown) => String(v ?? "").trim().toLowerCase();
    const teacherKeys = new Set([toKey(me.id), toKey(me.specific_id), toKey((me as any).staff_code)]);
    if (!isAdmin && !teacherKeys.has(toKey(classRow.teacher_id))) {
      throw new Error("Forbidden");
    }

    const parsedSession = new Date(data.sessionDate);
    if (Number.isNaN(parsedSession.getTime())) throw new Error("Invalid sessionDate");
    const sessionIso = parsedSession.toISOString();

    const payload = (data.records ?? []).map((row) => ({
      class_id: data.classId,
      session_date: sessionIso,
      student_id: row.studentId,
      attendance_status: row.attendanceStatus,
      excuse_reason: row.excuseReason?.trim() ? row.excuseReason.trim() : null,
      marked_by: context.userId ?? null,
      marked_by_specific_id: me.specific_id ?? null,
      updated_at: new Date().toISOString(),
    }));

    if (payload.length === 0) return { ok: true, count: 0 };

    const { error } = await supabaseAdmin
      .from("class_attendance_records")
      .upsert(payload, { onConflict: "class_id,session_date,student_id" });
    if (error) throw new Error(error.message);

    return { ok: true, count: payload.length };
  });

export const getClassSessionGrading = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        classId: z.string().min(1),
        sessionDate: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await getCurrentUserRow(context);
    const role = normalizeRole(me.role);
    const isAdmin = role === "admin";

    const { data: classRow, error: classErr } = await supabaseAdmin
      .from("classes")
      .select("class_id, teacher_id")
      .eq("class_id", data.classId)
      .maybeSingle();
    if (classErr) throw new Error(classErr.message);
    if (!classRow) throw new Error("Class not found");

    const toKey = (v: unknown) => String(v ?? "").trim().toLowerCase();
    const teacherKeys = new Set([toKey(me.id), toKey(me.specific_id), toKey((me as any).staff_code)]);
    if (!isAdmin && !teacherKeys.has(toKey(classRow.teacher_id))) {
      throw new Error("Forbidden");
    }

    const parsedSession = new Date(data.sessionDate);
    if (Number.isNaN(parsedSession.getTime())) throw new Error("Invalid sessionDate");
    const sessionIso = parsedSession.toISOString();

    const { data: enrollmentRows, error: enrollmentErr } = await supabaseAdmin
      .from("class_enrollments")
      .select("student_id")
      .eq("class_id", data.classId);
    if (enrollmentErr) {
      const m = String(enrollmentErr.message ?? enrollmentErr);
      if (!m.includes("Could not find the table") && !m.includes("does not exist") && !m.includes("42P01")) {
        throw new Error(enrollmentErr.message);
      }
    }
    const studentIds = Array.from(
      new Set((enrollmentRows ?? []).map((r: any) => String(r.student_id ?? "")).filter(Boolean)),
    ) as string[];

    const users = studentIds.length
      ? await supabaseAdmin.from("users").select("id, specific_id, staff_code, full_name")
      : { data: [], error: null };
    if (users.error) throw new Error(users.error.message);

    const idSet = new Set(studentIds.map((v) => String(v).trim()));
    const profileMap = new Map<string, { full_name: string | null; staff_code: string | null; specific_id: string | null }>();
    for (const u of users.data ?? []) {
      const keys = [u.id, u.specific_id, u.staff_code].map((v: any) => String(v ?? "").trim()).filter(Boolean);
      if (!keys.some((k) => idSet.has(k))) continue;
      const profile = {
        full_name: (u.full_name as string | null) ?? null,
        staff_code: (u.staff_code as string | null) ?? null,
        specific_id: (u.specific_id as string | null) ?? null,
      };
      for (const key of keys) {
        if (!profileMap.has(key)) profileMap.set(key, profile);
      }
    }

    const { data: gradeRows, error: gradeErr } = await supabaseAdmin
      .from("class_student_grades")
      .select("student_id, listening, speaking, reading, writing, vocabulary, grammar, general_comment")
      .eq("class_id", data.classId)
      .eq("session_date", sessionIso);
    if (gradeErr) {
      const m = String(gradeErr.message ?? gradeErr);
      if (!m.includes("Could not find the table") && !m.includes("does not exist") && !m.includes("42P01")) {
        throw new Error(gradeErr.message);
      }
    }

    const gradeMap = new Map<string, any>();
    for (const r of gradeRows ?? []) {
      gradeMap.set(String((r as any).student_id ?? ""), r);
    }

    return studentIds.map((studentId: string) => {
      const p = profileMap.get(studentId) ?? { full_name: null, staff_code: null, specific_id: studentId };
      const g = gradeMap.get(studentId);
      return {
        student_id: studentId,
        full_name: p.full_name,
        staff_code: p.staff_code ?? p.specific_id,
        listening: g?.listening ?? null,
        speaking: g?.speaking ?? null,
        reading: g?.reading ?? null,
        writing: g?.writing ?? null,
        vocabulary: g?.vocabulary ?? null,
        grammar: g?.grammar ?? null,
        general_comment: g?.general_comment ?? null,
      };
    });
  });

export const saveClassSessionGrading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        classId: z.string().min(1),
        sessionDate: z.string().min(1),
        records: z
          .array(
            z.object({
              studentId: z.string().min(1),
              listening: z.number().int().min(0).max(100),
              speaking: z.number().int().min(0).max(100),
              reading: z.number().int().min(0).max(100),
              writing: z.number().int().min(0).max(100),
              vocabulary: z.number().int().min(0).max(100),
              grammar: z.number().int().min(0).max(100),
              generalComment: z.string().max(2000).optional(),
            }),
          )
          .default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await getCurrentUserRow(context);
    const role = normalizeRole(me.role);
    const isAdmin = role === "admin";

    const { data: classRow, error: classErr } = await supabaseAdmin
      .from("classes")
      .select("class_id, teacher_id")
      .eq("class_id", data.classId)
      .maybeSingle();
    if (classErr) throw new Error(classErr.message);
    if (!classRow) throw new Error("Class not found");

    const toKey = (v: unknown) => String(v ?? "").trim().toLowerCase();
    const teacherKeys = new Set([toKey(me.id), toKey(me.specific_id), toKey((me as any).staff_code)]);
    if (!isAdmin && !teacherKeys.has(toKey(classRow.teacher_id))) {
      throw new Error("Forbidden");
    }

    const parsedSession = new Date(data.sessionDate);
    if (Number.isNaN(parsedSession.getTime())) throw new Error("Invalid sessionDate");
    const sessionIso = parsedSession.toISOString();

    const payload = (data.records ?? []).map((row) => ({
      class_id: data.classId,
      session_date: sessionIso,
      student_id: row.studentId,
      listening: row.listening,
      speaking: row.speaking,
      reading: row.reading,
      writing: row.writing,
      vocabulary: row.vocabulary,
      grammar: row.grammar,
      general_comment: row.generalComment?.trim() ? row.generalComment.trim() : null,
      graded_by: context.userId ?? null,
      graded_by_specific_id: me.specific_id ?? null,
      updated_at: new Date().toISOString(),
    }));

    if (payload.length === 0) return { ok: true, count: 0 };

    const { error } = await supabaseAdmin
      .from("class_student_grades")
      .upsert(payload, { onConflict: "class_id,session_date,student_id" });
    if (error) throw new Error(error.message);

    return { ok: true, count: payload.length };
  });


// ---------- Ratings ----------

export const rateTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slotId: z.string().min(1).optional(),
        classId: z.string().min(1),
        sessionDate: z.string().min(1),
        teacherId: z.string().min(1),
        stars: z.number().int().min(1).max(5),
        comment: z.string().max(500).optional(),
        materialStars: z.number().int().min(1).max(5).optional(),
        materialComment: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const isMissingTableError = (message: string) =>
      message.includes("Could not find the table") ||
      message.includes("does not exist") ||
      message.includes("42P01");

    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("id, specific_id, staff_code")
      .eq("id", userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me?.specific_id) throw new Error("User not found");

    const parsedSession = new Date(data.sessionDate);
    if (Number.isNaN(parsedSession.getTime())) throw new Error("sessionDate không hợp lệ");
    if (parsedSession.getTime() > Date.now()) throw new Error("Chỉ được đánh giá sau khi buổi học kết thúc");
    const sessionIso = parsedSession.toISOString();

    const studentKeys = new Set(
      [String(me.specific_id ?? "").trim(), String(me.id ?? "").trim(), String(me.staff_code ?? "").trim()].filter(
        Boolean,
      ),
    );

    const resolveSpecificId = async (raw: string) => {
      const v = String(raw ?? "").trim();
      if (!v) return "";

      const { data: byCode, error: byCodeErr } = await supabaseAdmin
        .from("users")
        .select("specific_id")
        .or(`specific_id.eq.${v},staff_code.eq.${v}`)
        .limit(1)
        .maybeSingle();
      if (byCodeErr) throw new Error(byCodeErr.message);
      if (byCode?.specific_id) return String(byCode.specific_id).trim();

      const isUuid = (value: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

      if (!isUuid(v)) return v;

      const { data: byId, error: byIdErr } = await supabaseAdmin
        .from("users")
        .select("specific_id")
        .eq("id", v)
        .maybeSingle();
      if (byIdErr) throw new Error(byIdErr.message);
      return String(byId?.specific_id ?? v).trim();
    };

    const teacherSpecificId = await resolveSpecificId(data.teacherId);

    const { data: classRow, error: classErr } = await supabaseAdmin
      .from("classes")
      .select("class_id, teacher_id")
      .eq("class_id", data.classId)
      .maybeSingle();
    if (classErr) throw new Error(classErr.message);
    if (!classRow) throw new Error("Không tìm thấy lớp học");

    const classTeacherSpecificId = await resolveSpecificId(String(classRow.teacher_id ?? ""));
    if (classTeacherSpecificId && classTeacherSpecificId !== teacherSpecificId) {
      throw new Error("Giáo viên không khớp với lớp học");
    }

    const enrollmentRows = await supabaseAdmin
      .from("class_enrollments")
      .select("student_id")
      .eq("class_id", data.classId)
      .limit(2000);
    if (enrollmentRows.error && !isMissingTableError(String(enrollmentRows.error.message ?? enrollmentRows.error))) {
      throw new Error(enrollmentRows.error.message);
    }
    const hasEnrollment = (enrollmentRows.data ?? []).some((row: any) =>
      studentKeys.has(String(row?.student_id ?? "").trim()),
    );

    let validatedByBooking = false;
    if (!hasEnrollment && data.slotId) {
      const bookingCheck = await supabaseAdmin
        .from("bookings")
        .select("slot_id, student_id, teacher_id, class_id, session_date, status")
        .eq("slot_id", data.slotId)
        .maybeSingle();
      if (bookingCheck.error && !isMissingTableError(String(bookingCheck.error.message ?? bookingCheck.error))) {
        throw new Error(bookingCheck.error.message);
      }
      if (bookingCheck.data) {
        const bookingTeacherSpecificId = await resolveSpecificId(String(bookingCheck.data.teacher_id ?? ""));
        const bookingTs = bookingCheck.data.session_date
          ? new Date(bookingCheck.data.session_date).getTime()
          : Number.NaN;
        const sameSession = Number.isFinite(bookingTs)
          ? bookingTs === parsedSession.getTime()
          : String(bookingCheck.data.session_date ?? "") === data.sessionDate;
        validatedByBooking =
          studentKeys.has(String(bookingCheck.data.student_id ?? "").trim()) &&
          String(bookingCheck.data.class_id ?? "").trim() === data.classId &&
          bookingTeacherSpecificId === teacherSpecificId &&
          sameSession &&
          ["confirmed", "pending"].includes(String(bookingCheck.data.status ?? ""));
      }
    }

    if (!hasEnrollment && !validatedByBooking) {
      throw new Error("Không tìm thấy quyền đánh giá cho buổi học này");
    }

    const { data: row, error } = await (supabaseAdmin as any)
      .from("teacher_session_ratings")
      .upsert(
        {
          slot_id: data.slotId ?? null,
          class_id: data.classId,
          session_date: sessionIso,
          teacher_id: teacherSpecificId,
          student_id: me.specific_id,
          stars: data.stars,
          comment: data.comment?.trim() ? data.comment.trim() : null,
          material_stars: data.materialStars ?? null,
          material_comment: data.materialComment?.trim() ? data.materialComment.trim() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,class_id,session_date" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase.rpc("log_action", {
      p_action: "rate_teacher",
      p_details: {
        slot_id: data.slotId ?? null,
        class_id: data.classId,
        session_date: sessionIso,
        stars: data.stars,
      } as any,
    } as any);
    return row;
  });

export const getMyRatings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isMissingTableError = (message: string) =>
      message.includes("Could not find the table") ||
      message.includes("does not exist") ||
      message.includes("42P01");

    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("specific_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me?.specific_id) return [];

    const sessionRatings = await supabaseAdmin
      .from("teacher_session_ratings")
      .select("slot_id, class_id, session_date, stars, comment, material_stars, material_comment, created_at, teacher_id")
      .eq("student_id", me.specific_id);
    if (sessionRatings.error && !isMissingTableError(String(sessionRatings.error.message ?? sessionRatings.error))) {
      throw new Error(sessionRatings.error.message);
    }

    if (!sessionRatings.error) return sessionRatings.data ?? [];

    const legacyRatings = await supabaseAdmin
      .from("teacher_ratings")
      .select("slot_id, stars, comment, created_at, teacher_id")
      .eq("student_id", me.specific_id);
    if (legacyRatings.error) throw new Error(legacyRatings.error.message);
    return legacyRatings.data ?? [];
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
        classMaterials: z
          .array(
            z.object({
              name: z.string().min(1),
              url: z.string().min(1),
              mimeType: z.string().optional().nullable(),
              size: z.number().optional().nullable(),
              uploadedAt: z.string().optional().nullable(),
            }),
          )
          .optional(),
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
      class_materials: data.classMaterials ?? [],
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
      "class_materials",
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

// ---------- Lesson preparation + session material mapping ----------

export const listHskLessonsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        hskLevel: z.number().int().min(1).max(9).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdminContext(context);
    let query = supabaseAdmin
      .from("hsk_lessons")
      .select("lesson_id, lesson_code, hsk_level, lesson_no, lesson_title, materials, created_at, updated_at")
      .order("hsk_level", { ascending: true })
      .order("lesson_no", { ascending: true });

    if (data.hskLevel) query = query.eq("hsk_level", data.hskLevel);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      ...r,
      materials: normalizeLessonMaterials(r.materials),
    }));
  });

export const createHskLessonAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        hskLevel: z.number().int().min(1).max(9),
        lessonNo: z.number().int().min(1).optional(),
        lessonTitle: z.string().min(1).max(255),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminContext(context);

    let lessonNo = data.lessonNo;
    if (!lessonNo) {
      const { data: maxRows, error: maxErr } = await supabaseAdmin
        .from("hsk_lessons")
        .select("lesson_no")
        .eq("hsk_level", data.hskLevel)
        .order("lesson_no", { ascending: false })
        .limit(1);
      if (maxErr) throw new Error(maxErr.message);
      lessonNo = Number(maxRows?.[0]?.lesson_no ?? 0) + 1;
    }

    const lessonCode = `HSK${data.hskLevel}-B${String(lessonNo).padStart(2, "0")}`;
    const { data: row, error } = await supabaseAdmin
      .from("hsk_lessons")
      .insert({
        lesson_code: lessonCode,
        hsk_level: data.hskLevel,
        lesson_no: lessonNo,
        lesson_title: data.lessonTitle,
        materials: [],
      })
      .select("lesson_id, lesson_code, hsk_level, lesson_no, lesson_title, materials, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...row, materials: normalizeLessonMaterials((row as any).materials) };
  });

export const updateHskLessonAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        lessonId: z.string().min(1),
        lessonTitle: z.string().min(1).max(255).optional(),
        materials: z.array(z.record(z.any())).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminContext(context);
    const updates: any = {};
    if (typeof data.lessonTitle === "string") updates.lesson_title = data.lessonTitle;
    if (Array.isArray(data.materials)) updates.materials = normalizeLessonMaterials(data.materials);

    const { data: row, error } = await supabaseAdmin
      .from("hsk_lessons")
      .update(updates)
      .eq("lesson_id", data.lessonId)
      .select("lesson_id, lesson_code, hsk_level, lesson_no, lesson_title, materials, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...row, materials: normalizeLessonMaterials((row as any).materials) };
  });

export const deleteHskLessonAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lessonId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminContext(context);

    const { data: current, error: currentErr } = await supabaseAdmin
      .from("hsk_lessons")
      .select("materials")
      .eq("lesson_id", data.lessonId)
      .maybeSingle();
    if (currentErr) throw new Error(currentErr.message);

    const paths = normalizeLessonMaterials(current?.materials)
      .map((m: any) => String(m.storage_path ?? "").trim())
      .filter(Boolean);
    if (paths.length > 0) {
      await supabaseAdmin.storage.from(HSK_MATERIALS_BUCKET).remove(paths);
    }

    const { error } = await supabaseAdmin.from("hsk_lessons").delete().eq("lesson_id", data.lessonId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const uploadHskLessonMaterialAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        lessonId: z.string().min(1),
        fileName: z.string().min(1).max(255),
        contentType: z.string().min(1).max(120).optional(),
        base64: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminContext(context);

    const { data: lesson, error: lessonErr } = await supabaseAdmin
      .from("hsk_lessons")
      .select("lesson_id, hsk_level, lesson_no, materials")
      .eq("lesson_id", data.lessonId)
      .maybeSingle();
    if (lessonErr) throw new Error(lessonErr.message);
    if (!lesson) throw new Error("Không tìm thấy bài học.");

    const bytes = decodeBase64ToBytes(data.base64);
    if (!bytes?.length) throw new Error("Nội dung file rỗng.");

    const safeName = sanitizeFileName(data.fileName);
    const storagePath = `hsk${lesson.hsk_level}/lesson-${String(lesson.lesson_no).padStart(2, "0")}/${Date.now()}-${safeName}`;
    const uploadRes = await supabaseAdmin.storage.from(HSK_MATERIALS_BUCKET).upload(storagePath, bytes, {
      cacheControl: "3600",
      upsert: false,
      contentType: data.contentType ?? "application/octet-stream",
    });
    if (uploadRes.error) throw new Error(uploadRes.error.message);

    const publicUrl = supabaseAdmin.storage.from(HSK_MATERIALS_BUCKET).getPublicUrl(storagePath).data.publicUrl;
    const currentMaterials = normalizeLessonMaterials(lesson.materials);
    const nextMaterials = [
      ...currentMaterials,
      {
        name: data.fileName,
        url: publicUrl,
        storage_path: storagePath,
        mime_type: data.contentType ?? null,
        size: bytes.length,
        uploaded_at: new Date().toISOString(),
      },
    ];

    const { data: row, error } = await supabaseAdmin
      .from("hsk_lessons")
      .update({ materials: nextMaterials })
      .eq("lesson_id", data.lessonId)
      .select("lesson_id, lesson_code, hsk_level, lesson_no, lesson_title, materials, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);

    return {
      lesson: {
        ...row,
        materials: normalizeLessonMaterials((row as any).materials),
      },
      uploaded: {
        name: data.fileName,
        url: publicUrl,
        storage_path: storagePath,
      },
    };
  });

export const removeHskLessonMaterialAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        lessonId: z.string().min(1),
        storagePath: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminContext(context);
    const { data: lesson, error: lessonErr } = await supabaseAdmin
      .from("hsk_lessons")
      .select("materials")
      .eq("lesson_id", data.lessonId)
      .maybeSingle();
    if (lessonErr) throw new Error(lessonErr.message);
    if (!lesson) throw new Error("Không tìm thấy bài học.");

    await supabaseAdmin.storage.from(HSK_MATERIALS_BUCKET).remove([data.storagePath]);
    const nextMaterials = normalizeLessonMaterials(lesson.materials).filter(
      (m: any) => String(m.storage_path ?? "") !== String(data.storagePath),
    );

    const { data: row, error } = await supabaseAdmin
      .from("hsk_lessons")
      .update({ materials: nextMaterials })
      .eq("lesson_id", data.lessonId)
      .select("lesson_id, lesson_code, hsk_level, lesson_no, lesson_title, materials, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...row, materials: normalizeLessonMaterials((row as any).materials) };
  });

export const listClassSessionsForMaterialMapAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        q: z.string().optional(),
        hskLevel: z.number().int().min(1).max(9).optional(),
        classId: z.string().optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        limit: z.number().int().min(20).max(3000).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdminContext(context);

    const { data: classes, error: classesErr } = await supabaseAdmin
      .from("classes")
      .select("class_id, class_name, course_id, start_date, start_time, schedule_days, total_lessons, status")
      .order("class_id", { ascending: true });
    if (classesErr) throw new Error(classesErr.message);

    const parseDateOnly = (value?: string | null) => {
      const raw = String(value ?? "").trim();
      if (!raw) return new Date();
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T00:00:00`);
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? new Date() : d;
    };

    const normalizeTimeValue = (value?: string | null) => {
      const raw = String(value ?? "").trim();
      if (!raw) return "00:00:00";
      const m = raw.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
      if (!m) return "00:00:00";
      return `${String(Number(m[1])).padStart(2, "0")}:${String(Number(m[2])).padStart(2, "0")}:${String(Number(m[3] ?? 0)).padStart(2, "0")}`;
    };

    const makeIsoLike = (date: Date, hhmmss?: string | null) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}T${normalizeTimeValue(hhmmss)}`;
    };

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

    const generated: any[] = [];
    for (const cls of classes ?? []) {
      const classId = String((cls as any).class_id ?? "").trim();
      if (!classId) continue;

      if (data.classId && classId !== data.classId) continue;
      const level = extractHskLevel((cls as any).class_id, (cls as any).course_id);
      if (data.hskLevel && level !== data.hskLevel) continue;

      const totalLessons = Math.max(1, Number((cls as any).total_lessons ?? 15));
      const baseDate = parseDateOnly((cls as any).start_date ?? null);
      const scheduleSet = normalizeScheduleDays((cls as any).schedule_days);
      const useAnyDay = scheduleSet.size === 0;

      const lessonDates: Date[] = [];
      const cursor = new Date(baseDate);
      cursor.setHours(0, 0, 0, 0);
      let guard = 0;
      while (lessonDates.length < totalLessons && guard < 1200) {
        guard += 1;
        const weekday = cursor.getDay();
        if (useAnyDay || scheduleSet.has(weekday)) lessonDates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }

      for (let i = 0; i < lessonDates.length; i += 1) {
        const d0 = lessonDates[i];
        const sessionDate = makeIsoLike(d0, (cls as any).start_time ?? "00:00:00");
        generated.push({
          class_id: classId,
          class_name: (cls as any).class_name ?? classId,
          status: (cls as any).status ?? null,
          hsk_level: level,
          lesson_order: i + 1,
          session_date: sessionDate,
        });
      }
    }

    const classIds = Array.from(new Set(generated.map((x: any) => x.class_id).filter(Boolean)));

    let mapRows: any[] = [];
    if (classIds.length > 0) {
      let query = supabaseAdmin
        .from("class_session_material_map")
        .select("class_id, session_date, lesson_id, hsk_lessons ( lesson_id, lesson_code, lesson_title, hsk_level, lesson_no, materials )")
        .in("class_id", classIds);

      if (data.fromDate) query = query.gte("session_date", `${data.fromDate}T00:00:00`);
      if (data.toDate) query = query.lte("session_date", `${data.toDate}T23:59:59`);

      const { data: rows, error } = await query;
      if (error) throw new Error(error.message);
      mapRows = rows ?? [];
    }

    const mappedBySession = new Map<string, any>();
    for (const row of mapRows) {
      mappedBySession.set(toSessionKey((row as any).class_id, (row as any).session_date), row);
    }

    const q = String(data.q ?? "").trim().toLowerCase();
    const fromTs = data.fromDate ? new Date(`${data.fromDate}T00:00:00`).getTime() : NaN;
    const toTs = data.toDate ? new Date(`${data.toDate}T23:59:59`).getTime() : NaN;

    const result = generated
      .filter((row: any) => {
        const ts = new Date(row.session_date).getTime();
        if (!Number.isNaN(fromTs) && ts < fromTs) return false;
        if (!Number.isNaN(toTs) && ts > toTs) return false;

        const mapped = mappedBySession.get(toSessionKey(row.class_id, row.session_date));
        const lessonCode = String((mapped as any)?.hsk_lessons?.lesson_code ?? "").toLowerCase();
        const lessonTitle = String((mapped as any)?.hsk_lessons?.lesson_title ?? "").toLowerCase();
        if (!q) return true;
        return (
          String(row.class_id ?? "").toLowerCase().includes(q) ||
          String(row.class_name ?? "").toLowerCase().includes(q) ||
          String(row.session_date ?? "").toLowerCase().includes(q) ||
          lessonCode.includes(q) ||
          lessonTitle.includes(q)
        );
      })
      .map((row: any) => {
        const mapped = mappedBySession.get(toSessionKey(row.class_id, row.session_date));
        const lesson = (mapped as any)?.hsk_lessons ?? null;
        const materials = normalizeLessonMaterials(lesson?.materials);
        return {
          ...row,
          map_id: (mapped as any)?.map_id ?? null,
          lesson_id: lesson?.lesson_id ?? (mapped as any)?.lesson_id ?? null,
          lesson_code: lesson?.lesson_code ?? null,
          lesson_title: lesson?.lesson_title ?? null,
          materials_count: materials.length,
          material_url: getFirstLessonMaterialUrl(lesson?.materials) || null,
          is_mapped: Boolean((mapped as any)?.lesson_id),
        };
      })
      .sort((a: any, b: any) => String(a.session_date).localeCompare(String(b.session_date)));

    const limit = Number(data.limit ?? 1200);
    return result.slice(0, limit);
  });

export const upsertClassSessionMaterialMapAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        classId: z.string().min(1),
        sessionDate: z.string().min(1),
        lessonId: z.string().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const me = await assertAdminContext(context);

    const cleanLessonId = String(data.lessonId ?? "").trim();
    if (!cleanLessonId) {
      const { error: delErr } = await supabaseAdmin
        .from("class_session_material_map")
        .delete()
        .eq("class_id", data.classId)
        .eq("session_date", data.sessionDate);
      if (delErr) throw new Error(delErr.message);
      return { ok: true, deleted: true };
    }

    const payload = {
      class_id: data.classId,
      session_date: data.sessionDate,
      lesson_id: cleanLessonId,
      mapped_by: context.userId ?? (me as any).id ?? null,
    };

    const { data: row, error } = await supabaseAdmin
      .from("class_session_material_map")
      .upsert(payload, { onConflict: "class_id,session_date" })
      .select("map_id, class_id, session_date, lesson_id, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getClassSessionMaterialMapStatsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        hskLevel: z.number().int().min(1).max(9).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdminContext(context);

    const { data: classes, error: classErr } = await supabaseAdmin
      .from("classes")
      .select("class_id, course_id, total_lessons");
    if (classErr) throw new Error(classErr.message);

    const filteredClasses = (classes ?? []).filter((c: any) => {
      if (!data.hskLevel) return true;
      return extractHskLevel(c.class_id, c.course_id) === data.hskLevel;
    });

    const classIds = filteredClasses.map((c: any) => String(c.class_id ?? "").trim()).filter(Boolean);
    const totalSessions = filteredClasses.reduce((sum: number, c: any) => sum + Math.max(1, Number(c.total_lessons ?? 15)), 0);

    let mappedSessions = 0;
    if (classIds.length > 0) {
      const { count, error } = await supabaseAdmin
        .from("class_session_material_map")
        .select("map_id", { count: "exact", head: true })
        .in("class_id", classIds);
      if (error) throw new Error(error.message);
      mappedSessions = Number(count ?? 0);
    }

    return {
      total_classes: classIds.length,
      total_sessions: totalSessions,
      mapped_sessions: mappedSessions,
      unmapped_sessions: Math.max(0, totalSessions - mappedSessions),
    };
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
        accountImage: z
          .object({
            fileName: z.string().min(1).max(255),
            contentType: z.string().min(1).max(120),
            base64: z.string().min(1),
          })
          .optional(),
      }).superRefine((value, ctx) => {
        if (value.role === "student" && !value.studentAccountType) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["studentAccountType"], message: "Student account type is required for students" });
        }
        if (value.accountImage && !value.accountImage.contentType.startsWith("image/")) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accountImage"], message: "Account image must be an image file" });
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

    let avatarUrl: string | null = null;
    if (data.accountImage) {
      try {
        avatarUrl = await uploadAccountImage({
          userId: authResult.user.id,
          fileName: data.accountImage.fileName,
          contentType: data.accountImage.contentType,
          base64: data.accountImage.base64,
        });
      } catch (e) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(authResult.user.id);
        } catch (deleteErr) {
          console.warn("Failed to clean up auth user after avatar upload failure:", (deleteErr as any)?.message ?? deleteErr);
        }
        throw e;
      }

      try {
        await supabaseAdmin.auth.admin.updateUserById(authResult.user.id, {
          user_metadata: {
            full_name: data.fullName,
            role: data.role,
            avatar_url: avatarUrl,
            ...(data.studentAccountType ? { student_account_type: data.studentAccountType } : {}),
          },
        });
      } catch (e) {
        console.warn("Failed to update auth metadata avatar_url:", (e as any)?.message ?? e);
      }
    }

    const updatePayload: Record<string, unknown> = {
      id: authResult.user.id,
      full_name: data.fullName,
      email: data.email,
      status: data.status,
      role: data.role,
      student_account_type: data.role === "student" ? data.studentAccountType : null,
      avatar_url: avatarUrl,
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
        details: { new_user_id: userRow?.id ?? authResult.user.id, email: data.email, role: data.role, has_avatar: Boolean(avatarUrl) },
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
      .select("id, specific_id, staff_code, full_name, email, role, status, phone, birth_year, student_account_type, avatar_url, created_at, updated_at")
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
        accountImage: z
          .object({
            fileName: z.string().min(1).max(255),
            contentType: z.string().min(1).max(120),
            base64: z.string().min(1),
          })
          .optional(),
      })
      .superRefine((value, ctx) => {
        if (value.accountImage && !value.accountImage.contentType.startsWith("image/")) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accountImage"], message: "Account image must be an image file" });
        }
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, fullName, role, status, phone, birthDate, birthYear, password, studentAccountType, accountImage } = data;

    await assertAdminContext(context);

    let avatarUrl: string | null = null;
    if (accountImage) {
      avatarUrl = await uploadAccountImage({
        userId: id,
        fileName: accountImage.fileName,
        contentType: accountImage.contentType,
        base64: accountImage.base64,
      });
    }

    // Update auth metadata and/or password via service client when available
    try {
      if (password || fullName || role || avatarUrl) {
        const adminApi = (supabaseAdmin as any)?.auth?.admin;
        if (adminApi && typeof adminApi.updateUserById === "function") {
          const updatePayload: any = {};
          if (password) updatePayload.password = password;
          if (fullName || role || avatarUrl)
            updatePayload.user_metadata = {
              ...(fullName ? { full_name: fullName } : {}),
              ...(role ? { role } : {}),
              ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
              ...(studentAccountType !== undefined ? { student_account_type: studentAccountType } : {}),
            };
          // call updateUserById on service client
          await adminApi.updateUserById(id, updatePayload);
        } else if (adminApi && typeof adminApi.updateUser === "function") {
          // fallback name
          const updatePayload: any = {};
          if (password) updatePayload.password = password;
          if (fullName || role || avatarUrl)
            updatePayload.user_metadata = {
              ...(fullName ? { full_name: fullName } : {}),
              ...(role ? { role } : {}),
              ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
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
    if (avatarUrl) updatePayload.avatar_url = avatarUrl;
    else if ((role ?? currentUser?.role) === "student" && currentUser?.student_account_type != null && !("student_account_type" in updatePayload)) {
      updatePayload.student_account_type = currentUser.student_account_type;
    }

    if (Object.keys(updatePayload).length === 0) return { ok: true };

    // Use service client to update public.users after admin verification above.

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

const SKILL_KEYS_ORDER = [
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
] as const;

async function getMergedStudentSkillsByIdentity(identity: {
  specificId?: string | null;
  userId?: string | null;
  staffCode?: string | null;
}) {
  const keys = Array.from(
    new Set([
      String(identity.specificId ?? "").trim(),
      String(identity.userId ?? "").trim(),
      String(identity.staffCode ?? "").trim(),
    ].filter(Boolean)),
  );

  const sumMap = new Map<string, number>();
  const countMap = new Map<string, number>();

  const add = (skill: string, score: number, n = 1) => {
    if (!SKILL_KEYS_ORDER.includes(skill as any)) return;
    if (!Number.isFinite(score) || !Number.isFinite(n) || n <= 0) return;
    sumMap.set(skill, (sumMap.get(skill) ?? 0) + score * n);
    countMap.set(skill, (countMap.get(skill) ?? 0) + n);
  };

  if (identity.specificId) {
    try {
      const rpcRes = await supabaseAdmin.rpc("get_student_skills", {
        p_student_id: identity.specificId,
      });
      if (rpcRes.error) {
        const m = String(rpcRes.error.message ?? rpcRes.error);
        if (!m.includes("does not exist") && !m.includes("42P01") && !m.includes("Could not find")) {
          throw new Error(rpcRes.error.message);
        }
      } else {
        for (const row of rpcRes.data ?? []) {
          add(
            String((row as any).skill ?? "").toLowerCase(),
            Number((row as any).avg_score ?? 0),
            Number((row as any).session_count ?? 0),
          );
        }
      }
    } catch {
      // ignore RPC failures; continue with class_student_grades source
    }
  }

  if (keys.length > 0) {
    const isUuid = (v: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    const uuidKeys = keys.filter(isUuid);

    let gradeRows: any[] = [];
    const firstTry = await supabaseAdmin
      .from("class_student_grades")
      .select("student_id, listening, speaking, reading, writing, vocabulary, grammar")
      .in("student_id", keys);

    if (firstTry.error) {
      const m = String(firstTry.error.message ?? firstTry.error);
      const isUuidCastError = m.includes("invalid input syntax for type uuid");
      if (isUuidCastError && uuidKeys.length > 0) {
        const retry = await supabaseAdmin
          .from("class_student_grades")
          .select("student_id, listening, speaking, reading, writing, vocabulary, grammar")
          .in("student_id", uuidKeys);
        if (retry.error) {
          const rm = String(retry.error.message ?? retry.error);
          if (!rm.includes("does not exist") && !rm.includes("42P01") && !rm.includes("Could not find")) {
            throw new Error(retry.error.message);
          }
        } else {
          gradeRows = retry.data ?? [];
        }
      } else if (!m.includes("does not exist") && !m.includes("42P01") && !m.includes("Could not find")) {
        throw new Error(firstTry.error.message);
      }
    } else {
      gradeRows = firstTry.data ?? [];
    }

    for (const row of gradeRows) {
      add("listening", Number((row as any).listening ?? 0));
      add("speaking", Number((row as any).speaking ?? 0));
      add("reading", Number((row as any).reading ?? 0));
      add("writing", Number((row as any).writing ?? 0));
      add("vocabulary", Number((row as any).vocabulary ?? 0));
      add("grammar", Number((row as any).grammar ?? 0));
    }
  }

  return SKILL_KEYS_ORDER.map((skill) => {
    const total = sumMap.get(skill) ?? 0;
    const count = countMap.get(skill) ?? 0;
    const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 0;
    return {
      skill,
      avg_score: avg,
      session_count: count,
    };
  });
}

export const getStudentSkillsById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ studentId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const queryValue = String(data.studentId ?? "").trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        queryValue,
      );

    // Verify student exists (ưu tiên staff_code trước để tránh cast UUID)
    let student: any = null;

    const byStaffCode = await supabaseAdmin
      .from("users")
      .select("id, specific_id, staff_code, full_name, role")
      .ilike("staff_code", queryValue)
      .eq("role", "student")
      .maybeSingle();
    if (byStaffCode.error) throw new Error(byStaffCode.error.message);
    student = byStaffCode.data ?? null;

    if (!student) {
      const bySpecific = await supabaseAdmin
        .from("users")
        .select("id, specific_id, staff_code, full_name, role")
        .eq("specific_id", queryValue)
        .eq("role", "student")
        .maybeSingle();
      if (bySpecific.error) {
        const m = String(bySpecific.error.message ?? bySpecific.error);
        const isUuidCastError = m.includes("invalid input syntax for type uuid");
        if (!isUuidCastError) throw new Error(bySpecific.error.message);
      } else {
        student = bySpecific.data ?? null;
      }
    }

    if (!student && isUuid) {
      const byAuthId = await supabaseAdmin
        .from("users")
        .select("id, specific_id, staff_code, full_name, role")
        .eq("id", queryValue)
        .eq("role", "student")
        .maybeSingle();
      if (byAuthId.error) throw new Error(byAuthId.error.message);
      student = byAuthId.data ?? null;
    }

    if (!student) return null; // not found — caller will show "no student"

    const skills = await getMergedStudentSkillsByIdentity({
      specificId: student.specific_id,
      userId: student.id,
      staffCode: (student as any).staff_code,
    });

    const isMissingTableError = (message: string) =>
      message.includes("Could not find the table") ||
      message.includes("does not exist") ||
      message.includes("42P01");

    const [enrollmentsRes, progressRes] = await Promise.all([
      supabaseAdmin
        .from("class_enrollments")
        .select("class_id, classes(class_name, course_id, type)")
        .eq("student_id", student.specific_id),
      supabaseAdmin
        .from("student_progress")
        .select("course_id, learning_mode, status")
        .eq("student_id", student.specific_id),
    ]);

    if (enrollmentsRes.error && !isMissingTableError(String(enrollmentsRes.error.message ?? enrollmentsRes.error))) {
      throw new Error(enrollmentsRes.error.message);
    }
    if (progressRes.error && !isMissingTableError(String(progressRes.error.message ?? progressRes.error))) {
      throw new Error(progressRes.error.message);
    }

    const coursesMap = new Map<string, { course_id: string | null; class_id: string | null; class_name: string | null; learning_mode: string | null; status: string | null }>();

    for (const row of enrollmentsRes.data ?? []) {
      const courseId = (row as any)?.classes?.course_id ?? null;
      const classId = (row as any)?.class_id ?? null;
      const className = (row as any)?.classes?.class_name ?? null;
      const classType = (row as any)?.classes?.type ?? null;
      const key = `${courseId ?? ""}|${classId ?? ""}`;
      if (!coursesMap.has(key)) {
        coursesMap.set(key, {
          course_id: courseId,
          class_id: classId,
          class_name: className,
          learning_mode:
            classType === "online_1_1"
              ? "online"
              : classType
                ? "offline"
                : null,
          status: null,
        });
      }
    }

    for (const row of progressRes.data ?? []) {
      const courseId = (row as any)?.course_id ?? null;
      const key = `${courseId ?? ""}|`;
      if (!coursesMap.has(key)) {
        coursesMap.set(key, {
          course_id: courseId,
          class_id: null,
          class_name: null,
          learning_mode: (row as any)?.learning_mode ?? null,
          status: (row as any)?.status ?? null,
        });
      } else {
        const current = coursesMap.get(key)!;
        coursesMap.set(key, {
          ...current,
          learning_mode: current.learning_mode ?? (row as any)?.learning_mode ?? null,
          status: current.status ?? (row as any)?.status ?? null,
        });
      }
    }

    return {
      student: {
        specific_id: student.specific_id,
        staff_code: (student as any).staff_code ?? null,
        full_name: student.full_name,
      },
      skills: skills ?? [],
      courses: Array.from(coursesMap.values()),
    };
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
      .select("id, specific_id, staff_code")
      .eq("id", context.userId)
      .maybeSingle();
    if (meErr || !me) throw new Error(meErr?.message ?? "User profile not found");

    const data = await getMergedStudentSkillsByIdentity({
      specificId: me.specific_id,
      userId: me.id,
      staffCode: (me as any).staff_code,
    });

    return data ?? [];
  });
