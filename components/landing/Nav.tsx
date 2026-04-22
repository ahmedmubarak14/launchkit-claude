"use client";

import { Link } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";

export function Nav() {
  const t = useTranslations("nav");
  return (
    <header className="sticky top-0 z-40 border-b hairline bg-paper/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="font-display text-lg leading-none">LaunchKit</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-ink">
          <a href="#features" className="hover:text-ink transition-colors">{t("product")}</a>
          <a href="#how" className="hover:text-ink transition-colors">{t("customers")}</a>
          <a href="#faq" className="hover:text-ink transition-colors">{t("docs")}</a>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link
            href="/login"
            className="hidden sm:inline-block text-sm text-muted-ink hover:text-ink transition-colors"
          >
            {t("login")}
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center h-9 px-4 rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink/85 transition-colors"
          >
            {t("getStarted")}
          </Link>
        </div>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" className="w-6 h-6" aria-hidden>
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="#0B0B0C" stroke="#0B0B0C" />
      <path
        d="M10 20.5 V10 M10 20.5 H21.5 M16 15 L21 10"
        stroke="#F4F0E8"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="21.5" cy="10" r="1.25" fill="#B3A389" />
    </svg>
  );
}
