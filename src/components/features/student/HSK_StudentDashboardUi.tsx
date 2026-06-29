import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { rateTeacher } from "@/lib/hsk.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, MoreHorizontal, Star } from "lucide-react";
import type { HSKSlot } from "@/types/hsk-models/hsk-booking.types";
import {
  BOOKING_STATUS_LABELS,
  LEARNING_PROGRESS_STATUS_LABELS,
  getStatusLabel,
} from "@/lib/hsk-status-labels";

// ─── Cancel Confirmation Dialog ───────────────────────────────────────────────
function CancelConfirmDialog({
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
  const isSafe = hoursUntil > 6; // huỷ trước >6h → không mất buổi

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent id="cancel-booking-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isSafe ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            Xác nhận huỷ buổi học
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
                Slot ID:{" "}
                <span className="font-mono text-xs text-foreground">{slot.slot_id}</span>
              </p>

              {isSafe ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    ✅ Bạn huỷ trước{" "}
                    <strong>{Math.floor(hoursUntil)} giờ</strong> — không bị mất buổi học.
                  </p>
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    Buổi học sẽ được hoàn lại vào số buổi còn lại của bạn.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">
                    ⚠️ Bạn huỷ trong vòng{" "}
                    <strong>{hoursUntil > 0 ? `${Math.floor(hoursUntil)} giờ ${Math.floor((hoursUntil % 1) * 60)} phút` : "dưới 1 giờ"}</strong>{" "}
                    trước buổi học — <strong>bạn sẽ bị mất buổi học này.</strong>
                  </p>
                  <p className="mt-1 text-xs text-destructive/80">
                    Chính sách: huỷ trong vòng 6 giờ trước buổi học sẽ không được hoàn lại buổi.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel id="cancel-dialog-close">Giữ lại buổi học</AlertDialogCancel>
          <AlertDialogAction
            id="cancel-dialog-confirm"
            onClick={onConfirm}
            className={isSafe ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
          >
            {isSafe ? "Xác nhận huỷ" : "Xác nhận huỷ (mất buổi)"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ProgressCards({
  items,
  onFreeze,
  onUnfreeze,
}: {
  items: any[];
  onFreeze: (v: { studentId: string; courseId: string }) => void;
  onUnfreeze: (v: { studentId: string; courseId: string }) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Tiến độ khoá học</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((p) => {
          const pct =
            p.total_sessions > 0
              ? ((p.total_sessions - p.remaining_sessions) / p.total_sessions) * 100
              : 0;
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{p.course_id}</div>
                  <div className="text-xs text-muted-foreground">
                    Còn {p.remaining_sessions}/{p.total_sessions} buổi · {p.learning_mode}
                  </div>
                </div>
                <Badge
                  variant={
                    p.status === "active"
                      ? "default"
                      : p.status === "frozen"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {getStatusLabel(p.status, LEARNING_PROGRESS_STATUS_LABELS)}
                </Badge>
              </div>
              <Progress value={pct} className="mt-3" />
              <div className="mt-3 flex gap-2">
                {p.status !== "frozen" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onFreeze({ studentId: p.student_id, courseId: p.course_id })}
                  >
                    Bảo lưu
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUnfreeze({ studentId: p.student_id, courseId: p.course_id })}
                  >
                    Kích hoạt lại
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ==================== CHỈNH SỬA HÀM BookingsTable ====================

export function BookingsTable({
  bookings,
  ratedSlots,
  onCancel,
}: {
  bookings: HSKSlot[];
  ratedSlots: Set<any>;
  onCancel: (slotId: string) => void;
}) {
  const qc = useQueryClient();
  const rate = useServerFn(rateTeacher);

  // Cancel confirm dialog state
  const [cancelSlot, setCancelSlot] = useState<HSKSlot | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<HSKSlot | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [materialStars, setMaterialStars] = useState(5);
  const [materialComment, setMaterialComment] = useState("");

  const rateMutation = useMutation({
    mutationFn: () => {
      if (!ratingTarget?.teacher_id || !ratingTarget?.class_id || !ratingTarget?.session_date) {
        throw new Error("Thiếu thông tin buổi học để đánh giá");
      }
      return rate({
        data: {
          slotId: ratingTarget.slot_id,
          classId: ratingTarget.class_id,
          sessionDate: ratingTarget.session_date,
          teacherId: ratingTarget.teacher_id,
          stars: ratingStars,
          comment: ratingComment,
          materialStars: materialStars,
          materialComment: materialComment,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ratings"] });
      qc.invalidateQueries({ queryKey: ["student-dash"] });
      setRatingDialogOpen(false);
      setRatingTarget(null);
      setRatingComment("");
      setRatingStars(5);
      setMaterialComment("");
      setMaterialStars(5);
    },
  });

  function openCancelDialog(slot: HSKSlot) {
    setCancelSlot(slot);
    setCancelDialogOpen(true);
  }

  function handleConfirmCancel() {
    if (cancelSlot) onCancel(cancelSlot.slot_id);
    setCancelDialogOpen(false);
  }

  function openRatingDialog(slot: HSKSlot) {
    setRatingTarget(slot);
    setRatingStars(5);
    setRatingComment("");
    setMaterialStars(5);
    setMaterialComment("");
    setRatingDialogOpen(true);
  }

  const toSessionKey = (classId?: string | null, sessionDate?: string | null) => {
    const ts = sessionDate ? new Date(sessionDate).getTime() : NaN;
    return `${classId ?? ""}|${Number.isFinite(ts) ? ts : sessionDate ?? ""}`;
  };

  const isRatedBooking = (slot: HSKSlot) =>
    ratedSlots.has(slot.slot_id) || ratedSlots.has(toSessionKey(slot.class_id ?? null, slot.session_date));

  // Hàm tính độ dài buổi học (phút)
  const getDuration = (start: string, end?: string | null) => {
    if (!end) return "Chưa kết thúc";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    if (diffMinutes < 60) return `${diffMinutes} phút`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours} giờ ${mins} phút`;
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "ongoing" | "completed" | "cancelled">("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "week" | "month" | "custom">("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"class_id" | "course_name" | "session_date" | "status" | "teacher_name">("session_date");
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

  const renderSortIcon = (field: "class_id" | "course_name" | "session_date" | "status" | "teacher_name") => {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfDay(new Date(weekStart.getTime()));
    weekEnd.setDate(weekEnd.getDate() + 6);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const customFrom = customDateFrom ? new Date(customDateFrom) : null;
    const customTo = customDateTo ? endOfDay(new Date(customDateTo)) : null;

    const getBookingDisplayStatus = (booking: HSKSlot) => {
      const now = Date.now();
      const start = new Date(booking.session_date).getTime();
      const hasActualEnd = !!booking.actual_end_time;
      const end = hasActualEnd
        ? new Date(booking.actual_end_time as string).getTime()
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

    return bookings.filter((b) => {
      if (statusFilter !== "all" && getBookingDisplayStatus(b) !== statusFilter) return false;

      if (query) {
        const displayStatus = getBookingDisplayStatus(b);
        const displayStatusLabel = 
          displayStatus === "cancelled" ? "Đã huỷ" :
          displayStatus === "ongoing" ? "Đang diễn ra" :
          displayStatus === "completed" ? "Hoàn thành" : "Sắp diễn ra";

        const haystack = `${b.course_name ?? b.class_id ?? ""} ${b.teacher_name ?? ""} ${b.status ?? ""} ${displayStatusLabel}`
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      const sessionDate = parseIsoDate(b.session_date);
      if (!sessionDate) return false;

      if (dateRangeFilter === "week" && (sessionDate < weekStart || sessionDate > weekEnd)) return false;
      if (dateRangeFilter === "month" && (sessionDate < monthStart || sessionDate > monthEnd)) return false;
      if (dateRangeFilter === "custom") {
        if (customFrom && sessionDate < customFrom) return false;
        if (customTo && sessionDate > customTo) return false;
      }

      return true;
    });
  }, [bookings, customDateFrom, customDateTo, dateRangeFilter, searchQuery, statusFilter]);

  const sortedBookings = useMemo(() => {
    const sorted = [...filteredBookings];
    sorted.sort((a, b) => {
      let aValue: string | number | null = null;
      let bValue: string | number | null = null;

      if (sortBy === "class_id") {
        aValue = a.class_id ?? "";
        bValue = b.class_id ?? "";
      } else if (sortBy === "course_name") {
        aValue = a.course_name ?? a.class_id ?? "";
        bValue = b.course_name ?? b.class_id ?? "";
      } else if (sortBy === "session_date") {
        aValue = parseIsoDate(a.session_date)?.getTime() ?? 0;
        bValue = parseIsoDate(b.session_date)?.getTime() ?? 0;
      } else if (sortBy === "status") {
        aValue = getStatusLabel(a.status, BOOKING_STATUS_LABELS);
        bValue = getStatusLabel(b.status, BOOKING_STATUS_LABELS);
      } else {
        aValue = a.teacher_name ?? "";
        bValue = b.teacher_name ?? "";
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

  const handleSort = (field: "class_id" | "course_name" | "session_date" | "status" | "teacher_name") => {
    if (sortBy === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Lịch học của tôi</h2>

      {/* Cancel confirm dialog */}
      <CancelConfirmDialog
        slot={cancelSlot}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleConfirmCancel}
      />

      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Đánh giá buổi học</DialogTitle>
            <DialogDescription>
              {ratingTarget?.teacher_name ?? "Giáo viên"} · {ratingTarget?.teacher_staff_code ?? ratingTarget?.teacher_id ?? "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Đánh giá giáo viên */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Đánh giá giáo viên</h4>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRatingStars(n)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        n <= ratingStars ? "fill-warning text-warning" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Gợi ý chọn nhanh giáo viên */}
              <div className="flex flex-wrap gap-2 py-1 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setRatingComment((prev) => {
                      const trimmed = prev.trim();
                      if (!trimmed) return "Giáo viên dạy dễ hiểu";
                      if (trimmed.includes("Giáo viên dạy dễ hiểu")) return prev;
                      return `${trimmed}, giáo viên dạy dễ hiểu`;
                    });
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted transition text-muted-foreground cursor-pointer"
                >
                  Giáo viên dạy dễ hiểu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRatingComment((prev) => {
                      const trimmed = prev.trim();
                      if (!trimmed) return "Giáo viên nói khó nghe";
                      if (trimmed.includes("Giáo viên nói khó nghe")) return prev;
                      return `${trimmed}, giáo viên nói khó nghe`;
                    });
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted transition text-muted-foreground cursor-pointer"
                >
                  Giáo viên nói khó nghe
                </button>
              </div>

              <Textarea
                placeholder="Nhận xét giáo viên (tuỳ chọn)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                maxLength={500}
                rows={2}
              />
            </div>

            <hr className="border-border" />

            {/* Đánh giá tài liệu */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Đánh giá chất lượng tài liệu</h4>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMaterialStars(n)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        n <= materialStars ? "fill-warning text-warning" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Gợi ý chọn nhanh tài liệu */}
              <div className="flex flex-wrap gap-2 py-1 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setMaterialComment((prev) => {
                      const trimmed = prev.trim();
                      if (!trimmed) return "Tài liệu dễ hiểu";
                      if (trimmed.includes("Tài liệu dễ hiểu")) return prev;
                      return `${trimmed}, tài liệu dễ hiểu`;
                    });
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted transition text-muted-foreground cursor-pointer"
                >
                  Tài liệu dễ hiểu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMaterialComment((prev) => {
                      const trimmed = prev.trim();
                      if (!trimmed) return "Tài liệu khó hiểu";
                      if (trimmed.includes("Tài liệu khó hiểu")) return prev;
                      return `${trimmed}, tài liệu khó hiểu`;
                    });
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted transition text-muted-foreground cursor-pointer"
                >
                  Tài liệu khó hiểu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMaterialComment((prev) => {
                      const trimmed = prev.trim();
                      if (!trimmed) return "Thiếu tài liệu";
                      if (trimmed.includes("Thiếu tài liệu")) return prev;
                      return `${trimmed}, thiếu tài liệu`;
                    });
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted transition text-muted-foreground cursor-pointer"
                >
                  Thiếu tài liệu
                </button>
              </div>

              <Textarea
                placeholder="Nhận xét tài liệu (tuỳ chọn)"
                value={materialComment}
                onChange={(e) => setMaterialComment(e.target.value)}
                maxLength={500}
                rows={2}
              />
            </div>
          </div>

          {rateMutation.isError && (
            <p className="text-sm text-destructive">{(rateMutation.error as Error).message}</p>
          )}

          <DialogFooter>
            <Button
              onClick={() => rateMutation.mutate()}
              disabled={
                rateMutation.isPending ||
                !ratingTarget?.teacher_id ||
                !ratingTarget?.class_id ||
                !ratingTarget?.session_date
              }
            >
              {rateMutation.isPending ? "Đang gửi..." : "Gửi đánh giá"}
            </Button>
          </DialogFooter>
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
            placeholder="Tìm kiếm khoá học, giáo viên, trạng thái..."
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
                  setDateRangeFilter(value as "all" | "week" | "month" | "custom");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
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

        <div className="text-sm text-slate-500">
          Hiển thị {paginatedBookings.length} trong {sortedBookings.length} buổi học.
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto w-full">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead
                className="min-w-[180px] whitespace-nowrap cursor-pointer select-none font-display font-semibold transition-colors hover:bg-muted/50"
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
                className="min-w-[180px] whitespace-nowrap cursor-pointer select-none font-display font-semibold transition-colors hover:bg-muted/50"
                onClick={() => handleSort("course_name")}
              >
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  Tên lớp
                  <span
                    className={`text-[10px] transition-colors ${sortBy === "course_name" ? "text-blue-500" : "text-muted-foreground/30"}`}
                    aria-hidden="true"
                  >
                    {sortBy === "course_name" && sortDirection === "desc" ? "▼" : "▲"}
                  </span>
                </span>
              </TableHead>
              <TableHead
                className="min-w-[150px] whitespace-nowrap cursor-pointer select-none font-display font-semibold transition-colors hover:bg-muted/50"
                onClick={() => handleSort("teacher_name")}
              >
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  Giáo viên
                  <span
                    className={`text-[10px] transition-colors ${sortBy === "teacher_name" ? "text-blue-500" : "text-muted-foreground/30"}`}
                    aria-hidden="true"
                  >
                    {sortBy === "teacher_name" && sortDirection === "desc" ? "▼" : "▲"}
                  </span>
                </span>
              </TableHead>
              <TableHead
                className="min-w-[160px] whitespace-nowrap cursor-pointer select-none font-display font-semibold transition-colors hover:bg-muted/50"
                onClick={() => handleSort("session_date")}
              >
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  T/G bắt đầu
                  <span
                    className={`text-[10px] transition-colors ${sortBy === "session_date" ? "text-blue-500" : "text-muted-foreground/30"}`}
                    aria-hidden="true"
                  >
                    {sortBy === "session_date" && sortDirection === "desc" ? "▼" : "▲"}
                  </span>
                </span>
              </TableHead>
              <TableHead className="min-w-[160px] whitespace-nowrap font-display font-semibold">T/G kết thúc</TableHead>
              <TableHead className="min-w-[100px] whitespace-nowrap font-display font-semibold">Số giờ</TableHead>
              <TableHead className="min-w-[180px] whitespace-nowrap font-display font-semibold">GV ghi chú</TableHead>
              <TableHead className="min-w-[100px] whitespace-nowrap font-display font-semibold">Tài liệu</TableHead>
              <TableHead
                className="min-w-[120px] whitespace-nowrap cursor-pointer select-none font-display font-semibold transition-colors hover:bg-muted/50"
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
              <TableHead className="min-w-[140px] whitespace-nowrap text-right font-display font-semibold">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBookings.map((b) => (
              <TableRow key={b.slot_id}>
                <TableCell className="font-mono text-xs whitespace-nowrap">{b.class_id ?? "—"}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">{b.course_name ?? b.class_id ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {b.teacher_name ? (
                    <>
                      <div className="font-medium">{b.teacher_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{b.teacher_staff_code ?? b.teacher_id}</div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Chờ nhận</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(b.session_date).toLocaleString()}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {b.actual_end_time ? new Date(b.actual_end_time).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">{getDuration(b.session_date, b.actual_end_time)}</TableCell>
                <TableCell className="max-w-xs whitespace-nowrap truncate">
                  {b.teacher_note ? (
                    <span className="block truncate cursor-help text-xs" title={b.teacher_note}>
                      {b.teacher_note}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {b.material_url ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => b.material_url && window.open(b.material_url, "_blank")}
                    >
                      Tài liệu
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <StatusBadge booking={b} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    {isRatedBooking(b) && <span className="text-xs text-success">Đã đánh giá</span>}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mở menu hành động">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!b.is_enrollment_only &&
                          (b.status === "pending" || b.status === "confirmed") &&
                          new Date(b.session_date) > new Date() && (
                            <DropdownMenuItem
                              id={`btn-cancel-${b.slot_id}`}
                              className="text-destructive focus:text-destructive"
                              onClick={() => openCancelDialog(b)}
                            >
                              Huỷ buổi học
                            </DropdownMenuItem>
                          )}

                        {b.teacher_id &&
                          new Date(b.session_date) <= new Date() &&
                          (b.status === "confirmed" || b.status === "pending") &&
                          !isRatedBooking(b) && (
                            <DropdownMenuItem onClick={() => openRatingDialog(b)}>
                              Đánh giá buổi học
                            </DropdownMenuItem>
                          )}

                        {isRatedBooking(b) && (
                          <DropdownMenuItem disabled>Đã đánh giá buổi học</DropdownMenuItem>
                        )}

                        {!isRatedBooking(b) &&
                          !(
                            !b.is_enrollment_only &&
                            (b.status === "pending" || b.status === "confirmed") &&
                            new Date(b.session_date) > new Date()
                          ) &&
                          !(
                            b.teacher_id &&
                            new Date(b.session_date) <= new Date() &&
                            (b.status === "confirmed" || b.status === "pending")
                          ) && <DropdownMenuItem disabled>Không có hành động</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {paginatedBookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground whitespace-nowrap">
                  Chưa có buổi học nào phù hợp với bộ lọc
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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

export function AssignmentRow({
  assignment,
  submission,
  onSubmit,
}: {
  assignment: any;
  submission: any;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState<string>(submission?.submission_text ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const accept = assignment.media_type === "audio"
    ? "audio/*"
    : assignment.media_type === "image"
    ? "image/*"
    : "image/*,audio/*,application/pdf";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) setText(file.name);
  };

  return (
    <TableRow>
      <TableCell className="font-mono text-xs whitespace-nowrap">
        <div className="font-semibold text-primary">{assignment.slot_id || assignment.assignment_id.slice(0, 8)}</div>
        <div className="text-xs text-muted-foreground">{assignment.course_id}</div>
      </TableCell>
      <TableCell>
        <div className="font-medium whitespace-nowrap">{assignment.title}</div>
        {assignment.description && (
          <div className="text-xs text-muted-foreground max-w-[250px] truncate" title={assignment.description}>
            {assignment.description}
          </div>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        {new Date(assignment.deadline).toLocaleString()}
      </TableCell>
      <TableCell className="text-xs min-w-[200px]">
        {submission ? (
          <div className="space-y-1 whitespace-nowrap">
            {submission.submission_url ? (
              <a
                href={submission.submission_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Xem tệp đã nộp
              </a>
            ) : (
              <span className="truncate max-w-[150px] inline-block">{submission.submission_text}</span>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 min-w-[160px]">
            <input
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="block w-full text-[10px] text-slate-600 file:mr-2 file:rounded-full file:border-0 file:bg-slate-100 file:px-2 file:py-0.5 file:text-[10px] file:font-semibold"
            />
            {selectedFile && (
              <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">Đã chọn: {selectedFile.name}</div>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="text-xs font-semibold whitespace-nowrap">
        {submission?.score ?? "—"}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {!submission && (
          <Button
            size="sm"
            disabled={!selectedFile && !text}
            onClick={() => onSubmit(selectedFile ? selectedFile.name : text)}
          >
            Nộp
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

const MOCK_ASSIGNMENTS = [
  {
    assignment_id: "mock-a1",
    slot_id: "SLOT-20260520-0900-a5f1e",
    course_id: "KH-HSK1",
    title: "Bài tập Từ vựng HSK 1 - Bài 1",
    description: "Luyện viết và nghe 15 từ vựng cơ bản về chào hỏi (你好, 谢谢, 再见).",
    deadline: "2026-06-05T12:00:00.000Z",
  },
  {
    assignment_id: "mock-a2",
    slot_id: "SLOT-20260522-1000-b8c2d",
    course_id: "KH-HSK1",
    title: "Bài tập Ngữ pháp - Câu chữ 是",
    description: "Hoàn thành 10 câu trắc nghiệm sử dụng động từ liên kết '是'.",
    deadline: "2026-06-07T12:00:00.000Z",
  },
  {
    assignment_id: "mock-a3",
    slot_id: "SLOT-20260525-1400-9ef21",
    course_id: "KH-HSK2",
    title: "Luyện dịch HSK 2 - Chủ đề Mua sắm",
    description: "Dịch các câu hội thoại về giá cả và mua sắm tại cửa hàng tiện lợi.",
    deadline: "2026-06-10T12:00:00.000Z",
  },
  {
    assignment_id: "mock-a4",
    slot_id: "SLOT-20260527-1600-e22cf",
    course_id: "KH-HSK2",
    title: "Bài tập Nghe hiểu HSK 2 - Bài 4",
    description: "Nghe file ghi âm và chọn bức tranh mô tả đúng nhất.",
    deadline: "2026-06-12T12:00:00.000Z",
  },
  {
    assignment_id: "mock-a5",
    slot_id: "SLOT-20260530-0900-cf3b9",
    course_id: "KH-HSK3",
    title: "Viết đoạn văn ngắn HSK 3",
    description: "Viết một đoạn văn ngắn (50-80 chữ) kể về gia đình hoặc sở thích của bạn.",
    deadline: "2026-06-15T12:00:00.000Z",
  },
  {
    assignment_id: "mock-a6",
    slot_id: "SLOT-20260601-1000-01ab2",
    course_id: "KH-HSK3",
    title: "Ngữ pháp HSK 3 - Bổ ngữ xu hướng",
    description: "Chọn bổ ngữ xu hướng thích hợp (起来, 过去, 过来) để điền vào chỗ trống.",
    deadline: "2026-06-18T12:00:00.000Z",
  },
  {
    assignment_id: "mock-a7",
    slot_id: "SLOT-20260603-1400-334ef",
    course_id: "KH-HSK4",
    title: "Đọc hiểu HSK 4 - Sắp xếp câu",
    description: "Sắp xếp các câu A, B, C thành một đoạn văn hoàn chỉnh có nghĩa.",
    deadline: "2026-06-20T12:00:00.000Z",
  },
  {
    assignment_id: "mock-a8",
    slot_id: "SLOT-20260605-1600-fa122",
    course_id: "KH-HSK4",
    title: "Luyện dịch HSK 4 - Viết lại câu",
    description: "Sử dụng từ gợi ý trong ngoặc để hoàn thành hoặc viết lại câu.",
    deadline: "2026-06-22T12:00:00.000Z",
  },
  {
    assignment_id: "mock-a9",
    slot_id: "SLOT-20260608-0900-bc56e",
    course_id: "KH-HSK5",
    title: "Viết HSK 5 Phần 2 - Viết bài luận",
    description: "Sử dụng 5 từ cho sẵn để viết một bài luận ngắn khoảng 80 từ.",
    deadline: "2026-06-25T12:00:00.000Z",
  },
  {
    assignment_id: "mock-a10",
    slot_id: "SLOT-20260610-1000-dde44",
    course_id: "KH-HSK5",
    title: "Đọc hiểu HSK 5 - Chọn từ điền vào",
    description: "Đọc đoạn văn và chọn từ vựng/ngữ pháp thích hợp nhất cho các vị trí trống.",
    deadline: "2026-06-27T12:00:00.000Z",
  },
  {
    assignment_id: "mock-a11",
    slot_id: "SLOT-20260612-1400-aa112",
    course_id: "KH-HSK6",
    title: "Bài tập Tìm lỗi sai HSK 6",
    description: "Xác định câu bị lỗi ngữ pháp hoặc lỗi dùng từ trong 10 câu cho sẵn.",
    deadline: "2026-06-30T12:00:00.000Z",
  },
  {
    assignment_id: "mock-a12",
    slot_id: "SLOT-20260615-1600-99bb2",
    course_id: "KH-HSK6",
    title: "Tóm tắt đoạn văn HSK 6 (缩写)",
    description: "Đọc một câu chuyện dài 1000 chữ trong 10 phút, sau đó tóm tắt lại thành 400 chữ.",
    deadline: "2026-07-02T12:00:00.000Z",
  }
];

export function AssignmentsTable({
  assignments,
  submissions,
  onSubmit,
}: {
  assignments: any[];
  submissions: any[];
  onSubmit: (assignmentId: string, text: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const combinedAssignments = useMemo(() => {
    // If the database returns some assignments, combine them with mock assignments.
    // Avoid double keys just in case.
    const dbIds = new Set(assignments.map((a) => a.assignment_id));
    const filteredMocks = MOCK_ASSIGNMENTS.filter((m) => !dbIds.has(m.assignment_id));
    return [...assignments, ...filteredMocks];
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return combinedAssignments.filter((a) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return [
        a.assignment_id,
        a.slot_id,
        a.course_id,
        a.title,
        a.description,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .some((value) => value.includes(query));
    });
  }, [combinedAssignments, searchQuery]);

  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Làm bài tập về nhà.</h2>

      <div className="mb-4 max-w-md">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Tìm kiếm ID, khoá, tiêu đề..."
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto w-full">
        <div className="max-h-[400px] overflow-y-auto min-w-[850px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px] whitespace-nowrap">ID buổi học</TableHead>
                <TableHead className="min-w-[200px] whitespace-nowrap">Tiêu đề</TableHead>
                <TableHead className="min-w-[150px] whitespace-nowrap">Hạn nộp</TableHead>
                <TableHead className="min-w-[180px] whitespace-nowrap">Bài nộp</TableHead>
                <TableHead className="min-w-[100px] whitespace-nowrap">Điểm GV</TableHead>
                <TableHead className="min-w-[80px] whitespace-nowrap"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((a) => {
                const sub = submissions.find((s: any) => s.assignment_id === a.assignment_id);
                return (
                  <AssignmentRow
                    key={a.assignment_id}
                    assignment={a}
                    submission={sub}
                    onSubmit={(text) => onSubmit(a.assignment_id, text)}
                  />
                );
              })}
              {filteredAssignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground whitespace-nowrap">
                    Chưa có bài tập nào phù hợp
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

function StatusBadge({ booking }: { booking: HSKSlot }) {
  const now = Date.now();
  const start = new Date(booking.session_date).getTime();
  const hasActualEnd = !!booking.actual_end_time;
  const end = hasActualEnd
    ? new Date(booking.actual_end_time as string).getTime()
    : start + 90 * 60 * 1000; // fallback 90 phút nếu chưa có giờ kết thúc

  const rawStatus = String(booking.status ?? "").toLowerCase();

  let label = "Sắp diễn ra";
  let className = "bg-primary/15 text-primary ring-1 ring-primary/30";

  if (rawStatus.includes("cancelled")) {
    label = "Đã huỷ";
    className = "bg-destructive/10 text-destructive";
  } else if (now >= start && now <= end) {
    label = "Đang diễn ra";
    className = "bg-warning/15 text-warning-foreground ring-1 ring-warning/30";
  } else if (now > end) {
    label = "Hoàn thành";
    className = "bg-success/10 text-success";
  }

  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
