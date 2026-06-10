import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Star, MoreHorizontal, Pencil, Trash2, Eye, EyeOff, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AdminMappingPanel({
  studentId,
  classId,
  onStudentIdChange,
  onClassIdChange,
  onAssign,
  isSubmitDisabled,
}: {
  studentId: string;
  classId: string;
  onStudentIdChange: (value: string) => void;
  onClassIdChange: (value: string) => void;
  onAssign: () => void;
  isSubmitDisabled: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 font-display text-base font-semibold">Gán học viên vào lớp offline</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Student ID</Label>
          <Input
            placeholder="HV-26-XXXX"
            value={studentId}
            onChange={(e) => onStudentIdChange(e.target.value)}
            className="w-56 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Class ID</Label>
          <Input
            placeholder="L-OFF-XXXX"
            value={classId}
            onChange={(e) => onClassIdChange(e.target.value)}
            className="w-64 font-mono"
          />
        </div>
        <Button onClick={onAssign} disabled={isSubmitDisabled}>
          Gán vào lớp
        </Button>
      </div>
    </div>
  );
}

export function AdminTeacherAnalyticsPanel({
  teachers,
  ratings,
}: {
  teachers: any[];
  ratings: any[];
}) {
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
            {teachers.map((t) => (
              <TableRow key={t.teacher_id}>
                <TableCell className="font-mono text-xs">{t.teacher_id}</TableCell>
                <TableCell>{t.full_name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="font-semibold">{Number(t.avg_stars).toFixed(2)}</span>
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
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-display text-base font-semibold">Feedback chi tiết từ học viên</h3>
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
            {ratings.map((r) => (
              <TableRow key={r.rating_id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(r.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.teacher_name ?? "—"}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.teacher_id}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.student_name ?? "—"}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.student_id}</div>
                </TableCell>
                <TableCell>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={
                          n <= r.stars
                            ? "h-3.5 w-3.5 fill-warning text-warning"
                            : "text-muted-foreground/30"
                        }
                      />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="max-w-md text-sm">{r.comment ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function AdminAuditLogsPanel({
  logs,
}: {
  logs: any[];
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log, index) => (
              <TableRow key={`${log.log_id ?? index}-${log.created_at}`}>
                <TableCell className="text-xs whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div>{log.user_full_name ?? log.user_specific_id ?? "—"}</div>
                  <div className="font-mono text-xs text-muted-foreground">{log.user_specific_id}</div>
                </TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell className="max-w-xl text-sm text-muted-foreground">
                  {JSON.stringify(log.details ?? {})}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function AdminUserManagementPanel({
  users,
  onUpdateUser,
  onDeleteUser,
  isPending,
}: {
  users: any[];
  onUpdateUser: (payload: any) => void;
  onDeleteUser: (id: string, hardDelete: boolean) => void;
  isPending: boolean;
}) {
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    specific_id: true,
    full_name: true,
    email: true,
    role: true,
    status: true,
    phone: true,
    birth_year: true,
    created_at: false,
    updated_at: false,
  });
  const [filterText, setFilterText] = useState("");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleColumn = (key: string) => setVisibleColumns((s) => ({ ...s, [key]: !s[key] }));

  const displayedUsers = (users ?? [])
    .filter((u: any) => {
      if (!filterText) return true;
      const q = filterText.toLowerCase();
      return (
        String(u.full_name ?? "").toLowerCase().includes(q) ||
        String(u.email ?? "").toLowerCase().includes(q) ||
        String(u.specific_id ?? "").toLowerCase().includes(q) ||
        String(u.phone ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a: any, b: any) => {
      if (!sortBy) return 0;
      const av = (a[sortBy] ?? '') as any;
      const bv = (b[sortBy] ?? '') as any;
      if (av === bv) return 0;
      if (sortDir === 'asc') return av > bv ? 1 : -1;
      return av > bv ? -1 : 1;
    });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");

  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editBirthDate, setEditBirthDate] = useState<any>("");

  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditFullName(user.full_name || "");
    setEditRole(user.role || "student");
    setEditStatus(user.status || "active");
    setEditPhone(user.phone || "");
    setEditPassword("");
    if (user && user.birth_year) {
      setEditBirthDate(typeof user.birth_year === 'string' ? user.birth_year : `${user.birth_year}-01-01`);
    } else {
      setEditBirthDate("");
    }
    setShowEditPassword(false);
  };

  const handleUpdate = () => {
    if (!editingUser) return;
    const payload: any = { id: editingUser.id };
    if (editFullName !== editingUser.full_name) payload.fullName = editFullName;
    if (editRole !== editingUser.role) payload.role = editRole;
    if (editStatus !== editingUser.status) payload.status = editStatus;
    if (editPhone !== editingUser.phone) payload.phone = editPhone;
    if (editPassword) payload.password = editPassword;
    // send full date string when available, otherwise fall back to year
    if (editBirthDate !== (editingUser.birth_year ? (typeof editingUser.birth_year === 'string' ? editingUser.birth_year : `${editingUser.birth_year}-01-01`) : "")) {
      if (editBirthDate) {
        payload.birthDate = editBirthDate;
      } else {
        const y = editingUser.birth_year ?? null;
        if (y !== null && y !== undefined) payload.birthYear = Number(y);
      }
    }

    onUpdateUser(payload);
    setEditingUser(null);
  };

  // export displayed users as CSV
  const exportCsv = () => {
    const cols = ['specific_id','full_name','email','role','status','phone','birth_year','created_at','updated_at'];
    const escape = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const formatBirth = (u: any) => {
      const by = u.birth_year;
      if (by === null || by === undefined || by === '') return '';
      if (typeof by === 'string') {
        const d = new Date(by);
        if (!Number.isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          return `${dd}/${mm}/${yyyy}`;
        }
        return String(by);
      }
      return `01/01/${by}`;
    };
    const rows = displayedUsers.map((u: any) => cols.map((c) => (c === 'birth_year' ? escape(formatBirth(u)) : escape(u[c] ?? ''))).join(','));
    const header = cols.map((c) => escape(c)).join(',');
    const csv = [header, ...rows].join('\n');
    // prepend UTF-8 BOM so Excel detects UTF-8 with accents correctly
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hsk_users_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Quản lý toàn bộ tài khoản</h3>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">Tổng: {displayedUsers.length} / {users.length} tài khoản</div>
            <div className="flex items-center gap-2">
              <Input placeholder="Tìm kiếm" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
              <Button size="sm" variant="ghost" onClick={exportCsv}>Export</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Cột <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <div className="p-2">
                    {[
                      { key: 'specific_id', label: 'Specific ID' },
                      { key: 'full_name', label: 'Họ tên' },
                      { key: 'email', label: 'Email' },
                      { key: 'role', label: 'Vai trò' },
                      { key: 'status', label: 'Trạng thái' },
                      { key: 'phone', label: 'Số điện thoại' },
                      { key: 'birth_year', label: 'Năm sinh' },
                      { key: 'created_at', label: 'Tạo lúc' },
                      { key: 'updated_at', label: 'Cập nhật lúc' },
                    ].map((c) => (
                      <label
                        key={c.key}
                        className="flex items-center gap-2 px-2 py-1"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox checked={!!visibleColumns[c.key]} onCheckedChange={() => toggleColumn(c.key)} />
                        <span className="text-sm">{c.label}</span>
                      </label>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {(() => {
            const colOrder = ['specific_id','full_name','email','role','status','phone','birth_year','created_at','updated_at'];
            const labels: Record<string,string> = {
              specific_id: 'Specific ID',
              full_name: 'Họ tên',
              email: 'Email',
              role: 'Vai trò',
              status: 'Trạng thái',
              phone: 'Số điện thoại',
              birth_year: 'Năm sinh',
              created_at: 'Tạo lúc',
              updated_at: 'Cập nhật lúc',
            };
            const visibleKeys = colOrder.filter((k) => visibleColumns[k]);
            const visibleCount = visibleKeys.length;
            const supportsSort = new Set(['specific_id','full_name','email','role','status','birth_year','created_at','updated_at']);
            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    {colOrder.map((k) =>
                      visibleColumns[k] ? (
                        <TableHead key={k} onClick={() => {
                          if (!supportsSort.has(k)) return;
                          setSortBy(k);
                          setSortDir(sortBy === k ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc');
                        }}>
                          {labels[k]}
                        </TableHead>
                      ) : null
                    )}
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleCount + 1} className="text-center text-muted-foreground">
                        Không có tài khoản nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedUsers.map((u) => (
                      <TableRow key={u.id}>
                        {colOrder.map((k) => {
                          if (!visibleColumns[k]) return null;
                          if (k === 'specific_id') return <TableCell key={k} className="font-mono text-xs">{u.specific_id}</TableCell>;
                          if (k === 'full_name') return <TableCell key={k} className="font-medium">{u.full_name}</TableCell>;
                          if (k === 'email') return <TableCell key={k}>{u.email}</TableCell>;
                          if (k === 'role') return <TableCell key={k} className="capitalize">{u.role}</TableCell>;
                          if (k === 'status') return (
                            <TableCell key={k}>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-destructive/10 text-destructive'}`}>
                                {u.status}
                              </span>
                            </TableCell>
                          );
                          if (k === 'phone') return <TableCell key={k} className="font-mono text-xs">{u.phone ?? '—'}</TableCell>;
                          if (k === 'birth_year') {
                            const by = u.birth_year;
                            let display = '—';
                            if (by !== null && by !== undefined) {
                              if (typeof by === 'string') {
                                const d = new Date(by);
                                if (!Number.isNaN(d.getTime())) {
                                  const dd = String(d.getDate()).padStart(2, '0');
                                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                                  const yyyy = d.getFullYear();
                                  display = `${dd}/${mm}/${yyyy}`;
                                } else {
                                  display = String(by);
                                }
                              } else {
                                display = `01/01/${by}`;
                              }
                            }
                            return <TableCell key={k} className="text-xs">{display}</TableCell>;
                          }
                          if (k === 'created_at') return <TableCell key={k} className="text-xs">{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</TableCell>;
                          if (k === 'updated_at') return <TableCell key={k} className="text-xs">{u.updated_at ? new Date(u.updated_at).toLocaleString() : '—'}</TableCell>;
                          return null;
                        })}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(u)}>
                                <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-orange-600 focus:text-orange-600"
                                onClick={() => {
                                  setDeletingUser(u);
                                  setDeleteMode('soft');
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Vô hiệu hoá (Soft Delete)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setDeletingUser(u);
                                  setDeleteMode('hard');
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Xoá vĩnh viễn
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            );
          })()}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(v) => !v && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa tài khoản</DialogTitle>
            <DialogDescription>
              Thay đổi thông tin hoặc đặt lại mật khẩu cho {editingUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label>Họ tên</Label>
              <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vai trò</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Học viên</SelectItem>
                  <SelectItem value="teacher">Giáo viên</SelectItem>
                  <SelectItem value="logistics">Logistics</SelectItem>
                  <SelectItem value="care">CSKH</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Trạng thái</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ngày sinh</Label>
              <Input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 relative">
              <Label>Mật khẩu mới (Bỏ trống nếu không đổi)</Label>
              <div className="relative">
                <Input
                  type={showEditPassword ? "text" : "password"}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="********"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-9 w-9"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Hủy
            </Button>
            <Button onClick={handleUpdate} disabled={isPending}>
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingUser} onOpenChange={(v) => !v && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteMode === "hard" ? "Xác nhận xoá vĩnh viễn" : "Vô hiệu hoá tài khoản"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === "hard"
                ? `Bạn có chắc chắn muốn xoá tài khoản ${deletingUser?.email}? Hành động này không thể hoàn tác và sẽ xoá toàn bộ dữ liệu liên quan.`
                : `Bạn có chắc muốn vô hiệu hoá tài khoản ${deletingUser?.email}? Người dùng sẽ không thể đăng nhập cho đến khi được kích hoạt lại.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className={deleteMode === "hard" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-orange-600 hover:bg-orange-600/90"}
              onClick={() => {
                if (!deletingUser) return;
                onDeleteUser(deletingUser.id, deleteMode === "hard");
                setDeletingUser(null);
              }}
            >
              {deleteMode === "hard" ? "Xoá vĩnh viễn" : "Vô hiệu hoá"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AdminClassesPanel({
  classes,
  teachers,
  currentStudentCounts,
  isPending,
  createMutation,
  updateMutation,
  deleteMutation,
  onCreateClass,
  onUpdateClass,
  onDeleteClass,
}: {
  classes: any[];
  teachers: any[];
  currentStudentCounts?: Record<string, number>;
  isPending: boolean;
  createMutation?: any;
  updateMutation?: any;
  deleteMutation?: any;
  onCreateClass: (payload: any) => void;
  onUpdateClass: (payload: any) => void;
  onDeleteClass: (classId: string) => void;
}) {
  const [filterText, setFilterText] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    classId: "",
    className: "",
    totalLessons: 15,
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    scheduleDays: [] as number[],
    maxStudents: 10,
    teacherId: "",
    roomLink: "",
    status: "pending",
  });
  const [deleting, setDeleting] = useState<any>(null);

  const DAYS = [
    { label: "Thứ 2", v: 1 },
    { label: "Thứ 3", v: 2 },
    { label: "Thứ 4", v: 3 },
    { label: "Thứ 5", v: 4 },
    { label: "Thứ 6", v: 5 },
    { label: "Thứ 7", v: 6 },
    { label: "Chủ nhật", v: 0 },
  ];

  const displayed = (classes ?? []).filter((c: any) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      String(c.class_id ?? "").toLowerCase().includes(q) ||
      String(c.class_name ?? "").toLowerCase().includes(q) ||
      String(c.teacher_id ?? "").toLowerCase().includes(q)
    );
  });

  const startCreate = () => {
    setEditing(null);
    setForm({
      classId: "",
      className: "",
      totalLessons: 15,
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      scheduleDays: [],
      maxStudents: 10,
      teacherId: "",
      roomLink: "",
      status: "pending",
    });
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      classId: c.class_id,
      className: c.class_name ?? "",
      totalLessons: c.total_lessons ?? 15,
      startDate: c.start_date ?? "",
      endDate: c.end_date ?? "",
      startTime: c.start_time ?? "",
      endTime: c.end_time ?? "",
      scheduleDays: Array.isArray(c.schedule_days) ? c.schedule_days : [],
      maxStudents: c.max_students ?? 10,
      teacherId: c.teacher_id ?? "",
      roomLink: c.room_link ?? "",
      status: c.status ?? "pending",
    });
  };

  const submit = () => {
    const payload: any = {
      classId: form.classId,
      className: form.className,
      totalLessons: Number(form.totalLessons) || 15,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      scheduleDays: form.scheduleDays,
      maxStudents: Number(form.maxStudents) || 10,
      teacherId: form.teacherId || undefined,
      roomLink: form.roomLink || undefined,
      status: form.status,
    };
    if (editing) {
      onUpdateClass({ classId: editing.class_id, updates: {
        class_name: payload.className,
        total_lessons: payload.totalLessons,
        start_date: payload.startDate,
        end_date: payload.endDate,
        start_time: payload.startTime,
        end_time: payload.endTime,
        schedule_days: payload.scheduleDays,
        max_students: payload.maxStudents,
        teacher_id: payload.teacherId,
        room_link: payload.roomLink,
        status: payload.status,
      }});
    } else {
      onCreateClass(payload);
    }
    // clear only after mutation success (handled in effects below)
  };

  useEffect(() => {
    if (createMutation?.isSuccess) {
      startCreate();
    }
  }, [createMutation?.isSuccess]);

  useEffect(() => {
    if (updateMutation?.isSuccess) {
      setEditing(null);
    }
  }, [updateMutation?.isSuccess]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Tạo / Quản lý lớp học</h3>
          <div className="flex items-center gap-2">
            <Input placeholder="Tìm kiếm" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
            <Button variant="ghost" onClick={startCreate}>Làm mới form</Button>
          </div>
        </div>

        { (classes ?? []).length === 0 && (
          <div className="mb-3 rounded-md bg-muted/5 border border-muted p-3 text-sm text-muted-foreground">Không có dữ liệu lớp học. Nếu bạn vừa tạo lớp mà không thấy gì, kiểm tra bảng `classes` trên Supabase hoặc xem lỗi từ mutation.</div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Mã lớp</Label>
            <Input placeholder="L-OFF-HSK1-NC-0001" value={form.classId} onChange={(e) => setForm((s:any)=>({...s,classId:e.target.value}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Tên lớp</Label>
            <Input value={form.className} onChange={(e) => setForm((s:any)=>({...s,className:e.target.value}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Tổng buổi</Label>
            <Input type="number" value={String(form.totalLessons)} onChange={(e) => setForm((s:any)=>({...s,totalLessons: Number(e.target.value)}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Sĩ số tối đa</Label>
            <Input type="number" value={String(form.maxStudents)} onChange={(e) => setForm((s:any)=>({...s,maxStudents: Number(e.target.value)}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Ngày bắt đầu</Label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm((s:any)=>({...s,startDate:e.target.value}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Ngày kết thúc</Label>
            <Input type="date" value={form.endDate} onChange={(e) => setForm((s:any)=>({...s,endDate:e.target.value}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Giờ bắt đầu</Label>
            <Input type="time" value={form.startTime} onChange={(e) => setForm((s:any)=>({...s,startTime:e.target.value}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Giờ kết thúc</Label>
            <Input type="time" value={form.endTime} onChange={(e) => setForm((s:any)=>({...s,endTime:e.target.value}))} />
          </div>

          <div className="space-y-1.5">
            <Label>Thứ trong tuần</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <label key={d.v} className="inline-flex items-center gap-2">
                  <Checkbox checked={form.scheduleDays?.includes(d.v)} onCheckedChange={() => {
                    const set = new Set(form.scheduleDays || []);
                    if (set.has(d.v)) set.delete(d.v); else set.add(d.v);
                    setForm((s:any)=>({...s,scheduleDays: Array.from(set)}));
                  }} />
                  <span className="text-sm">{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Giáo viên</Label>
            <Select value={form.teacherId} onValueChange={(v) => setForm((s:any)=>({...s,teacherId: v === '__none' ? '' : v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Không chọn —</SelectItem>
                {(teachers ?? []).map((t:any) => {
                  const id = t.teacher_id ?? t.specific_id ?? t.id ?? "";
                  if (!id) return null;
                  return (
                    <SelectItem key={id} value={id}>{t.full_name ?? id}</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Room / Link</Label>
            <Input value={form.roomLink} onChange={(e) => setForm((s:any)=>({...s,roomLink:e.target.value}))} />
          </div>

          <div className="space-y-1.5">
            <Label>Trạng thái</Label>
            <Select value={form.status} onValueChange={(v) => setForm((s:any)=>({...s,status:v}))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="completed">completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={submit} disabled={isPending}>{editing ? 'Lưu thay đổi' : 'Tạo lớp mới'}</Button>
          {editing && <Button variant="outline" onClick={startCreate}>Hủy chỉnh sửa</Button>}
        </div>
        <div className="mt-3">
          {createMutation?.isSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Tạo lớp thành công.</div>
          )}
          {createMutation?.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{(createMutation.error as Error)?.message ?? 'Không thể tạo lớp.'}</div>
          )}
          {updateMutation?.isSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 mt-2">Cập nhật lớp thành công.</div>
          )}
          {updateMutation?.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive mt-2">{(updateMutation.error as Error)?.message ?? 'Không thể cập nhật lớp.'}</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-medium">Danh sách lớp ({displayed.length})</h4>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên lớp</TableHead>
              <TableHead>Giáo viên</TableHead>
              <TableHead className="text-center">Số học viên</TableHead>
              <TableHead>Thứ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">Không có lớp học.</TableCell>
              </TableRow>
            ) : (
              displayed.map((c:any) => (
                <TableRow key={c.class_id}>
                  <TableCell className="font-mono text-xs">{c.class_id}</TableCell>
                  <TableCell>{c.class_name}</TableCell>
                  <TableCell>{(() => {
                    const id = c.teacher_id;
                    const t = (teachers ?? []).find((x:any) => x.teacher_id === id || x.specific_id === id || x.id === id);
                    return t ? (t.full_name ?? id) : (id ?? '—');
                  })()}</TableCell>
                  <TableCell className="text-center">{(currentStudentCounts?.[c.class_id] ?? c.current_students ?? 0)}</TableCell>
                  <TableCell className="text-xs">{(c.schedule_days ?? []).map((d:number)=>DAYS.find(x=>x.v===d)?.label ?? d).join(', ')}</TableCell>
                  
                  <TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : c.status === 'completed' ? 'bg-muted text-muted-foreground' : 'bg-yellow-100 text-yellow-800'}`}>{c.status}</span></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="mr-2 h-4 w-4"/> Chỉnh sửa</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(c)}><Trash2 className="mr-2 h-4 w-4"/> Xoá</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(v)=>!v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xoá lớp</AlertDialogTitle>
            <AlertDialogDescription>Bạn có chắc muốn xoá lớp {deleting?.class_id} không? Hành động này sẽ xoá hoàn toàn.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleting) onDeleteClass(deleting.class_id); setDeleting(null); }}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
