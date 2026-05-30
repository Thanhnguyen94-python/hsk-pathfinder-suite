import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/common/DashboardShell";
import { HSK_TeacherDashboardView } from "@/components/features/teacher/HSK_TeacherDashboardView";

export const Route = createFileRoute("/teacher")({
  head: () => ({ meta: [{ title: "Giáo viên · HSK Center" }] }),
  component: TeacherDashboard,
});

function TeacherDashboard() {
  return (
    <DashboardShell role="Giáo viên" accent="bg-primary/10 text-primary">
      <HSK_TeacherDashboardView />
    </DashboardShell>
  );
}
