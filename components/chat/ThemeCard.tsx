"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Palette, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAction } from "@/types";

interface ThemeCardProps {
  action: AIAction;
  sessionId: string;
  language: "en" | "ar";
  onConfirm: (data: unknown) => void;
}

export function ThemeCard({ sessionId, language, onConfirm }: ThemeCardProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const isRTL = language === "ar";

  // Fetch the real store_id so we can build the correct dashboard URL
  useEffect(() => {
    fetch("/api/store/debug")
      .then((r) => r.json())
      .then((d) => {
        const id = d.store?.store_id || d.store_id || null;
        if (id) setStoreId(String(id));
      })
      .catch(() => {});
  }, [sessionId]);

  // Both URLs work — dashboard.zid.sa needs the store ID, web.zid.sa is a simpler fallback
  const dashboardThemeUrl = storeId
    ? `https://dashboard.zid.sa/ar-sa/stores/${storeId}/channels/online-store/themes`
    : null;
  const webThemeUrl = "https://web.zid.sa/store-design";

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm({ chosenExternal: true });
  };

  if (confirmed) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm" dir={isRTL ? "rtl" : "ltr"}>
        <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            {language === "en" ? "Theme step completed!" : "اكتملت خطوة الثيم!"}
          </p>
          <p className="text-xs text-emerald-500 mt-0.5">
            {language === "en" ? "You've successfully set up your design direction." : "لقد قمت بإعداد اتجاه التصميم الخاص بك بنجاح."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50/60 border border-violet-100 rounded-2xl p-5 space-y-4 shadow-sm" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
          <Palette className="w-4 h-4 text-violet-600" />
        </div>
        <span className="text-base font-bold text-violet-900">
          {language === "en" ? "Choose Your Zid Theme" : "اختر ثيم متجرك من زد"}
        </span>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed">
        {language === "en"
          ? "Professional, high-converting store themes are managed directly through the Zid dashboard. Pick a design that fits your brand."
          : "تتم إدارة ثيمات المتاجر الاحترافية مباشرةً من لوحة تحكم زد. اختر تصميمًا يناسب علامتك التجارية."}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5 pt-2">
        {/* Primary: dashboard with dynamic store ID (most direct) */}
        {dashboardThemeUrl ? (
          <a
            href={dashboardThemeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white text-sm font-semibold rounded-xl px-5 py-3 shadow-md shadow-violet-200/60 transition-all hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4" />
            {language === "en" ? "Open Theme Settings" : "افتح إعدادات الثيم"}
            <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
          </a>
        ) : (
          /* Fallback while store ID is loading */
          <a
            href={webThemeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white text-sm font-semibold rounded-xl px-5 py-3 shadow-md shadow-violet-200/60 transition-all hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4" />
            {language === "en" ? "Open Store Design" : "افتح تصميم المتجر"}
            <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
          </a>
        )}

        {/* Secondary: always show the simpler web.zid.sa link too */}
        <a
          href={webThemeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 border border-violet-200 bg-violet-50 text-violet-700 text-sm font-medium rounded-xl px-5 py-2.5 hover:bg-violet-100 transition-all"
        >
          {language === "en" ? "Or open via web.zid.sa/store-design" : "أو افتح عبر web.zid.sa/store-design"}
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>

        <Button
          onClick={handleConfirm}
          variant="outline"
          className="w-full text-sm font-medium rounded-xl border-gray-200 text-gray-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 py-3"
        >
          {language === "en" ? "I've chosen my theme ✓ Continue" : "لقد اخترت الثيم ✓ متابعة"}
        </Button>
      </div>
    </div>
  );
}
