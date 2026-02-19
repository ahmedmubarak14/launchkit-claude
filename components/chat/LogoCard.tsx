"use client";

import { useState, useCallback } from "react";
import { Check, Download, RefreshCw, Wand2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAction } from "@/types";
import { generateSVGLogo, svgToDataUri, SVGLogoConfig } from "@/lib/svg-logo-generator";

interface LogoCardProps {
  action: AIAction;
  sessionId: string;
  language: "en" | "ar";
  onConfirm: (logoUrl: string) => void;
}

type LogoStyle = SVGLogoConfig["style"];
type Tab = "svg" | "ai";

const STYLE_OPTIONS: { value: LogoStyle; labelEn: string; labelAr: string }[] = [
  { value: "initials", labelEn: "Initials", labelAr: "أحرف أولى" },
  { value: "wordmark", labelEn: "Wordmark", labelAr: "اسم المتجر" },
  { value: "icon+text", labelEn: "Icon + Text", labelAr: "أيقونة + نص" },
];

export function LogoCard({ action, sessionId, language, onConfirm }: LogoCardProps) {
  const isRTL = language === "ar";
  const storeName = action.data?.storeName || "My Store";
  const defaultColor = action.data?.primaryColor || "#7C3AED";

  const [tab, setTab] = useState<Tab>("svg");
  const [logoStyle, setLogoStyle] = useState<LogoStyle>("initials");
  const [color, setColor] = useState(defaultColor);
  const [confirmed, setConfirmed] = useState(false);
  const [savedLogoUrl, setSavedLogoUrl] = useState<string | null>(null);

  // AI logo state
  const [aiLogoUrl, setAiLogoUrl] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Saving state
  const [saving, setSaving] = useState(false);

  const svgString = generateSVGLogo({ storeName, primaryColor: color, style: logoStyle });
  const svgDataUri = svgToDataUri(svgString);

  const handleDownloadSVG = () => {
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${storeName.toLowerCase().replace(/\s+/g, "-")}-logo.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateAI = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const prompt = action.data?.logoPrompt || `Clean minimalist logo for a store called "${storeName}", white background, professional, no text`;
      const res = await fetch("/api/store/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ai", prompt, sessionId }),
      });
      const data = await res.json();
      if (data.logoUrl) {
        setAiLogoUrl(data.logoUrl);
      } else {
        setAiError(data.error || (language === "en" ? "Generation failed" : "فشل الإنشاء"));
      }
    } catch {
      setAiError(language === "en" ? "Network error. Try again." : "خطأ في الشبكة. حاول مرة أخرى.");
    } finally {
      setAiLoading(false);
    }
  }, [action.data?.logoPrompt, storeName, sessionId, language]);

  const handleSave = async () => {
    setSaving(true);
    const logoToSave = tab === "ai" && aiLogoUrl ? aiLogoUrl : svgDataUri;
    try {
      const res = await fetch("/api/store/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "save", logoUrl: logoToSave, sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedLogoUrl(logoToSave);
        setConfirmed(true);
        onConfirm(logoToSave);
      } else {
        console.error("Logo save error:", data);
        // Still confirm on frontend — don't block user over a DB write issue
        setSavedLogoUrl(logoToSave);
        setConfirmed(true);
        onConfirm(logoToSave);
      }
    } catch (err) {
      console.error("Logo save error:", err);
      // On network error still confirm so user can continue
      setSavedLogoUrl(logoToSave);
      setConfirmed(true);
      onConfirm(logoToSave);
    } finally {
      setSaving(false);
    }
  };

  if (confirmed && savedLogoUrl) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-700">
            {language === "en" ? "Logo saved!" : "تم حفظ الشعار!"}
          </p>
          <p className="text-xs text-emerald-500 mt-0.5">
            {language === "en" ? "Your logo is ready to use" : "شعارك جاهز للاستخدام"}
          </p>
        </div>
        {savedLogoUrl.startsWith("data:image/svg") ? (
          <img src={savedLogoUrl} alt="logo" className="w-10 h-10 object-contain" />
        ) : (
          <img src={savedLogoUrl} alt="logo" className="w-10 h-10 object-cover rounded-lg" />
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50/60 border border-violet-100 rounded-2xl p-4 space-y-4 shadow-sm" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
          <Wand2 className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <span className="text-sm font-semibold text-violet-800">
          {language === "en" ? "Generate Your Logo" : "إنشاء شعارك"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/60 rounded-xl p-1 border border-violet-100">
        <button
          onClick={() => setTab("svg")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
            tab === "svg" ? "bg-violet-600 text-white shadow-sm" : "text-gray-500 hover:text-violet-600"
          }`}
        >
          <Wand2 className="w-3 h-3" />
          {language === "en" ? "SVG Logo" : "شعار SVG"}
        </button>
        <button
          onClick={() => setTab("ai")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
            tab === "ai" ? "bg-violet-600 text-white shadow-sm" : "text-gray-500 hover:text-violet-600"
          }`}
        >
          <ImageIcon className="w-3 h-3" />
          {language === "en" ? "AI Image" : "صورة بالذكاء الاصطناعي"}
        </button>
      </div>

      {/* SVG Tab */}
      {tab === "svg" && (
        <div className="space-y-3">
          {/* Preview */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-center min-h-[100px]">
            <img src={svgDataUri} alt="logo preview" className="max-h-20 object-contain" />
          </div>

          {/* Style selector */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">
              {language === "en" ? "Style" : "النمط"}
            </p>
            <div className="flex gap-1.5">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLogoStyle(opt.value)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                    logoStyle === opt.value
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-violet-200"
                  }`}
                >
                  {isRTL ? opt.labelAr : opt.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500 font-medium">
              {language === "en" ? "Color" : "اللون"}
            </p>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
            />
            <span className="text-xs text-gray-400 font-mono">{color}</span>

            <button
              onClick={handleDownloadSVG}
              className="ml-auto flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {language === "en" ? "Download SVG" : "تحميل SVG"}
            </button>
          </div>
        </div>
      )}

      {/* AI Tab */}
      {tab === "ai" && (
        <div className="space-y-3">
          {aiLoading ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 flex flex-col items-center gap-3 min-h-[120px] justify-center">
              <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
              <p className="text-xs text-gray-400">
                {language === "en" ? "Generating your logo..." : "جاري إنشاء شعارك..."}
              </p>
            </div>
          ) : aiLogoUrl ? (
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-3">
              <img src={aiLogoUrl} alt="AI generated logo" className="max-h-32 object-contain rounded-lg" />
              <button
                onClick={handleGenerateAI}
                className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {language === "en" ? "Regenerate" : "إعادة الإنشاء"}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-violet-200 p-6 flex flex-col items-center gap-3">
              {aiError && (
                <p className="text-xs text-red-500 text-center">{aiError}</p>
              )}
              <p className="text-xs text-gray-400 text-center">
                {language === "en"
                  ? "Generate a unique AI-powered logo for your store"
                  : "أنشئ شعاراً فريداً بالذكاء الاصطناعي لمتجرك"}
              </p>
              <Button
                onClick={handleGenerateAI}
                className="bg-gradient-to-r from-violet-600 to-violet-700 text-white text-xs font-semibold rounded-xl px-4 py-2 h-auto gap-1.5"
              >
                <Wand2 className="w-3.5 h-3.5" />
                {language === "en" ? "Generate AI Logo" : "إنشاء شعار بالذكاء الاصطناعي"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={saving || (tab === "ai" && !aiLogoUrl)}
        className="w-full bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white text-sm font-semibold rounded-xl px-5 py-2.5 h-auto shadow-md shadow-violet-200/60 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 gap-2"
      >
        {saving ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {language === "en" ? "Saving..." : "جاري الحفظ..."}
          </>
        ) : (
          <>
            <Check className="w-3.5 h-3.5" />
            {language === "en" ? "Save Logo to Store" : "حفظ الشعار في المتجر"}
          </>
        )}
      </Button>
    </div>
  );
}
