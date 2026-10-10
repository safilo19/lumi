import { SiteNav } from "@/components/marketing/site-nav";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Features } from "@/components/marketing/features";
import { FreeForever } from "@/components/marketing/free-forever";
import { ClosingCta } from "@/components/marketing/closing-cta";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <FreeForever />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
