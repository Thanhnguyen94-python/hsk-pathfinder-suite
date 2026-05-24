import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardShell } from "@/components/site/DashboardShell";
import {
  assignStudentToOfflineClass,
  getAuditLogs,
} from "@/lib/hsk.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · HSK Center" }] }),
  component: () => (
    <DashboardShell role="Admin" accent="bg-brand/10 text-brand">
      <Inner />
    </DashboardShell>
  ),
});

function Inner() {
  const qc = useQueryClient();
  const logsFn = useServerFn(getAuditLogs);
  const assignFn = useServerFn(assignStudentToOfflineClass);
  const logs = useQuery({ queryKey: ["audit"], queryFn: () => logsFn() });

  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const assignM = useMutation({
    mutationFn: () => assignFn({ data: { studentId, classId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit"] });
      setStudentId("");
      setClassId("");
    },
  });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">
          Mapping học viên → lớp offline
        </h2>
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label>Student ID (HV-…)</Label>
            <Input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-56"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Class ID (L-OFF-…)</Label>
            <Input
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-64"
            />
          </div>
          <Button
            onClick={() => assignM.mutate()}
            disabled={!studentId || !classId || assignM.isPending}
          >
            Gán vào lớp
          </Button>
          {assignM.isError && (
            <p className="text-sm text-destructive">
              {(assignM.error as Error).message}
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Audit logs</h2>
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs.data ?? []).map((l: any) => (
                <TableRow key={l.log_id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(l.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {l.user_specific_id ?? l.user_id?.slice(0, 8) ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">{l.action}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {JSON.stringify(l.details)}
                  </TableCell>
                </TableRow>
              ))}
              {(logs.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {logs.isLoading ? "Đang tải…" : "Chưa có log nào"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
