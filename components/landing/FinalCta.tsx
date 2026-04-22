"use client";

import { Link } from "@/lib/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ArrowRight } from "lucide-react";

export function FinalCta() {
  const t = useTranslations("landing");
  const isAr = useLocale() === "ar";

  return (
    <section className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-[32px] bg-ink text-paper px-8 py-16 md:px-16 md:py-24">
          <div className="pointer-events-none absolute inset-0 noise opacity-40" />
          <div className="pointer-events-none absolute -top-24 -end-24 w-72 h-72 rounded-full bg-champagne/20 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-4xl md:text-6xl leading-[1.02] tracking-tight">
              {t("finalTitle")}
            </h2>
            <p className="mt-6 text-lg md:text-xl text-paper/70 leading-relaxed">
              {t("finalBody")}
            </p>
            <Link
              href="/signup"
              className="mt-10 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-paper text-ink font-medium hover:bg-cream transition-colors"
            >
              {t("finalCta")}
              <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
