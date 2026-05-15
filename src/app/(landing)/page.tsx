import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { VoteSection } from "@/components/landing/VoteSection";
import { Footer } from "@/components/landing/Footer";
import { Nav } from "@/components/landing/Nav";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-white dark:bg-[#020617] text-gray-900 dark:text-[#f8fafc]">
      {/* Ambient glow - dark mode only */}
      <div className="hidden dark:block fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-rose-500/[0.06] blur-[150px]" />
        <div className="absolute top-[40%] right-[-15%] w-[600px] h-[600px] rounded-full bg-violet-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] rounded-full bg-rose-500/[0.03] blur-[100px]" />
      </div>
      {/* Subtle glow for light mode */}
      <div className="dark:hidden fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-rose-500/[0.03] blur-[120px]" />
      </div>

      <Nav />
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <VoteSection />
        <Pricing />
        <Footer />
      </main>
    </div>
  );
}
