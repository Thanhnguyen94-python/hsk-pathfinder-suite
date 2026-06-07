import { HSK_ProfileDashboardUi } from "./HSK_ProfileDashboardUi";
import { useHSKProfileViewModel } from "@/hooks/hsk-viewmodels/HSK_useProfileViewModel";

export function HSK_ProfileDashboardView() {
  const { profile, profileLoading, changePassword, passwordState } = useHSKProfileViewModel();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Trang cá nhân</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý thông tin tài khoản và đổi mật khẩu cho tài khoản được cấp ban đầu.
        </p>
      </div>
      <HSK_ProfileDashboardUi
        profile={profile}
        profileLoading={profileLoading}
        changePassword={changePassword}
        passwordState={passwordState}
      />
    </div>
  );
}
