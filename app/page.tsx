import HomeBannerCarousel from "@/components/home/HomeBannerCarousel";
import DemoVideoSection from "@/components/home/DemoVideoSection";
import PlanComparisonSection from "@/components/home/PlanComparisonSection";
import HomeFooter from "@/components/home/HomeFooter";
import { HOME_BANNERS } from "@/lib/home-banners";
import { HOME_DEMO_VIDEOS } from "@/lib/home-demo-videos";
import { PLAN_COMPARISON_FEATURES } from "@/lib/home-plan-comparison";

export default function HomePage() {
  return (
    <>
      <HomeBannerCarousel banners={HOME_BANNERS} />
      <DemoVideoSection demos={HOME_DEMO_VIDEOS} />
      <PlanComparisonSection features={PLAN_COMPARISON_FEATURES} />
      <HomeFooter />
    </>
  );
}
