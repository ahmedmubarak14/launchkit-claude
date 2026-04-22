"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

type Item = { q: string; a: string };

export function Faq() {
  const t = useTranslations("landing");
  const items = (t.raw("faq") as Item[]) || [];

  return (
    <section id="faq" className="py-24 md:py-32 border-t hairline">
      <div className="max-w-4xl mx-auto px-6 lg:px-10">
        <h2 className="font-display text-4xl md:text-5xl leading-[1.04] tracking-tight mb-14">
          {t("faqTitle")}
        </h2>
        <div className="divide-y hairline border-y hairline">
          {items.map((item, i) => (
            <details key={i} className="group py-6 md:py-7">
              <summary className="list-none cursor-pointer flex items-start justify-between gap-6">
                <span className="font-display text-xl md:text-2xl text-ink leading-snug">
                  {item.q}
                </span>
                <span className="mt-1 flex-shrink-0 w-8 h-8 rounded-full border hairline flex items-center justify-center transition-transform group-open:rotate-45">
                  <Plus className="w-4 h-4 text-ink" />
                </span>
              </summary>
              <p className="mt-4 text-muted-ink leading-relaxed md:text-lg max-w-2xl">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
