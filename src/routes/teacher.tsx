import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/site/DashboardShell";
import {
  claimSlot,
  getTeacherDashboard,
  teacherCancelBooking,
} from "@/lib/hsk.functions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/teacher")({
  head: () => ({ meta: [{ title: "Giáo viên · HSK Center" }] }),
  component: () => (
    <DashboardShell role="Giáo viên" accent="bg-primary/10 text-primary">
      <Inner />
    </DashboardShell>
  ),
});

function Inner() {
  const qc = useQueryClient();
  const dash = useServerFn(getTeacherDashboard);
  const claim = useServerFn(claimSlot);
  const cancel = useServerFn(teacherCancelBooking);
  const q = useQuery({ queryKey: ["teacher-dash"], queryFn: () => dash() });

  const refresh = () => qc.invalidateQueries({ queryKey: ["teacher-dash"] });
  const claimM = useMutation({
    mutationFn: (slotId: string) => claim({ data: { slotId } }),
    onSuccess: refresh,
  });
  const cancelM = useMutation({
    mutationFn: (slotId: string) => cancel({ data: { slotId } }),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">
          Slot pending — sẵn sàng nhận
        </h2>
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slot</TableHead>
                <TableHead>Học viên</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data?.pendingSlots ?? []).map((b: any) => (
                <TableRow key={b.slot_id}>
                  <TableCell className="font-mono text-xs">{b.slot_id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{b.student_name ?? "—"}</div>
                    <div className="font-mono text-xs text-muted-foreground">{b.student_id}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{b.class_id}</TableCell>
                  <TableCell>{new Date(b.session_date).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => claimM.mutate(b.slot_id)}>
                      Nhận
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {(q.data?.pendingSlots ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Không có slot nào đang chờ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Lịch dạy của tôi</h2>
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slot</TableHead>
                <TableHead>Học viên</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data?.myBookings ?? [])
                .filter((b: any) => b.status === "confirmed")
                .map((b: any) => (
                  <TableRow key={b.slot_id}>
                    <TableCell className="font-mono text-xs">{b.slot_id}</TableCell>
                    <TableCell>{b.student_id}</TableCell>
                    <TableCell>{new Date(b.session_date).toLocaleString()}</TableCell>
                    <TableCell>{b.status}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelM.mutate(b.slot_id)}
                      >
                        Huỷ (penalty nếu &lt;6h)
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Penalty của tôi</h2>
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slot</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead>Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data?.penalties ?? []).map((p: any) => (
                <TableRow key={p.penalty_id}>
                  <TableCell className="font-mono text-xs">{p.slot_id}</TableCell>
                  <TableCell className="text-destructive">{p.reason}</TableCell>
                  <TableCell>{new Date(p.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {(q.data?.penalties ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Không có vi phạm
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
