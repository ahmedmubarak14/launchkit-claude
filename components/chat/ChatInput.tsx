"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { ArrowUp, Paperclip, X, FileText, FileSpreadsheet, ImageIcon } from "lucide-react";
import { parseProductsFromCSV, parseProductsFromXLSXRows } from "@/lib/csv-parser";
import { BulkProductItem } from "@/types";

const QUICK_CHIPS = {
  en: [
    "I sell fashion",
    "I sell electronics",
    "I sell home goods",
    "I sell food products",
  ],
  ar: [
    "أبيع ملابس",
    "أبيع إلكترونيات",
    "أبيع منتجات منزلية",
    "أبيع منتجات غذائية",
  ],
};

// Accepted MIME types + extensions
const ACCEPT = [
  "image/*",
  ".csv",
  "text/csv",
  ".xlsx",
  ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  ".pdf",
  "application/pdf",
].join(",");

type FileKind = "image" | "csv" | "xlsx" | "pdf";

type AttachedFile = {
  file: File;
  kind: FileKind;
  previewUrl?: string;
};

interface ChatInputProps {
  onSend: (message: string) => void;
  onImageUpload?: (file: File) => void;
  onCSVUpload?: (products: BulkProductItem[]) => void;
  disabled?: boolean;
  language: "en" | "ar";
  showQuickChips?: boolean;
}

function getFileKind(file: File): FileKind | null {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/")) return "image";
  if (name.endsWith(".csv") || file.type.includes("csv")) return "csv";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx";
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  return null;
}

export function ChatInput({
  onSend,
  onImageUpload,
  onCSVUpload,
  disabled,
  language,
  showQuickChips = true,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [chipsVisible, setChipsVisible] = useState(showQuickChips);
  const [attached, setAttached] = useState<AttachedFile | null>(null);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRTL = language === "ar";

  const handleSend = () => {
    const trimmed = value.trim();
    if ((!trimmed && !attached) || disabled) return;
    if (trimmed) onSend(trimmed);
    setValue("");
    setAttached(null);
    setChipsVisible(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChip = (chip: string) => {
    onSend(chip);
    setChipsVisible(false);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setFileError(null);
    const kind = getFileKind(file);

    if (!kind) {
      setFileError(
        language === "en"
          ? "Unsupported file. Use images, CSV, XLSX, or PDF."
          : "نوع الملف غير مدعوم. استخدم صور أو CSV أو XLSX أو PDF."
      );
      return;
    }

    setFileProcessing(true);

    try {
      if (kind === "image") {
        if (onImageUpload) onImageUpload(file);
        onSend(
          language === "en"
            ? `I uploaded an image: ${file.name}`
            : `قمت برفع صورة: ${file.name}`
        );

      } else if (kind === "csv") {
        const text = await file.text();
        const products = parseProductsFromCSV(text);
        if (products.length > 0 && onCSVUpload) {
          onCSVUpload(products);
          onSend(
            language === "en"
              ? `I uploaded a CSV with ${products.length} products: ${file.name}`
              : `رفعت ملف CSV يحتوي على ${products.length} منتج: ${file.name}`
          );
        } else {
          onSend(
            language === "en"
              ? `I uploaded a CSV (${file.name}) but no products were found. Please check column names: name_ar, name_en, price`
              : `رفعت ملف CSV (${file.name}) لكن لم أجد منتجات. تحقق من الأعمدة: name_ar, name_en, price`
          );
        }

      } else if (kind === "xlsx") {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/store/parse-file", { method: "POST", body: fd });
        const data = await res.json();

        if (res.ok && data.rows) {
          const products = parseProductsFromXLSXRows(data.rows as Record<string, unknown>[]);
          if (products.length > 0 && onCSVUpload) {
            onCSVUpload(products);
            onSend(
              language === "en"
                ? `I uploaded an Excel file with ${products.length} products: ${file.name}`
                : `رفعت ملف Excel يحتوي على ${products.length} منتج: ${file.name}`
            );
          } else {
            // No product columns — send raw content to AI for interpretation
            onSend(
              language === "en"
                ? `I uploaded an Excel file (${file.name}, ${data.totalRows} rows). Here's the content:\n\n${data.text}`
                : `رفعت ملف Excel (${file.name}، ${data.totalRows} صفوف). المحتوى:\n\n${data.text}`
            );
          }
        } else {
          setFileError(data.error || (language === "en" ? "Failed to parse Excel file" : "فشل تحليل ملف Excel"));
        }

      } else if (kind === "pdf") {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/store/parse-file", { method: "POST", body: fd });
        const data = await res.json();

        if (res.ok && data.text) {
          onSend(
            language === "en"
              ? `I uploaded a PDF (${file.name}, ${data.pages} page${data.pages !== 1 ? "s" : ""}). Here's the content:\n\n${data.text}`
              : `رفعت ملف PDF (${file.name}، ${data.pages} صفحة). المحتوى:\n\n${data.text}`
          );
        } else {
          setFileError(data.error || (language === "en" ? "Failed to read PDF" : "فشل قراءة ملف PDF"));
        }
      }
    } catch (err) {
      console.error("[ChatInput] file error:", err);
      setFileError(
        language === "en"
          ? "Error reading file. Please try again."
          : "خطأ في قراءة الملف. حاول مرة أخرى."
      );
    } finally {
      setFileProcessing(false);
      setAttached(null);
    }
  };

  const chips = QUICK_CHIPS[language];

  const fileIcon: Record<FileKind, React.ReactNode> = {
    image: <ImageIcon className="w-3.5 h-3.5 text-violet-500" />,
    csv: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />,
    xlsx: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />,
    pdf: <FileText className="w-3.5 h-3.5 text-red-400" />,
  };

  return (
    <div className="space-y-2" dir={isRTL ? "rtl" : "ltr"}>
      {/* Quick chips */}
      {chipsVisible && (
        <div className="flex flex-wrap gap-2 px-1">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleChip(chip)}
              disabled={disabled}
              className="px-3.5 py-1.5 bg-white border border-violet-100 rounded-full text-sm text-violet-600 font-medium hover:bg-violet-50 hover:border-violet-200 transition-all shadow-sm disabled:opacity-50 active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Attached file pill */}
      {attached && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 border border-violet-100 rounded-xl w-fit max-w-full">
          {fileIcon[attached.kind]}
          {attached.previewUrl && (
            <img src={attached.previewUrl} alt="" className="w-6 h-6 rounded object-cover" />
          )}
          <span className="text-xs font-medium text-violet-700 truncate max-w-[180px]">
            {attached.file.name}
          </span>
          <button
            onClick={() => {
              if (attached.previewUrl) URL.revokeObjectURL(attached.previewUrl);
              setAttached(null);
            }}
            className="text-violet-400 hover:text-violet-600 flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* File error */}
      {fileError && (
        <p className="text-[11px] text-red-500 px-1">{fileError}</p>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100 transition-all">

        {/* Unified attach button */}
        <button
          onClick={() => { setFileError(null); fileInputRef.current?.click(); }}
          disabled={disabled || fileProcessing}
          className="text-gray-400 hover:text-violet-500 transition-colors flex-shrink-0 mb-0.5 disabled:opacity-50"
          title={
            language === "en"
              ? "Attach file — images, CSV, Excel (.xlsx), PDF"
              : "إرفاق ملف — صور، CSV، Excel (.xlsx)، PDF"
          }
        >
          {fileProcessing ? (
            <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            language === "en"
              ? "Describe your business or ask anything..."
              : "صف نشاطك التجاري أو اسأل أي شيء..."
          }
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none leading-relaxed disabled:opacity-50"
          style={{ maxHeight: 120 }}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={disabled || (!value.trim() && !attached)}
          className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-md transition-all hover:bg-violet-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 mb-0.5"
        >
          {disabled ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {/* Hint */}
      <p className="text-center text-[10px] text-gray-300">
        {language === "en"
          ? "📎 Images · CSV · Excel · PDF   ·   Enter to send · Shift+Enter new line"
          : "📎 صور · CSV · Excel · PDF   ·   Enter للإرسال · Shift+Enter سطر جديد"}
      </p>
    </div>
  );
}
