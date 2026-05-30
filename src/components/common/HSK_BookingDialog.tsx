import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarRange, AlertTriangle, Info } from "lucide-react";
import { createRecurringBookings } from "@/lib/hsk.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const WEEKDAYS = [
  { v: 1, l: "T2" },
  { v: 2, l: "T3" },
  { v: 3, l: "T4" },
  { v: 4, l: "T5" },
  { v: 5, l: "T6" },
  { v: 6, l: "T7" },
  { v: 0, l: "CN" },
];

interface CourseProgress {
  course_id: string;
  learning_mode: string;
  remaining_sessions: number;
  total_sessions: number;
  status: string;
}

export function HSK_BookingDialog({
  courses,
}: {
  courses: CourseProgress[];
}) {
  const qc = useQueryClient();
  const fn = useServerFn(createRecurringBookings);
  const [open, setOpen] = useState(false);

  // Default values
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const [bookingMode, setBookingMode] = useState<"single" | "recurring">("single");
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.course_id ?? "");

  const activeCourse = useMemo(() => {
    return courses.find((c) => c.course_id === selectedCourseId) || courses[0];
  }, [courses, selectedCourseId]);

  const [form, setForm] = useState({
    startDate: tomorrowStr,
    endDate: tomorrowStr,
    startTime: "09:00",
    endTime: "10:00",
    weekdays: [1, 2, 3, 4, 5, 6, 0] as number[],
  });

  const remainingSessions = activeCourse?.remaining_sessions ?? 0;
  const isOutOfSessions = remainingSessions <= 0;

  // Compute number of sessions based on selected dates and weekdays
  const previewCount = useMemo(() => {
    if (isOutOfSessions) return 0;

    if (bookingMode === "single") {
      return 1;
    }

    try {
      const s = new Date(form.startDate);
      const e = new Date(form.endDate);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
      let n = 0;
      const cur = new Date(s);
      while (cur <= e) {
        if (form.weekdays.includes(cur.getDay())) n++;
        cur.setDate(cur.getDate() + 1);
      }
      return n;
    } catch {
      return 0;
    }
  }, [form.startDate, form.endDate, form.weekdays, bookingMode, isOutOfSessions]);

  // Validation: Check if start datetime is >24 hours in the future
  const isDateTimeValid = useMemo(() => {
    try {
      const targetStr = `${form.startDate}T${form.startTime}`;
      const targetTime = new Date(targetStr).getTime();
      const limitTime = Date.now() + 24 * 60 * 60 * 1000; // current time + 24 hours
      return targetTime > limitTime;
    } catch {
      return false;
    }
  }, [form.startDate, form.startTime]);

  const m = useMutation({
    mutationFn: () => {
      // Build parameters based on mode
      const payload = {
        courseId: selectedCourseId,
        classId: `L-ON-${selectedCourseId}-01`,
        startDate: form.startDate,
        endDate: bookingMode === "single" ? form.startDate : form.endDate,
        startTime: form.startTime,
        endTime: form.endTime,
        weekdays:
          bookingMode === "single"
            ? [new Date(form.startDate).getDay()]
            : form.weekdays,
      };
      return fn({ data: payload });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["student-dash"] });
      setOpen(false);
      alert(`Đã tạo ${r.created} buổi. Bỏ qua: ${r.skipped}.`);
    },
  });

  const toggleWeekday = (v: number) =>
    setForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(v)
        ? f.weekdays.filter((x) => x !== v)
        : [...f.weekdays, v],
    }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-display">
          <CalendarRange className="mr-1.5 h-4 w-4" /> Đặt lịch học
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Đặt lịch học 1-1 (Online)</DialogTitle>
          <DialogDescription>
            Đăng ký học đơn hoặc đăng ký lịch cố định theo tuần. Đặt lịch trước ít nhất 24 giờ.
          </DialogDescription>
        </DialogHeader>

        {isOutOfSessions ? (
          <div className="flex gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Số buổi học trong gói đã hết</p>
              <p className="mt-0.5 text-xs opacity-90">
                Vui lòng đăng ký tiếp khóa học mới để tiếp tục đặt lịch học HSK.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Khóa học</Label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {courses.map((c) => (
                    <option key={c.course_id} value={c.course_id}>
                      {c.course_id} (Còn {c.remaining_sessions} buổi)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Chế độ đặt lịch</Label>
                <div className="flex rounded-md border border-input p-0.5">
                  <button
                    type="button"
                    onClick={() => setBookingMode("single")}
                    className={`flex-1 rounded-sm py-1.5 text-xs font-medium transition ${
                      bookingMode === "single"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Học đơn (1 buổi)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingMode("recurring")}
                    className={`flex-1 rounded-sm py-1.5 text-xs font-medium transition ${
                      bookingMode === "recurring"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Định kỳ (Nhiều buổi)
                  </button>
                </div>
              </div>

              {bookingMode === "single" ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Ngày học</Label>
                  <Input
                    type="date"
                    min={tomorrowStr}
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        startDate: e.target.value,
                        endDate: e.target.value,
                      })
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Ngày bắt đầu</Label>
                    <Input
                      type="date"
                      min={tomorrowStr}
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ngày kết thúc</Label>
                    <Input
                      type="date"
                      min={form.startDate}
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label>Giờ bắt đầu</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Giờ kết thúc</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>

              {bookingMode === "recurring" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Các thứ học trong tuần</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((d) => {
                      const on = form.weekdays.includes(d.v);
                      return (
                        <button
                          key={d.v}
                          type="button"
                          onClick={() => toggleWeekday(d.v)}
                          className={`rounded-md border h-9 w-9 text-xs font-semibold transition ${
                            on
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-input bg-background text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {d.l}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* DateTime Warning Notice */}
            {!isDateTimeValid && (
              <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-xs text-warning-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Thời điểm học phải cách thời gian hiện tại <strong>lớn hơn 24 tiếng</strong>. Vui lòng chọn ngày/giờ muộn hơn.
                </p>
              </div>
            )}

            {/* Info Preview */}
            {isDateTimeValid && (
              <div className="flex items-center gap-2 rounded-lg bg-info/10 p-3 text-xs text-info-foreground">
                <Info className="h-4 w-4 shrink-0 text-primary" />
                <p>
                  Hệ thống sẽ tạo <strong>{previewCount} buổi học</strong> từ ngày{" "}
                  {form.startDate}{" "}
                  {bookingMode === "recurring" && `đến ngày ${form.endDate}`} lúc{" "}
                  {form.startTime}–{form.endTime}.
                </p>
              </div>
            )}
          </div>
        )}

        {m.isError && (
          <p className="text-xs text-destructive">{(m.error as Error).message}</p>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          {!isOutOfSessions && (
            <Button
              onClick={() => m.mutate()}
              disabled={
                previewCount === 0 ||
                !isDateTimeValid ||
                m.isPending ||
                (bookingMode === "recurring" && form.weekdays.length === 0)
              }
            >
              {m.isPending ? "Đang xử lý..." : `Xác nhận đặt ${previewCount} buổi`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
