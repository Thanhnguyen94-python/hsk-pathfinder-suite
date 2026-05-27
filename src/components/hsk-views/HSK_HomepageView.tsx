import { SiteFooter, SiteHeader } from "@/components/site/SiteHeader";
import { Features } from "@/components/site/Features";
import { Hero } from "@/components/site/Hero";
import { LoginPortal } from "@/components/site/LoginPortal";
import { NoticeBoard } from "@/components/site/NoticeBoard";
import { TopTeachers } from "@/components/site/TopTeachers";
import { HSK_Theme } from "@/theme/HSK_Theme";

export function HSK_HomepageView() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: HSK_Theme.light.background }}>
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
