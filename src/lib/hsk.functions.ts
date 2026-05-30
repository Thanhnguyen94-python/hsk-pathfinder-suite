import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const { data: row, error } = await context.supabase.rpc(
      "assign_student_to_offline_class",
      { p_student_id: data.studentId, p_class_id: data.classId },
    );
    if (error) throw new Error(error.message);
    return row;
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


// ---------- Dashboard reads ----------

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("users")
      .select("id, specific_id, full_name, email, role")
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const getStudentDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [progress, bookings, users] = await Promise.all([
      supabase.from("student_progress").select("*"),
      supabase
        .from("bookings")
        .select("*")
        .order("session_date", { ascending: true })
        .limit(50),
      supabase.from("users").select("specific_id, full_name"),
    ]);
    if (progress.error) throw new Error(progress.error.message);
    if (bookings.error) throw new Error(bookings.error.message);
    const nameMap = new Map((users.data ?? []).map((u: any) => [u.specific_id, u.full_name]));
    return {
      progress: progress.data ?? [],
      bookings: (bookings.data ?? []).map((b: any) => ({
        ...b,
        teacher_name: b.teacher_id ? nameMap.get(b.teacher_id) ?? null : null,
      })),
    };
  });


export const getTeacherDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [pending, mine, penalties, users] = await Promise.all([
      supabase
        .from("bookings")
        .select("*")
        .eq("status", "pending")
        .is("teacher_id", null)
        .order("session_date", { ascending: true }),
      supabase
        .from("bookings")
        .select("*")
        .order("session_date", { ascending: true }),
      supabase
        .from("teacher_penalties")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("users").select("specific_id, full_name"),
    ]);
    if (pending.error) throw new Error(pending.error.message);
    if (mine.error) throw new Error(mine.error.message);
    if (penalties.error) throw new Error(penalties.error.message);
    const nameMap = new Map((users.data ?? []).map((u: any) => [u.specific_id, u.full_name]));
    const enrich = (b: any) => ({
      ...b,
      student_name: nameMap.get(b.student_id) ?? null,
    });
    return {
      pendingSlots: (pending.data ?? []).map(enrich),
      myBookings: (mine.data ?? []).map(enrich),
      penalties: penalties.data ?? [],
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
    const { supabase } = context;
    const { data: me } = await supabase.from("users").select("specific_id").single();
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
    const { data, error } = await context.supabase
      .from("teacher_ratings")
      .select("slot_id, stars, comment, created_at, teacher_id");
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
        pdfUrl: z.string().url().max(500).optional().or(z.literal("")),
        orderIndex: z.number().int().min(0).max(999).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      course_id: data.courseId,
      title: data.title,
      content: data.content ?? null,
      pdf_url: data.pdfUrl || null,
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
    const { data: me } = await context.supabase
      .from("users")
      .select("specific_id")
      .single();
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
    const { data: me } = await context.supabase
      .from("users")
      .select("specific_id")
      .single();
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
    const { data: me } = await context.supabase
      .from("users")
      .select("specific_id")
      .single();
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
    const { supabase } = context;
    const { data: me, error: meErr } = await supabase
      .from("users")
      .select("specific_id")
      .single();
    if (meErr || !me) throw new Error(meErr?.message ?? "User profile not found");
    const { data, error } = await supabase.rpc("get_student_skills", {
      p_student_id: me.specific_id,
    });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
