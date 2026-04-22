"use client";

import { useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";

export function Footer() {
  const t = useTranslations("landing.footer");
  return (
    <footer className="border-t hairline bg-paper">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-14 grid md:grid-cols-4 gap-10">
        <div>
          <div className="font-display text-xl">LaunchKit</div>
          <p className="mt-3 text-sm text-muted-ink leading-relaxed max-w-xs">
            {t("copyright")}
          </p>
        </div>
        <FooterGroup title={t("product")} items={[t("about"), t("changelog"), t("status")]} />
        <FooterGroup title={t("company")} items={[t("about"), t("contact")]} />
        <FooterGroup title={t("legal")} items={[t("privacy"), t("terms")]} />
      </div>
      <div className="border-t hairline">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-14 flex items-center justify-between text-xs text-muted-ink">
          <span>© {new Date().getFullYear()} LaunchKit</span>
          <LanguageToggle variant="link" />
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs tracking-[0.22em] uppercase text-muted-ink mb-4">{title}</div>
      <ul className="space-y-2.5 text-sm text-ink">
        {items.map((it) => (
          <li key={it}>
            <a href="#" className="hover:text-champagne transition-colors">{it}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
