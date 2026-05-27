import { useHSKTeacherBookingViewModel } from "@/hooks/hsk-viewmodels/HSK_useBookingViewModel";
import {
  MyBookingsTable,
  PendingSlotsTable,
  PenaltiesTable,
} from "./HSK_TeacherDashboardUi";

export function HSK_TeacherDashboardView() {
  const { pendingSlots, myBookings, penalties, claimSlot, cancelBooking } =
    useHSKTeacherBookingViewModel();

  return (
    <div className="space-y-8">
      <PendingSlotsTable pendingSlots={pendingSlots} onClaim={claimSlot} />
      <MyBookingsTable myBookings={myBookings} onCancel={cancelBooking} />
      <PenaltiesTable penalties={penalties} />
    </div>
  );
}
