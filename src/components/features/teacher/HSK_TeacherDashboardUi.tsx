import { useState, useMemo, useEffect } from "react";
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
import {
  Loader2,
  Search,
  Star,
  UserSearch,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  MoreHorizontal,
  XCircle,
  ClipboardCheck,
  ClipboardPen,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
import { BOOKING_STATUS_LABELS, getStatusLabel } from "@/lib/hsk-status-labels";

// ─── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { variant: "secondary" },
    confirmed: { variant: "default" },
    cancelled: { variant: "destructive" },
    cancelled_valid: { variant: "destructive" },
    cancelled_late: { variant: "destructive" },
    completed: { variant: "outline" },
  };
  const normalized = String(status ?? "").toLowerCase();
  const cfg = map[normalized] ?? { variant: "outline" as const };
  return <Badge variant={cfg.variant}>{getStatusLabel(status, BOOKING_STATUS_LABELS)}</Badge>;
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
          placeholder="Nhập ID học viên (vd: ST-0001)"
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
                    <div className="font-mono text-xs text-muted-foreground truncate max-w-[130px]">
                      {(b as any).student_code ?? b.student_id ?? "—"}
                    </div>
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

// ─── Teacher Cancel Confirmation Dialog ───────────────────────────────────────
function TeacherCancelConfirmDialog({
  slot,
  open,
  onOpenChange,
  onConfirm,
}: {
  slot: HSKSlot | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  if (!slot) return null;

  const sessionTime = new Date(slot.session_date).getTime();
  const hoursUntil = (sessionTime - Date.now()) / 3_600_000;
  const isSafe = hoursUntil > 6; // huỷ trước >6h → không bị penalty

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent id="cancel-teaching-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isSafe ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            Xác nhận huỷ buổi dạy
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Buổi học:{" "}
                <span className="font-semibold text-foreground">
                  {new Date(slot.session_date).toLocaleString("vi-VN")}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Học viên:{" "}
                <span className="font-semibold text-foreground">
                  {slot.student_name ?? "—"} ({slot.student_id})
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Slot ID:{" "}
                <span className="font-mono text-xs text-foreground">{slot.slot_id}</span>
              </p>

              {isSafe ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    ✅ Bạn huỷ trước{" "}
                    <strong>{Math.floor(hoursUntil)} giờ</strong> — không bị tính vi phạm (penalty).
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">
                    ⚠️ Bạn huỷ trong vòng{" "}
                    <strong>{hoursUntil > 0 ? `${Math.floor(hoursUntil)} giờ ${Math.floor((hoursUntil % 1) * 60)} phút` : "dưới 1 giờ"}</strong>{" "}
                    trước buổi học — <strong>bạn sẽ bị tính vi phạm (penalty).</strong>
                  </p>
                  <p className="mt-1 text-xs text-destructive/80">
                    Chính sách: Giáo viên huỷ lịch trong vòng 6 giờ trước buổi học sẽ bị ghi nhận vào danh sách vi phạm.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel id="cancel-dialog-close">Giữ lại lịch dạy</AlertDialogCancel>
          <AlertDialogAction
            id="cancel-dialog-confirm"
            onClick={onConfirm}
            className={isSafe ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
          >
            {isSafe ? "Xác nhận huỷ" : "Xác nhận huỷ (penalty)"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── My bookings table ────────────────────────────────────────────────────────
export function MyBookingsTable({
  myBookings,
  onCancel,
  cancelPending,
  onSubmitEvaluation,
  evaluationPending,
  evaluationError,
  evaluationSuccess,
}: {
  myBookings: HSKSlot[];
  onCancel: (slotId: string) => void;
  cancelPending?: boolean;
  onSubmitEvaluation?: (payload: EvalPayload) => void;
  evaluationPending?: boolean;
  evaluationError?: Error | null;
  evaluationSuccess?: boolean;
}) {
  const [cancelSlot, setCancelSlot] = useState<HSKSlot | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [attendanceSlot, setAttendanceSlot] = useState<HSKSlot | null>(null);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<"present" | "absent">("present");
  const [attendanceNote, setAttendanceNote] = useState("");
  const [gradeSlot, setGradeSlot] = useState<HSKSlot | null>(null);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [gradeNotes, setGradeNotes] = useState("");
  const [gradeScores, setGradeScores] = useState<Record<string, number>>({
    listening: 70,
    speaking: 70,
    reading: 70,
    writing: 70,
    vocabulary: 70,
    grammar: 70,
  });
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (evaluationSuccess && gradeDialogOpen) {
      setGradeDialogOpen(false);
      setGradeSlot(null);
      setGradeNotes("");
    }
  }, [evaluationSuccess, gradeDialogOpen]);

  function openCancelDialog(slot: HSKSlot) {
    setCancelSlot(slot);
    setCancelDialogOpen(true);
  }

  function handleConfirmCancel() {
    if (cancelSlot) onCancel(cancelSlot.slot_id);
    setCancelDialogOpen(false);
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "ongoing" | "completed" | "cancelled">("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"class_id" | "student_name" | "session_date" | "status">("session_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const parseIsoDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const startOfWeek = (date: Date) => {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = (day + 6) % 7;
    copy.setDate(copy.getDate() - diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);

  const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const compareValues = (a: string | number | null, b: string | number | null) => {
    if (a === b) return 0;
    if (a === null || a === undefined || a === "") return 1;
    if (b === null || b === undefined || b === "") return -1;
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
  };

  const renderSortIcon = (field: "class_id" | "student_name" | "session_date" | "status") => {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const getBookingDisplayStatus = (booking: HSKSlot) => {
    const now = Date.now();
    const start = new Date(booking.session_date).getTime();
    const end = booking.session_end_date
      ? new Date(booking.session_end_date).getTime()
      : booking.actual_end_time
        ? new Date(booking.actual_end_time).getTime()
        : start + 90 * 60 * 1000;

    const rawStatus = String(booking.status ?? "").toLowerCase();

    if (rawStatus.includes("cancelled")) {
      return "cancelled";
    } else if (now >= start && now <= end) {
      return "ongoing";
    } else if (now > end) {
      return "completed";
    }
    return "upcoming";
  };

  const renderDisplayStatusBadge = (displayStatus: "upcoming" | "ongoing" | "completed" | "cancelled") => {
    if (displayStatus === "cancelled") {
      return <Badge variant="destructive">Đã huỷ</Badge>;
    }
    if (displayStatus === "ongoing") {
      return <Badge variant="default">Đang diễn ra</Badge>;
    }
    if (displayStatus === "completed") {
      return <Badge variant="outline">Đã hoàn thành</Badge>;
    }
    return <Badge variant="secondary">Sắp diễn ra</Badge>;
  };

  const formatRemainingTime = (sessionDate: string, displayStatus: "upcoming" | "ongoing" | "completed" | "cancelled") => {
    if (displayStatus === "cancelled") return "Đã huỷ";
    if (displayStatus === "ongoing") return "Đang vào lớp";
    if (displayStatus === "completed") return "Đã kết thúc";

    const diffMs = new Date(sessionDate).getTime() - nowTs;
    if (diffMs <= 0) return "Đến giờ vào lớp";

    const totalMinutes = Math.floor(diffMs / 60_000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days} ngày ${hours} giờ`;
    if (hours > 0) return `${hours} giờ ${minutes} phút`;
    return `${minutes} phút`;
  };

  function openAttendanceDialog(slot: HSKSlot) {
    setAttendanceSlot(slot);
    setAttendanceStatus("present");
    setAttendanceNote("");
    setAttendanceDialogOpen(true);
  }

  function openGradeDialog(slot: HSKSlot) {
    setGradeSlot(slot);
    setGradeNotes("");
    setGradeScores({
      listening: 70,
      speaking: 70,
      reading: 70,
      writing: 70,
      vocabulary: 70,
      grammar: 70,
    });
    setGradeDialogOpen(true);
  }

  function handleSubmitGrade() {
    if (!gradeSlot?.student_id || !onSubmitEvaluation) return;
    onSubmitEvaluation({
      slotId: gradeSlot.slot_id,
      studentId: gradeSlot.student_id,
      listening: gradeScores.listening,
      speaking: gradeScores.speaking,
      reading: gradeScores.reading,
      writing: gradeScores.writing,
      vocabulary: gradeScores.vocabulary,
      grammar: gradeScores.grammar,
      generalComment: gradeNotes || undefined,
    });
  }

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfDay(new Date(weekStart.getTime()));
    weekEnd.setDate(weekEnd.getDate() + 6);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const customFrom = customDateFrom ? new Date(customDateFrom) : null;
    const customTo = customDateTo ? endOfDay(new Date(customDateTo)) : null;

    return myBookings.filter((b) => {
      const displayStatus = getBookingDisplayStatus(b);
      if (statusFilter !== "all" && displayStatus !== statusFilter) return false;

      if (query) {
        const displayStatusLabel =
          displayStatus === "cancelled" ? "Đã huỷ" :
          displayStatus === "ongoing" ? "Đang diễn ra" :
          displayStatus === "completed" ? "Đã hoàn thành" : "Sắp diễn ra";

        const haystack = `${b.class_id ?? ""} ${b.slot_id} ${b.student_name ?? ""} ${(b as any).student_code ?? ""} ${b.student_id ?? ""} ${b.status ?? ""} ${displayStatusLabel}`
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      const sessionDate = parseIsoDate(b.session_date);
      if (!sessionDate) return false;

      if (dateRangeFilter === "today" && (sessionDate < todayStart || sessionDate > todayEnd)) return false;
      if (dateRangeFilter === "week" && (sessionDate < weekStart || sessionDate > weekEnd)) return false;
      if (dateRangeFilter === "month" && (sessionDate < monthStart || sessionDate > monthEnd)) return false;
      if (dateRangeFilter === "custom") {
        if (customFrom && sessionDate < customFrom) return false;
        if (customTo && sessionDate > customTo) return false;
      }

      return true;
    });
  }, [myBookings, customDateFrom, customDateTo, dateRangeFilter, searchQuery, statusFilter]);

  const sortedBookings = useMemo(() => {
    const sorted = [...filteredBookings];
    sorted.sort((a, b) => {
      let aValue: string | number | null = null;
      let bValue: string | number | null = null;

      if (sortBy === "class_id") {
        aValue = a.class_id ?? "";
        bValue = b.class_id ?? "";
      } else if (sortBy === "student_name") {
        aValue = a.student_name ?? "";
        bValue = b.student_name ?? "";
      } else if (sortBy === "session_date") {
        aValue = parseIsoDate(a.session_date)?.getTime() ?? 0;
        bValue = parseIsoDate(b.session_date)?.getTime() ?? 0;
      } else if (sortBy === "status") {
        aValue = getBookingDisplayStatus(a);
        bValue = getBookingDisplayStatus(b);
      }

      const result = compareValues(aValue, bValue);
      return sortDirection === "asc" ? result : -result;
    });
    return sorted;
  }, [filteredBookings, sortBy, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sortedBookings.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedBookings.slice(start, start + rowsPerPage);
  }, [currentPage, rowsPerPage, sortedBookings]);

  const handleSort = (field: "class_id" | "student_name" | "session_date" | "status") => {
    if (sortBy === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Lịch dạy của tôi</h2>

      {/* Cancel confirm dialog */}
      <TeacherCancelConfirmDialog
        slot={cancelSlot}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleConfirmCancel}
      />

      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="max-w-md" id="attendance-modal">
          <DialogHeader>
            <DialogTitle>Điểm danh học viên</DialogTitle>
            <DialogDescription>
              {attendanceSlot?.student_name ?? "Học viên"} ({attendanceSlot?.student_id ?? "—"})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="attendance-status">Trạng thái điểm danh</Label>
              <Select
                value={attendanceStatus}
                onValueChange={(value) => setAttendanceStatus(value as "present" | "absent")}
              >
                <SelectTrigger id="attendance-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Có mặt</SelectItem>
                  <SelectItem value="absent">Vắng mặt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="attendance-note">Ghi chú</Label>
              <Textarea
                id="attendance-note"
                rows={3}
                value={attendanceNote}
                onChange={(event) => setAttendanceNote(event.target.value)}
                placeholder="Ghi chú điểm danh..."
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Điểm danh hiện đang ở bản UI thử nghiệm, dữ liệu sẽ tích hợp lưu DB ở bước backend tiếp theo.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>Đóng</Button>
              <Button onClick={() => setAttendanceDialogOpen(false)}>Lưu điểm danh</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="max-w-lg" id="grade-modal">
          <DialogHeader>
            <DialogTitle>Chấm điểm học viên</DialogTitle>
            <DialogDescription>
              {gradeSlot?.student_name ?? "Học viên"} ({gradeSlot?.student_id ?? "—"})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {SKILL_KEYS.map((key) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <Label>{SKILL_LABELS[key]}</Label>
                  <span className="font-mono font-semibold text-primary">{gradeScores[key]}</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[gradeScores[key]]}
                  onValueChange={([v]) => setGradeScores((prev) => ({ ...prev, [key]: v }))}
                />
              </div>
            ))}

            <div className="space-y-1">
              <Label htmlFor="grade-note">Nhận xét</Label>
              <Textarea
                id="grade-note"
                rows={3}
                value={gradeNotes}
                onChange={(event) => setGradeNotes(event.target.value)}
                placeholder="Nhận xét buổi học..."
              />
            </div>

            {evaluationError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {evaluationError.message}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGradeDialogOpen(false)}>Đóng</Button>
              <Button
                onClick={handleSubmitGrade}
                disabled={evaluationPending || !gradeSlot?.student_id || !onSubmitEvaluation}
              >
                {evaluationPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Lưu điểm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-4 space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 xl:grid-cols-[1.5fr_auto]">
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm kiếm mã lớp, mã slot, học viên, trạng thái..."
          />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Trạng thái</p>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as any);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="upcoming">Sắp diễn ra</SelectItem>
                  <SelectItem value="ongoing">Đang diễn ra</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="cancelled">Đã huỷ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Khoảng thời gian</p>
              <Select
                value={dateRangeFilter}
                onValueChange={(value) => {
                  setDateRangeFilter(value as "all" | "today" | "week" | "month" | "custom");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="today">Hôm nay</SelectItem>
                  <SelectItem value="week">Tuần này</SelectItem>
                  <SelectItem value="month">Tháng này</SelectItem>
                  <SelectItem value="custom">Tuỳ chọn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Dòng / trang</p>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {dateRangeFilter === "custom" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="date"
              value={customDateFrom}
              onChange={(event) => {
                setCustomDateFrom(event.target.value);
                setPage(1);
              }}
              placeholder="Từ ngày"
            />
            <Input
              type="date"
              value={customDateTo}
              onChange={(event) => {
                setCustomDateTo(event.target.value);
                setPage(1);
              }}
              placeholder="Đến ngày"
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[110px] whitespace-nowrap">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                    onClick={() => handleSort("class_id")}
                  >
                    Mã lớp
                    {renderSortIcon("class_id")}
                  </button>
                </TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                    onClick={() => handleSort("student_name")}
                  >
                    Học viên
                    {renderSortIcon("student_name")}
                  </button>
                </TableHead>
                <TableHead className="min-w-[160px] whitespace-nowrap">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                    onClick={() => handleSort("session_date")}
                  >
                    Thời gian
                    {renderSortIcon("session_date")}
                  </button>
                </TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">Thời gian còn</TableHead>
                <TableHead className="min-w-[100px] whitespace-nowrap">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                    onClick={() => handleSort("status")}
                  >
                    Trạng thái
                    {renderSortIcon("status")}
                  </button>
                </TableHead>
                <TableHead className="min-w-[80px] whitespace-nowrap text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBookings.map((b) => {
                const hoursLeft =
                  (new Date(b.session_date).getTime() - Date.now()) / 3_600_000;
                const isLate = hoursLeft < 6;
                const displayStatus = getBookingDisplayStatus(b);
                const isFuture = new Date(b.session_date) > new Date();
                const canCancel =
                  !b.is_enrollment_only &&
                  (b.status === "confirmed" || b.status === "pending") &&
                  isFuture;
                const canAttendance = displayStatus === "ongoing" || displayStatus === "completed";
                const canGrade = !b.is_enrollment_only && b.status === "confirmed" && !!b.student_id;

                return (
                  <TableRow key={b.slot_id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{b.class_id ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium truncate max-w-[130px]">{b.student_name ?? "—"}</div>
                      <div className="font-mono text-xs text-muted-foreground truncate max-w-[130px]">
                        {(b as any).student_code ?? b.student_id ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(b.session_date).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      {formatRemainingTime(b.session_date, displayStatus)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {renderDisplayStatusBadge(displayStatus)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Mở menu hành động">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel>Tác vụ buổi học</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            id={`action-cancel-${b.slot_id}`}
                            disabled={!canCancel || cancelPending}
                            onClick={() => openCancelDialog(b)}
                            className={isLate && canCancel ? "text-destructive focus:text-destructive" : ""}
                          >
                            <XCircle className="h-4 w-4" />
                            {isLate && canCancel ? "Huỷ lớp (penalty)" : "Huỷ lớp"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            id={`action-attendance-${b.slot_id}`}
                            disabled={!canAttendance}
                            onClick={() => openAttendanceDialog(b)}
                          >
                            <ClipboardCheck className="h-4 w-4" />
                            Điểm danh học viên
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            id={`action-grade-${b.slot_id}`}
                            disabled={!canGrade || !onSubmitEvaluation}
                            onClick={() => openGradeDialog(b)}
                          >
                            <ClipboardPen className="h-4 w-4" />
                            Chấm điểm học viên
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedBookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Không tìm thấy lịch dạy nào phù hợp
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="text-sm text-slate-600">
          Trang {currentPage} / {pageCount}
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => currentPage > 1 && setPage(currentPage - 1)}
                className={currentPage === 1 ? "opacity-50 pointer-events-none" : undefined}
              />
            </PaginationItem>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  isActive={pageNumber === currentPage}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => currentPage < pageCount && setPage(currentPage + 1)}
                className={currentPage === pageCount ? "opacity-50 pointer-events-none" : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
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
