import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { assignStudentToOfflineClass, createCareUser, getAuditLogs, getTeacherAnalytics, getAllUsersAdmin, updateUserAdmin, deleteUserAdmin } from "@/lib/hsk.functions";
import { AdminAuditLogsPanel, AdminMappingPanel, AdminTeacherAnalyticsPanel, AdminUserManagementPanel } from "./HSK_AdminPanelUi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HSK_Theme } from "@/theme/hsk-config-theme";

export function HSK_AdminPanelView() {
  const qc = useQueryClient();
  const assignFn = useServerFn(assignStudentToOfflineClass);
  const auditFn = useServerFn(getAuditLogs);
  const analyticsFn = useServerFn(getTeacherAnalytics);

  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const [activeTab, setActiveTab] = useState("mapping");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "logistics" | "care">("student");
  const [phone, setPhone] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [status, setStatus] = useState<"active" | "disabled">("active");
  const [showPassword, setShowPassword] = useState(false);

  const createUserFn = useServerFn(createCareUser);
  const getAllUsersFn = useServerFn(getAllUsersAdmin);
  const updateUserFn = useServerFn(updateUserAdmin);
  const deleteUserFn = useServerFn(deleteUserAdmin);

  const usersQuery = useQuery({ queryKey: ["admin-users"], queryFn: () => getAllUsersFn() });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => updateUserFn({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) => deleteUserFn({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const createUserMutation = useMutation({
    mutationFn: (payload: {
      email: string;
      password: string;
      fullName: string;
      role: "student" | "teacher" | "logistics" | "care";
      phone: string;
      birthYear: number;
      status: "active" | "disabled";
    }) => createUserFn({ data: payload }),
    onSuccess: () => {
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("student");
      setPhone("");
      setBirthYear("");
      setStatus("active");
    },
  });

  const birthYearNumber = Number(birthYear);
  const isCreateFormValid =
    Boolean(fullName.trim()) &&
    Boolean(email.trim()) &&
    Boolean(password) &&
    Boolean(phone.trim()) &&
    Boolean(birthYear) &&
    !Number.isNaN(birthYearNumber) &&
    birthYearNumber >= 1900 &&
    birthYearNumber <= new Date().getFullYear();

  const hasInput = Boolean(fullName || email || password || phone || birthYear);
  const showValidationError = !isCreateFormValid && hasInput && !createUserMutation.isSuccess;

  const auditQuery = useQuery({ queryKey: ["audit"], queryFn: () => auditFn() });
  const analyticsQuery = useQuery({ queryKey: ["teacher-analytics"], queryFn: () => analyticsFn() });

  const handleAssign = async () => {
    await assignFn({ data: { studentId, classId } });
    qc.invalidateQueries({ queryKey: ["audit"] });
    setStudentId("");
    setClassId("");
  };

  const filteredAuditRows = useMemo(() => {
    const search = "";
    const rows = (auditQuery.data ?? []) as any[];
    return rows.filter((row) => !!row);
  }, [auditQuery.data]);

  return (
    <div className="space-y-6" style={{ backgroundColor: HSK_Theme.light.surface }}>
      <div>
        <h1 className="font-display text-2xl font-bold">Bảng điều khiển Admin</h1>
        <p className="text-sm text-muted-foreground">
          Master control panel — gán lớp, theo dõi giáo viên và audit log toàn hệ thống.
        </p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="mapping">Mapping học viên ↔ lớp</TabsTrigger>
          <TabsTrigger value="teachers">Giáo viên & đánh giá</TabsTrigger>
          <TabsTrigger value="audit">Audit logs</TabsTrigger>
          <TabsTrigger value="create-user">Tạo tài khoản</TabsTrigger>
        </TabsList>
        <TabsContent value="mapping" className="mt-6">
          <AdminMappingPanel
            studentId={studentId}
            classId={classId}
            onStudentIdChange={setStudentId}
            onClassIdChange={setClassId}
            onAssign={handleAssign}
            isSubmitDisabled={!studentId || !classId}
          />
        </TabsContent>
        <TabsContent value="teachers" className="mt-6">
          <AdminTeacherAnalyticsPanel
            teachers={analyticsQuery.data?.teachers ?? []}
            ratings={analyticsQuery.data?.ratings ?? []}
          />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <AdminAuditLogsPanel logs={filteredAuditRows} />
        </TabsContent>
        <TabsContent value="create-user" className="mt-6">
          <div className="rounded-xl border border-border bg-background p-6">
            <div className="mb-4">
              <h2 className="font-display text-lg font-semibold">Tạo tài khoản mới</h2>
              <p className="text-sm text-muted-foreground">
                Admin có thể tạo tài khoản học viên, giáo viên, logistics hoặc CSKH tại đây.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Họ và tên</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5 relative">
                <Label>Mật khẩu</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-9 w-9" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Vai trò</Label>
                <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
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
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Năm sinh</Label>
                <Input
                  type="number"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                onClick={() =>
                  createUserMutation.mutate({
                    fullName,
                    email,
                    password,
                    role,
                    phone: phone.trim(),
                    birthYear: birthYearNumber,
                    status,
                  })
                }
                disabled={createUserMutation.isPending || !isCreateFormValid}
              >
                Tạo tài khoản mới
              </Button>
              {showValidationError && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                  Xin hãy điền đầy đủ họ tên, email, mật khẩu, số điện thoại và năm sinh hợp lệ.
                </div>
              )}
              {createUserMutation.isSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Tạo tài khoản thành công.
                </div>
              )}
              {createUserMutation.isError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {(createUserMutation.error as Error)?.message ?? "Không thể tạo tài khoản."}
                </div>
              )}
            </div>
          </div>
          
          <AdminUserManagementPanel 
            users={usersQuery.data ?? []}
            isPending={updateMutation.isPending || deleteMutation.isPending}
            onUpdateUser={(payload) => updateMutation.mutate(payload)}
            onDeleteUser={(id, hardDelete) => {
              if (hardDelete) {
                deleteMutation.mutate({ id });
              } else {
                updateMutation.mutate({ id, status: "disabled" });
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
