import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-success/10 blur-3xl" />
        <div className="absolute right-0 top-20 h-[300px] w-[300px] rounded-full bg-brand/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-success" />
            Hệ thống quản lý trung tâm Hán ngữ · HSK 1 → 6
          </div>
          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Vận hành lớp tiếng Trung
            <span className="block text-success">gọn — minh bạch — đúng chuẩn HSK.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Một nền tảng cho cả Học viên, Giáo viên, Logistics và Admin: đặt lịch 1-1,
            quản lý lớp offline, theo dõi bài tập HSK và audit log toàn hệ thống.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#login"
              className="group inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
            >
              Chọn vai trò để vào dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#features"
              className="inline-flex h-11 items-center rounded-md border border-input bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Xem tính năng
            </a>
          </div>

          {/* Stats strip */}
          <div className="mx-auto mt-14 grid max-w-2xl grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card/60 backdrop-blur">
            {[
              { v: "6", l: "Cấp độ HSK" },
              { v: "1-1", l: "& Offline group" },
              { v: "100%", l: "Hành động được log" },
            ].map((s) => (
              <div key={s.l} className="px-4 py-5">
                <div className="font-display text-2xl font-bold text-foreground">{s.v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
