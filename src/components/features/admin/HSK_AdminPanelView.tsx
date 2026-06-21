import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { assignStudentToOfflineClass, createCareUser, getAuditLogs, getTeacherAnalytics, getAllUsersAdmin, updateUserAdmin, deleteUserAdmin, getAllClassesAdmin, createClassAdmin, updateClassAdmin, deleteClassAdmin, getClassDetailsAdmin, getClassEnrollmentsAdmin, getStudentEnrollmentsAdmin, getStudentSuggestionsAdmin, removeStudentFromClassAdmin, getClassEventsAdmin } from "@/lib/hsk.functions";
import { AdminAuditLogsPanel, AdminMappingPanel, AdminTeacherAnalyticsPanel, AdminUserManagementPanel, AdminClassesPanel } from "./HSK_AdminPanelUi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HSK_Theme } from "@/theme/hsk-config-theme";

export function HSK_AdminPanelView() {
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const assignFn = useServerFn(assignStudentToOfflineClass);
  const auditFn = useServerFn(getAuditLogs);
  const analyticsFn = useServerFn(getTeacherAnalytics);
  const getClassDetailsFn = useServerFn(getClassDetailsAdmin);
  const getClassEnrollmentsFn = useServerFn(getClassEnrollmentsAdmin);
  const getStudentEnrollmentsFn = useServerFn(getStudentEnrollmentsAdmin);
  const getStudentSuggestionsFn = useServerFn(getStudentSuggestionsAdmin);
  const removeStudentFn = useServerFn(removeStudentFromClassAdmin);
  const getClassEventsFn = useServerFn(getClassEventsAdmin);

  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const [activeTab, setActiveTab] = useState("mapping");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "logistics" | "care">("student");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [status, setStatus] = useState<"active" | "disabled">("active");
  const [showPassword, setShowPassword] = useState(false);

  const createUserFn = useServerFn(createCareUser);
  const getAllUsersFn = useServerFn(getAllUsersAdmin);
  const updateUserFn = useServerFn(updateUserAdmin);
  const deleteUserFn = useServerFn(deleteUserAdmin);

  const usersQuery = useQuery({ queryKey: ["admin-users"], queryFn: () => getAllUsersFn(), enabled: Boolean(!loading && user) });

  // helper to resolve a staff_code (or fallback identifiers) to the actual user id/specific_id
  const resolveUserIdFromCode = (code?: string) => {
    if (!code) return null;
    const users = (usersQuery.data ?? []) as any[];
    const c = String(code).trim();
    if (!c) return null;
    const found = users.find((u) => {
      const sc = String(u.staff_code ?? u.staffCode ?? "");
      const sid = String(u.specific_id ?? u.specificId ?? "");
      const authId = String(u.id ?? "");
      return sc === c || sid === c || authId === c;
    });
    // Prefer returning the public.specific_id (canonical student/teacher id used in
    // the `classes`/`class_enrollments` relationships). Fall back to auth `id` only
    // when `specific_id` is not available.
    return found ? (found.specific_id ?? found.specificId ?? found.id ?? null) : null;
  };

  const updateMutation = useMutation({
    mutationFn: (payload: any) => updateUserFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) => deleteUserFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
  const createUserMutation = useMutation({
    mutationFn: (payload: {
      email: string;
      password: string;
      fullName: string;
      role: "student" | "teacher" | "logistics" | "care";
      phone: string;
      birthDate?: string;
      birthYear?: number;
      status: "active" | "disabled";
      staff_code?: string;
    }) => createUserFn({ data: payload }),
    onSuccess: () => {
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("student");
      setPhone("");
      setBirthDate("");
      setStatus("active");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  const birthYearNumber = birthDate ? new Date(birthDate).getFullYear() : NaN;
  const isCreateFormValid =
    Boolean(fullName.trim()) &&
    Boolean(email.trim()) &&
    Boolean(password) &&
    Boolean(phone.trim()) &&
    Boolean(birthDate) &&
    !Number.isNaN(birthYearNumber) &&
    birthYearNumber >= 1900 &&
    birthYearNumber <= new Date().getFullYear();

  const hasInput = Boolean(fullName || email || password || phone || birthDate);
  const showValidationError = !isCreateFormValid && hasInput && !createUserMutation.isSuccess;

  // helper to generate next staff_code based on existing users
  const rolePrefix: Record<string, string> = {
    student: 'ST',
    teacher: 'TC',
    logistics: 'LG',
    care: 'CR',
    admin: 'AD',
  };
  const nextStaffCodeForRole = (r: typeof role) => {
    const prefix = rolePrefix[r] ?? 'ST';
    const users = (usersQuery.data ?? []) as any[];
    let max = 0;
    for (const u of users) {
      const sc = String(u.staff_code ?? u.staffCode ?? '');
      const m = sc.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (m) {
        const n = Number(m[1]);
        if (!Number.isNaN(n) && n > max) max = n;
      }
    }
    const next = String(max + 1).padStart(4, '0');
    return `${prefix}-${next}`;
  };

  const auditQuery = useQuery({ queryKey: ["audit"], queryFn: () => auditFn(), enabled: Boolean(!loading && user) });
  const analyticsQuery = useQuery({ queryKey: ["teacher-analytics"], queryFn: () => analyticsFn(), enabled: Boolean(!loading && user) });

  const getAllClassesFn = useServerFn(getAllClassesAdmin);
  const createClassFn = useServerFn(createClassAdmin);
  const updateClassFn = useServerFn(updateClassAdmin);
  const deleteClassFn = useServerFn(deleteClassAdmin);

  const classesQuery = useQuery({ queryKey: ["admin-classes"], queryFn: () => getAllClassesFn(), enabled: Boolean(!loading && user) });

  const createClassMutation = useMutation({
    mutationFn: (payload: any) => createClassFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-classes"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: (payload: any) => updateClassFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-classes"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: (payload: { id: string }) => deleteClassFn({ data: { classId: payload.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-classes"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });

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
          <TabsTrigger value="mapping">Sắp xếp lớp</TabsTrigger>
          <TabsTrigger value="create-user">Tạo tài khoản</TabsTrigger>
          <TabsTrigger value="classes">Tạo lớp học</TabsTrigger>
          <TabsTrigger value="teachers">Giáo viên & đánh giá</TabsTrigger>
          <TabsTrigger value="audit">Audit logs</TabsTrigger>
        </TabsList>
        <TabsContent value="mapping" className="mt-6">
          <AdminMappingPanel
            studentId={studentId}
            classId={classId}
            onStudentIdChange={setStudentId}
            onClassIdChange={setClassId}
            onAssign={handleAssign}
            isSubmitDisabled={!studentId || !classId}
            getClassDetails={(cid: string) => getClassDetailsFn({ data: { classId: cid } })}
            // AdminMappingPanel will pass staff_code (Mã nhân viên) as the student identifier.
            // Resolve it here to the actual user id expected by server functions.
            getStudentEnrollments={(sid: string) => {
              const uid = resolveUserIdFromCode(sid);
              if (!uid) return Promise.resolve([]);
              return getStudentEnrollmentsFn({ data: { studentId: uid } });
            }}
            getClasses={() => getAllClassesFn()}
            getClassEnrollments={(cid: string) => getClassEnrollmentsFn({ data: { classId: cid } })}
            // when AdminMappingPanel asks to add/remove by staff_code, resolve to actual id
            onAddStudentToClass={(cid: string, sid: string) => {
              const uid = resolveUserIdFromCode(sid);
              if (!uid) return Promise.reject(new Error('Không tìm thấy học viên với mã nhân viên đã nhập'));
              return assignFn({ data: { studentId: uid, classId: cid } });
            }}
            onRemoveStudentFromClass={(cid: string, sid: string) => {
              const uid = resolveUserIdFromCode(sid);
              if (!uid) return Promise.reject(new Error('Không tìm thấy học viên với mã nhân viên đã nhập'));
              return removeStudentFn({ data: { classId: cid, studentId: uid } });
            }}
            getStudentSuggestions={(q: string) => getStudentSuggestionsFn({ data: { q } })}
            // when updating class teacher, accept staff_code and resolve to actual id if present
            onUpdateClass={(cid: string, updates: Record<string, any>) => {
              const up = { ...updates } as Record<string, any>;
              if (up.teacher_id) {
                const uid = resolveUserIdFromCode(up.teacher_id);
                up.teacher_id = uid ?? up.teacher_id;
              }
              return updateClassFn({ data: { classId: cid, updates: up } });
            }}
            teachers={(usersQuery.data ?? []).filter((u: any) => u.role === 'teacher')}
            getClassEvents={(cid: string) => getClassEventsFn({ data: { classId: cid } })}
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
                <Label>Ngày sinh</Label>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
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
                        birthDate: birthDate || undefined,
                        birthYear: Number.isNaN(birthYearNumber) ? undefined : birthYearNumber,
                        status,
                        staff_code: nextStaffCodeForRole(role),
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
        <TabsContent value="classes" className="mt-6">
          <AdminClassesPanel
            classes={classesQuery.data ?? []}
            teachers={(usersQuery.data ?? []).filter((u: any) => u.role === 'teacher')}
            isPending={createClassMutation.isPending || updateClassMutation.isPending || deleteClassMutation.isPending}
            createMutation={createClassMutation}
            updateMutation={updateClassMutation}
            deleteMutation={deleteClassMutation}
            onCreateClass={(payload: any) => createClassMutation.mutate(payload)}
            onUpdateClass={(payload: any) => updateClassMutation.mutate(payload)}
            onDeleteClass={(id: string) => deleteClassMutation.mutate({ id })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
