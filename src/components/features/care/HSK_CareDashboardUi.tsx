import { useEffect, useMemo, useState } from "react";
import { UseMutationResult } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { USER_STATUS_LABELS, getStatusLabel } from "@/lib/hsk-status-labels";

const STUDENT_SORT_FIELDS = [
  { value: "created_at", label: "Ngày tham gia" },
  { value: "name", label: "Họ tên" },
  { value: "email", label: "Email" },
  { value: "status", label: "Trạng thái" },
  { value: "course", label: "Khoá" },
];

const STAFF_SORT_FIELDS = [
  { value: "role", label: "Vai trò" },
  { value: "created_at", label: "Ngày tham gia" },
  { value: "name", label: "Họ tên" },
  { value: "email", label: "Email" },
  { value: "status", label: "Trạng thái" },
];

export function HSK_CareDashboardUi({
  isAdmin,
  canCreateUsers,
  students,
  studentsLoading,
  studentsError,
  staff,
  staffLoading,
  staffError,
  createUser,
  createUserState,
}: {
  isAdmin: boolean;
  canCreateUsers: boolean;
  students: any[];
  studentsLoading: boolean;
  studentsError: unknown;
  staff: any[];
  staffLoading: boolean;
  staffError: unknown;
  createUser: (payload: {
    email: string;
    password: string;
    fullName: string;
    role: "student" | "teacher" | "logistics" | "care";
    phone?: string;
    birthYear?: number;
    status?: "active" | "disabled";
  }) => void;
  createUserState: UseMutationResult<
    { specificId: any },
    Error,
    {
      email: string;
      password: string;
      fullName: string;
      role: "student" | "teacher" | "logistics" | "care";
      phone?: string;
      birthYear?: number;
      status?: "active" | "disabled";
    }
  >;
}) {
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSortBy, setStudentSortBy] = useState<"created_at" | "name" | "email" | "status" | "course">("created_at");
  const [studentSortDirection, setStudentSortDirection] = useState<"asc" | "desc">("desc");
  const [staffSearch, setStaffSearch] = useState("");
  const [staffSortBy, setStaffSortBy] = useState<"role" | "created_at" | "name" | "email" | "status">("role");
  const [staffSortDirection, setStaffSortDirection] = useState<"asc" | "desc">("asc");

  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "student" as "student" | "teacher" | "logistics" | "care",
    phone: "",
    birthYear: "",
    status: "active" as "active" | "disabled",
  });

  const birthYearNumber = Number(createForm.birthYear);
  const isCreateFormValid =
    Boolean(createForm.fullName.trim()) &&
    Boolean(createForm.email.trim()) &&
    Boolean(createForm.password) &&
    Boolean(createForm.phone.trim()) &&
    Boolean(createForm.birthYear) &&
    !Number.isNaN(birthYearNumber) &&
    birthYearNumber >= 1900 &&
    birthYearNumber <= new Date().getFullYear();

  useEffect(() => {
    if (createUserState.isSuccess) {
      setCreateForm({
        fullName: "",
        email: "",
        password: "",
        role: "student",
        phone: "",
        birthYear: "",
        status: "active",
      });
    }
  }, [createUserState.isSuccess]);

  const normalizedStudentFilter = studentSearch.trim().toLowerCase();
  const filteredStudents = useMemo(() => {
    const rows = students.filter((student) => {
      if (!normalizedStudentFilter) return true;
      const haystack = [
        student.full_name,
        student.specific_id,
        student.email,
        student.phone,
        student.birth_year?.toString(),
        student.status,
        (student.courses ?? [])
          .map((course: any) => `${course.course_id} ${course.mode}`)
          .join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedStudentFilter);
    });

    return rows.sort((a, b) => {
      const direction = studentSortDirection === "asc" ? 1 : -1;
      const aValue =
        studentSortBy === "name"
          ? a.full_name ?? ""
          : studentSortBy === "email"
          ? a.email ?? ""
          : studentSortBy === "status"
          ? a.status ?? ""
          : studentSortBy === "course"
          ? ((a.courses ?? [])[0]?.course_id ?? "")
          : new Date(a.created_at).getTime();
      const bValue =
        studentSortBy === "name"
          ? b.full_name ?? ""
          : studentSortBy === "email"
          ? b.email ?? ""
          : studentSortBy === "status"
          ? b.status ?? ""
          : studentSortBy === "course"
          ? ((b.courses ?? [])[0]?.course_id ?? "")
          : new Date(b.created_at).getTime();

      if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * direction;
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [students, normalizedStudentFilter, studentSortBy, studentSortDirection]);

  const normalizedStaffFilter = staffSearch.trim().toLowerCase();
  const filteredStaff = useMemo(() => {
    const rows = staff.filter((member) => {
      if (!normalizedStaffFilter) return true;
      const haystack = [
        member.full_name,
        member.specific_id,
        member.email,
        member.role,
        member.phone,
        member.birth_year?.toString(),
        member.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedStaffFilter);
    });

    return rows.sort((a, b) => {
      const direction = staffSortDirection === "asc" ? 1 : -1;
      const aValue =
        staffSortBy === "name"
          ? a.full_name ?? ""
          : staffSortBy === "email"
          ? a.email ?? ""
          : staffSortBy === "status"
          ? a.status ?? ""
          : staffSortBy === "created_at"
          ? new Date(a.created_at).getTime()
          : a.role ?? "";
      const bValue =
        staffSortBy === "name"
          ? b.full_name ?? ""
          : staffSortBy === "email"
          ? b.email ?? ""
          : staffSortBy === "status"
          ? b.status ?? ""
          : staffSortBy === "created_at"
          ? new Date(b.created_at).getTime()
          : b.role ?? "";

      if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * direction;
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [staff, normalizedStaffFilter, staffSortBy, staffSortDirection]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Danh bạ CSKH</h2>
            <p className="text-sm text-muted-foreground">
              Danh sách học viên và nhân viên hiển thị đầy đủ thông tin. Chỉ mật khẩu được biểu thị dưới dạng ẩn.
            </p>
          </div>
          <Badge variant="secondary">Quyền {isAdmin ? "Admin" : "CSKH"}</Badge>
        </div>

        {canCreateUsers ? (
          <div className="rounded-xl border border-border bg-background p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">Tạo tài khoản mới</h3>
                <p className="text-sm text-muted-foreground">
                  Chỉ Admin và CSKH có thể tạo học viên hoặc nhân viên mới ngay tại đây.
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                Tạo tài khoản cho hệ thống
              </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Họ và tên</Label>
                <Input
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mật khẩu</Label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vai trò</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) => setCreateForm({ ...createForm, role: value as typeof createForm.role })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Học viên</SelectItem>
                    <SelectItem value="teacher">Giáo viên</SelectItem>
                    <SelectItem value="logistics">Logistics</SelectItem>
                    <SelectItem value="care">CSKH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Số điện thoại</Label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Năm sinh</Label>
                <Input
                  type="number"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={createForm.birthYear}
                  onChange={(e) => setCreateForm({ ...createForm, birthYear: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <Select
                  value={createForm.status}
                  onValueChange={(value) => setCreateForm({ ...createForm, status: value as typeof createForm.status })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{USER_STATUS_LABELS.active}</SelectItem>
                    <SelectItem value="disabled">{USER_STATUS_LABELS.disabled}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                onClick={() =>
                  createUser({
                    fullName: createForm.fullName,
                    email: createForm.email,
                    password: createForm.password,
                    role: createForm.role,
                    phone: createForm.phone.trim(),
                    birthYear: birthYearNumber,
                    status: createForm.status,
                  })
                }
                disabled={createUserState.isPending || !isCreateFormValid}
              >
                Tạo tài khoản mới
              </Button>
              {!isCreateFormValid && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                  Vui lòng điền đầy đủ thông tin quan trọng: họ tên, email, mật khẩu, số điện thoại và năm sinh hợp lệ.
                </div>
              )}
              {createUserState.isSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Tài khoản đã được tạo thành công.
                </div>
              )}
              {createUserState.isError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {(createUserState.error as Error)?.message ?? "Không thể tạo tài khoản."}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-background p-5">
            <p className="text-sm text-muted-foreground">
              Chỉ Admin và CSKH mới có quyền tạo tài khoản mới trên CSKH.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold">Học viên</h3>
            <p className="text-sm text-muted-foreground">Tìm kiếm, sắp xếp và xem toàn bộ thông tin học viên. Mật khẩu luôn ẩn.</p>
          </div>
          <Badge variant="secondary">Danh sách</Badge>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            placeholder="Tìm kiếm học viên..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
          />
          <div className="flex gap-2">
            <Select value={studentSortBy} onValueChange={(value) => setStudentSortBy(value as typeof studentSortBy)}>
              <SelectTrigger className="min-w-[170px]">
                <SelectValue placeholder="Sắp xếp theo" />
              </SelectTrigger>
              <SelectContent>
                {STUDENT_SORT_FIELDS.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setStudentSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
            >
              {studentSortDirection === "asc" ? "↑" : "↓"}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead>Họ tên / ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>SĐT</TableHead>
                <TableHead>Năm sinh</TableHead>
                <TableHead>Mật khẩu</TableHead>
                <TableHead>Khoá đang học</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tham gia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.specific_id}>
                  <TableCell>
                    <div className="font-medium">{student.full_name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{student.specific_id}</div>
                  </TableCell>
                  <TableCell className="text-sm">{student.email}</TableCell>
                  <TableCell>{student.phone ?? "—"}</TableCell>
                  <TableCell>{student.birth_year ?? "—"}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">••••••••</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(student.courses ?? []).length > 0 ? (
                        student.courses.map((course: any, index: number) => (
                          <Badge key={index} variant="outline" className="font-mono text-xs">
                            {course.course_id} · {course.mode} · {course.remaining}/{course.total}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Chưa có</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={student.status === "active" ? "default" : "destructive"}
                      className="capitalize"
                    >
                      {getStatusLabel(student.status, USER_STATUS_LABELS)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(student.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {studentsLoading
                      ? "Đang tải…"
                      : studentsError
                      ? (studentsError as Error).message
                      : "Không tìm thấy học viên."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold">Nhân viên</h3>
            <p className="text-sm text-muted-foreground">Tìm kiếm, sắp xếp và xem thông tin đội ngũ support, giáo viên hoặc logistics.</p>
          </div>
          <Badge variant="secondary">Danh sách</Badge>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            placeholder="Tìm kiếm nhân viên..."
            value={staffSearch}
            onChange={(e) => setStaffSearch(e.target.value)}
          />
          <div className="flex gap-2">
            <Select value={staffSortBy} onValueChange={(value) => setStaffSortBy(value as typeof staffSortBy)}>
              <SelectTrigger className="min-w-[170px]">
                <SelectValue placeholder="Sắp xếp theo" />
              </SelectTrigger>
              <SelectContent>
                {STAFF_SORT_FIELDS.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setStaffSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
            >
              {staffSortDirection === "asc" ? "↑" : "↓"}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Họ tên / ID</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>SĐT</TableHead>
                <TableHead>Năm sinh</TableHead>
                <TableHead>Mật khẩu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tham gia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((member) => (
                <TableRow key={member.specific_id}>
                  <TableCell>
                    <div className="font-medium">{member.full_name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{member.specific_id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{member.email}</TableCell>
                  <TableCell>{member.phone ?? "—"}</TableCell>
                  <TableCell>{member.birth_year ?? "—"}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">••••••••</TableCell>
                  <TableCell>
                    <Badge
                      variant={member.status === "active" ? "default" : "destructive"}
                      className="capitalize"
                    >
                      {getStatusLabel(member.status, USER_STATUS_LABELS)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {filteredStaff.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {staffLoading
                      ? "Đang tải…"
                      : staffError
                      ? (staffError as Error).message
                      : "Không tìm thấy nhân viên."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
