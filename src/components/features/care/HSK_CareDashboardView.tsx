import { HSK_CareDashboardUi } from "./HSK_CareDashboardUi";
import { useHSKCareViewModel } from "@/hooks/hsk-viewmodels/HSK_useCareViewModel";

export function HSK_CareDashboardView() {
  const {
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
  } = useHSKCareViewModel();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Chăm sóc khách hàng</h1>
        <p className="text-sm text-muted-foreground">
          Danh bạ học viên và nhân viên. Chỉ mật khẩu được bảo mật trong danh sách.
        </p>
      </div>
      <HSK_CareDashboardUi
        isAdmin={Boolean(isAdmin)}
        canCreateUsers={Boolean(canCreateUsers)}
        students={students}
        studentsLoading={studentsLoading}
        studentsError={studentsError}
        staff={staff}
        staffLoading={staffLoading}
        staffError={staffError}
        createUser={createUser}
        createUserState={createUserState}
      />
    </div>
  );
}
