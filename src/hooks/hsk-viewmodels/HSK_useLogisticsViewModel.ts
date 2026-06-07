import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listChapters,
  upsertChapter,
  deleteChapter,
  listSubmissions,
} from "@/lib/hsk.functions";

export function useHSKLogisticsViewModel() {
  const qc = useQueryClient();
  const chaptersFn = useServerFn(listChapters);
  const upsertChapterFn = useServerFn(upsertChapter);
  const deleteChapterFn = useServerFn(deleteChapter);
  const submissionsFn = useServerFn(listSubmissions);

  const chaptersQuery = useQuery({
    queryKey: ["chapters"],
    queryFn: () => chaptersFn(),
  });

  const submissionsQuery = useQuery({
    queryKey: ["submissions"],
    queryFn: () => submissionsFn(),
  });

  const createChapterMutation = useMutation({
    mutationFn: (payload: {
      courseId: string;
      title: string;
      content?: string;
      fileUrls?: string[];
      orderIndex: number;
    }) => upsertChapterFn({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chapters"] }),
  });

  const removeChapterMutation = useMutation({
    mutationFn: (chapterId: string) => deleteChapterFn({ data: { chapterId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chapters"] }),
  });

  return {
    chapters: chaptersQuery.data ?? [],
    chaptersLoading: chaptersQuery.isLoading,
    chaptersError: chaptersQuery.error,
    submissions: submissionsQuery.data ?? [],
    submissionsLoading: submissionsQuery.isLoading,
    submissionsError: submissionsQuery.error,
    createChapter: createChapterMutation.mutate,
    createChapterState: createChapterMutation,
    deleteChapter: removeChapterMutation.mutate,
    deleteChapterState: removeChapterMutation,
  };
}
