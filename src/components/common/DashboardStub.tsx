import { Link } from "@tanstack/react-router";
import { ArrowLeft, Hammer } from "lucide-react";

export function DashboardStub({ role, accent }: { role: string; accent: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Về trang chủ
          </Link>
          <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${accent}`}>{role}</span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-foreground">
          <Hammer className="h-6 w-6" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
          Dashboard {role} đang được dựng
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          Mình đã hoàn tất layout & Public Homepage. Dashboard chi tiết cho vai trò này sẽ được
          triển khai ở bước tiếp theo theo đúng spec bạn đã mô tả.
        </p>
      </main>
    </div>
  );
}
