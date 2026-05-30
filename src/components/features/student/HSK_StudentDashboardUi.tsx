import { useState } from "react";
import { RatingDialog } from "@/components/common/RatingDialog";
import { Button } from "@/components/ui/button";
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
import type { HSKSlot } from "@/types/hsk-models/hsk-booking.types";

export function ProgressCards({
  items,
  onFreeze,
  onUnfreeze,
}: {
  items: any[];
  onFreeze: (v: { studentId: string; courseId: string }) => void;
  onUnfreeze: (v: { studentId: string; courseId: string }) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Tiến độ khoá học</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((p) => {
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
                    Còn {p.remaining_sessions}/{p.total_sessions} buổi · {p.learning_mode}
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
                    onClick={() => onFreeze({ studentId: p.student_id, courseId: p.course_id })}
                  >
                    Bảo lưu
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUnfreeze({ studentId: p.student_id, courseId: p.course_id })}
                  >
                    Kích hoạt lại
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function BookingsTable({
  bookings,
  ratedSlots,
  onCancel,
}: {
  bookings: HSKSlot[];
  ratedSlots: Set<any>;
  onCancel: (slotId: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Lịch học của tôi</h2>
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slot</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Giáo viên</TableHead>
              <TableHead>Bắt đầu</TableHead>
              <TableHead>Kết thúc</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.slot_id}>
                <TableCell className="font-mono text-xs">{b.slot_id}</TableCell>
                <TableCell className="font-mono text-xs">{b.class_id}</TableCell>
                <TableCell>
                  {b.teacher_name ? (
                    <>
                      <div className="font-medium">{b.teacher_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{b.teacher_id}</div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Chờ nhận</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(b.session_date).toLocaleString()}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {b.session_end_date
                    ? new Date(b.session_end_date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={b.status} />
                </TableCell>
                <TableCell className="space-x-2">
                  {(b.status === "pending" || b.status === "confirmed") &&
                    new Date(b.session_date) > new Date() && (
                      <Button size="sm" variant="outline" onClick={() => onCancel(b.slot_id)}>
                        Huỷ
                      </Button>
                    )}
                  {b.teacher_id &&
                    new Date(b.session_date) <= new Date() &&
                    (b.status === "confirmed" || b.status === "pending") &&
                    !ratedSlots.has(b.slot_id) && (
                      <RatingDialog slotId={b.slot_id} teacherId={b.teacher_id} />
                    )}
                  {ratedSlots.has(b.slot_id) && (
                    <span className="text-xs text-success">Đã đánh giá</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {bookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Chưa có buổi học nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function AssignmentRow({
  assignment,
  submission,
  onSubmit,
}: {
  assignment: any;
  submission: any;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState(submission?.submission_text ?? "");

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{assignment.course_id}</TableCell>
      <TableCell>
        <div className="font-medium">{assignment.title}</div>
        {assignment.description && (
          <div className="text-xs text-muted-foreground line-clamp-1">{assignment.description}</div>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        {new Date(assignment.deadline).toLocaleString()}
      </TableCell>
      <TableCell className="text-xs">
        {submission ? (
          <span>
            Đã nộp · điểm: <span className="font-semibold">{submission.score ?? "—"}</span>
            {submission.reviewer_comment && (
              <div className="text-muted-foreground">{submission.reviewer_comment}</div>
            )}
          </span>
        ) : (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nội dung bài làm…"
            className="h-9 w-full rounded-md border border-input bg-background px-2"
          />
        )}
      </TableCell>
      <TableCell>
        {!submission && (
          <Button size="sm" disabled={!text} onClick={() => onSubmit(text)}>
            Nộp
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function AssignmentsTable({
  assignments,
  submissions,
  onSubmit,
}: {
  assignments: any[];
  submissions: any[];
  onSubmit: (assignmentId: string, text: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Bài tập HSK</h2>
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khoá</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Hạn nộp</TableHead>
              <TableHead>Bài nộp / điểm</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => {
              const sub = submissions.find((s: any) => s.assignment_id === a.assignment_id);
              return (
                <AssignmentRow
                  key={a.assignment_id}
                  assignment={a}
                  submission={sub}
                  onSubmit={(text) => onSubmit(a.assignment_id, text)}
                />
              );
            })}
            {assignments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Chưa có bài tập nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
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
