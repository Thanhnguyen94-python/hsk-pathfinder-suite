import { createFileRoute } from "@tanstack/react-router";
import { Hsk_Home_MainLayoutView } from "@/components/hsk-views/Hsk_Home_MainLayoutView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HSK Center — Hệ thống quản lý trung tâm Hán ngữ" },
      {
        name: "description",
        content:
          "Nền tảng quản lý trung tâm tiếng Trung HSK 1-6: đặt lịch 1-1, lớp offline, bài tập HSK và audit log minh bạch.",
      },
      { property: "og:title", content: "HSK Center — Quản lý trung tâm Hán ngữ" },
      {
        property: "og:description",
        content: "Đặt lịch 1-1, lớp offline, bài tập HSK và audit log toàn hệ thống.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <Hsk_Home_MainLayoutView />;
}
