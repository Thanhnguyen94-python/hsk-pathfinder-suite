import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  claimSlot,
  expireStaleFreezes,
  freezeCourse,
  getClassSessionAttendance,
  getClassSessionGrading,
  getStudentDashboard,
  getStudentSkillsById,
  getTeacherDashboard,
  listMyAssignments,
  listMySubmissions,
  studentCancelBooking,
  submitAssignment,
  submitEvaluation,
  saveClassSessionAttendance,
  saveClassSessionGrading,
  teacherCancelBooking,
  unfreezeCourse,
  getMe,
  getMyRatings,
  getStudentSkills,
} from "@/lib/hsk.functions";
import type { HSKCancellationRule, HSKSlot } from "@/types/hsk-models/hsk-booking.types";

const CANCELLATION_WINDOW_HOURS = 6;

export function getHSKSlotCancellationRule(slot: HSKSlot): HSKCancellationRule {
  const now = Date.now();
  const sessionTime = new Date(slot.session_date).getTime();
  const hoursUntilSession = Math.max(0, (sessionTime - now) / 1000 / 60 / 60);
  const isLate = hoursUntilSession < CANCELLATION_WINDOW_HOURS;

  return {
    hoursUntilSession,
    isLate,
  };
}

export function useHSKStudentBookingViewModel() {
  const qc = useQueryClient();

  const dashFn = useServerFn(getStudentDashboard);
  const meFn = useServerFn(getMe);
  const ratingsFn = useServerFn(getMyRatings);
  const assignmentsFn = useServerFn(listMyAssignments);
  const submissionsFn = useServerFn(listMySubmissions);
  const expireFn = useServerFn(expireStaleFreezes);
  const cancelFn = useServerFn(studentCancelBooking);
  const freezeFn = useServerFn(freezeCourse);
  const unfreezeFn = useServerFn(unfreezeCourse);
  const submitFn = useServerFn(submitAssignment);
  const skillsFn = useServerFn(getStudentSkills);

  useEffect(() => {
    expireFn().catch(() => {});
  }, [expireFn]);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => meFn(),
  });

  const dashQuery = useQuery({
    queryKey: ["student-dash"],
    queryFn: () => dashFn(),
  });

  const ratingsQuery = useQuery({
    queryKey: ["my-ratings"],
    queryFn: () => ratingsFn(),
  });

  const assignmentsQuery = useQuery({
    queryKey: ["assignments"],
    queryFn: () => assignmentsFn(),
  });

  const submissionsQuery = useQuery({
    queryKey: ["my-submissions"],
    queryFn: () => submissionsFn(),
  });

  const skillsQuery = useQuery({
    queryKey: ["my-skills"],
    queryFn: () => skillsFn(),
  });

  const cancelMutation = useMutation({
    mutationFn: (slotId: string) => cancelFn({ data: { slotId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-dash"] }),
  });

  const freezeMutation = useMutation({
    mutationFn: (payload: { studentId: string; courseId: string }) =>
      freezeFn({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-dash"] }),
  });

  const unfreezeMutation = useMutation({
    mutationFn: (payload: { studentId: string; courseId: string }) =>
      unfreezeFn({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-dash"] }),
  });

  const submitMutation = useMutation({
    mutationFn: (values: { assignmentId: string; text: string }) =>
      submitFn({ data: { assignmentId: values.assignmentId, text: values.text } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-submissions"] }),
  });

  const ratedSlots = useMemo(() => {
    const set = new Set<string>();
    for (const r of ratingsQuery.data ?? []) {
      const slotId = String((r as any).slot_id ?? "").trim();
      if (slotId) set.add(slotId);
      const classId = String((r as any).class_id ?? "").trim();
      const sessionDate = String((r as any).session_date ?? "").trim();
      if (classId && sessionDate) {
        const ts = new Date(sessionDate).getTime();
        set.add(`${classId}|${Number.isFinite(ts) ? ts : sessionDate}`);
      }
    }
    return set;
  }, [ratingsQuery.data]);

  const progress = (dashQuery.data?.progress ?? []) as any[];
  const bookings = (dashQuery.data?.bookings ?? []) as any[];
  const enrollments = (dashQuery.data?.enrollments ?? []) as any[];
  const sessionNotes = (dashQuery.data?.sessionNotes ?? []) as any[];

  return {
    me: meQuery.data,
    meLoading: meQuery.isLoading,
    progress,
    bookings,
    enrollments,
    sessionNotes,
    ratedSlots,
    assignments: assignmentsQuery.data ?? [],
    submissions: submissionsQuery.data ?? [],
    skills: skillsQuery.data ?? [],
    isLoading:
      dashQuery.isLoading ||
      assignmentsQuery.isLoading ||
      submissionsQuery.isLoading ||
      skillsQuery.isLoading,
    cancelSlot: cancelMutation.mutate,
    freezeCourse: freezeMutation.mutate,
    unfreezeCourse: unfreezeMutation.mutate,
    submitAssignment: submitMutation.mutate,
    cancelState: cancelMutation,
    freezeState: freezeMutation,
    unfreezeState: unfreezeMutation,
    submitState: submitMutation,
    slotRule: getHSKSlotCancellationRule,
  };
}

export function useHSKTeacherBookingViewModel() {
  const qc = useQueryClient();

  const dashFn = useServerFn(getTeacherDashboard);
  const claimFn = useServerFn(claimSlot);
  const cancelFn = useServerFn(teacherCancelBooking);
  const submitEvalFn = useServerFn(submitEvaluation);
  const attendanceFn = useServerFn(getClassSessionAttendance);
  const saveAttendanceFn = useServerFn(saveClassSessionAttendance);
  const gradingFn = useServerFn(getClassSessionGrading);
  const saveGradingFn = useServerFn(saveClassSessionGrading);

  const dashQuery = useQuery({
    queryKey: ["teacher-dash"],
    queryFn: () => dashFn(),
  });

  const claimMutation = useMutation({
    mutationFn: (slotId: string) => claimFn({ data: { slotId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher-dash"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (slotId: string) => cancelFn({ data: { slotId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher-dash"] }),
  });

  const evaluationMutation = useMutation({
    mutationFn: (payload: {
      slotId: string;
      studentId: string;
      listening: number;
      speaking: number;
      reading: number;
      writing: number;
      vocabulary: number;
      grammar: number;
      generalComment?: string;
    }) => submitEvalFn({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher-dash"] }),
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: (payload: {
      classId: string;
      sessionDate: string;
      records: Array<{
        studentId: string;
        attendanceStatus: "present" | "absent_excused" | "absent_unexcused";
        excuseReason?: string;
      }>;
    }) => saveAttendanceFn({ data: payload }),
  });

  const saveGradingMutation = useMutation({
    mutationFn: (payload: {
      classId: string;
      sessionDate: string;
      records: Array<{
        studentId: string;
        listening: number;
        speaking: number;
        reading: number;
        writing: number;
        vocabulary: number;
        grammar: number;
        generalComment?: string;
      }>;
    }) => saveGradingFn({ data: payload }),
  });

  return {
    pendingSlots: (dashQuery.data?.pendingSlots ?? []) as HSKSlot[],
    myBookings: (dashQuery.data?.myBookings ?? []) as HSKSlot[],
    penalties: (dashQuery.data?.penalties ?? []) as any[],
    teacherProfile: (dashQuery.data?.teacherProfile ?? null) as
      | {
          full_name?: string | null;
          staff_code?: string | null;
          avg_stars?: number;
          total_reviews?: number;
        }
      | null,
    isLoading: dashQuery.isLoading,
    error: dashQuery.error,
    claimSlot: claimMutation.mutate,
    cancelBooking: cancelMutation.mutate,
    submitEvaluation: evaluationMutation.mutate,
    getSessionAttendance: (payload: { classId: string; sessionDate: string }) =>
      attendanceFn({ data: payload }),
    saveSessionAttendance: saveAttendanceMutation.mutateAsync,
    getSessionGrading: (payload: { classId: string; sessionDate: string }) =>
      gradingFn({ data: payload }),
    saveSessionGrading: saveGradingMutation.mutateAsync,
    claimState: claimMutation,
    cancelState: cancelMutation,
    evaluationState: evaluationMutation,
    attendanceState: saveAttendanceMutation,
    gradingState: saveGradingMutation,
  };
}

/** Hook riêng để teacher tra cứu skills học viên theo ID (lazy, gọi thủ công) */
export function useTeacherStudentLookup() {
  const lookupFn = useServerFn(getStudentSkillsById);

  const mutation = useMutation({
    mutationFn: (studentId: string) => lookupFn({ data: { studentId } }),
  });

  return {
    lookup: mutation.mutate,
    lookupAsync: mutation.mutateAsync,
    result: mutation.data,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
