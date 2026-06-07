import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/common/DashboardShell";
import { HSK_ProfileDashboardView } from "@/components/features/profile/HSK_ProfileDashboardView";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Trang cá nhân · HSK Center" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <DashboardShell role="Cá nhân" accent="bg-accent/10 text-foreground">
      <HSK_ProfileDashboardView />
    </DashboardShell>
  );
}
