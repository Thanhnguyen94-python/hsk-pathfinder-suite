import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { UseMutationResult } from "@tanstack/react-query";

export function HSK_ProfileDashboardUi({
  profile,
  profileLoading,
  changePassword,
  passwordState,
}: {
  profile: { specific_id?: string; full_name?: string; email?: string; role?: string } | undefined;
  profileLoading: boolean;
  changePassword: (payload: { password: string }) => void;
  passwordState: UseMutationResult<{ passwordChanged: boolean }, Error, { password: string }>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || !confirmPassword) {
      setValidationError("Vui lòng nhập mật khẩu mới và xác nhận.");
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setValidationError(null);
    changePassword({ password });
  };

  if (profileLoading) {
    return <div className="rounded-xl border border-border bg-card p-5">Đang tải thông tin tài khoản…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Thông tin tài khoản</h2>
            <p className="text-sm text-muted-foreground">Bạn có thể xem thông tin cơ bản và đổi mật khẩu tại đây.</p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {profile?.role ?? "Người dùng"}
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Họ và tên</Label>
            <div className="mt-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {profile?.full_name ?? "—"}
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <div className="mt-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {profile?.email ?? "—"}
            </div>
          </div>
          <div>
            <Label>ID người dùng</Label>
            <div className="mt-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {profile?.specific_id ?? "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold">Đổi mật khẩu</h2>
          <p className="text-sm text-muted-foreground">
            Nhập mật khẩu mới để cập nhật ngay tài khoản được gán ban đầu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
              />
            </div>
          </div>

          {validationError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {validationError}
            </div>
          )}
          {passwordState.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {passwordState.error?.message ?? "Không thể cập nhật mật khẩu."}
            </div>
          )}
          {passwordState.isSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Mật khẩu đã được cập nhật thành công.
            </div>
          )}

          <Button type="submit" disabled={passwordState.isPending || !password || !confirmPassword}>
            {passwordState.isPending ? "Đang lưu…" : "Cập nhật mật khẩu"}
          </Button>
        </form>
      </div>
    </div>
  );
}
