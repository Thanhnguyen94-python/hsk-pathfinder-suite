import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export function DashboardShell({
  role,
  accent,
  children,
}: {
  role: string;
  accent: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Đang tải…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Về trang chủ
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/care"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              CSKH
            </Link>
            <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${accent}`}>
              {role}
            </span>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="mr-1.5 h-4 w-4" /> Đăng xuất
            </Button>
          </div>

        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
