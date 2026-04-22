import { setRequestLocale } from "next-intl/server";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Marquee } from "@/components/landing/Marquee";
import { Features } from "@/components/landing/Features";
import { Steps } from "@/components/landing/Steps";
import { Testimonial } from "@/components/landing/Testimonial";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

export default async function Landing({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      <Nav />
      <Hero />
      <Marquee />
      <Features />
      <Steps />
      <Testimonial />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
