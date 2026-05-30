import { useMemo, useState } from "react";
import { RatingDialog } from "@/components/common/RatingDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { HSKSlot } from "@/types/hsk-models/hsk-booking.types";

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
                  {p.status}
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
  const [statusFilter, setStatusFilter] = useState<HSKSlot["status"] | "all">("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "week" | "month" | "custom">("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"session_date" | "status" | "teacher_name">("session_date");
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

    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;

      if (query) {
        const haystack = `${b.course_name ?? b.class_id ?? ""} ${b.teacher_name ?? ""} ${b.status ?? ""}`
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

      if (sortBy === "session_date") {
        aValue = parseIsoDate(a.session_date)?.getTime() ?? 0;
        bValue = parseIsoDate(b.session_date)?.getTime() ?? 0;
      } else if (sortBy === "status") {
        aValue = a.status ?? "";
        bValue = b.status ?? "";
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

  const handleSort = (field: "session_date" | "status" | "teacher_name") => {
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
                  setStatusFilter(value as HSKSlot["status"] | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled_valid">Cancelled valid</SelectItem>
                  <SelectItem value="cancelled_late">Cancelled late</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Khoảng thời gian</p>
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

        <div className="text-sm text-slate-500">
          Hiển thị {paginatedBookings.length} trong {sortedBookings.length} buổi học.
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slot</TableHead>
              <TableHead>Khoá học</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  onClick={() => handleSort("teacher_name")}
                >
                  Giáo viên
                  {sortBy === "teacher_name" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  onClick={() => handleSort("session_date")}
                >
                  Bắt đầu
                  {sortBy === "session_date" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </button>
              </TableHead>
              <TableHead>Kết thúc (thực tế)</TableHead>
              <TableHead>Độ dài</TableHead>
              <TableHead>Ghi chú GV</TableHead>
              <TableHead>Tài liệu</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  onClick={() => handleSort("status")}
                >
                  Trạng thái
                  {sortBy === "status" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </button>
              </TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBookings.map((b) => (
              <TableRow key={b.slot_id}>
                <TableCell className="font-mono text-xs">{b.slot_id}</TableCell>
                <TableCell className="font-medium">{b.course_name ?? b.class_id}</TableCell>
                <TableCell>
                  {b.teacher_name ? (
                    <>
                      <div className="font-medium">{b.teacher_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{b.teacher_id}</div>
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
                <TableCell className="text-xs">{getDuration(b.session_date, b.actual_end_time)}</TableCell>
                <TableCell className="max-w-xs">
                  {b.teacher_note ? (
                    <span className="block truncate cursor-help text-xs" title={b.teacher_note}>
                      {b.teacher_note}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
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
                <TableCell>
                  <StatusBadge status={b.status} />
                </TableCell>
                <TableCell className="space-x-2">
                  {(b.status === "pending" || b.status === "confirmed") && new Date(b.session_date) > new Date() && (
                    <Button size="sm" variant="outline" onClick={() => onCancel(b.slot_id)}>
                      Huỷ
                    </Button>
                  )}
                  {b.teacher_id && new Date(b.session_date) <= new Date() && (b.status === "confirmed" || b.status === "pending") && !ratedSlots.has(b.slot_id) && (
                    <RatingDialog slotId={b.slot_id} teacherId={b.teacher_id} />
                  )}
                  {ratedSlots.has(b.slot_id) && (
                    <span className="text-xs text-success">Đã đánh giá</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {paginatedBookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
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

  const submissionLabel = submission?.submission_url
    ? submission.submission_url
    : submission?.submission_text || "Chưa nộp";

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">
        <div>{assignment.assignment_id}</div>
        <div className="text-xs text-muted-foreground">{assignment.course_id}</div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{assignment.title}</div>
        {assignment.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">{assignment.description}</div>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        {new Date(assignment.deadline).toLocaleString()}
      </TableCell>
      <TableCell className="space-y-2 text-xs">
        {submission ? (
          <div className="space-y-1">
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
              <div className="break-words">{submission.submission_text}</div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold"
            />
            {selectedFile && (
              <div className="text-xs text-muted-foreground">Đã chọn: {selectedFile.name}</div>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="text-xs font-semibold">
        {submission?.score ?? "—"}
      </TableCell>
      <TableCell>
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

  const filteredAssignments = assignments.filter((a) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return [
      a.assignment_id,
      a.course_id,
      a.title,
      a.description,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())
      .some((value) => value.includes(query));
  });

  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Bài tập HSK</h2>

      <div className="mb-4 max-w-md">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Tìm kiếm ID, khoá, tiêu đề..."
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="max-h-[520px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID buổi học</TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Hạn nộp</TableHead>
                <TableHead>Bài nộp</TableHead>
                <TableHead>Điểm GV</TableHead>
                <TableHead></TableHead>
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning-foreground",
    confirmed: "bg-success/10 text-success",
    cancelled_valid: "bg-muted text-muted-foreground",
    cancelled_late: "bg-destructive/10 text-destructive",
  };

  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${map[status] ?? ""}`}>
      {status}
    </span>
  );
}
