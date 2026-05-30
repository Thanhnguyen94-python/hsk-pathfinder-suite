import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/common/DashboardShell";
import { HSK_AdminPanelView } from "@/components/features/admin/HSK_AdminPanelView";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · HSK Center" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <DashboardShell role="Admin" accent="bg-brand/10 text-brand">
      <HSK_AdminPanelView />
    </DashboardShell>
  );
}
