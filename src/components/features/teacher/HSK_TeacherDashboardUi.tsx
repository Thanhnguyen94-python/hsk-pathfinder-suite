import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Star, UserSearch, AlertTriangle } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { HSKSlot } from "@/types/hsk-models/hsk-booking.types";

// ─── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Chờ nhận", variant: "secondary" },
    confirmed: { label: "Đã xác nhận", variant: "default" },
    cancelled: { label: "Đã huỷ", variant: "destructive" },
    completed: { label: "Hoàn thành", variant: "outline" },
  };
  const cfg = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ─── Spider-chart helper ──────────────────────────────────────────────────────
const SKILL_LABELS: Record<string, string> = {
  listening: "Nghe",
  speaking: "Nói",
  reading: "Đọc",
  writing: "Viết",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
};
const SKILL_KEYS = Object.keys(SKILL_LABELS) as Array<keyof typeof SKILL_LABELS>;

function SkillRadarChart({ skills }: { skills: Array<{ skill: string; avg_score: number }> }) {
  const data = SKILL_KEYS.map((key) => {
    const found = skills.find((s) => s.skill === key);
    return { subject: SKILL_LABELS[key], value: found ? Math.round(found.avg_score) : 0 };
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar name="Kỹ năng" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
        <Tooltip formatter={(v: number) => [`${v}/100`, "Điểm TB"]} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Student lookup + Evaluate modal ────────────────────────────────────────
type EvalPayload = {
  slotId: string;
  studentId: string;
  listening: number; speaking: number; reading: number;
  writing: number; vocabulary: number; grammar: number;
  generalComment?: string;
};

interface StudentLookupPanelProps {
  /** Slots xác nhận thuộc giáo viên này để validate */
  myConfirmedSlots: HSKSlot[];
  onLookup: (studentId: string) => void;
  lookupResult?: { student: { specific_id: string; full_name: string }; skills: any[] } | null;
  lookupLoading: boolean;
  lookupError?: Error | null;
  onSubmitEvaluation: (payload: EvalPayload) => void;
  evaluationPending: boolean;
  evaluationError?: Error | null;
  evaluationSuccess: boolean;
}

export function StudentLookupPanel({
  myConfirmedSlots,
  onLookup,
  lookupResult,
  lookupLoading,
  lookupError,
  onSubmitEvaluation,
  evaluationPending,
  evaluationError,
  evaluationSuccess,
}: StudentLookupPanelProps) {
  const [query, setQuery] = useState("");
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({
    listening: 70, speaking: 70, reading: 70,
    writing: 70, vocabulary: 70, grammar: 70,
  });
  const [evalNotes, setEvalNotes] = useState("");

  const lookupData = lookupResult;

  function handleSearch() {
    const id = query.trim();
    if (!id) return;
    onLookup(id);
  }

  // Slot confirmed của giáo viên có học viên đang xem
  const eligibleSlots = myConfirmedSlots.filter(
    (s) => s.student_id === lookupData?.student.specific_id && s.status === "confirmed",
  );

  function openEvalModal() {
    setSelectedSlotId(eligibleSlots[0]?.slot_id ?? "");
    setShowEvalModal(true);
  }

  function handleSubmitEval() {
    if (!lookupData || !selectedSlotId) return;
    onSubmitEvaluation({
      slotId: selectedSlotId,
      studentId: lookupData.student.specific_id,
      ...Object.fromEntries(SKILL_KEYS.map((k) => [k, scores[k]])) as any,
      generalComment: evalNotes || undefined,
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-display text-base font-semibold flex items-center gap-2">
        <UserSearch className="h-4 w-4 text-primary" />
        Tra cứu kỹ năng học viên
      </h2>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <Input
          id="teacher-student-search"
          placeholder="Nhập ID học viên (vd: STU-0001)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-xs font-mono"
        />
        <Button onClick={handleSearch} disabled={lookupLoading || !query.trim()} size="sm" id="btn-search-student">
          {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="ml-1">Tìm</span>
        </Button>
      </div>

      {/* Error */}
      {lookupError && (
        <p className="text-sm text-muted-foreground">{lookupError.message ?? "Không tìm thấy học viên."}</p>
      )}

      {lookupData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold">{lookupData.student.full_name}</p>
              <p className="text-xs text-muted-foreground font-mono">{lookupData.student.specific_id}</p>
            </div>
            {eligibleSlots.length > 0 && (
              <Button size="sm" variant="default" onClick={openEvalModal} id="btn-open-eval">
                <Star className="h-4 w-4 mr-1" />
                Đánh giá kỹ năng
              </Button>
            )}
            {eligibleSlots.length === 0 && (
              <Badge variant="outline" className="text-muted-foreground text-xs">
                Chưa có slot confirmed để đánh giá
              </Badge>
            )}
          </div>
          {lookupData.skills.length > 0 ? (
            <SkillRadarChart skills={lookupData.skills} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Chưa có đánh giá kỹ năng nào.
            </p>
          )}
        </div>
      )}

      {/* Evaluation modal */}
      <Dialog open={showEvalModal} onOpenChange={setShowEvalModal}>
        <DialogContent className="max-w-lg" id="eval-modal">
          <DialogHeader>
            <DialogTitle>Đánh giá kỹ năng học viên</DialogTitle>
            <DialogDescription>
              Thang điểm <strong>0 – 100</strong> cho mỗi kỹ năng. Mỗi buổi học chỉ được đánh giá <strong>một lần</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Slot selector — only confirmed slots of this student */}
          <div className="space-y-1">
            <Label htmlFor="eval-slot-select">Buổi học (Slot ID)</Label>
            <select
              id="eval-slot-select"
              value={selectedSlotId}
              onChange={(e) => setSelectedSlotId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            >
              {eligibleSlots.map((s) => (
                <option key={s.slot_id} value={s.slot_id}>
                  {s.slot_id} — {new Date(s.session_date).toLocaleDateString("vi-VN")}
                </option>
              ))}
            </select>
          </div>

          {/* Score sliders */}
          <div className="space-y-4 pt-1">
            {SKILL_KEYS.map((key) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <Label>{SKILL_LABELS[key]}</Label>
                  <span className="font-mono font-semibold text-primary">{scores[key]}</span>
                </div>
                <Slider
                  id={`eval-slider-${key}`}
                  min={0} max={100} step={5}
                  value={[scores[key]]}
                  onValueChange={([v]) => setScores((prev) => ({ ...prev, [key]: v }))}
                />
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="eval-notes">Ghi chú (tuỳ chọn)</Label>
            <Textarea
              id="eval-notes"
              placeholder="Nhận xét về buổi học..."
              value={evalNotes}
              onChange={(e) => setEvalNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Error */}
          {evaluationError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {evaluationError.message}
            </div>
          )}
          {evaluationSuccess && (
            <p className="text-sm text-green-600 font-medium">✓ Đã lưu đánh giá thành công!</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setShowEvalModal(false)}>Đóng</Button>
            <Button
              id="btn-submit-eval"
              onClick={handleSubmitEval}
              disabled={evaluationPending || !selectedSlotId}
            >
              {evaluationPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Lưu đánh giá
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ─── Pending slots table ──────────────────────────────────────────────────────
export function PendingSlotsTable({
  pendingSlots,
  onClaim,
  claimPending,
}: {
  pendingSlots: HSKSlot[];
  onClaim: (slotId: string) => void;
  claimPending?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">
        Học viên đang chờ nhận lớp
      </h2>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[110px] whitespace-nowrap">Slot ID</TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">Học viên</TableHead>
                <TableHead className="min-w-[90px] whitespace-nowrap">Lớp</TableHead>
                <TableHead className="min-w-[160px] whitespace-nowrap">Thời gian</TableHead>
                <TableHead className="min-w-[80px] whitespace-nowrap">Trạng thái</TableHead>
                <TableHead className="min-w-[80px] whitespace-nowrap"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingSlots.map((b) => (
                <TableRow key={b.slot_id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{b.slot_id}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="font-medium truncate max-w-[130px]">{b.student_name ?? "—"}</div>
                    <div className="font-mono text-xs text-muted-foreground truncate max-w-[130px]">{b.student_id}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{b.class_id}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(b.session_date).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button
                      id={`btn-claim-${b.slot_id}`}
                      size="sm"
                      onClick={() => onClaim(b.slot_id)}
                      disabled={claimPending}
                    >
                      {claimPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Nhận lớp
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pendingSlots.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Không có học viên nào đang chờ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}

// ─── My bookings table ────────────────────────────────────────────────────────
export function MyBookingsTable({
  myBookings,
  onCancel,
  cancelPending,
}: {
  myBookings: HSKSlot[];
  onCancel: (slotId: string) => void;
  cancelPending?: boolean;
}) {
  const confirmed = myBookings.filter((b) => b.status === "confirmed");

  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Lịch dạy của tôi</h2>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[110px] whitespace-nowrap">Slot ID</TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">Học viên</TableHead>
                <TableHead className="min-w-[160px] whitespace-nowrap">Thời gian</TableHead>
                <TableHead className="min-w-[100px] whitespace-nowrap">Trạng thái</TableHead>
                <TableHead className="min-w-[160px] whitespace-nowrap"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {confirmed.map((b) => {
                const hoursLeft =
                  (new Date(b.session_date).getTime() - Date.now()) / 3_600_000;
                const isLate = hoursLeft < 6;
                return (
                  <TableRow key={b.slot_id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{b.slot_id}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium truncate max-w-[130px]">{b.student_name ?? "—"}</div>
                      <div className="font-mono text-xs text-muted-foreground truncate max-w-[130px]">{b.student_id}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(b.session_date).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button
                        id={`btn-cancel-${b.slot_id}`}
                        size="sm"
                        variant={isLate ? "destructive" : "outline"}
                        onClick={() => onCancel(b.slot_id)}
                        disabled={cancelPending}
                        title={isLate ? "Huỷ trong vòng 6h trước giờ học sẽ bị penalty" : ""}
                      >
                        {cancelPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {isLate ? (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Huỷ (penalty)
                          </>
                        ) : (
                          "Huỷ buổi học"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {confirmed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Chưa có lịch dạy nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}

// ─── Penalties table ──────────────────────────────────────────────────────────
export function PenaltiesTable({ penalties }: { penalties: any[] }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Vi phạm của tôi</h2>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[110px] whitespace-nowrap">Slot ID</TableHead>
                <TableHead className="min-w-[220px] whitespace-nowrap">Lý do</TableHead>
                <TableHead className="min-w-[160px] whitespace-nowrap">Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {penalties.map((p) => (
                <TableRow key={p.penalty_id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{p.slot_id}</TableCell>
                  <TableCell className="text-destructive whitespace-nowrap max-w-[220px] truncate">{p.reason}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(p.created_at).toLocaleString("vi-VN")}
                  </TableCell>
                </TableRow>
              ))}
              {penalties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Không có vi phạm nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}
