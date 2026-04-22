import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Inter, Fraunces, IBM_Plex_Sans_Arabic } from "next/font/google";
import { locales, localeMeta, type Locale } from "@/lib/i18n/config";
import { Providers } from "@/components/providers";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });
const ibmArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-ibm-arabic",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr ? "لانش كيت — مشغّل التجارة لـ زد" : "LaunchKit — The commerce operator for Zid",
    description: isAr
      ? "اربط متجر زد، أنشئ كتالوجاً كاملاً، ركّب قالباً، ونشر صفحة رئيسية في بعد ظهر واحد."
      : "Connect your Zid store, build your catalogue, install a theme, and ship a landing page in an afternoon.",
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        ar: "/ar",
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  const meta = localeMeta[locale as Locale];

  return (
    <html lang={meta.htmlLang} dir={meta.dir} className={`${inter.variable} ${fraunces.variable} ${ibmArabic.variable}`}>
      <body>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
