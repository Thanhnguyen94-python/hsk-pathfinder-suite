import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardShell } from "@/components/site/DashboardShell";
import {
  listChapters,
  upsertChapter,
  deleteChapter,
  listAssignments,
  createAssignment,
  deleteAssignment,
  listSubmissions,
  gradeSubmission,
} from "@/lib/hsk.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus, FileText } from "lucide-react";

export const Route = createFileRoute("/logistics")({
  head: () => ({ meta: [{ title: "Logistics · HSK Center" }] }),
  component: () => (
    <DashboardShell role="Logistics" accent="bg-warning/20 text-warning-foreground">
      <Inner />
    </DashboardShell>
  ),
});

const HSK_COURSES = ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"];

function Inner() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Bảng điều khiển Logistics</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý giáo trình, bài tập và chấm điểm bài nộp.
        </p>
      </div>
      <Tabs defaultValue="curriculum">
        <TabsList>
          <TabsTrigger value="curriculum">Giáo trình HSK</TabsTrigger>
          <TabsTrigger value="assignments">Tạo bài tập</TabsTrigger>
          <TabsTrigger value="submissions">Bài nộp & chấm điểm</TabsTrigger>
        </TabsList>
        <TabsContent value="curriculum" className="mt-6">
          <CurriculumTab />
        </TabsContent>
        <TabsContent value="assignments" className="mt-6">
          <AssignmentsTab />
        </TabsContent>
        <TabsContent value="submissions" className="mt-6">
          <SubmissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CurriculumTab() {
  const qc = useQueryClient();
  const list = useServerFn(listChapters);
  const upsert = useServerFn(upsertChapter);
  const del = useServerFn(deleteChapter);
  const q = useQuery({ queryKey: ["chapters"], queryFn: () => list() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["chapters"] });

  const [form, setForm] = useState({
    courseId: "HSK1",
    title: "",
    content: "",
    pdfUrl: "",
    orderIndex: 0,
  });
  const upsertM = useMutation({
    mutationFn: () => upsert({ data: form }),
    onSuccess: () => {
      refresh();
      setForm({ ...form, title: "", content: "", pdfUrl: "" });
    },
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { chapterId: id } }),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-display text-base font-semibold">Thêm chương mới</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Khoá HSK</Label>
            <select
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {HSK_COURSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Tiêu đề chương</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Nội dung bài học</Label>
            <Textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>PDF URL (mock)</Label>
            <Input
              placeholder="https://…"
              value={form.pdfUrl}
              onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Thứ tự</Label>
            <Input
              type="number"
              value={form.orderIndex}
              onChange={(e) =>
                setForm({ ...form, orderIndex: Number(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        <Button
          onClick={() => upsertM.mutate()}
          disabled={!form.title || upsertM.isPending}
          className="mt-4"
        >
          <Plus className="mr-1 h-4 w-4" /> Thêm chương
        </Button>
        {upsertM.isError && (
          <p className="mt-2 text-sm text-destructive">
            {(upsertM.error as Error).message}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khoá</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>PDF</TableHead>
              <TableHead>Thứ tự</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(q.data ?? []).map((c: any) => (
              <TableRow key={c.chapter_id}>
                <TableCell className="font-mono text-xs">{c.course_id}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>
                  {c.pdf_url ? (
                    <a
                      href={c.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-success hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" /> Mở
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{c.order_index}</TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => delM.mutate(c.chapter_id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(q.data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {q.isLoading ? "Đang tải…" : "Chưa có chương nào"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AssignmentsTab() {
  const qc = useQueryClient();
  const list = useServerFn(listAssignments);
  const create = useServerFn(createAssignment);
  const del = useServerFn(deleteAssignment);
  const q = useQuery({ queryKey: ["assignments"], queryFn: () => list() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["assignments"] });

  const [form, setForm] = useState({
    courseId: "HSK1",
    title: "",
    description: "",
    deadline: "",
  });
  const createM = useMutation({
    mutationFn: () =>
      create({
        data: {
          courseId: form.courseId,
          title: form.title,
          description: form.description,
          deadline: new Date(form.deadline).toISOString(),
        },
      }),
    onSuccess: () => {
      refresh();
      setForm({ ...form, title: "", description: "", deadline: "" });
    },
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { assignmentId: id } }),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-display text-base font-semibold">Tạo bài tập mới</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Khoá HSK</Label>
            <select
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {HSK_COURSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Tiêu đề</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Mô tả</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hạn nộp</Label>
            <Input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>
        </div>
        <Button
          onClick={() => createM.mutate()}
          disabled={!form.title || !form.deadline || createM.isPending}
          className="mt-4"
        >
          <Plus className="mr-1 h-4 w-4" /> Tạo bài tập
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khoá</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Hạn nộp</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(q.data ?? []).map((a: any) => (
              <TableRow key={a.assignment_id}>
                <TableCell className="font-mono text-xs">{a.course_id}</TableCell>
                <TableCell>{a.title}</TableCell>
                <TableCell>{new Date(a.deadline).toLocaleString()}</TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => delM.mutate(a.assignment_id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(q.data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Chưa có bài tập nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SubmissionsTab() {
  const qc = useQueryClient();
  const list = useServerFn(listSubmissions);
  const grade = useServerFn(gradeSubmission);
  const q = useQuery({ queryKey: ["submissions"], queryFn: () => list() });
  const [editing, setEditing] = useState<Record<string, { score: string; comment: string }>>({});
  const gradeM = useMutation({
    mutationFn: (v: { submissionId: string; score: number; comment: string }) =>
      grade({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions"] }),
  });

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Học viên</TableHead>
            <TableHead>Bài tập</TableHead>
            <TableHead>Bài nộp</TableHead>
            <TableHead>Điểm</TableHead>
            <TableHead>Nhận xét</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(q.data ?? []).map((s: any) => {
            const e = editing[s.submission_id] ?? {
              score: s.score?.toString() ?? "",
              comment: s.reviewer_comment ?? "",
            };
            return (
              <TableRow key={s.submission_id}>
                <TableCell className="font-mono text-xs">{s.student_id}</TableCell>
                <TableCell>
                  <div className="font-medium">{s.assignments?.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.assignments?.course_id}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  {s.submission_text && (
                    <p className="line-clamp-2 text-xs">{s.submission_text}</p>
                  )}
                  {s.submission_url && (
                    <a
                      className="text-xs text-success hover:underline"
                      href={s.submission_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      File đính kèm
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    className="w-20"
                    type="number"
                    value={e.score}
                    onChange={(ev) =>
                      setEditing({
                        ...editing,
                        [s.submission_id]: { ...e, score: ev.target.value },
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={e.comment}
                    onChange={(ev) =>
                      setEditing({
                        ...editing,
                        [s.submission_id]: { ...e, comment: ev.target.value },
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() =>
                      gradeM.mutate({
                        submissionId: s.submission_id,
                        score: Number(e.score) || 0,
                        comment: e.comment,
                      })
                    }
                    disabled={gradeM.isPending}
                  >
                    Lưu
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {(q.data ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Chưa có bài nộp
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
