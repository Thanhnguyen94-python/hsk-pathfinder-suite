import { SiteFooter, SiteHeader } from "@/components/site/SiteHeader";
import { Hsk_Home_FeatureGrid } from "@/components/site/Hsk_Home_FeatureGrid";
import { Hsk_Home_HeroSection } from "@/components/site/Hsk_Home_HeroSection";
import { Hsk_Home_LoginGateway } from "@/components/site/Hsk_Home_LoginGateway";
import { Hsk_Home_NoticeBoard } from "@/components/site/Hsk_Home_NoticeBoard";
import { Hsk_Home_TeacherShowcase } from "@/components/site/Hsk_Home_TeacherShowcase";
import { HSK_Theme } from "@/theme/hsk-config-theme";

export function Hsk_Home_MainLayoutView() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: HSK_Theme.light.background }}>
      <SiteHeader />
      <main className="flex-1">
        <Hsk_Home_HeroSection />
        <Hsk_Home_FeatureGrid />
        <Hsk_Home_TeacherShowcase />
        <Hsk_Home_NoticeBoard />
        <Hsk_Home_LoginGateway />
      </main>
      <SiteFooter />
    </div>
  );
}
