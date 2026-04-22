"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

type SRConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

function getConstructor(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type UseSpeechRecognitionOptions = {
  lang: "ar-SA" | "en-US";
  onFinalTranscript: (text: string) => void;
};

const noopSubscribe = () => () => {};

export function useSpeechRecognition({ lang, onFinalTranscript }: UseSpeechRecognitionOptions) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => !!getConstructor(),
    () => false
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const start = useCallback(() => {
    const Ctor = getConstructor();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (ev) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < ev.results.length; i++) {
        const res = ev.results[i] as ArrayLike<{ transcript: string }> & { isFinal?: boolean };
        const chunk = res[0]?.transcript ?? "";
        if ((res as { isFinal?: boolean }).isFinal) finalText += chunk;
        else interimText += chunk;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        onFinalTranscript(finalText.trim());
        setInterim("");
      }
    };
    rec.onerror = (ev) => {
      setError(ev.error);
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  }, [lang, onFinalTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { supported, listening, interim, error, start, stop };
}
