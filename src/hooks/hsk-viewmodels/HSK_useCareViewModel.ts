import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createCareUser, getCareStaff, getCareStudents, getMe } from "@/lib/hsk.functions";

export function useHSKCareViewModel() {
  const qc = useQueryClient();
  const meFn = useServerFn(getMe);
  const studentsFn = useServerFn(getCareStudents);
  const staffFn = useServerFn(getCareStaff);
  const createUserFn = useServerFn(createCareUser);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const studentsQuery = useQuery({ queryKey: ["care-students"], queryFn: () => studentsFn() });
  const staffQuery = useQuery({ queryKey: ["care-staff"], queryFn: () => staffFn() });

  const createUserMutation = useMutation({
    mutationFn: (payload: {
      email: string;
      password: string;
      fullName: string;
      role: "student" | "teacher" | "logistics" | "care";
      phone?: string;
      birthYear?: number;
      status?: "active" | "disabled";
    }) => createUserFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-students"] });
      qc.invalidateQueries({ queryKey: ["care-staff"] });
    },
  });

  return {
    me: meQuery.data,
    isAdmin: meQuery.data?.role === "admin",
    canCreateUsers: ["admin", "care"].includes(meQuery.data?.role ?? ""),
    isLoading: meQuery.isLoading || studentsQuery.isLoading || staffQuery.isLoading,
    students: studentsQuery.data ?? [],
    studentsLoading: studentsQuery.isLoading,
    studentsError: studentsQuery.error,
    staff: staffQuery.data ?? [],
    staffLoading: staffQuery.isLoading,
    staffError: staffQuery.error,
    createUser: createUserMutation.mutate,
    createUserState: createUserMutation,
  };
}
