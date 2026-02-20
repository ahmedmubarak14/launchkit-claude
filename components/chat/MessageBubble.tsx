"use client";

import { formatDistanceToNow } from "date-fns";
import { Sparkles } from "lucide-react";
import { ChatMessage, BulkProductItem } from "@/types";
import { CategoryCard } from "./CategoryCard";
import { ProductCard } from "./ProductCard";
import { CouponCard, CouponData } from "./CouponCard";
import { ThemeCard } from "./ThemeCard";
import { LogoCard } from "./LogoCard";
import { BulkProductCard } from "./BulkProductCard";
import { LandingPageCard } from "./LandingPageCard";

interface MessageBubbleProps {
  message: ChatMessage;
  sessionId: string;
  language: "en" | "ar";
  onCategoryConfirm: (categories: Array<{ nameAr: string; nameEn: string }>) => void;
  onProductConfirm: (product: unknown) => void;
  onThemeConfirm: (data: unknown) => void;
  onLogoConfirm: (logoUrl: string) => void;
  onBulkProductsConfirm: (products: BulkProductItem[]) => void;
  onLandingPageConfirm?: (data: any) => void;
}

function timeAgo(date: Date): string {
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "just now";
  }
}

export function MessageBubble({
  message,
  sessionId,
  language,
  onCategoryConfirm,
  onProductConfirm,
  onThemeConfirm,
  onLogoConfirm,
  onBulkProductsConfirm,
  onLandingPageConfirm,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isRTL = language === "ar";

  const hasCoupon = message.action?.type === "preview_coupon";
  const couponData = hasCoupon ? (message.action?.data as unknown as CouponData) : null;

  return (
    <div
      className={`flex items-start gap-3 message-enter ${isUser ? "flex-row-reverse" : ""}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* AI avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center flex-shrink-0 shadow-md mt-0.5">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`flex flex-col gap-1.5 max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Bubble */}
        <div
          className={`relative px-4 py-3 ${isUser
            ? "bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-2xl rounded-br-sm shadow-md shadow-violet-200/50"
            : "bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm"
            }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Action cards (AI only) */}
        {!isUser && message.action && message.action.type !== "none" && (
          <div className="w-full mt-1 space-y-2">
            {message.action.type === "suggest_categories" && (
              <CategoryCard
                action={message.action}
                sessionId={sessionId}
                language={language}
                onConfirm={onCategoryConfirm}
              />
            )}
            {message.action.type === "preview_product" && (
              <ProductCard
                action={message.action}
                sessionId={sessionId}
                language={language}
                onConfirm={onProductConfirm}
              />
            )}
            {hasCoupon && couponData && (
              <CouponCard
                coupon={couponData}
                sessionId={sessionId}
                language={language}
              />
            )}
            {message.action.type === "suggest_themes" && (
              <ThemeCard
                action={message.action}
                sessionId={sessionId}
                language={language}
                onConfirm={onThemeConfirm}
              />
            )}
            {message.action.type === "generate_logo" && (
              <LogoCard
                action={message.action}
                sessionId={sessionId}
                language={language}
                onConfirm={onLogoConfirm}
              />
            )}
            {message.action.type === "bulk_products" && (
              <BulkProductCard
                action={message.action}
                sessionId={sessionId}
                language={language}
                onConfirm={onBulkProductsConfirm}
              />
            )}
            {message.action.type === "generate_landing_page" && (
              <LandingPageCard
                action={message.action}
                sessionId={sessionId}
                language={language}
                onConfirm={onLandingPageConfirm || (() => { })}
              />
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-gray-400 px-1 select-none">
          {timeAgo(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

export function TypingIndicator({ language }: { language: "en" | "ar" }) {
  return (
    <div className="flex items-start gap-3 message-enter">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center flex-shrink-0 shadow-md">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm border border-gray-100 px-4 py-3.5 shadow-sm">
        <div className="flex gap-1.5 items-center h-4">
          <div className="w-2 h-2 rounded-full bg-violet-400 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-violet-400 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-violet-400 typing-dot" />
        </div>
      </div>
    </div>
  );
}
