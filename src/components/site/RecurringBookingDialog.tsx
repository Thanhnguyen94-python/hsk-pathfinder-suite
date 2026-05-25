import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarRange } from "lucide-react";
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

export function RecurringBookingDialog({
  courses,
}: {
  courses: { course_id: string; learning_mode: string }[];
}) {
  const qc = useQueryClient();
  const fn = useServerFn(createRecurringBookings);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    courseId: courses[0]?.course_id ?? "HSK1",
    classId: `L-ON-${(courses[0]?.course_id ?? "HSK1")}-01`,
    startDate: today,
    endDate: today,
    startTime: "09:00",
    endTime: "10:00",
    weekdays: [1, 2, 3, 4, 5, 6, 0] as number[],
  });

  const preview = useMemo(() => {
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
  }, [form.startDate, form.endDate, form.weekdays]);

  const m = useMutation({
    mutationFn: () => fn({ data: form }),
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
        <Button>
          <CalendarRange className="mr-1.5 h-4 w-4" /> Đặt lịch theo dải ngày
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Đặt lịch 1-1 (Online)</DialogTitle>
          <DialogDescription>
            Tạo cùng lúc nhiều buổi học cố định theo khoảng ngày và giờ.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Khoá học</Label>
            <select
              value={form.courseId}
              onChange={(e) =>
                setForm({
                  ...form,
                  courseId: e.target.value,
                  classId: `L-ON-${e.target.value}-01`,
                })
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {courses.map((c) => (
                <option key={c.course_id} value={c.course_id}>
                  {c.course_id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Mã lớp</Label>
            <Input
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ngày bắt đầu</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ngày kết thúc</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Các ngày trong tuần</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const on = form.weekdays.includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => toggleWeekday(d.v)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-muted-foreground"
                    }`}
                  >
                    {d.l}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          Sẽ tạo <span className="font-semibold text-foreground">{preview}</span> buổi
          từ {form.startDate} đến {form.endDate} lúc {form.startTime}–{form.endTime}.
        </div>
        {m.isError && (
          <p className="text-sm text-destructive">{(m.error as Error).message}</p>
        )}
        <DialogFooter>
          <Button
            onClick={() => m.mutate()}
            disabled={preview === 0 || m.isPending || form.weekdays.length === 0}
          >
            Xác nhận tạo {preview} buổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
