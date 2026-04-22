"use client";

import { useTranslations } from "next-intl";

const MERCHANTS = [
  "Fiddah",
  "Noor Atelier",
  "Rawdha Home",
  "مسك",
  "Dar Al Oud",
  "Qamar Studio",
  "Mada Ceramics",
  "Zahra & Co",
  "Baraka Coffee",
  "Layali Press",
];

export function Marquee() {
  const t = useTranslations("landing");
  const doubled = [...MERCHANTS, ...MERCHANTS];
  return (
    <section className="border-y hairline bg-cream/60">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
        <div className="text-xs tracking-[0.22em] uppercase text-muted-ink text-center">
          {t("proofLabel")}
        </div>
        <div className="mt-6 overflow-hidden">
          <div className="flex gap-12 marquee-track whitespace-nowrap w-max">
            {doubled.map((m, i) => (
              <span key={i} className="font-display text-2xl md:text-3xl text-muted-ink/80">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
