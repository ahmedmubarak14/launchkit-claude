"use client";

import { Link } from "@/lib/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ArrowRight, Play } from "lucide-react";

export function Hero() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const isAr = locale === "ar";

  return (
    <section className="relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 mb-8 text-xs tracking-[0.18em] uppercase text-muted-ink">
              <span className="w-6 h-px bg-champagne" />
              {t("eyebrow")}
            </div>

            <h1 className="font-display text-[44px] leading-[1.02] md:text-[72px] md:leading-[0.98] tracking-tight text-ink">
              {t("heroTitle")}
            </h1>

            <p className="mt-8 max-w-xl text-lg md:text-xl leading-relaxed text-muted-ink">
              {t("heroLead")}
            </p>

            <div className={`mt-10 flex flex-wrap items-center gap-3 ${isAr ? "sm:flex-row-reverse sm:justify-end" : ""}`}>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-ink text-paper font-medium hover:bg-ink/85 transition-colors"
              >
                {t("primaryCta")}
                <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-full border hairline text-ink hover:bg-cream transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-ink" />
                {t("secondaryCta")}
              </button>
            </div>

            <p className="mt-6 text-sm text-muted-ink">
              {t("heroNote")}
            </p>
          </div>

          <div className="lg:col-span-5">
            <StorefrontStill />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-hairline" />
    </section>
  );
}

function StorefrontStill() {
  return (
    <div className="relative aspect-[4/5] w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
      <div className="absolute inset-0 rounded-[28px] bg-cream border hairline overflow-hidden shadow-[0_24px_60px_-30px_rgba(11,11,12,0.25)]">
        <div className="absolute inset-0 noise" />

        <div className="absolute top-5 left-5 right-5 flex items-center justify-between text-[10px] tracking-[0.22em] uppercase text-muted-ink">
          <span>Fiddah / فضّة</span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-champagne" />
            Live on Zid
          </span>
        </div>

        <svg viewBox="0 0 320 360" className="absolute inset-x-10 top-20 bottom-28" aria-hidden>
          <defs>
            <radialGradient id="ring-shine" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#F8F4EB" />
              <stop offset="60%" stopColor="#CFC6B3" />
              <stop offset="100%" stopColor="#8A8272" />
            </radialGradient>
            <linearGradient id="chain" x1="0" x2="1">
              <stop offset="0%" stopColor="#C7C3B8" />
              <stop offset="50%" stopColor="#EDE7D8" />
              <stop offset="100%" stopColor="#B3A389" />
            </linearGradient>
          </defs>
          <ellipse cx="160" cy="320" rx="110" ry="10" fill="#0B0B0C" opacity="0.08" />
          <circle cx="160" cy="170" r="82" fill="url(#ring-shine)" stroke="#8A8272" strokeWidth="1.2" />
          <circle cx="160" cy="170" r="56" fill="#FBFAF7" stroke="#D9D1BE" strokeWidth="1" />
          <circle cx="160" cy="108" r="8" fill="#F4F0E8" stroke="#B3A389" strokeWidth="1.2" />
          <path
            d="M80 250 Q 160 300 240 250"
            stroke="url(#chain)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <g opacity="0.85">
            {Array.from({ length: 18 }).map((_, i) => (
              <circle
                key={i}
                cx={82 + i * 9}
                cy={250 + Math.sin(i * 0.6) * 18}
                r="2"
                fill="#B3A389"
              />
            ))}
          </g>
        </svg>

        <div className="absolute left-5 right-5 bottom-5 flex items-end justify-between">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-muted-ink">Hero</div>
            <div className="font-display text-xl leading-tight mt-1">أناقة بلمسة فضية</div>
          </div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-muted-ink text-right">
            <div>Theme</div>
            <div className="text-ink font-medium mt-1">LaunchKit / Silver</div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-3 -right-3 sm:-bottom-6 sm:-right-6 w-28 sm:w-32 aspect-square rounded-2xl bg-ink text-paper p-4 flex flex-col justify-between shadow-xl">
        <div className="text-[10px] tracking-[0.22em] uppercase opacity-70">Live catalog</div>
        <div>
          <div className="font-display text-3xl leading-none">52</div>
          <div className="text-[11px] opacity-70 mt-1">products · 6 categories</div>
        </div>
      </div>
    </div>
  );
}
