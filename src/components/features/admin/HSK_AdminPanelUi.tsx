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
import { Star, MoreHorizontal, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
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
              <TableRow key={`${log.id ?? index}-${log.created_at}`}>
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
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");

  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditFullName(user.full_name || "");
    setEditRole(user.role || "student");
    setEditStatus(user.status || "active");
    setEditPhone(user.phone || "");
    setEditPassword("");
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

    onUpdateUser(payload);
    setEditingUser(null);
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Quản lý toàn bộ tài khoản</h3>
          <p className="text-sm text-muted-foreground">Tổng: {users.length} tài khoản</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Specific ID</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.specific_id}</TableCell>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="capitalize">{u.role}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        u.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {u.status}
                    </span>
                  </TableCell>
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
                            setDeleteMode("soft");
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Vô hiệu hoá (Soft Delete)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setDeletingUser(u);
                            setDeleteMode("hard");
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Xoá vĩnh viễn
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Không có tài khoản nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
