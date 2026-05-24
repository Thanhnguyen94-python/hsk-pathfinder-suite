import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { Features } from "@/components/site/Features";
import { NoticeBoard } from "@/components/site/NoticeBoard";
import { LoginPortal } from "@/components/site/LoginPortal";
import { TopTeachers } from "@/components/site/TopTeachers";

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
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Features />
        <TopTeachers />
        <NoticeBoard />
        <LoginPortal />
      </main>
      <SiteFooter />
    </div>
  );
}
