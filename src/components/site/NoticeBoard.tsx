import { Megaphone } from "lucide-react";
import { notices } from "@/data/mock";

export function NoticeBoard() {
  return (
    <section id="notices" className="border-b border-border/60 bg-secondary/40 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-brand">
              Bảng tin trung tâm
            </div>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Thông báo mới nhất.
            </h2>
          </div>
          <Megaphone className="hidden h-10 w-10 text-brand/70 sm:block" />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {notices.map((n) => (
            <article
              key={n.id}
              className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                  {n.tag}
                </span>
                <time className="text-[11px] text-muted-foreground">{n.date}</time>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold leading-snug">{n.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
