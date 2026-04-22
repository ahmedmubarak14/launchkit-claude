export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

export const localeMeta: Record<Locale, { label: string; dir: "ltr" | "rtl"; htmlLang: string }> = {
  en: { label: "English", dir: "ltr", htmlLang: "en" },
  ar: { label: "العربية", dir: "rtl", htmlLang: "ar" },
};
