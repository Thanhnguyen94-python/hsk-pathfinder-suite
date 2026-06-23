import { useMemo } from "react";
import { useHSKStudentBookingViewModel } from "@/hooks/hsk-viewmodels/HSK_useBookingViewModel";
import { RatingDialog } from "@/components/common/RatingDialog";
import { HSK_BookingDialog } from "@/components/common/HSK_BookingDialog";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  AssignmentsTable,
  BookingsTable,
  ProgressCards,
} from "./HSK_StudentDashboardUi";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { HSKSlot } from "@/types/hsk-models/hsk-booking.types";

const skillSampleData = [
  { skill: "Nghe", score: 75 },
  { skill: "Nói", score: 62 },
  { skill: "Đọc", score: 80 },
  { skill: "Viết", score: 55 },
  { skill: "Từ vựng", score: 70 },
  { skill: "Ngữ pháp", score: 68 },
];

const SKILL_LABELS: Record<string, string> = {
  listening: "Nghe",
  speaking: "Nói",
  reading: "Đọc",
  writing: "Viết",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
};

export function HSK_StudentDashboardView() {
  const {
    me,
    progress,
    bookings,
    enrollments,
    sessionNotes,
    ratedSlots,
    assignments,
    submissions,
    skills,
    cancelSlot,
    freezeCourse,
    unfreezeCourse,
    submitAssignment,
  } = useHSKStudentBookingViewModel();

  const radarData = useMemo(() => {
    const safeSkills = (skills ?? []) as any[];
    if (safeSkills.length > 0) {
      return safeSkills.map((s: any) => ({
        skill: SKILL_LABELS[String(s.skill)] ?? String(s.skill ?? ""),
        score: Number(s.avg_score ?? s.score) || 0,
      }));
    }
    return skillSampleData;
  }, [skills]);

  const onlineCourses = useMemo(
    () => progress.filter((p) => p.learning_mode === "online"),
    [progress],
  );
  const offlineCourses = useMemo(
    () => progress.filter((p) => p.learning_mode === "offline"),
    [progress],
  );

  const hasOnline = onlineCourses.length > 0;
  const hasOffline = offlineCourses.length > 0;
  const defaultMode = hasOnline ? "online" : hasOffline ? "offline" : "online";
  const myCode = me?.staff_code ?? me?.specific_id ?? "";
  const accountMode =
    me?.student_account_type === "online" || me?.student_account_type === "offline"
      ? me.student_account_type
      : null;
  const accountType =
    accountMode === "online"
      ? "Online"
      : accountMode === "offline"
        ? "Offline"
        : null;
  const displayName =
    me?.full_name?.trim() ||
    (me?.email ? String(me.email).split("@")[0] : "") ||
    "…";

  const bookingsForTable = useMemo(() => {
    const toSessionKey = (classId?: string | null, sessionDate?: string | null) => {
      const ts = sessionDate ? new Date(sessionDate).getTime() : NaN;
      return `${classId ?? ""}|${Number.isFinite(ts) ? ts : sessionDate ?? ""}`;
    };

    const noteBySession = new Map<string, string>();
    for (const row of sessionNotes ?? []) {
      const key = toSessionKey(row?.class_id, row?.session_date);
      const note = String(row?.teacher_note ?? "").trim();
      if (!key || !note) continue;
      if (!noteBySession.has(key)) noteBySession.set(key, note);
    }

    for (const row of bookings ?? []) {
      const key = toSessionKey(row?.class_id, row?.session_date);
      const note = String(row?.teacher_note ?? "").trim();
      if (!key || !note) continue;
      if (!noteBySession.has(key)) noteBySession.set(key, note);
    }

    const normalizeScheduleDays = (raw: any): Set<number> => {
      const src = Array.isArray(raw) ? raw.map((v) => Number(v)).filter((v) => !Number.isNaN(v)) : [];
      const out = new Set<number>();
      for (const n of src) {
        if (n >= 0 && n <= 6) out.add(n);
        if (n >= 1 && n <= 7) out.add(n % 7);
        if (n >= 2 && n <= 8) out.add((n - 1) % 7);
      }
      return out;
    };

    const makeIsoLike = (date: Date, hhmmss?: string | null) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}T${hhmmss ?? "00:00:00"}`;
    };

    const rowsFromEnrollments = enrollments.flatMap((item: any, classIndex: number) => {
      const totalLessons = Math.max(1, Number(item.total_lessons ?? 15));
      const baseDate = item.start_date ? new Date(`${item.start_date}T00:00:00`) : new Date(item.enrolled_at ?? Date.now());
      const scheduleSet = normalizeScheduleDays(item.schedule_days);
      const useAnyDay = scheduleSet.size === 0;
      const rows: HSKSlot[] = [];

      const cursor = new Date(baseDate);
      cursor.setHours(0, 0, 0, 0);
      let guard = 0;
      while (rows.length < totalLessons && guard < 1200) {
        guard += 1;
        const weekday = cursor.getDay();
        if (useAnyDay || scheduleSet.has(weekday)) {
          rows.push({
            slot_id: `${item.class_id ?? `CLASS-${classIndex + 1}`}-L${String(rows.length + 1).padStart(2, "0")}`,
            class_id: item.class_id ?? null,
            course_name: item.class_name ?? item.class_id ?? "Lớp học",
            teacher_id: item.teacher_id ?? null,
            teacher_name: item.teacher_name ?? null,
            teacher_staff_code: item.teacher_staff_code ?? null,
            session_date: makeIsoLike(cursor, item.start_time ?? "00:00:00"),
            actual_end_time: item.end_time ? makeIsoLike(cursor, item.end_time) : null,
            teacher_note: noteBySession.get(
              toSessionKey(
                item.class_id ?? null,
                makeIsoLike(cursor, item.start_time ?? "00:00:00"),
              ),
            ) ?? null,
            status: "confirmed",
            is_enrollment_only: true,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      return rows;
    });

    if (accountMode === "offline" && rowsFromEnrollments.length > 0) {
      return rowsFromEnrollments;
    }

    if (bookings.length > 0) return bookings;
    if (rowsFromEnrollments.length > 0) return rowsFromEnrollments;
    return [];
  }, [bookings, enrollments, accountMode, sessionNotes]);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Xin chào, {displayName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{myCode}</span>
            {accountType && <Badge variant="outline">Tài khoản: {accountType}</Badge>}
            {hasOnline && (
              <Badge variant="default" className="bg-success/15 text-success hover:bg-success/15">
                {myCode}-ON · Online
              </Badge>
            )}
            {hasOffline && (
              <Badge variant="secondary">{myCode}-OFF · Offline</Badge>
            )}
          </div>
        </div>
      </section>
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Kỹ năng hiện tại</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="skill" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Radar
                name="Học viên"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">*Điểm đánh giá nội bộ, sẽ cập nhật theo tiến độ thực tế</p>
      </div>

      {accountMode ? (
        <div className="space-y-8">
          {accountMode === "online" ? (
            <>
              <ProgressCards
                items={onlineCourses}
                onFreeze={(v) => freezeCourse(v)}
                onUnfreeze={(v) => unfreezeCourse(v)}
              />
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold">Đặt lịch 1-1 với giáo viên</h2>
                  <HSK_BookingDialog courses={onlineCourses} />
                </div>
                {onlineCourses.length === 0 && (
                  <p className="text-sm text-muted-foreground">Bạn chưa đăng ký khoá Online nào.</p>
                )}
              </section>
            </>
          ) : (
            <>
              <ProgressCards
                items={offlineCourses}
                onFreeze={(v) => freezeCourse(v)}
                onUnfreeze={(v) => unfreezeCourse(v)}
              />
              <section>
                <h2 className="mb-3 font-display text-lg font-semibold">Lịch lớp cố định</h2>
                <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                  Lớp Offline do <span className="font-medium text-foreground">Admin</span> sắp xếp và gán lịch. Bạn không thể tự đặt lịch — vui lòng liên hệ phòng CSKH nếu cần thay đổi.
                </div>
              </section>
            </>
          )}
        </div>
      ) : (
        <Tabs defaultValue={defaultMode}>
          <TabsList>
            <TabsTrigger value="online" disabled={!hasOnline && hasOffline}>
              Online (1-1)
            </TabsTrigger>
            <TabsTrigger value="offline" disabled={!hasOffline && hasOnline}>
              Offline (Lớp cố định)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="mt-6 space-y-8">
            <ProgressCards
              items={onlineCourses}
              onFreeze={(v) => freezeCourse(v)}
              onUnfreeze={(v) => unfreezeCourse(v)}
            />
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Đặt lịch 1-1 với giáo viên</h2>
                <HSK_BookingDialog courses={onlineCourses} />
              </div>
              {onlineCourses.length === 0 && (
                <p className="text-sm text-muted-foreground">Bạn chưa đăng ký khoá Online nào.</p>
              )}
            </section>
          </TabsContent>

          <TabsContent value="offline" className="mt-6 space-y-8">
            <ProgressCards
              items={offlineCourses}
              onFreeze={(v) => freezeCourse(v)}
              onUnfreeze={(v) => unfreezeCourse(v)}
            />
            <section>
              <h2 className="mb-3 font-display text-lg font-semibold">Lịch lớp cố định</h2>
              <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                Lớp Offline do <span className="font-medium text-foreground">Admin</span> sắp xếp và gán lịch. Bạn không thể tự đặt lịch — vui lòng liên hệ phòng CSKH nếu cần thay đổi.
              </div>
            </section>
          </TabsContent>
        </Tabs>
      )}

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Danh sách lịch học</h2>
        <BookingsTable
          bookings={bookingsForTable}
          ratedSlots={ratedSlots}
          onCancel={(id) => cancelSlot(id)}
        />
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Lớp học của tôi</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {enrollments.map((item: any) => (
            <div key={item.class_id} className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{item.class_name ?? item.class_id}</div>
                  <div className="text-xs text-muted-foreground">{item.course_id ?? "—"}</div>
                </div>
                <Badge variant={item.class_type === "online_1_1" ? "default" : "secondary"}>
                  {item.class_type === "online_1_1" ? "Online" : "Offline"}
                </Badge>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <div>Mã lớp: <span className="font-mono text-foreground">{item.class_id}</span></div>
                <div>Ngày bắt đầu: <span className="text-foreground">{item.start_date ?? "—"}</span></div>
                <div>Ngày kết thúc: <span className="text-foreground">{item.end_date ?? "—"}</span></div>
                <div>Giờ học: <span className="text-foreground">{item.start_time ?? "—"} - {item.end_time ?? "—"}</span></div>
              </div>
            </div>
          ))}
          {enrollments.length === 0 && (
            <p className="text-sm text-muted-foreground">Học viên hiện chưa có lớp học được gán trong CSDL.</p>
          )}
        </div>
      </section>

      <AssignmentsTable
        assignments={assignments}
        submissions={submissions}
        onSubmit={(assignmentId, text) => submitAssignment({ assignmentId, text })}
      />
    </div>
  );
}

