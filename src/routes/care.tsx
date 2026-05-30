import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { DashboardShell } from "@/components/common/DashboardShell";
import { MaskedCell } from "@/components/common/MaskedCell";
import { getCareStudents, getCareStaff, getMe } from "@/lib/hsk.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/care")({
  head: () => ({ meta: [{ title: "Chăm sóc khách hàng · HSK Center" }] }),
  component: () => (
    <DashboardShell role="CSKH" accent="bg-accent/30 text-foreground">
      <TooltipProvider>
        <Inner />
      </TooltipProvider>
    </DashboardShell>
  ),
});

function Inner() {
  const meFn = useServerFn(getMe);
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const isAdmin = meQ.data?.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Chăm sóc khách hàng</h1>
        <p className="text-sm text-muted-foreground">
          Danh bạ học viên và nhân viên. Các trường nhạy cảm (SĐT, năm sinh, mật khẩu) chỉ Admin có quyền xem.
        </p>
      </div>
      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Học viên</TabsTrigger>
          <TabsTrigger value="staff">Nhân viên</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-6">
          <StudentsTab isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="staff" className="mt-6">
          <StaffTab isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StudentsTab({ isAdmin }: { isAdmin: boolean }) {
  const fn = useServerFn(getCareStudents);
  const q = useQuery({ queryKey: ["care-students"], queryFn: () => fn() });
  const rows = (q.data ?? []) as any[];

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
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
          {rows.map((s) => (
            <TableRow key={s.specific_id}>
              <TableCell>
                <div className="font-medium">{s.full_name}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {s.specific_id}
                </div>
              </TableCell>
              <TableCell className="text-sm">{s.email}</TableCell>
              <TableCell>
                <MaskedCell
                  specificId={s.specific_id}
                  field="phone"
                  masked={s.phone_masked}
                  canReveal={isAdmin}
                />
              </TableCell>
              <TableCell>
                <MaskedCell
                  specificId={s.specific_id}
                  field="birth_year"
                  masked={s.birth_year_masked}
                  canReveal={isAdmin}
                />
              </TableCell>
              <TableCell className="font-mono text-muted-foreground">••••••••</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(s.courses ?? []).map((c: any, i: number) => (
                    <Badge key={i} variant="outline" className="font-mono text-xs">
                      {c.course_id} · {c.mode} · {c.remaining}/{c.total}
                    </Badge>
                  ))}
                  {(s.courses ?? []).length === 0 && (
                    <span className="text-xs text-muted-foreground">Chưa có</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={s.status === "active" ? "default" : "destructive"}
                  className="capitalize"
                >
                  {s.status}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {new Date(s.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                {q.isLoading ? "Đang tải…" : q.isError ? (q.error as Error).message : "Chưa có học viên"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function StaffTab({ isAdmin }: { isAdmin: boolean }) {
  const fn = useServerFn(getCareStaff);
  const q = useQuery({ queryKey: ["care-staff"], queryFn: () => fn() });
  const rows = (q.data ?? []) as any[];

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
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
          {rows.map((s) => (
            <TableRow key={s.specific_id}>
              <TableCell>
                <div className="font-medium">{s.full_name}</div>
                <div className="font-mono text-xs text-muted-foreground">{s.specific_id}</div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {s.role}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{s.email}</TableCell>
              <TableCell>
                <MaskedCell
                  specificId={s.specific_id}
                  field="phone"
                  masked={s.phone_masked}
                  canReveal={isAdmin}
                />
              </TableCell>
              <TableCell>
                <MaskedCell
                  specificId={s.specific_id}
                  field="birth_year"
                  masked={s.birth_year_masked}
                  canReveal={isAdmin}
                />
              </TableCell>
              <TableCell className="font-mono text-muted-foreground">••••••••</TableCell>
              <TableCell>
                <Badge
                  variant={s.status === "active" ? "default" : "destructive"}
                  className="capitalize"
                >
                  {s.status}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {new Date(s.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                {q.isLoading ? "Đang tải…" : q.isError ? (q.error as Error).message : "Chưa có nhân viên"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
