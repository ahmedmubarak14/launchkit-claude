"use client";

import { useTranslations } from "next-intl";

export function Testimonial() {
  const t = useTranslations("landing");

  return (
    <section className="py-24 md:py-32">
      <div className="max-w-4xl mx-auto px-6 lg:px-10">
        <div className="text-xs tracking-[0.22em] uppercase text-muted-ink mb-8">
          {t("testimonialsEyebrow")}
        </div>
        <blockquote className="font-display text-3xl md:text-5xl leading-[1.12] tracking-tight text-ink">
          <span aria-hidden className="text-champagne">“</span>
          {t("testimonial.quote")}
          <span aria-hidden className="text-champagne">”</span>
        </blockquote>
        <figcaption className="mt-10 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-cream border hairline flex items-center justify-center font-display text-lg text-ink">
            {getInitial(t("testimonial.author"))}
          </div>
          <div>
            <div className="text-sm font-medium text-ink">{t("testimonial.author")}</div>
            <div className="text-xs text-muted-ink">{t("testimonial.role")}</div>
          </div>
        </figcaption>
      </div>
    </section>
  );
}

function getInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed[0] : "·";
}
