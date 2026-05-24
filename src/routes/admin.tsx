import { createFileRoute } from "@tanstack/react-router";
import { DashboardStub } from "@/components/site/DashboardStub";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · HSK Center" }] }),
  component: () => <DashboardStub role="Admin" accent="bg-brand/10 text-brand" />,
});
