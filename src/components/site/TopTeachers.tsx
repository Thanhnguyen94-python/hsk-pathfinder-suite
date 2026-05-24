import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, Award } from "lucide-react";
import { getTopTeachers } from "@/lib/public.functions";

export function TopTeachers() {
  const fn = useServerFn(getTopTeachers);
  const q = useQuery({
    queryKey: ["top-teachers"],
    queryFn: () => fn(),
  });

  const teachers = q.data ?? [];
  if (teachers.length === 0) return null;

  return (
    <section className="border-b border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-warning">
            <Award className="h-3.5 w-3.5" />
            Giáo viên xuất sắc
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            Top giáo viên được học viên đánh giá cao
          </h2>
          <p className="mt-3 text-muted-foreground">
            Xếp hạng thời gian thực dựa trên feedback của học viên sau mỗi buổi học.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {teachers.map((t: any, i: number) => (
            <div
              key={t.teacher_id}
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-success/10 blur-2xl" />
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-success">
                #{i + 1} · {t.teacher_id}
              </div>
              <div className="mt-3 font-display text-xl font-bold">{t.full_name}</div>
              <div className="mt-4 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-5 w-5 ${
                      n <= Math.round(Number(t.avg_stars))
                        ? "fill-warning text-warning"
                        : "text-muted-foreground/40"
                    }`}
                  />
                ))}
                <span className="ml-2 font-display text-lg font-bold">
                  {Number(t.avg_stars).toFixed(1)}
                </span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {t.total_reviews} đánh giá · Chuyên HSK 1-6
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
