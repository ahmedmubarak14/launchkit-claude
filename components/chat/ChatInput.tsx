"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { ArrowUp, ImagePlus, Mic } from "lucide-react";

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

interface ChatInputProps {
  onSend: (message: string) => void;
  onImageUpload?: (file: File) => void;
  disabled?: boolean;
  language: "en" | "ar";
  showQuickChips?: boolean;
}

export function ChatInput({
  onSend,
  onImageUpload,
  disabled,
  language,
  showQuickChips = true,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [chipsVisible, setChipsVisible] = useState(showQuickChips);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRTL = language === "ar";

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    setChipsVisible(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
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
    // Auto-grow
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
  };

  const chips = QUICK_CHIPS[language];

  return (
    <div className="space-y-3" dir={isRTL ? "rtl" : "ltr"}>
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

      {/* Input area */}
      <div className="flex items-end gap-2 bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100 transition-all">
        {/* Image upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="text-gray-400 hover:text-violet-500 transition-colors flex-shrink-0 mb-0.5 disabled:opacity-50"
          title={language === "en" ? "Upload image" : "رفع صورة"}
        >
          <ImagePlus className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
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

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-md transition-all hover:bg-violet-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 mb-0.5"
        >
          {disabled ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
