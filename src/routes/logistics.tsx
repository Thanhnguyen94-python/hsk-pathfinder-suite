import { createFileRoute } from "@tanstack/react-router";
import { DashboardStub } from "@/components/site/DashboardStub";

export const Route = createFileRoute("/logistics")({
  head: () => ({ meta: [{ title: "Logistics · HSK Center" }] }),
  component: () => <DashboardStub role="Logistics" accent="bg-warning/20 text-warning-foreground" />,
});
