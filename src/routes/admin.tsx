import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/site/DashboardShell";
import {
  assignStudentToOfflineClass,
  getAuditLogs,
  getTeacherAnalytics,
} from "@/lib/hsk.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Bảng điều khiển Admin</h1>
        <p className="text-sm text-muted-foreground">
          Master control panel — gán lớp, theo dõi giáo viên và audit log toàn hệ thống.
        </p>
      </div>
      <Tabs defaultValue="mapping">
        <TabsList>
          <TabsTrigger value="mapping">Mapping học viên ↔ lớp</TabsTrigger>
          <TabsTrigger value="teachers">Giáo viên & đánh giá</TabsTrigger>
          <TabsTrigger value="audit">Audit logs</TabsTrigger>
        </TabsList>
        <TabsContent value="mapping" className="mt-6">
          <MappingTab />
        </TabsContent>
        <TabsContent value="teachers" className="mt-6">
          <TeachersTab />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <AuditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MappingTab() {
  const qc = useQueryClient();
  const assign = useServerFn(assignStudentToOfflineClass);
  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const m = useMutation({
    mutationFn: () => assign({ data: { studentId, classId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit"] });
      setStudentId("");
      setClassId("");
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 font-display text-base font-semibold">
        Gán học viên vào lớp offline
      </h3>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Student ID</Label>
          <Input
            placeholder="HV-26-XXXX"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-56 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Class ID</Label>
          <Input
            placeholder="L-OFF-XXXX"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-64 font-mono"
          />
        </div>
        <Button
          onClick={() => m.mutate()}
          disabled={!studentId || !classId || m.isPending}
        >
          Gán vào lớp
        </Button>
      </div>
      {m.isError && (
        <p className="mt-3 text-sm text-destructive">{(m.error as Error).message}</p>
      )}
      {m.isSuccess && (
        <p className="mt-3 text-sm text-success">Gán thành công.</p>
      )}
    </div>
  );
}

function TeachersTab() {
  const fn = useServerFn(getTeacherAnalytics);
  const q = useQuery({ queryKey: ["teacher-analytics"], queryFn: () => fn() });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-display text-base font-semibold">
            Tổng hợp giáo viên — đánh giá & vi phạm
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher ID</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Average rating</TableHead>
              <TableHead>Tổng review</TableHead>
              <TableHead>Late cancellations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(q.data?.teachers ?? []).map((t: any) => (
              <TableRow key={t.teacher_id}>
                <TableCell className="font-mono text-xs">{t.teacher_id}</TableCell>
                <TableCell>{t.full_name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="font-semibold">
                      {Number(t.avg_stars).toFixed(2)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{t.total_reviews}</TableCell>
                <TableCell>
                  <span
                    className={
                      Number(t.total_penalties) > 0
                        ? "font-semibold text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {t.total_penalties}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {(q.data?.teachers ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {q.isLoading ? "Đang tải…" : "Chưa có dữ liệu"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-display text-base font-semibold">
            Feedback chi tiết từ học viên
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Học viên</TableHead>
              <TableHead>Sao</TableHead>
              <TableHead>Nhận xét</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(q.data?.ratings ?? []).map((r: any) => (
              <TableRow key={r.rating_id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(r.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="font-mono text-xs">{r.teacher_id}</TableCell>
                <TableCell className="font-mono text-xs">{r.student_id}</TableCell>
                <TableCell>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-3.5 w-3.5 ${
                          n <= r.stars
                            ? "fill-warning text-warning"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="max-w-md text-sm">{r.comment ?? "—"}</TableCell>
              </TableRow>
            ))}
            {(q.data?.ratings ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Chưa có đánh giá nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AuditTab() {
  const fn = useServerFn(getAuditLogs);
  const q = useQuery({ queryKey: ["audit"], queryFn: () => fn() });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE = 25;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const all = (q.data ?? []) as any[];
    if (!s) return all;
    return all.filter(
      (l) =>
        l.user_specific_id?.toLowerCase().includes(s) ||
        l.action?.toLowerCase().includes(s) ||
        JSON.stringify(l.details ?? {}).toLowerCase().includes(s),
    );
  }, [q.data, search]);

  const pageRows = filtered.slice(page * PAGE, (page + 1) * PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Tìm theo User ID / Action / Details…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-sm"
        />
        <div className="text-sm text-muted-foreground">
          {filtered.length} bản ghi
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((l: any) => (
              <TableRow key={l.log_id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(l.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {l.user_specific_id ?? l.user_id?.slice(0, 8) ?? "—"}
                </TableCell>
                <TableCell className="font-medium">{l.action}</TableCell>
                <TableCell className="max-w-md font-mono text-[11px] text-muted-foreground">
                  <span className="line-clamp-2">
                    {JSON.stringify(l.details)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="rounded-md bg-success/10 px-2 py-0.5 text-xs text-success">
                    OK
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {q.isLoading ? "Đang tải…" : "Không có log"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Trước
        </Button>
        <div className="text-sm text-muted-foreground">
          Trang {page + 1} / {totalPages}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}
