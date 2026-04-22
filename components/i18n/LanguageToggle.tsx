"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";

export function LanguageToggle({ variant = "chip" }: { variant?: "chip" | "link" }) {
  const locale = useLocale();
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const next = locale === "ar" ? "en" : "ar";
  const label = t("switchToArabic");

  const onClick = () => {
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  if (variant === "link") {
    return (
      <button
        onClick={onClick}
        disabled={pending}
        className="text-sm text-muted-ink hover:text-ink transition-colors disabled:opacity-50"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border hairline bg-paper/70 backdrop-blur text-xs font-medium text-ink hover:bg-cream transition-colors disabled:opacity-50"
      aria-label={label}
    >
      <Languages className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
