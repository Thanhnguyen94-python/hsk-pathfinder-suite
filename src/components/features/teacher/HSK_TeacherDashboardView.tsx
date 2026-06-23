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
      {/* Student skill lookup + Spider Chart + Evaluation form */}
      <StudentLookupPanel
        teacherProfile={teacherProfile as any}
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {dashboardError && (
          <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Không tải được dữ liệu lịch dạy: {(dashboardError as Error)?.message ?? "Lỗi không xác định"}
          </p>
        )}
        <TabsList>
          <TabsTrigger value="pending-slots">Học viên đang chờ nhận lớp</TabsTrigger>
          <TabsTrigger value="my-bookings">Lịch dạy của tôi</TabsTrigger>
          <TabsTrigger value="penalties">Vi phạm của tôi</TabsTrigger>
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
        <TabsContent value="penalties" className="mt-6">
          <PenaltiesTable penalties={penalties} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

