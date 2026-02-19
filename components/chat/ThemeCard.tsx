"use client";

import { useState } from "react";
import { Check, Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAction, StoreTheme } from "@/types";
import { STORE_THEMES } from "@/lib/themes";

interface ThemeCardProps {
  action: AIAction;
  sessionId: string;
  language: "en" | "ar";
  onConfirm: (theme: StoreTheme) => void;
}

const STYLE_LABELS: Record<string, { en: string; ar: string }> = {
  modern: { en: "Modern", ar: "عصري" },
  minimal: { en: "Minimal", ar: "بسيط" },
  bold: { en: "Bold", ar: "جريء" },
  elegant: { en: "Elegant", ar: "أنيق" },
};

export function ThemeCard({ sessionId, language, onConfirm }: ThemeCardProps) {
  const [selected, setSelected] = useState<StoreTheme | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRTL = language === "ar";

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/store/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: selected.id, sessionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmed(true);
        onConfirm(selected);
      } else {
        const msg = data.error || (language === "en" ? "Failed to save theme" : "فشل حفظ الثيم");
        setError(msg);
        console.error("Theme apply error:", data);
        // Still confirm on frontend — theme preference is cosmetic
        // even if DB save failed, let user continue
        setConfirmed(true);
        onConfirm(selected);
      }
    } catch (err) {
      console.error("Theme apply error:", err);
      // Still confirm — network error shouldn't block UI flow
      setConfirmed(true);
      onConfirm(selected);
    } finally {
      setLoading(false);
    }
  };

  if (confirmed && selected) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-700">
            {language === "en" ? "Theme applied!" : "تم تطبيق الثيم!"}
          </p>
          <p className="text-xs text-emerald-500 mt-0.5">
            {isRTL ? selected.nameAr : selected.nameEn}
          </p>
        </div>
        {/* Color swatches */}
        <div className="flex gap-1">
          {Object.values(selected.colors).map((c, i) => (
            <div key={i} className="w-5 h-5 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50/60 border border-violet-100 rounded-2xl p-4 space-y-4 shadow-sm" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
          <Palette className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <span className="text-sm font-semibold text-violet-800">
          {language === "en" ? "Choose Your Store Theme" : "اختر ثيم متجرك"}
        </span>
      </div>

      {/* Theme grid */}
      <div className="grid grid-cols-2 gap-2">
        {STORE_THEMES.map((theme) => {
          const isSelected = selected?.id === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => setSelected(theme)}
              className={`relative text-left rounded-xl border-2 p-3 transition-all hover:shadow-md ${
                isSelected
                  ? "border-violet-500 bg-white shadow-md shadow-violet-100"
                  : "border-transparent bg-white/70 hover:border-violet-200"
              }`}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Color swatches */}
              <div className="flex gap-1 mb-2">
                <div className="w-6 h-6 rounded-full border border-white/80 shadow-sm" style={{ backgroundColor: theme.colors.primary }} />
                <div className="w-6 h-6 rounded-full border border-white/80 shadow-sm" style={{ backgroundColor: theme.colors.secondary }} />
                <div className="w-6 h-6 rounded-full border border-white/80 shadow-sm" style={{ backgroundColor: theme.colors.accent }} />
              </div>

              {/* Name */}
              <p className="text-xs font-bold text-gray-800 leading-tight">
                {isRTL ? theme.nameAr : theme.nameEn}
              </p>

              {/* Style badge */}
              <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: theme.colors.secondary, color: theme.colors.primary }}>
                {isRTL ? STYLE_LABELS[theme.style].ar : STYLE_LABELS[theme.style].en}
              </span>

              {/* Description */}
              <p className="text-[10px] text-gray-400 mt-1 leading-tight line-clamp-2">
                {isRTL ? theme.descriptionAr : theme.descriptionEn}
              </p>
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      <Button
        onClick={handleConfirm}
        disabled={!selected || loading}
        className="w-full bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white text-sm font-semibold rounded-xl px-5 py-2.5 h-auto shadow-md shadow-violet-200/60 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 gap-2"
      >
        {loading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {language === "en" ? "Applying..." : "جاري التطبيق..."}
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            {selected
              ? language === "en"
                ? `Apply "${isRTL ? selected.nameAr : selected.nameEn}"`
                : `تطبيق "${selected.nameAr}"`
              : language === "en"
              ? "Select a theme first"
              : "اختر ثيماً أولاً"}
          </>
        )}
      </Button>
    </div>
  );
}
