"use client";

import { useState, useEffect } from "react";
import {
  Check,
  LayoutTemplate,
  Star,
  Truck,
  Shield,
  ArrowRight,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Gift,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAction } from "@/types";

interface LandingPageCardProps {
  action: AIAction;
  sessionId: string;
  language: "en" | "ar";
  onConfirm: (data: unknown) => void;
}

interface HeroSection {
  headline: string;
  headlineAr?: string;
  subheadline: string;
  subheadlineAr?: string;
  cta: string;
  ctaAr?: string;
}

interface FeatureItem {
  icon: string;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
}

interface TestimonialItem {
  quote: string;
  quoteAr?: string;
  author: string;
  rating?: number;
}

interface PromoSection {
  headline: string;
  headlineAr?: string;
  discount?: string;
  code?: string;
  cta?: string;
  ctaAr?: string;
}

interface LandingPageData {
  storeName?: string;
  storeNameAr?: string;
  primaryColor?: string;
  hero?: HeroSection;
  features?: FeatureItem[];
  testimonials?: TestimonialItem[];
  promo?: PromoSection;
  categories?: Array<{ name: string; nameAr?: string }>;
  seoTitle?: string;
  seoDescription?: string;
}

function getFeatureIcon(iconName: string, color: string) {
  const cls = "w-4 h-4";
  const style = { color };
  switch (iconName?.toLowerCase()) {
    case "truck":
    case "shipping":
      return <Truck className={cls} style={style} />;
    case "gift":
      return <Gift className={cls} style={style} />;
    case "tag":
    case "discount":
      return <Tag className={cls} style={style} />;
    default:
      return <Shield className={cls} style={style} />;
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-violet-600 transition-colors px-2 py-1 rounded-lg hover:bg-violet-50"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

export function LandingPageCard({ action, language, onConfirm }: LandingPageCardProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeBuilderUrl, setStoreBuilderUrl] = useState<string | null>(null);
  const [showSections, setShowSections] = useState(false);

  const isRTL = language === "ar";
  const data = (action.data as unknown as LandingPageData) || {};

  const primaryColor = data.primaryColor || "#7C3AED";
  const hero: HeroSection = data.hero || {
    headline: "Your Store",
    headlineAr: "متجرك",
    subheadline: "Welcome to our store",
    subheadlineAr: "مرحباً بك في متجرنا",
    cta: "Shop Now",
    ctaAr: "تسوق الآن",
  };
  const features: FeatureItem[] = data.features || [];
  const testimonials: TestimonialItem[] = data.testimonials || [];
  const promo: PromoSection | null = data.promo || null;
  const storeName = (isRTL ? data.storeNameAr : data.storeName) || data.storeName || "Your Store";

  // Fetch store builder URL on mount
  useEffect(() => {
    fetch("/api/store/landing-page")
      .then((r) => r.json())
      .then((d) => {
        if (d.storeBuilderUrl) setStoreBuilderUrl(d.storeBuilderUrl);
      })
      .catch(() => {});
  }, []);

  const handleApply = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/store/landing-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: data }),
      });
      const result = await res.json();
      if (result.storeBuilderUrl) setStoreBuilderUrl(result.storeBuilderUrl);
      setConfirmed(true);
      onConfirm(data);
    } catch {
      setError(language === "en" ? "Failed to save layout" : "فشل في حفظ التخطيط");
    } finally {
      setLoading(false);
    }
  };

  // Build a plain-text copy of the full landing page content
  const buildCopyText = () => {
    const lines: string[] = [];
    lines.push(`=== ${storeName} — Landing Page Content ===\n`);

    lines.push("--- HERO SECTION ---");
    lines.push(`Headline (EN): ${hero.headline}`);
    if (hero.headlineAr) lines.push(`Headline (AR): ${hero.headlineAr}`);
    lines.push(`Subheadline (EN): ${hero.subheadline}`);
    if (hero.subheadlineAr) lines.push(`Subheadline (AR): ${hero.subheadlineAr}`);
    lines.push(`CTA Button (EN): ${hero.cta}`);
    if (hero.ctaAr) lines.push(`CTA Button (AR): ${hero.ctaAr}`);

    if (features.length > 0) {
      lines.push("\n--- FEATURES / TRUST BADGES ---");
      features.forEach((f, i) => {
        lines.push(`${i + 1}. ${f.title}${f.titleAr ? ` / ${f.titleAr}` : ""}: ${f.description}${f.descriptionAr ? ` / ${f.descriptionAr}` : ""}`);
      });
    }

    if (promo) {
      lines.push("\n--- PROMO BANNER ---");
      lines.push(`Headline (EN): ${promo.headline}`);
      if (promo.headlineAr) lines.push(`Headline (AR): ${promo.headlineAr}`);
      if (promo.discount) lines.push(`Discount: ${promo.discount}`);
      if (promo.code) lines.push(`Coupon Code: ${promo.code}`);
    }

    if (testimonials.length > 0) {
      lines.push("\n--- TESTIMONIALS ---");
      testimonials.forEach((t, i) => {
        lines.push(`${i + 1}. "${t.quote}" — ${t.author}`);
        if (t.quoteAr) lines.push(`   AR: "${t.quoteAr}"`);
      });
    }

    if (data.seoTitle) {
      lines.push("\n--- SEO ---");
      lines.push(`Title: ${data.seoTitle}`);
      if (data.seoDescription) lines.push(`Description: ${data.seoDescription}`);
    }

    return lines.join("\n");
  };

  if (confirmed) {
    return (
      <div
        className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-3 shadow-sm"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              {language === "en" ? "Landing Page Layout Saved!" : "تم حفظ تخطيط الصفحة الرئيسية!"}
            </p>
            <p className="text-xs text-emerald-500 mt-0.5">
              {language === "en"
                ? "Apply the content in your Zid Store Builder"
                : "طبّق المحتوى في منشئ متجر زد"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {storeBuilderUrl && (
            <a
              href={storeBuilderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl px-4 py-2.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {language === "en" ? "Open Zid Store Builder" : "افتح منشئ متجر زد"}
            </a>
          )}
          <CopyButton text={buildCopyText()} label={language === "en" ? "Copy all content" : "نسخ كل المحتوى"} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-gray-100 rounded-2xl shadow-md overflow-hidden"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-50">
        <div className="w-8 h-8 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0">
          <LayoutTemplate className="w-4 h-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-gray-900 block truncate">
            {language === "en" ? "Landing Page Preview" : "معاينة الصفحة الرئيسية"}
          </span>
          <span className="text-[10px] text-violet-500 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            {language === "en" ? "AI Generated · " : "من إنشاء الذكاء الاصطناعي · "}
            {storeName}
          </span>
        </div>
      </div>

      {/* Browser Mockup */}
      <div className="rounded-none border-b border-gray-100 overflow-hidden bg-gray-50/50">
        {/* Browser Chrome */}
        <div className="bg-gray-100/80 px-3 py-2 border-b border-gray-200 flex items-center gap-1.5" dir="ltr">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
          </div>
          <div className="mx-auto h-4 w-36 bg-white rounded flex items-center justify-center text-[8px] text-gray-400 font-medium border border-gray-200">
            myshop.zid.store
          </div>
        </div>

        {/* Page Content */}
        <div className="max-h-[420px] overflow-y-auto">
          {/* Hero */}
          <div
            className="px-6 py-10 flex flex-col items-center justify-center text-center text-white relative overflow-hidden"
            style={{ backgroundColor: primaryColor }}
          >
            {/* decorative circles */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-10 bg-white" />

            <h1 className="text-lg font-extrabold mb-1.5 tracking-tight relative z-10">
              {isRTL && hero.headlineAr ? hero.headlineAr : hero.headline}
            </h1>
            <p className="text-white/75 text-[11px] mb-4 max-w-[220px] leading-relaxed relative z-10">
              {isRTL && hero.subheadlineAr ? hero.subheadlineAr : hero.subheadline}
            </p>
            <button
              className="bg-white text-gray-900 px-5 py-1.5 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1 relative z-10"
              style={{ color: primaryColor }}
            >
              {isRTL && hero.ctaAr ? hero.ctaAr : hero.cta}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Promo Banner */}
          {promo && (
            <div
              className="px-4 py-3 flex items-center justify-between text-white text-[10px]"
              style={{ backgroundColor: `${primaryColor}dd` }}
            >
              <span className="font-bold">{isRTL && promo.headlineAr ? promo.headlineAr : promo.headline}</span>
              <div className="flex items-center gap-2">
                {promo.discount && (
                  <span className="bg-white/20 rounded-full px-2 py-0.5 font-semibold">{promo.discount}</span>
                )}
                {promo.code && (
                  <span className="bg-white text-gray-800 rounded-full px-2 py-0.5 font-mono font-bold">
                    {promo.code}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Features */}
          {features.length > 0 && (
            <div className="py-5 px-4 bg-white">
              <div className="grid grid-cols-2 gap-2">
                {features.map((f, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center text-center p-3 rounded-xl border border-gray-100 bg-gray-50/60"
                  >
                    <div
                      className="w-7 h-7 rounded-full mb-1.5 flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}18` }}
                    >
                      {getFeatureIcon(f.icon, primaryColor)}
                    </div>
                    <h3 className="text-[10px] font-bold text-gray-800">
                      {isRTL && f.titleAr ? f.titleAr : f.title}
                    </h3>
                    <p className="text-[9px] text-gray-500 mt-0.5 leading-snug">
                      {isRTL && f.descriptionAr ? f.descriptionAr : f.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories strip */}
          {data.categories && data.categories.length > 0 && (
            <div className="px-4 py-4 bg-gray-50 border-t border-gray-100">
              <p className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold mb-2 text-center">
                {language === "en" ? "Shop by Category" : "تسوق حسب الفئة"}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {data.categories.map((c, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-semibold px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isRTL && c.nameAr ? c.nameAr : c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Testimonials */}
          {testimonials.length > 0 && (
            <div className="py-4 px-4 bg-white border-t border-gray-100">
              <p className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold mb-2 text-center">
                {language === "en" ? "Customer Reviews" : "آراء العملاء"}
              </p>
              <div className="flex flex-col gap-2">
                {testimonials.map((t, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 p-2.5 rounded-xl border border-gray-100"
                  >
                    <div className="flex text-amber-400 mb-1">
                      {[...Array(t.rating || 5)].map((_, j) => (
                        <Star key={j} className="w-2.5 h-2.5 fill-current" />
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-600 italic leading-snug">
                      "{isRTL && t.quoteAr ? t.quoteAr : t.quote}"
                    </p>
                    <p className="text-[9px] font-bold text-gray-800 mt-1">— {t.author}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEO footer */}
          {data.seoTitle && (
            <div className="py-3 px-4 bg-gray-100 border-t border-gray-200 text-center">
              <p className="text-[9px] text-gray-500 font-medium">{data.seoTitle}</p>
              {data.seoDescription && (
                <p className="text-[8px] text-gray-400 mt-0.5 leading-snug">{data.seoDescription}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Sections Accordion */}
      <div className="px-4 py-3 border-b border-gray-50">
        <button
          onClick={() => setShowSections(!showSections)}
          className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span className="font-medium">
            {language === "en" ? "📋 View copyable content" : "📋 عرض المحتوى القابل للنسخ"}
          </span>
          {showSections ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showSections && (
          <div className="mt-3 space-y-2.5" dir={isRTL ? "rtl" : "ltr"}>
            {/* Hero content */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                  {language === "en" ? "Hero Section" : "قسم الهيرو"}
                </span>
                <CopyButton
                  text={`${hero.headline}\n${hero.subheadline}\n${hero.cta}`}
                  label={language === "en" ? "Copy" : "نسخ"}
                />
              </div>
              <p className="text-xs font-bold text-gray-800">{hero.headline}</p>
              {hero.headlineAr && <p className="text-xs font-bold text-gray-600" dir="rtl">{hero.headlineAr}</p>}
              <p className="text-[11px] text-gray-500">{hero.subheadline}</p>
              {hero.subheadlineAr && <p className="text-[11px] text-gray-400" dir="rtl">{hero.subheadlineAr}</p>}
              <span
                className="inline-block text-[10px] font-semibold px-3 py-1 rounded-full text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {hero.cta} {hero.ctaAr && `/ ${hero.ctaAr}`}
              </span>
            </div>

            {/* Features */}
            {features.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                    {language === "en" ? "Features / Trust Badges" : "المميزات / شارات الثقة"}
                  </span>
                  <CopyButton
                    text={features.map((f) => `• ${f.title}: ${f.description}`).join("\n")}
                    label={language === "en" ? "Copy" : "نسخ"}
                  />
                </div>
                {features.map((f, i) => (
                  <div key={i} className="text-[11px] text-gray-700">
                    <span className="font-semibold">{f.title}</span>
                    {f.titleAr && <span className="text-gray-400"> / {f.titleAr}</span>}
                    <span className="text-gray-500">: {f.description}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Promo */}
            {promo && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                    {language === "en" ? "Promo Banner" : "بانر العرض"}
                  </span>
                  <CopyButton
                    text={`${promo.headline}${promo.discount ? ` — ${promo.discount}` : ""}${promo.code ? ` — Code: ${promo.code}` : ""}`}
                    label={language === "en" ? "Copy" : "نسخ"}
                  />
                </div>
                <p className="text-xs font-bold text-gray-800">{promo.headline}</p>
                {promo.headlineAr && <p className="text-xs font-bold text-gray-600" dir="rtl">{promo.headlineAr}</p>}
                {promo.discount && (
                  <span className="text-[10px] font-bold text-white rounded-full px-2.5 py-0.5 inline-block" style={{ backgroundColor: primaryColor }}>
                    {promo.discount}
                  </span>
                )}
                {promo.code && (
                  <span className="text-[10px] font-mono font-bold bg-gray-200 text-gray-800 rounded-lg px-2 py-0.5 ml-2 inline-block">
                    {promo.code}
                  </span>
                )}
              </div>
            )}

            {/* Testimonials */}
            {testimonials.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                    {language === "en" ? "Testimonials" : "الشهادات"}
                  </span>
                  <CopyButton
                    text={testimonials.map((t) => `"${t.quote}" — ${t.author}`).join("\n")}
                    label={language === "en" ? "Copy" : "نسخ"}
                  />
                </div>
                {testimonials.map((t, i) => (
                  <div key={i} className="text-[11px] text-gray-600 italic">
                    "{t.quote}"<span className="font-semibold not-italic text-gray-800"> — {t.author}</span>
                    {t.quoteAr && <div className="text-gray-400" dir="rtl">"{t.quoteAr}"</div>}
                  </div>
                ))}
              </div>
            )}

            {/* SEO */}
            {(data.seoTitle || data.seoDescription) && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">SEO</span>
                  <CopyButton
                    text={`Title: ${data.seoTitle}\nDescription: ${data.seoDescription}`}
                    label={language === "en" ? "Copy" : "نسخ"}
                  />
                </div>
                {data.seoTitle && <p className="text-xs font-semibold text-blue-700">{data.seoTitle}</p>}
                {data.seoDescription && <p className="text-[11px] text-gray-500">{data.seoDescription}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-4 space-y-2.5">
        {error && (
          <p className="text-xs text-red-500 font-medium text-center">{error}</p>
        )}

        {/* Primary: Apply & Save */}
        <Button
          onClick={handleApply}
          disabled={loading}
          className="w-full text-white text-sm font-semibold rounded-xl px-5 py-2.5 shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-60"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          ) : (
            <Check className="w-4 h-4 mr-1.5" />
          )}
          {language === "en" ? "Save & Approve Layout" : "حفظ واعتماد التخطيط"}
        </Button>

        {/* Secondary: Open Zid Store Builder */}
        {storeBuilderUrl && (
          <a
            href={storeBuilderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 border border-violet-200 bg-violet-50 text-violet-700 text-xs font-medium rounded-xl px-4 py-2 hover:bg-violet-100 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {language === "en" ? "Open Zid Store Builder to apply" : "افتح منشئ متجر زد لتطبيق التصميم"}
          </a>
        )}

        {/* Copy all */}
        <div className="flex justify-center">
          <CopyButton
            text={buildCopyText()}
            label={language === "en" ? "Copy all content to clipboard" : "نسخ كل المحتوى"}
          />
        </div>

        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
          {language === "en"
            ? "Save your layout, then paste the content into your Zid Store Builder sections."
            : "احفظ التخطيط، ثم الصق المحتوى في أقسام منشئ متجر زد."}
        </p>
      </div>
    </div>
  );
}
