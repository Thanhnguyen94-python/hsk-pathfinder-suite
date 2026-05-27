import { Calendar, Users, ClipboardList, ShieldCheck, type LucideIcon } from "lucide-react";
import { features } from "@/data/mock";

const iconMap: Record<string, LucideIcon> = {
  calendar: Calendar,
  users: Users,
  clipboard: ClipboardList,
  shield: ShieldCheck,
};

export function Features() {
  return (
    <section id="features" className="border-b border-border/60 bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-success">
            Tính năng cốt lõi
          </div>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Mọi nghiệp vụ trung tâm trong một hệ thống.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Được thiết kế cho lớp 1-1 linh hoạt và lớp offline cố định, kèm công cụ audit minh bạch.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => {
            const Icon = iconMap[f.icon] ?? Calendar;
            return (
              <div
                key={f.title}
                className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-success/40 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-success/10 text-success ring-1 ring-success/20">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-5 font-display text-base font-semibold">{f.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                <div className="absolute right-5 top-5 text-[11px] font-medium text-muted-foreground/70">
                  0{i + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
