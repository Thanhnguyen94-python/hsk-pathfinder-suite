import { useMemo, useState } from "react";
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

const HSK_COURSES = ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"];

export function HSK_LogisticsDashboardUi({
  chapters,
  chaptersLoading,
  submissions,
  submissionsLoading,
  createChapter,
  createChapterState,
  deleteChapter,
}: {
  chapters: any[];
  chaptersLoading: boolean;
  submissions: any[];
  submissionsLoading: boolean;
  createChapter: (payload: {
    courseId: string;
    title: string;
    content?: string;
    fileUrls?: string[];
    orderIndex: number;
  }) => void;
  createChapterState: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
  };
  deleteChapter: (chapterId: string) => void;
}) {
  const [chapterForm, setChapterForm] = useState({
    courseId: "HSK1",
    title: "",
    content: "",
    orderIndex: 0,
  });
  const [chapterFiles, setChapterFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChapters = useMemo(() => {
    if (!searchQuery) return chapters;
    const query = searchQuery.toLowerCase();
    return chapters.filter((chapter) =>
      [chapter.chapter_id, chapter.course_id, chapter.title, chapter.content, chapter.pdf_url]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [chapters, searchQuery]);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Quản lý tài liệu hệ thống.</h2>
        <p className="text-sm text-muted-foreground">
          Tạo, chỉnh sửa và quản lý tài liệu học tập.
        </p>
        <div className="mt-4 max-w-md">
          <Input
            placeholder="Tìm kiếm theo ID, khoá, tiêu đề hoặc mô tả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 font-display text-base font-semibold">Khởi tạo bài học.</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Khoá Học</Label>
              <select
                value={chapterForm.courseId}
                onChange={(e) => setChapterForm({ ...chapterForm, courseId: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {HSK_COURSES.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Tiêu đề bài học</Label>
              <Input
                value={chapterForm.title}
                onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Nội dung bài học</Label>
              <Textarea
                rows={4}
                value={chapterForm.content}
                onChange={(e) => setChapterForm({ ...chapterForm, content: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Tải lên tài liệu</Label>
              <input
                type="file"
                multiple
                onChange={(e) => setChapterFiles(Array.from(e.target.files ?? []))}
                className="block w-full text-sm text-slate-600 file:mr-2 file:rounded-full file:border-0 file:bg-slate-100 file:px-2 file:py-0.5 file:text-xs file:font-semibold"
              />
              {chapterFiles.length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {chapterFiles.map((file) => (
                    <div key={file.name} className="truncate" title={file.name}>
                      {file.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Thứ tự</Label>
              <Input
                type="number"
                value={chapterForm.orderIndex}
                onChange={(e) =>
                  setChapterForm({
                    ...chapterForm,
                    orderIndex: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <Button
            className="mt-4"
            onClick={() => {
              createChapter({
                courseId: chapterForm.courseId,
                title: chapterForm.title,
                content: chapterForm.content,
                fileUrls: chapterFiles.map((file) => file.name),
                orderIndex: chapterForm.orderIndex,
              });
              setChapterForm({ ...chapterForm, title: "", content: "" });
              setChapterFiles([]);
            }}
            disabled={!chapterForm.title || createChapterState.isPending}
          >
            <Plus className="mr-1 h-4 w-4" /> Tạo bài học
          </Button>
          {createChapterState.isError && (
            <p className="mt-2 text-sm text-destructive">
              {(createChapterState.error as Error)?.message ?? "Có lỗi xảy ra."}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-x-auto w-full">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[60px] whitespace-nowrap">STT</TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">ID bài học</TableHead>
                <TableHead className="min-w-[120px] whitespace-nowrap">Khoá</TableHead>
                <TableHead className="min-w-[260px] whitespace-nowrap">Tiêu đề</TableHead>
                <TableHead className="min-w-[260px] whitespace-nowrap">Tài liệu</TableHead>
                <TableHead className="min-w-[100px] whitespace-nowrap">Thứ tự</TableHead>
                <TableHead className="min-w-[80px] whitespace-nowrap">Gỡ bỏ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChapters.map((chapter, index) => (
                <TableRow key={chapter.chapter_id}>
                  <TableCell className="whitespace-nowrap">{index + 1}</TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{chapter.chapter_id}</TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{chapter.course_id}</TableCell>
                  <TableCell className="whitespace-nowrap">{chapter.title}</TableCell>
                  <TableCell className="max-w-[260px] text-xs">
                    {chapter.file_urls?.length ? (
                      <ul className="space-y-1">
                        {chapter.file_urls.map((file: string, idx: number) => (
                          <li key={idx} className="truncate" title={file}>
                            {file}
                          </li>
                        ))}
                      </ul>
                    ) : chapter.pdf_url ? (
                      <a
                        href={chapter.pdf_url}
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
                  <TableCell className="whitespace-nowrap">{chapter.order_index}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteChapter(chapter.chapter_id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredChapters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {chaptersLoading ? "Đang tải…" : "Chưa có chương nào."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
      <section className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 font-display text-base font-semibold">Bài nộp</h3>
          <p className="text-sm text-muted-foreground">
            Danh sách bài nộp học viên chỉ để tham khảo. Thao tác chấm điểm được xử lý ở hệ thống nội bộ.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-x-auto w-full">
          <div className="max-h-[420px] overflow-y-auto min-w-[920px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px] whitespace-nowrap">Học viên</TableHead>
                  <TableHead className="min-w-[220px] whitespace-nowrap">Bài tập</TableHead>
                  <TableHead className="min-w-[280px] whitespace-nowrap">Bài nộp</TableHead>
                  <TableHead className="min-w-[100px] whitespace-nowrap">Điểm</TableHead>
                  <TableHead className="min-w-[180px] whitespace-nowrap">Nhận xét</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.submission_id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      <div>{submission.student_name ?? "—"}</div>
                      <div className="font-mono text-xs text-muted-foreground">{submission.student_id}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium">{submission.assignments?.title}</div>
                      <div className="text-xs text-muted-foreground">{submission.assignments?.course_id}</div>
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      {submission.submission_text && (
                        <p className="line-clamp-2 text-xs">{submission.submission_text}</p>
                      )}
                      {submission.submission_url && (
                        <a
                          className="text-xs text-success hover:underline"
                          href={submission.submission_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          File đính kèm
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{submission.score ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{submission.reviewer_comment ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {submissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {submissionsLoading ? "Đang tải…" : "Chưa có bài nộp."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
    </div>
  );
}
