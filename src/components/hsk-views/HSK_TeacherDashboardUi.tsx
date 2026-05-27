import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HSKSlot } from "@/types/hsk-models/hsk-booking.types";

export function PendingSlotsTable({
  pendingSlots,
  onClaim,
}: {
  pendingSlots: HSKSlot[];
  onClaim: (slotId: string) => void;
}) {
  return (
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
            {pendingSlots.map((b) => (
              <TableRow key={b.slot_id}>
                <TableCell className="font-mono text-xs">{b.slot_id}</TableCell>
                <TableCell>
                  <div className="font-medium">{b.student_name ?? "—"}</div>
                  <div className="font-mono text-xs text-muted-foreground">{b.student_id}</div>
                </TableCell>
                <TableCell className="font-mono text-xs">{b.class_id}</TableCell>
                <TableCell>{new Date(b.session_date).toLocaleString()}</TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => onClaim(b.slot_id)}>
                    Nhận
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {pendingSlots.length === 0 && (
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
  );
}

export function MyBookingsTable({
  myBookings,
  onCancel,
}: {
  myBookings: HSKSlot[];
  onCancel: (slotId: string) => void;
}) {
  return (
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
            {myBookings
              .filter((b) => b.status === "confirmed")
              .map((b) => (
                <TableRow key={b.slot_id}>
                  <TableCell className="font-mono text-xs">{b.slot_id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{b.student_name ?? "—"}</div>
                    <div className="font-mono text-xs text-muted-foreground">{b.student_id}</div>
                  </TableCell>
                  <TableCell>{new Date(b.session_date).toLocaleString()}</TableCell>
                  <TableCell>{b.status}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => onCancel(b.slot_id)}>
                      Huỷ (penalty nếu &lt;6h)
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function PenaltiesTable({
  penalties,
}: {
  penalties: any[];
}) {
  return (
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
            {penalties.map((p) => (
              <TableRow key={p.penalty_id}>
                <TableCell className="font-mono text-xs">{p.slot_id}</TableCell>
                <TableCell className="text-destructive">{p.reason}</TableCell>
                <TableCell>{new Date(p.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {penalties.length === 0 && (
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
  );
}
