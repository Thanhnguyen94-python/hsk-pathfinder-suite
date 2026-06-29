import { useState } from "react";
import {
  useHSKTeacherBookingViewModel,
  useTeacherStudentLookup,
} from "@/hooks/hsk-viewmodels/HSK_useBookingViewModel";
import {
  MyBookingsTable,
  PendingSlotsTable,
  PenaltiesTable,
  StudentLookupPanel,
} from "./HSK_TeacherDashboardUi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { notices } from "@/data/mock";

export function HSK_TeacherDashboardView() {
  const {
    pendingSlots,
    myBookings,
    penalties,
    teacherProfile,
    claimSlot,
    cancelBooking,
    submitEvaluation,
    claimState,
    cancelState,
    evaluationState,
    getSessionAttendance,
    saveSessionAttendance,
    attendanceState,
    getSessionGrading,
    saveSessionGrading,
    gradingState,
    error: dashboardError,
  } = useHSKTeacherBookingViewModel();

  const {
    lookup,
    result: lookupResult,
    isLoading: lookupLoading,
    error: lookupError,
  } = useTeacherStudentLookup();

  const [activeTab, setActiveTab] = useState("pending-slots");

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Xin chào, {teacherProfile?.full_name ?? "Giáo viên"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{teacherProfile?.staff_code ?? "—"}</span>
            <Badge variant="outline" className="text-xs">
              ⭐ {(teacherProfile?.avg_stars ?? 0).toFixed(1)} ({teacherProfile?.total_reviews ?? 0} đánh giá)
            </Badge>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {dashboardError && (
          <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Không tải được dữ liệu lịch dạy: {(dashboardError as Error)?.message ?? "Lỗi không xác định"}
          </p>
        )}
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-6">
          <TabsTrigger value="pending-slots">Nhận lớp</TabsTrigger>
          <TabsTrigger value="my-bookings">Lịch dạy</TabsTrigger>
          <TabsTrigger value="lookup">Tra cứu</TabsTrigger>
          <TabsTrigger value="leave">Xin nghỉ</TabsTrigger>
          <TabsTrigger value="penalties">Vi phạm</TabsTrigger>
          <TabsTrigger value="notices">Thông báo</TabsTrigger>
        </TabsList>
        <TabsContent value="pending-slots" className="mt-6">
          <PendingSlotsTable
            pendingSlots={pendingSlots}
            onClaim={claimSlot}
            claimPending={claimState.isPending}
          />
        </TabsContent>
        <TabsContent value="my-bookings" className="mt-6">
          <MyBookingsTable
            myBookings={myBookings}
            onCancel={cancelBooking}
            cancelPending={cancelState.isPending}
            onLoadAttendance={getSessionAttendance as any}
            onSaveAttendance={saveSessionAttendance as any}
            attendanceSaving={attendanceState.isPending}
            attendanceSaveError={attendanceState.error as Error | null}
            attendanceSaveSuccess={attendanceState.isSuccess}
            onLoadGrading={getSessionGrading as any}
            onSaveGrading={saveSessionGrading as any}
            gradingSaving={gradingState.isPending}
            gradingSaveError={gradingState.error as Error | null}
            gradingSaveSuccess={gradingState.isSuccess}
          />
        </TabsContent>
        <TabsContent value="lookup" className="mt-6">
          <StudentLookupPanel
            myConfirmedSlots={myBookings}
            onLookup={lookup}
            lookupResult={lookupResult as any}
            lookupLoading={lookupLoading}
            lookupError={lookupError as Error | null}
            onSubmitEvaluation={submitEvaluation}
            evaluationPending={evaluationState.isPending}
            evaluationError={evaluationState.error as Error | null}
            evaluationSuccess={evaluationState.isSuccess}
          />
        </TabsContent>
        <TabsContent value="leave" className="mt-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-2 font-display text-lg font-semibold">Xin nghỉ</h2>
            <p className="text-sm text-muted-foreground">
              Khu vực xin nghỉ được tách thành tab riêng để giáo viên thao tác thuận tiện hơn.
              Chức năng nghiệp vụ hiện tại được giữ nguyên, chỉ thay đổi cách hiển thị giao diện.
            </p>
          </section>
        </TabsContent>
        <TabsContent value="penalties" className="mt-6">
          <PenaltiesTable penalties={penalties} />
        </TabsContent>
        <TabsContent value="notices" className="mt-6">
          <section className="space-y-3 rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Thông báo</h2>
            <div className="space-y-3">
              {notices.map((n) => (
                <article key={n.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{n.tag}</Badge>
                    <span className="text-xs text-muted-foreground">{n.date}</span>
                  </div>
                  <h3 className="font-medium">{n.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                </article>
              ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

