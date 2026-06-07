import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/common/DashboardShell";
import { HSK_CareDashboardView } from "@/components/features/care/HSK_CareDashboardView";

export const Route = createFileRoute("/care")({
  head: () => ({ meta: [{ title: "Chăm sóc khách hàng · HSK Center" }] }),
  component: () => (
    <DashboardShell role="CSKH" accent="bg-accent/30 text-foreground">
      <HSK_CareDashboardView />
    </DashboardShell>
  ),
});
