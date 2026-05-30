import { SiteFooter, SiteHeader } from "@/components/common/SiteHeader";
import { HSK_HomeFeatureGrid } from "@/components/features/home/HSK_HomeFeatureGrid";
import { HSK_HomeHeroSection } from "@/components/features/home/HSK_HomeHeroSection";
import { HSK_HomeLoginGateway } from "@/components/features/home/HSK_HomeLoginGateway";
import { HSK_HomeNoticeBoard } from "@/components/features/home/HSK_HomeNoticeBoard";
import { HSK_HomeTeacherShowcase } from "@/components/features/home/HSK_HomeTeacherShowcase";
import { HSK_Theme } from "@/theme/hsk-config-theme";

export function HSK_HomeMainLayout() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: HSK_Theme.light.background }}>
      <SiteHeader />
      <main className="flex-1">
        <HSK_HomeHeroSection />
        <HSK_HomeFeatureGrid />
        <HSK_HomeTeacherShowcase />
        <HSK_HomeNoticeBoard />
        <HSK_HomeLoginGateway />
      </main>
      <SiteFooter />
    </div>
  );
}
