import { createFileRoute } from "@tanstack/react-router";
import { DashboardStub } from "@/components/site/DashboardStub";

export const Route = createFileRoute("/teacher")({
  head: () => ({ meta: [{ title: "Giáo viên · HSK Center" }] }),
  component: () => <DashboardStub role="Giáo viên" accent="bg-primary/10 text-primary" />,
});
