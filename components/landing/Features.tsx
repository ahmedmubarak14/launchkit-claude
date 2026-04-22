"use client";

import { useTranslations } from "next-intl";
import { Upload, Mic, Layers, Sparkles, Trash2 } from "lucide-react";

const ICON_BY_KEY = {
  catalog: Upload,
  voice: Mic,
  theme: Layers,
  landing: Sparkles,
  delete: Trash2,
} as const;

const KEYS = ["catalog", "voice", "theme", "landing", "delete"] as const;

export function Features() {
  const t = useTranslations("landing");

  return (
    <section id="features" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-10 mb-16">
          <div className="lg:col-span-4">
            <div className="text-xs tracking-[0.22em] uppercase text-muted-ink mb-4">
              {t("featuresEyebrow")}
            </div>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.02] tracking-tight">
              {t("featuresTitle")}
            </h2>
          </div>
          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-6">
            {KEYS.map((k, i) => {
              const Icon = ICON_BY_KEY[k];
              const isWide = i === 0;
              return (
                <article
                  key={k}
                  className={`relative rounded-3xl border hairline bg-paper p-7 ${isWide ? "sm:col-span-2" : ""} hover:border-champagne transition-colors`}
                >
                  <div className="w-11 h-11 rounded-xl bg-cream border hairline flex items-center justify-center mb-6">
                    <Icon className="w-5 h-5 text-ink" />
                  </div>
                  <h3 className="font-display text-xl md:text-2xl leading-tight text-ink">
                    {t(`features.${k}.title`)}
                  </h3>
                  <p className="mt-3 text-muted-ink leading-relaxed text-[15px]">
                    {t(`features.${k}.body`)}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
