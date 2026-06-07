import { HSK_LogisticsDashboardUi } from "./HSK_LogisticsDashboardUi";
import { useHSKLogisticsViewModel } from "@/hooks/hsk-viewmodels/HSK_useLogisticsViewModel";

export function HSK_LogisticsDashboardView() {
  const {
    chapters,
    chaptersLoading,
    submissions,
    submissionsLoading,
    createChapter,
    createChapterState,
    deleteChapter,
  } = useHSKLogisticsViewModel();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Bảng điều khiển Logistics</h1>
        <p className="text-sm text-muted-foreground">
          Tạo và quản lý tài liệu học tập.
        </p>
      </div>
      <HSK_LogisticsDashboardUi
        chapters={chapters}
        chaptersLoading={chaptersLoading}
        submissions={submissions}
        submissionsLoading={submissionsLoading}
        createChapter={createChapter}
        createChapterState={createChapterState}
        deleteChapter={deleteChapter}
      />
    </div>
  );
}
