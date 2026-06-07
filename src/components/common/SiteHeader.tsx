import { Link } from "@tanstack/react-router";
import { Languages } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="font-display text-lg font-bold">汉</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-semibold tracking-tight">HSK Center</div>
            <div className="text-[11px] text-muted-foreground">Trung tâm Hán ngữ</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">Tính năng</a>
          <a href="#notices" className="transition-colors hover:text-foreground">Bảng tin</a>
          <a href="#login" className="transition-colors hover:text-foreground">Đăng nhập</a>
          <Link to="/care" className="transition-colors hover:text-foreground">CSKH</Link>
        </nav>
        <Link
          to="/auth"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Languages className="h-4 w-4" />
          Vào hệ thống
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-secondary/30">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center lg:px-8">
        <div>© 2026 HSK Center · Hán Ngữ Kiều Kiều.</div>
        <div className="flex gap-6">
          <span>HSK 1 — 6</span>
          <span>Lịch học online 1-1 & Offline</span>
          <span>v0.1 mock</span>
        </div>
      </div>
    </footer>
  );
}
