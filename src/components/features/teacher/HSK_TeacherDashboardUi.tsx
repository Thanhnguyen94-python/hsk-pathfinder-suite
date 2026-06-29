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
import { Checkbox } from "@/components/ui/checkbox";
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
    return { skill: SKILL_LABELS[key], score: found ? Math.round(found.avg_score) : 0 };
  });
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="skill" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
        <Radar
          name="Kỹ năng"
          dataKey="score"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.3}
        />
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

type AttendanceStatus = "present" | "absent_excused" | "absent_unexcused";

type AttendanceStudentRow = {
  student_id: string;
  full_name: string | null;
  staff_code: string | null;
  attendance_status: AttendanceStatus | null;
  excuse_reason: string | null;
};

type GradingStudentRow = {
  student_id: string;
  full_name: string | null;
  staff_code: string | null;
  listening: number | null;
  speaking: number | null;
  reading: number | null;
  writing: number | null;
  vocabulary: number | null;
  grammar: number | null;
  general_comment: string | null;
};

interface StudentLookupPanelProps {
  /** Slots xác nhận thuộc giáo viên này để validate */
  myConfirmedSlots: HSKSlot[];
  onLookup: (studentId: string) => void;
  lookupResult?: {
    student: { specific_id: string; staff_code?: string | null; full_name: string };
    skills: any[];
    courses?: Array<{
      course_id?: string | null;
      class_id?: string | null;
      class_name?: string | null;
      learning_mode?: string | null;
      status?: string | null;
    }>;
  } | null;
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
          placeholder="Nhập mã học viên"
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
              <p className="text-xs text-muted-foreground font-mono">
                {lookupData.student.staff_code ?? lookupData.student.specific_id}
              </p>
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

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Khoá học đã tham gia</p>
            {(lookupData.courses ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(lookupData.courses ?? []).map((course, idx) => {
                  const label =
                    course.class_name ??
                    course.course_id ??
                    course.class_id ??
                    `Khoá học ${idx + 1}`;
                  const meta = [course.course_id, course.class_id].filter(Boolean).join(" · ");
                  return (
                    <Badge key={`${course.course_id ?? ""}-${course.class_id ?? ""}-${idx}`} variant="outline" className="max-w-full">
                      <span className="truncate">{label}{meta ? ` (${meta})` : ""}</span>
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu khoá học.</p>
            )}
          </div>
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
        Nhận lớp
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
  onLoadAttendance,
  onSaveAttendance,
  attendanceSaving,
  attendanceSaveError,
  attendanceSaveSuccess,
  onLoadGrading,
  onSaveGrading,
  gradingSaving,
  gradingSaveError,
  gradingSaveSuccess,
}: {
  myBookings: HSKSlot[];
  onCancel: (slotId: string) => void;
  cancelPending?: boolean;
  onLoadAttendance?: (payload: { classId: string; sessionDate: string }) => Promise<AttendanceStudentRow[]>;
  onSaveAttendance?: (payload: {
    classId: string;
    sessionDate: string;
    records: Array<{
      studentId: string;
      attendanceStatus: AttendanceStatus;
      excuseReason?: string;
    }>;
  }) => Promise<any>;
  attendanceSaving?: boolean;
  attendanceSaveError?: Error | null;
  attendanceSaveSuccess?: boolean;
  onLoadGrading?: (payload: { classId: string; sessionDate: string }) => Promise<GradingStudentRow[]>;
  onSaveGrading?: (payload: {
    classId: string;
    sessionDate: string;
    records: Array<{
      studentId: string;
      listening: number;
      speaking: number;
      reading: number;
      writing: number;
      vocabulary: number;
      grammar: number;
      generalComment?: string;
    }>;
  }) => Promise<any>;
  gradingSaving?: boolean;
  gradingSaveError?: Error | null;
  gradingSaveSuccess?: boolean;
}) {
  const [cancelSlot, setCancelSlot] = useState<HSKSlot | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [attendanceSlot, setAttendanceSlot] = useState<HSKSlot | null>(null);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceStudentRow[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceLoadError, setAttendanceLoadError] = useState<string | null>(null);
  const [gradeSlot, setGradeSlot] = useState<HSKSlot | null>(null);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [gradingRows, setGradingRows] = useState<GradingStudentRow[]>([]);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingLoadError, setGradingLoadError] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (gradingSaveSuccess && gradeDialogOpen) {
      setGradeDialogOpen(false);
      setGradeSlot(null);
    }
  }, [gradingSaveSuccess, gradeDialogOpen]);

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
  const [sortBy, setSortBy] = useState<"class_id" | "session_date" | "status">("session_date");
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

  const renderSortIcon = (field: "class_id" | "session_date" | "status") => {
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

  async function openAttendanceDialog(slot: HSKSlot) {
    if (!slot.class_id || !onLoadAttendance) return;
    setAttendanceSlot(slot);
    setAttendanceLoading(true);
    setAttendanceLoadError(null);
    setAttendanceRows([]);
    setAttendanceDialogOpen(true);
    try {
      const rows = await onLoadAttendance({
        classId: String(slot.class_id),
        sessionDate: String(slot.session_date),
      });
      setAttendanceRows(rows ?? []);
    } catch (error: any) {
      setAttendanceLoadError(error?.message ?? "Không tải được danh sách học viên");
    } finally {
      setAttendanceLoading(false);
    }
  }

  const setAttendanceField = (
    studentId: string,
    patch: Partial<Pick<AttendanceStudentRow, "attendance_status" | "excuse_reason">>,
  ) => {
    setAttendanceRows((prev) =>
      prev.map((row) =>
        row.student_id === studentId
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    );
  };

  async function handleSaveAttendance() {
    if (!attendanceSlot?.class_id || !onSaveAttendance) return;
    const records = attendanceRows.map((row) => ({
      studentId: row.student_id,
      attendanceStatus: (row.attendance_status ?? "present") as AttendanceStatus,
      excuseReason: row.excuse_reason ?? undefined,
    }));
    await onSaveAttendance({
      classId: String(attendanceSlot.class_id),
      sessionDate: String(attendanceSlot.session_date),
      records,
    });
  }

  async function openGradeDialog(slot: HSKSlot) {
    if (!slot.class_id || !onLoadGrading) return;
    setGradeSlot(slot);
    setGradingRows([]);
    setGradingLoadError(null);
    setGradingLoading(true);
    setGradeDialogOpen(true);
    try {
      const rows = await onLoadGrading({
        classId: String(slot.class_id),
        sessionDate: String(slot.session_date),
      });
      setGradingRows(rows ?? []);
    } catch (error: any) {
      setGradingLoadError(error?.message ?? "Không tải được dữ liệu chấm điểm");
    } finally {
      setGradingLoading(false);
    }
  }

  const setGradingField = (
    studentId: string,
    patch: Partial<
      Pick<
        GradingStudentRow,
        "listening" | "speaking" | "reading" | "writing" | "vocabulary" | "grammar" | "general_comment"
      >
    >,
  ) => {
    setGradingRows((prev) =>
      prev.map((row) =>
        row.student_id === studentId
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    );
  };

  async function handleSubmitGrade() {
    if (!gradeSlot?.class_id || !onSaveGrading) return;
    const records = gradingRows.map((row) => ({
      studentId: row.student_id,
      listening: Number(row.listening ?? 70),
      speaking: Number(row.speaking ?? 70),
      reading: Number(row.reading ?? 70),
      writing: Number(row.writing ?? 70),
      vocabulary: Number(row.vocabulary ?? 70),
      grammar: Number(row.grammar ?? 70),
      generalComment: row.general_comment ?? undefined,
    }));
    await onSaveGrading({
      classId: String(gradeSlot.class_id),
      sessionDate: String(gradeSlot.session_date),
      records,
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

        const haystack = `${b.class_id ?? ""} ${b.slot_id} ${b.status ?? ""} ${displayStatusLabel}`
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

  const handleSort = (field: "class_id" | "session_date" | "status") => {
    if (sortBy === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

  const classMaterialUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of myBookings) {
      const classId = String(row.class_id ?? "").trim();
      const materialUrl = String((row as any).material_url ?? "").trim();
      if (!classId || !materialUrl) continue;
      if (!map.has(classId)) map.set(classId, materialUrl);
    }
    return map;
  }, [myBookings]);

  const getMaterialUrlForBooking = (booking: HSKSlot) => {
    const ownMaterial = String((booking as any).material_url ?? "").trim();
    if (ownMaterial) return ownMaterial;
    const classId = String(booking.class_id ?? "").trim();
    return classId ? (classMaterialUrlMap.get(classId) ?? "") : "";
  };

  return (
    <section>
      {/* Cancel confirm dialog */}
      <TeacherCancelConfirmDialog
        slot={cancelSlot}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleConfirmCancel}
      />

      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="max-w-3xl" id="attendance-modal">
          <DialogHeader>
            <DialogTitle>Điểm danh</DialogTitle>
            <DialogDescription>
              Lớp {attendanceSlot?.class_id ?? "—"} — {attendanceSlot ? new Date(attendanceSlot.session_date).toLocaleString("vi-VN") : "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {attendanceLoadError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {attendanceLoadError}
              </div>
            )}

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên học viên</TableHead>
                    <TableHead>Mã học viên</TableHead>
                    <TableHead>Điểm danh</TableHead>
                    <TableHead>Lý do</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Đang tải danh sách học viên...</TableCell>
                    </TableRow>
                  ) : attendanceRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Không có học viên trong lớp.</TableCell>
                    </TableRow>
                  ) : (
                    attendanceRows.map((row) => (
                      <TableRow key={row.student_id}>
                        <TableCell>{row.full_name ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{row.staff_code ?? row.student_id}</TableCell>
                        <TableCell className="min-w-[190px]">
                          <Select
                            value={row.attendance_status ?? "present"}
                            onValueChange={(value) =>
                              setAttendanceField(row.student_id, {
                                attendance_status: value as AttendanceStatus,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Có mặt</SelectItem>
                              <SelectItem value="absent_excused">Vắng có phép</SelectItem>
                              <SelectItem value="absent_unexcused">Vắng không phép</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.excuse_reason ?? ""}
                            onChange={(event) =>
                              setAttendanceField(row.student_id, {
                                excuse_reason: event.target.value,
                              })
                            }
                            placeholder="Nhập lý do (nếu vắng)..."
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {attendanceSaveError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {attendanceSaveError.message}
              </div>
            )}
            {attendanceSaveSuccess && (
              <div className="rounded-md border border-green-300/60 bg-green-50 px-3 py-2 text-sm text-green-700">
                Đã lưu điểm danh thành công.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>Đóng</Button>
              <Button onClick={handleSaveAttendance} disabled={attendanceSaving || attendanceLoading || attendanceRows.length === 0}>
                {attendanceSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Lưu điểm danh
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] xl:max-w-6xl max-h-[88vh] overflow-hidden" id="grade-modal">
          <DialogHeader>
            <DialogTitle>Chấm điểm</DialogTitle>
            <DialogDescription>
              Lớp {gradeSlot?.class_id ?? "—"} — {gradeSlot ? new Date(gradeSlot.session_date).toLocaleString("vi-VN") : "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto pr-1">
            {gradingLoadError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {gradingLoadError}
              </div>
            )}

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên học viên</TableHead>
                      <TableHead>Mã học viên</TableHead>
                      <TableHead>Nghe</TableHead>
                      <TableHead>Nói</TableHead>
                      <TableHead>Đọc</TableHead>
                      <TableHead>Viết</TableHead>
                      <TableHead>Từ vựng</TableHead>
                      <TableHead>Ngữ pháp</TableHead>
                      <TableHead>Nhận xét</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradingLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">Đang tải danh sách học viên...</TableCell>
                      </TableRow>
                    ) : gradingRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">Không có học viên trong lớp.</TableCell>
                      </TableRow>
                    ) : (
                      gradingRows.map((row) => (
                        <TableRow key={row.student_id}>
                          <TableCell>{row.full_name ?? "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{row.staff_code ?? row.student_id}</TableCell>
                          {(SKILL_KEYS as Array<keyof typeof SKILL_LABELS>).map((skillKey) => (
                            <TableCell key={`${row.student_id}-${skillKey}`} className="w-[90px]">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={String((row as any)[skillKey] ?? 70)}
                                onChange={(event) => {
                                  const n = Number(event.target.value);
                                  const v = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
                                  setGradingField(row.student_id, { [skillKey]: v } as any);
                                }}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="min-w-[220px]">
                            <Input
                              value={row.general_comment ?? ""}
                              onChange={(event) =>
                                setGradingField(row.student_id, {
                                  general_comment: event.target.value,
                                })
                              }
                              placeholder="Nhận xét..."
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {gradingSaveError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {gradingSaveError.message}
              </div>
            )}
            {gradingSaveSuccess && (
              <div className="rounded-md border border-green-300/60 bg-green-50 px-3 py-2 text-sm text-green-700">
                Đã lưu chấm điểm thành công.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGradeDialogOpen(false)}>Đóng</Button>
              <Button
                onClick={handleSubmitGrade}
                disabled={gradingSaving || gradingLoading || gradingRows.length === 0 || !onSaveGrading}
              >
                {gradingSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Lưu điểm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[1.5fr_auto]">
            <Input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm kiếm mã lớp, mã slot, trạng thái..."
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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Thời gian</p>
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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Trang</p>
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

        <div className="overflow-x-auto">
          <Table className="min-w-[1080px]">
            <TableHeader>
              <TableRow>
                <TableHead
                  className="min-w-[110px] whitespace-nowrap cursor-pointer select-none font-display font-semibold transition-colors hover:bg-muted/50"
                  onClick={() => handleSort("class_id")}
                >
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    Mã lớp
                    <span
                      className={`text-[10px] transition-colors ${sortBy === "class_id" ? "text-blue-500" : "text-muted-foreground/30"}`}
                      aria-hidden="true"
                    >
                      {sortBy === "class_id" && sortDirection === "desc" ? "▼" : "▲"}
                    </span>
                  </span>
                </TableHead>
                <TableHead
                  className="min-w-[160px] whitespace-nowrap cursor-pointer select-none font-display font-semibold transition-colors hover:bg-muted/50"
                  onClick={() => handleSort("session_date")}
                >
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    Bắt đầu
                    <span
                      className={`text-[10px] transition-colors ${sortBy === "session_date" ? "text-blue-500" : "text-muted-foreground/30"}`}
                      aria-hidden="true"
                    >
                      {sortBy === "session_date" && sortDirection === "desc" ? "▼" : "▲"}
                    </span>
                  </span>
                </TableHead>
                <TableHead className="whitespace-nowrap font-display font-semibold">TG vào lớp</TableHead>
                <TableHead
                  className="min-w-[100px] whitespace-nowrap cursor-pointer select-none font-display font-semibold transition-colors hover:bg-muted/50"
                  onClick={() => handleSort("status")}
                >
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    Trạng thái
                    <span
                      className={`text-[10px] transition-colors ${sortBy === "status" ? "text-blue-500" : "text-muted-foreground/30"}`}
                      aria-hidden="true"
                    >
                      {sortBy === "status" && sortDirection === "desc" ? "▼" : "▲"}
                    </span>
                  </span>
                </TableHead>
                <TableHead className="min-w-[110px] whitespace-nowrap text-center font-display font-semibold">Điểm danh</TableHead>
                <TableHead className="min-w-[110px] whitespace-nowrap text-center font-display font-semibold">Chấm điểm</TableHead>
                <TableHead className="min-w-[110px] whitespace-nowrap text-center font-display font-semibold">Tài liệu</TableHead>
                <TableHead className="min-w-[80px] whitespace-nowrap text-right font-display font-semibold">Hành động</TableHead>
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
                const canGrade = displayStatus === "ongoing" || displayStatus === "completed";
                const materialUrl = getMaterialUrlForBooking(b);

                return (
                  <TableRow key={b.slot_id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{b.class_id ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(b.session_date).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      {formatRemainingTime(b.session_date, displayStatus)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {renderDisplayStatusBadge(displayStatus)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center">
                      <Checkbox checked={Boolean((b as any).attendance_done)} disabled />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center">
                      <Checkbox checked={Boolean((b as any).grading_done)} disabled />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center">
                      {materialUrl ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => window.open(materialUrl, "_blank")}
                        >
                          Tài liệu
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
                            disabled={!canAttendance || !onLoadAttendance || !onSaveAttendance}
                            onClick={() => openAttendanceDialog(b)}
                          >
                            <ClipboardCheck className="h-4 w-4" />
                            Điểm danh
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            id={`action-grade-${b.slot_id}`}
                            disabled={!canGrade || !onLoadGrading || !onSaveGrading}
                            onClick={() => openGradeDialog(b)}
                          >
                            <ClipboardPen className="h-4 w-4" />
                            Chấm điểm
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedBookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
