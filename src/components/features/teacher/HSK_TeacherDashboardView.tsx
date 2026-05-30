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

export function HSK_TeacherDashboardView() {
  const {
    pendingSlots,
    myBookings,
    penalties,
    claimSlot,
    cancelBooking,
    submitEvaluation,
    claimState,
    cancelState,
    evaluationState,
  } = useHSKTeacherBookingViewModel();

  const {
    lookup,
    result: lookupResult,
    isLoading: lookupLoading,
    error: lookupError,
  } = useTeacherStudentLookup();

  return (
    <div className="space-y-8">
      {/* Student skill lookup + Spider Chart + Evaluation form */}
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

      {/* Pending students waiting to be claimed */}
      <PendingSlotsTable
        pendingSlots={pendingSlots}
        onClaim={claimSlot}
        claimPending={claimState.isPending}
      />

      {/* My confirmed teaching bookings */}
      <MyBookingsTable
        myBookings={myBookings}
        onCancel={cancelBooking}
        cancelPending={cancelState.isPending}
      />

      {/* My penalties */}
      <PenaltiesTable penalties={penalties} />
    </div>
  );
}
