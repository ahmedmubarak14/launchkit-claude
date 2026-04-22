"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { Send, Loader2, Sparkles, Check, AlertCircle, Paperclip, Upload, X } from "lucide-react";
import { VoiceButton } from "./VoiceButton";
import { parseProductsFromCSV, parseProductsFromXLSXRows } from "@/lib/csv-parser";
import type { UiPayload, BulkProductPreview } from "@/lib/ai/tools";

type ToolEvent = { name: string; ok: boolean; summary: string };

type LocalBulkUploadPayload = {
  kind: "local_bulk_upload";
  products: BulkProductPreview[];
  fileName: string;
};

type AnyUiPayload = UiPayload | LocalBulkUploadPayload;

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; uiActions?: AnyUiPayload[]; toolEvents?: ToolEvent[] };

type ChatResponse = {
  message: string;
  uiActions: UiPayload[];
  toolEvents: ToolEvent[];
};

const SESSION_STORAGE_KEY = "launchkit.chat.sessionId.v1";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, fresh);
  return fresh;
}

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

async function fetchHistory(sessionId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { messages?: ChatMessage[] };
  return data.messages ?? [];
}

export function ChatPanel() {
  const t = useTranslations("chat");
  const locale = useLocale() as "ar" | "en";
  const isAr = locale === "ar";

  const introMessage: ChatMessage = useMemo(
    () => ({
      id: "sys-intro",
      role: "assistant",
      content: isAr
        ? "أهلاً بك. أنا لانش كِت. اكتب أو تحدّث، وسأنفّذ ما تطلبه في متجرك مباشرةً."
        : "Hi, I'm LaunchKit. Type or talk — I act on your live store directly.",
    }),
    [isAr]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([introMessage]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate sessionId from localStorage + past messages from Supabase on mount.
  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);

    fetchHistory(id).then((past) => {
      if (past.length > 0) setMessages([introMessage, ...past]);
      setHydrated(true);
    });
  }, [introMessage]);

  const historyForApi = useMemo(
    () =>
      messages
        .filter((m) => m.id !== "sys-intro")
        .map((m) => ({ role: m.role, content: m.content })),
    [messages]
  );

  const scrollToBottom = useCallback(() => {
    queueMicrotask(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    );
  }, []);

  const mutation = useMutation({
    mutationFn: (text: string) =>
      sendMessage({ sessionId, locale, message: text, history: historyForApi }),
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
      scrollToBottom();
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: isAr ? "حدث خطأ غير متوقّع. تفضّل بالمحاولة مرّة أخرى." : "Something went wrong. Try again.",
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

  // Replace a specific message in-place (used by the bulk-upload card after
  // a publish succeeds or fails).
  const replaceMessage = (id: string, next: ChatMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? next : m)));
  };

  const onFilePicked = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.toLowerCase().split(".").pop();
      let products: BulkProductPreview[] = [];

      if (ext === "csv") {
        products = parseProductsFromCSV(await file.text());
      } else if (ext === "xlsx" || ext === "xls") {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/store/parse-file", { method: "POST", body: fd });
        const data = await res.json();
        products = parseProductsFromXLSXRows(data.rows || []);
      } else {
        throw new Error(isAr ? "صيغة الملف غير مدعومة" : "Unsupported format");
      }

      if (products.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: isAr
              ? "لم أتمكّن من قراءة أيّ منتجات من هذا الملف. تأكّد من وجود الأعمدة التالية: name_ar و name_en و price."
              : "Couldn't read any products from that file. Make sure it has name_ar / name_en / price columns.",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: isAr ? `رفعتُ ملف ${file.name}` : `Uploaded ${file.name}`,
        },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: isAr
            ? `قرأتُ ${products.length} منتج من الملف. راجع القائمة أدناه ثم اضغط النشر.`
            : `I parsed ${products.length} products. Review the list below and hit publish.`,
          uiActions: [{ kind: "local_bulk_upload", products, fileName: file.name }],
        },
      ]);
      scrollToBottom();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: isAr ? `تعذّرت قراءة الملف. التفاصيل: ${String(err)}` : `Couldn't read the file: ${String(err)}`,
        },
      ]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {!hydrated && (
          <div className="flex items-center gap-2 text-muted-ink text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            {isAr ? "جارٍ استرجاع المحادثة…" : "Restoring conversation…"}
          </div>
        )}
        {messages.map((m) => (
          <Bubble
            key={m.id}
            message={m}
            isAr={isAr}
            onReplace={(next) => replaceMessage(m.id, next)}
          />
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFilePicked(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || mutation.isPending}
            title={t("uploadCsv")}
            className="w-11 h-11 rounded-2xl border hairline bg-paper text-ink flex items-center justify-center hover:bg-cream transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </button>
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

function Bubble({
  message,
  isAr,
  onReplace,
}: {
  message: ChatMessage;
  isAr: boolean;
  onReplace: (next: ChatMessage) => void;
}) {
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
          <UiActionCard
            key={i}
            ui={ui}
            isAr={isAr}
            onConfirmResult={(confirmedMessage) => onReplace(confirmedMessage)}
          />
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
      <span className="sr-only">{isAr ? "نتيجة تنفيذ أداة" : "tool event"}</span>
    </div>
  );
}

function UiActionCard({
  ui,
  isAr,
  onConfirmResult,
}: {
  ui: AnyUiPayload;
  isAr: boolean;
  onConfirmResult: (msg: ChatMessage) => void;
}) {
  if (ui.kind === "install_theme_instructions") {
    return (
      <div className="rounded-2xl border hairline bg-cream/60 p-5">
        <div className="text-xs tracking-[0.18em] uppercase text-muted-ink mb-2">
          {isAr ? "تركيب القالب" : "Theme install"}
        </div>
        <p className="text-sm text-ink leading-relaxed mb-3">
          {isAr
            ? "حمّل ملف القالب، ثم ارفعه من لوحة تحكّم زد: القوالب المخصّصة ← رفع قالب جديد."
            : "Download the ZIP and upload it from your Zid dashboard → Custom themes → Upload new theme."}
        </p>
        <a
          href={ui.downloadUrl}
          className="inline-flex items-center h-10 px-4 rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink/85"
          download
        >
          {isAr ? "تحميل الملف" : "Download ZIP"}
        </a>
      </div>
    );
  }

  if (ui.kind === "local_bulk_upload") {
    return <LocalBulkUploadCard ui={ui} isAr={isAr} onConfirmResult={onConfirmResult} />;
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

  if (ui.kind === "landing_page_applied") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="text-xs tracking-[0.18em] uppercase text-emerald-700 mb-1">
          {isAr ? "الصفحة الرئيسية منشورة" : "Landing page live"}
        </div>
        <p className="text-sm text-emerald-900 leading-relaxed">
          {isAr
            ? "تم حقن الصفحة الرئيسية في متجر زد مباشرة."
            : "Injected into your Zid storefront."}
        </p>
        {ui.storeUrl && (
          <a
            href={ui.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center h-9 px-4 rounded-full bg-ink text-paper text-xs font-medium hover:bg-ink/85"
          >
            {isAr ? "افتح المتجر" : "Open store"}
          </a>
        )}
      </div>
    );
  }

  if (ui.kind === "logo_preview") {
    return (
      <div className="rounded-2xl border hairline bg-paper p-5">
        <div className="text-xs tracking-[0.18em] uppercase text-muted-ink mb-3">
          {isAr ? "معاينة الشعار" : "Logo preview"}
        </div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-cream border hairline flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ui.logoUrl} alt={ui.storeName} className="w-full h-full object-contain p-2" />
          </div>
          <div>
            <div className="font-display text-lg">{ui.storeName}</div>
            <div className="text-xs text-muted-ink mt-1">
              {isAr ? "قل 'احفظ الشعار' للتثبيت" : "Say 'save this logo' to commit"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function LocalBulkUploadCard({
  ui,
  isAr,
  onConfirmResult,
}: {
  ui: LocalBulkUploadPayload;
  isAr: boolean;
  onConfirmResult: (msg: ChatMessage) => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const publish = async () => {
    setPublishing(true);
    setError(null);

    const BATCH_SIZE = 50;
    const total = ui.products.length;
    let totalCreated = 0;
    let totalFailed = 0;
    const firstErrorDetail: string[] = [];

    setProgress({ done: 0, total });

    try {
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const slice = ui.products.slice(i, i + BATCH_SIZE);
        const res = await fetch("/api/store/products/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: slice }),
        });
        const data = await res.json();

        if (!res.ok) {
          const issueDetail = Array.isArray(data.issues) && data.issues.length > 0
            ? ` · ${data.issues.map((x: { path?: (string | number)[]; message?: string }) => `${(x.path ?? []).join(".")}: ${x.message ?? "invalid"}`).slice(0, 3).join("; ")}`
            : "";
          firstErrorDetail.push(`${data.error || `HTTP ${res.status}`}${issueDetail}`);
          totalFailed += slice.length;
        } else {
          totalCreated += Number(data.created ?? 0);
          totalFailed += Number(data.failed ?? 0);
        }

        setProgress({ done: Math.min(i + BATCH_SIZE, total), total });
      }

      if (totalCreated === 0 && firstErrorDetail.length > 0) {
        setError(firstErrorDetail[0]);
        return;
      }

      const content = isAr
        ? `نُشر ${totalCreated} من أصل ${total} منتج${totalFailed > 0 ? `. فشل ${totalFailed}.` : " بنجاح."}`
        : `Published ${totalCreated} of ${total} products${totalFailed > 0 ? `. ${totalFailed} failed.` : "."}`;

      onConfirmResult({
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        toolEvents: [
          {
            name: "bulk_products_publish",
            ok: totalFailed === 0,
            summary: `${totalCreated}/${total}`,
          },
        ],
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setPublishing(false);
      setProgress(null);
    }
  };

  const dismiss = () => {
    onConfirmResult({
      id: crypto.randomUUID(),
      role: "assistant",
      content: isAr ? "تمّ إلغاء الرفع." : "Upload cancelled.",
    });
  };

  return (
    <div className="rounded-2xl border hairline bg-paper p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.18em] uppercase text-muted-ink">
            {isAr ? `${ui.products.length} منتج جاهز للنشر` : `${ui.products.length} products ready`}
          </div>
          <div className="text-sm font-medium mt-1 text-ink">{ui.fileName}</div>
        </div>
        <button
          onClick={dismiss}
          disabled={publishing}
          className="w-7 h-7 rounded-full border hairline flex items-center justify-center text-muted-ink hover:text-ink hover:bg-cream transition-colors disabled:opacity-50"
          title={isAr ? "إلغاء" : "Dismiss"}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <ul className="divide-y hairline max-h-64 overflow-y-auto">
        {ui.products.slice(0, 10).map((p, i) => (
          <li key={i} className="py-2 flex items-center gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <div className="truncate text-ink">{isAr ? p.nameAr : p.nameEn}</div>
              {p.categoryName && (
                <div className="text-xs text-muted-ink truncate">{p.categoryName}</div>
              )}
            </div>
            <div className="tabular-nums text-muted-ink text-xs">{p.price.toLocaleString()} SAR</div>
          </li>
        ))}
        {ui.products.length > 10 && (
          <li className="py-2 text-xs text-muted-ink">
            {isAr ? `و ${ui.products.length - 10} منتج إضافي…` : `and ${ui.products.length - 10} more…`}
          </li>
        )}
      </ul>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl break-words">{error}</p>
      )}

      {progress && (
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-cream overflow-hidden">
            <div
              className="h-full bg-ink transition-all"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-ink tabular-nums text-center">
            {progress.done} / {progress.total}
          </div>
        </div>
      )}

      <button
        onClick={publish}
        disabled={publishing}
        className="w-full h-11 rounded-full bg-ink text-paper text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-ink/85 transition-colors disabled:opacity-60"
      >
        {publishing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {publishing
          ? (isAr ? "جارٍ النشر…" : "Publishing…")
          : (isAr ? `نشر ${ui.products.length} منتج في زد` : `Publish ${ui.products.length} products to Zid`)}
      </button>
    </div>
  );
}
