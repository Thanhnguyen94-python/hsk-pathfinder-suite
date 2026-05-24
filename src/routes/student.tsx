import { createFileRoute } from "@tanstack/react-router";
import { DashboardStub } from "@/components/site/DashboardStub";

export const Route = createFileRoute("/student")({
  head: () => ({ meta: [{ title: "Học viên · HSK Center" }] }),
  component: () => <DashboardStub role="Học viên" accent="bg-success/10 text-success" />,
});
