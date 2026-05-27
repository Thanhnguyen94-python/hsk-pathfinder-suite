import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTeacherAnalytics, rateTeacher } from "@/lib/hsk.functions";

export function useHSKRatingViewModel() {
  const qc = useQueryClient();
  const analyticsFn = useServerFn(getTeacherAnalytics);
  const rateFn = useServerFn(rateTeacher);

  const analyticsQuery = useQuery({
    queryKey: ["teacher-analytics"],
    queryFn: () => analyticsFn(),
  });

  const outstandingTeachers = useMemo(() => {
    const teachers = (analyticsQuery.data?.teachers ?? []) as any[];
    return teachers
      .slice()
      .sort((a, b) => Number(b.avg_stars) - Number(a.avg_stars))
      .slice(0, 5);
  }, [analyticsQuery.data]);

  const rateMutation = useMutation({
    mutationFn: (payload: {
      slotId: string;
      teacherId: string;
      stars: number;
      comment?: string;
    }) => rateFn({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher-analytics"] }),
  });

  return {
    analytics: analyticsQuery.data,
    outstandingTeachers,
    analyticsLoading: analyticsQuery.isLoading,
    rateTeacher: rateMutation.mutate,
    rateState: rateMutation,
  };
}
