"use client";

import { useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { Send, Loader2, Sparkles, Check, AlertCircle } from "lucide-react";
import { VoiceButton } from "./VoiceButton";
import type { UiPayload } from "@/lib/ai/tools";

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; uiActions?: UiPayload[]; toolEvents?: ToolEvent[] };

type ToolEvent = { name: string; ok: boolean; summary: string };

type ChatResponse = {
  message: string;
  uiActions: UiPayload[];
  toolEvents: ToolEvent[];
};

async function sendMessage(args: {
  sessionId: string;
  locale: "ar" | "en";
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error("chat failed");
  return res.json();
}

export function ChatPanel() {
  const t = useTranslations("chat");
  const locale = useLocale() as "ar" | "en";
  const isAr = locale === "ar";

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "sys-intro",
      role: "assistant",
      content: isAr
        ? "أهلاً! أنا لانش كيت. اكتب أو تحدّث وسأنفّذ على متجرك مباشرة."
        : "Hi, I'm LaunchKit. Type or talk — I act on your live store directly.",
    },
  ]);
  const [input, setInput] = useState("");
  const sessionIdRef = useRef(crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  const historyForApi = useMemo(
    () =>
      messages
        .filter((m) => m.id !== "sys-intro")
        .map((m) => ({ role: m.role, content: m.content })),
    [messages]
  );

  const mutation = useMutation({
    mutationFn: (text: string) =>
      sendMessage({
        sessionId: sessionIdRef.current,
        locale,
        message: text,
        history: historyForApi,
      }),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
          uiActions: data.uiActions,
          toolEvents: data.toolEvents,
        },
      ]);
      queueMicrotask(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: isAr ? "حدث خطأ. حاول مرة أخرى." : "Something went wrong. Try again.",
        },
      ]);
    },
  });

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);
    setInput("");
    mutation.mutate(trimmed);
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {messages.map((m) => (
          <Bubble key={m.id} message={m} isAr={isAr} />
        ))}
        {mutation.isPending && (
          <div className="flex items-center gap-2 text-muted-ink text-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t("thinking")}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t hairline bg-paper px-4 py-4"
      >
        <div className="flex items-end gap-2">
          <VoiceButton onTranscript={(txt) => submit(txt)} />
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("placeholder")}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              className="w-full resize-none px-4 py-3 rounded-2xl border hairline bg-paper focus:outline-none focus:border-ink transition-colors text-sm min-h-[44px] max-h-40"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || mutation.isPending}
            className="w-11 h-11 rounded-2xl bg-ink text-paper flex items-center justify-center disabled:opacity-50 hover:bg-ink/85 transition-colors"
            aria-label={t("send")}
          >
            <Send className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ message, isAr }: { message: ChatMessage; isAr: boolean }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-ink text-paper rounded-2xl rounded-br-sm px-4 py-3 text-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-cream border hairline flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-champagne" />
      </div>
      <div className="flex-1 space-y-3">
        {message.content && (
          <div className="text-sm leading-relaxed text-ink whitespace-pre-wrap">
            {message.content}
          </div>
        )}
        {message.toolEvents?.map((ev, i) => (
          <ToolEventPill key={i} event={ev} isAr={isAr} />
        ))}
        {message.uiActions?.map((ui, i) => (
          <UiActionCard key={i} ui={ui} isAr={isAr} />
        ))}
      </div>
    </div>
  );
}

function ToolEventPill({ event, isAr }: { event: ToolEvent; isAr: boolean }) {
  const Icon = event.ok ? Check : AlertCircle;
  const color = event.ok
    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
    : "bg-red-50 border-red-200 text-red-700";
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${color}`}>
      <Icon className="w-3 h-3" />
      <span className="font-medium">{event.name}</span>
      <span className="opacity-70">·</span>
      <span>{event.summary}</span>
      <span className="sr-only">{isAr ? "حدث أداة" : "tool event"}</span>
    </div>
  );
}

function UiActionCard({ ui, isAr }: { ui: UiPayload; isAr: boolean }) {
  if (ui.kind === "install_theme_instructions") {
    return (
      <div className="rounded-2xl border hairline bg-cream/60 p-5">
        <div className="text-xs tracking-[0.18em] uppercase text-muted-ink mb-2">
          {isAr ? "تثبيت القالب" : "Theme install"}
        </div>
        <p className="text-sm text-ink leading-relaxed mb-3">
          {isAr
            ? "حمّل الملف وارفعه من لوحة تحكم زد ← القوالب المخصصة ← رفع قالب جديد."
            : "Download the ZIP and upload it from your Zid dashboard → Custom themes → Upload new theme."}
        </p>
        <a
          href={ui.downloadUrl}
          className="inline-flex items-center h-10 px-4 rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink/85"
          download
        >
          {isAr ? "تحميل ZIP" : "Download ZIP"}
        </a>
      </div>
    );
  }

  if (ui.kind === "preview_bulk_products") {
    return (
      <div className="rounded-2xl border hairline bg-paper p-5">
        <div className="text-xs tracking-[0.18em] uppercase text-muted-ink mb-3">
          {isAr ? `معاينة ${ui.products.length} منتجات` : `${ui.products.length} products — preview`}
        </div>
        <ul className="divide-y hairline">
          {ui.products.slice(0, 6).map((p, i) => (
            <li key={i} className="py-2 flex items-center gap-3 text-sm">
              <div className="flex-1 truncate">{isAr ? p.nameAr : p.nameEn}</div>
              <div className="tabular-nums text-muted-ink">{p.price.toLocaleString()} SAR</div>
            </li>
          ))}
        </ul>
        {ui.products.length > 6 && (
          <div className="text-xs text-muted-ink mt-2">
            {isAr ? `و ${ui.products.length - 6} منتجات أخرى…` : `and ${ui.products.length - 6} more…`}
          </div>
        )}
      </div>
    );
  }

  if (ui.kind === "preview_product") {
    return (
      <div className="rounded-2xl border hairline bg-paper p-5">
        <div className="text-xs tracking-[0.18em] uppercase text-muted-ink mb-2">
          {isAr ? "معاينة منتج" : "Product preview"}
        </div>
        <div className="font-display text-lg">{isAr ? ui.product.nameAr : ui.product.nameEn}</div>
        <div className="text-sm text-muted-ink mt-1">
          {ui.product.price.toLocaleString()} SAR
        </div>
      </div>
    );
  }

  return null;
}
