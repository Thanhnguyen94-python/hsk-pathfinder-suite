import { Link } from "@tanstack/react-router";
import { GraduationCap, Presentation, PackageOpen, ShieldCheck, ArrowUpRight } from "lucide-react";
import type { Role } from "@/data/mock";

const cards: {
  role: Role;
  title: string;
  desc: string;
  icon: typeof GraduationCap;
  tone: "success" | "primary" | "warning" | "brand";
  to: "/student" | "/teacher" | "/logistics" | "/admin";
}[] = [
  { role: "student", title: "Học viên", desc: "Gói học, đặt lịch, bài tập HSK.", icon: GraduationCap, tone: "success", to: "/student" },
  { role: "teacher", title: "Giáo viên", desc: "Lịch dạy, nhận lớp 1-1, whiteboard.", icon: Presentation, tone: "primary", to: "/teacher" },
  { role: "logistics", title: "Logistics", desc: "Quản lý giáo trình & tài liệu.", icon: PackageOpen, tone: "warning", to: "/logistics" },
  { role: "admin", title: "Admin", desc: "Mapping, audit log, phạt giáo viên.", icon: ShieldCheck, tone: "brand", to: "/admin" },
];

const toneStyles: Record<string, string> = {
  success: "bg-success/10 text-success ring-success/20",
  primary: "bg-primary/10 text-primary ring-primary/20",
  warning: "bg-warning/15 text-warning-foreground ring-warning/30",
  brand: "bg-brand/10 text-brand ring-brand/20",
};

export function LoginPortal() {
  return (
    <section id="login" className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-success">
            Cổng đăng nhập
          </div>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Chọn vai trò để vào dashboard.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Bản demo — chọn một vai trò để xem giao diện tương ứng (chưa có xác thực thật).
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.role}
                to={c.to}
                className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${toneStyles[c.tone]}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mt-5 font-display text-lg font-semibold">{c.title}</div>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {c.desc}
                </p>
                <div className="mt-5 flex items-center justify-between text-sm font-medium text-foreground">
                  <span>Vào dashboard</span>
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
