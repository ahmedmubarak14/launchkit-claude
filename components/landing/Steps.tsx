"use client";

import { useTranslations } from "next-intl";

type Step = { num: string; title: string; body: string };

export function Steps() {
  const t = useTranslations("landing");
  const steps = (t.raw("steps") as Step[]) || [];

  return (
    <section id="how" className="py-24 md:py-32 border-t hairline bg-cream/40">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <h2 className="font-display text-4xl md:text-5xl leading-[1.04] tracking-tight max-w-3xl">
          {t("stepsTitle")}
        </h2>

        <ol className="mt-14 divide-y hairline border-y hairline">
          {steps.map((s) => (
            <li key={s.num} className="grid md:grid-cols-12 gap-6 py-8 md:py-10">
              <div className="md:col-span-2 font-display text-3xl md:text-4xl text-champagne tabular-nums">
                {s.num}
              </div>
              <div className="md:col-span-4">
                <h3 className="font-display text-xl md:text-2xl leading-tight text-ink">
                  {s.title}
                </h3>
              </div>
              <p className="md:col-span-6 text-muted-ink leading-relaxed md:text-lg">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
