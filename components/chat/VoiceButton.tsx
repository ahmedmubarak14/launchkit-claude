"use client";

import { Mic, MicOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSpeechRecognition } from "./useSpeechRecognition";

export function VoiceButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const lang = locale === "ar" ? "ar-SA" : "en-US";

  const { supported, listening, interim, error, start, stop } = useSpeechRecognition({
    lang,
    onFinalTranscript: onTranscript,
  });

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title={t("voiceUnsupported")}
        className="w-11 h-11 rounded-2xl border hairline bg-paper text-muted-ink flex items-center justify-center opacity-50 cursor-not-allowed"
      >
        <MicOff className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {listening && interim && (
        <span className="text-xs text-muted-ink italic max-w-[160px] truncate">
          {interim}
        </span>
      )}
      <button
        type="button"
        onClick={() => (listening ? stop() : start())}
        title={listening ? t("voiceStop") : t("voiceStart")}
        className={`w-11 h-11 rounded-2xl border hairline flex items-center justify-center transition-colors ${
          listening
            ? "bg-red-600 text-white border-red-600 animate-pulse"
            : "bg-paper text-ink hover:bg-cream"
        }`}
        aria-label={listening ? t("listening") : t("voiceStart")}
      >
        <Mic className="w-4 h-4" />
      </button>
      {error && (
        <span className="text-xs text-red-600 ml-2">{error}</span>
      )}
    </div>
  );
}
