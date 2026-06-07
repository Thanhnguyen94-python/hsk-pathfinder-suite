import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/common/DashboardShell";
import { HSK_LogisticsDashboardView } from "@/components/features/logistics/HSK_LogisticsDashboardView";

export const Route = createFileRoute("/logistics")({
  head: () => ({ meta: [{ title: "Logistics · HSK Center" }] }),
  component: () => (
    <DashboardShell role="Logistics" accent="bg-warning/20 text-warning-foreground">
      <HSK_LogisticsDashboardView />
    </DashboardShell>
  ),
});
