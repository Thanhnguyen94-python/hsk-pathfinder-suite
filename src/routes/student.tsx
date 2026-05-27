import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/site/DashboardShell";
import { HSK_StudentDashboardView } from "@/components/hsk-views/HSK_StudentDashboardView";

export const Route = createFileRoute("/student")({
  head: () => ({ meta: [{ title: "Học viên · HSK Center" }] }),
  component: StudentDashboard,
});

function StudentDashboard() {
  return (
    <DashboardShell role="Học viên" accent="bg-success/10 text-success">
      <HSK_StudentDashboardView />
    </DashboardShell>
  );
}
