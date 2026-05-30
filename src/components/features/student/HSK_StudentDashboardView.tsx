import { useMemo } from "react";
import { useHSKStudentBookingViewModel } from "@/hooks/hsk-viewmodels/HSK_useBookingViewModel";
import { RatingDialog } from "@/components/common/RatingDialog";
import { RecurringBookingDialog } from "@/components/common/RecurringBookingDialog";
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

export function HSK_StudentDashboardView() {
  const {
    me,
    progress,
    bookings,
    ratedSlots,
    assignments,
    submissions,
    cancelSlot,
    freezeCourse,
    unfreezeCourse,
    submitAssignment,
  } = useHSKStudentBookingViewModel();

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
  const myId = me?.specific_id ?? "";

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Xin chào, {me?.full_name ?? "…"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{myId}</span>
            {hasOnline && (
              <Badge variant="default" className="bg-success/15 text-success hover:bg-success/15">
                {myId}-ON · Online
              </Badge>
            )}
            {hasOffline && (
              <Badge variant="secondary">{myId}-OFF · Offline</Badge>
            )}
          </div>
        </div>
      </section>
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Kỹ năng hiện tại</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillSampleData}>
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
              <h2 className="font-display text-lg font-semibold">
                Đặt lịch 1-1 với giáo viên
              </h2>
              {onlineCourses.length > 0 && (
                <RecurringBookingDialog
                  courses={onlineCourses.map((c) => ({
                    course_id: c.course_id,
                    learning_mode: c.learning_mode,
                  }))}
                />
              )}
            </div>
            {onlineCourses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Bạn chưa đăng ký khoá Online nào.
              </p>
            )}
          </section>
          <BookingsTable
            bookings={bookings.filter((b: HSKSlot) =>
              (b.class_id ?? "").includes("-ON-"),
            )}
            ratedSlots={ratedSlots}
            onCancel={(id) => cancelSlot(id)}
          />
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
          <BookingsTable
            bookings={bookings.filter((b: HSKSlot) =>
              (b.class_id ?? "").includes("-OFF-"),
            )}
            ratedSlots={ratedSlots}
            onCancel={(id) => cancelSlot(id)}
          />
        </TabsContent>
      </Tabs>

      <AssignmentsTable
        assignments={assignments}
        submissions={submissions}
        onSubmit={(assignmentId, text) => submitAssignment({ assignmentId, text })}
      />
    </div>
  );
}

