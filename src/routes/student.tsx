import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardShell } from "@/components/site/DashboardShell";
import { RatingDialog } from "@/components/site/RatingDialog";
import {
  getStudentDashboard,
  studentCancelBooking,
  freezeCourse,
  unfreezeCourse,
  expireStaleFreezes,
  createBooking,
  getMe,
  getMyRatings,
  listAssignments,
  listSubmissions,
  submitAssignment,
} from "@/lib/hsk.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

export const Route = createFileRoute("/student")({
  head: () => ({ meta: [{ title: "Học viên · HSK Center" }] }),
  component: StudentDashboard,
});

function StudentDashboard() {
  return (
    <DashboardShell role="Học viên" accent="bg-success/10 text-success">
      <Inner />
    </DashboardShell>
  );
}

function Inner() {
  const qc = useQueryClient();
  const dash = useServerFn(getStudentDashboard);
  const me = useServerFn(getMe);
  const expire = useServerFn(expireStaleFreezes);
  const cancel = useServerFn(studentCancelBooking);
  const freeze = useServerFn(freezeCourse);
  const unfreeze = useServerFn(unfreezeCourse);
  const book = useServerFn(createBooking);

  // Trigger 30-day expiry sweep on session start
  useEffect(() => {
    expire().catch(() => {});
  }, [expire]);

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => me() });
  const dashQ = useQuery({ queryKey: ["student-dash"], queryFn: () => dash() });
  const ratingsFn = useServerFn(getMyRatings);
  const ratingsQ = useQuery({ queryKey: ["my-ratings"], queryFn: () => ratingsFn() });
  const assignmentsFn = useServerFn(listAssignments);
  const submissionsFn = useServerFn(listSubmissions);
  const submitFn = useServerFn(submitAssignment);
  const assignmentsQ = useQuery({
    queryKey: ["assignments"],
    queryFn: () => assignmentsFn(),
  });
  const submissionsQ = useQuery({
    queryKey: ["my-submissions"],
    queryFn: () => submissionsFn(),
  });
  const submitM = useMutation({
    mutationFn: (v: { assignmentId: string; text: string }) =>
      submitFn({ data: { assignmentId: v.assignmentId, text: v.text } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-submissions"] }),
  });
  const ratedSlots = new Set(
    (ratingsQ.data ?? []).map((r: any) => r.slot_id),
  );

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["student-dash"] });

  const cancelM = useMutation({
    mutationFn: (slotId: string) => cancel({ data: { slotId } }),
    onSuccess: refresh,
  });
  const freezeM = useMutation({
    mutationFn: (v: { studentId: string; courseId: string }) =>
      freeze({ data: v }),
    onSuccess: refresh,
  });
  const unfreezeM = useMutation({
    mutationFn: (v: { studentId: string; courseId: string }) =>
      unfreeze({ data: v }),
    onSuccess: refresh,
  });

  const [form, setForm] = useState({
    classId: "L-ON-TEST-01",
    sessionDate: "",
  });
  const bookM = useMutation({
    mutationFn: () =>
      book({
        data: {
          slotId: `SLOT-${Date.now()}`,
          classId: form.classId,
          sessionDate: new Date(form.sessionDate).toISOString(),
        },
      }),
    onSuccess: refresh,
  });

  const myId = meQ.data?.specific_id ?? "";

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-2xl font-bold">
          Xin chào, {meQ.data?.full_name ?? "…"}
        </h1>
        <p className="text-sm text-muted-foreground">ID: {myId}</p>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Tiến độ khoá học</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(dashQ.data?.progress ?? []).map((p: any) => {
            const pct =
              p.total_sessions > 0
                ? ((p.total_sessions - p.remaining_sessions) / p.total_sessions) * 100
                : 0;
            return (
              <div key={p.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{p.course_id}</div>
                    <div className="text-xs text-muted-foreground">
                      Còn {p.remaining_sessions}/{p.total_sessions} buổi
                    </div>
                  </div>
                  <Badge
                    variant={
                      p.status === "active"
                        ? "default"
                        : p.status === "frozen"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {p.status}
                  </Badge>
                </div>
                <Progress value={pct} className="mt-3" />
                <div className="mt-3 flex gap-2">
                  {p.status !== "frozen" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        freezeM.mutate({ studentId: p.student_id, courseId: p.course_id })
                      }
                    >
                      Bảo lưu
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        unfreezeM.mutate({
                          studentId: p.student_id,
                          courseId: p.course_id,
                        })
                      }
                    >
                      Kích hoạt lại
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {dashQ.data?.progress.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Chưa có khoá học nào — admin sẽ gán khoá cho bạn.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Đặt lịch 1-1</h2>
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="cid">Class ID</Label>
            <Input
              id="cid"
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
              className="w-48"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dt">Thời gian</Label>
            <Input
              id="dt"
              type="datetime-local"
              value={form.sessionDate}
              onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
            />
          </div>
          <Button
            onClick={() => bookM.mutate()}
            disabled={!form.sessionDate || bookM.isPending}
          >
            Tạo slot pending
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Lịch học của tôi</h2>
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slot</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Giáo viên</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(dashQ.data?.bookings ?? []).map((b: any) => (
                <TableRow key={b.slot_id}>
                  <TableCell className="font-mono text-xs">{b.slot_id}</TableCell>
                  <TableCell>{b.class_id}</TableCell>
                  <TableCell>{b.teacher_id ?? "—"}</TableCell>
                  <TableCell>{new Date(b.session_date).toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell>
                    {(b.status === "pending" || b.status === "confirmed") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelM.mutate(b.slot_id)}
                      >
                        Huỷ
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(dashQ.data?.bookings ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Chưa có booking
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning-foreground",
    confirmed: "bg-success/10 text-success",
    cancelled_valid: "bg-muted text-muted-foreground",
    cancelled_late: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${map[status] ?? ""}`}>
      {status}
    </span>
  );
}
