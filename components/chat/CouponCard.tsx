"use client";

import { useState } from "react";
import { Check, Copy, Ticket, Calendar, Tag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface CouponData {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  expiryDate?: string;
  minOrderValue?: number;
  descriptionAr?: string;
  descriptionEn?: string;
}

interface CouponCardProps {
  coupon: CouponData;
  sessionId: string;
  language: "en" | "ar";
  onConfirm?: (coupon: CouponData) => void;
}

export function CouponCard({ coupon, sessionId, language, onConfirm }: CouponCardProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const isRTL = language === "ar";

  const discountLabel =
    coupon.discountType === "percentage"
      ? `${coupon.discountValue}% ${language === "en" ? "OFF" : "خصم"}`
      : `${coupon.discountValue} ${language === "en" ? "SAR OFF" : "ر.س خصم"}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async () => {
    setLoading(true);
    // Simulate API call — hook up to Zid coupon API when available
    await new Promise((r) => setTimeout(r, 1000));
    setConfirmed(true);
    setLoading(false);
    onConfirm?.(coupon);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat(isRTL ? "ar-SA" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  if (confirmed) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            {language === "en" ? "Coupon created!" : "تم إنشاء الكوبون!"}
          </p>
          <p className="text-xs font-mono text-emerald-500 mt-0.5 font-bold tracking-widest">
            {coupon.code}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border border-amber-100 shadow-md bg-white"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Gradient header with discount */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 px-5 py-4 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
        <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute right-12 bottom-2 w-12 h-12 rounded-full bg-white/10" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-xs font-medium">
                {language === "en" ? "Discount Coupon" : "كوبون خصم"}
              </p>
              <p className="text-white text-2xl font-black tracking-tight">{discountLabel}</p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <Zap className="w-6 h-6 text-white/60" />
          </div>
        </div>
      </div>

      {/* Perforated divider */}
      <div className="relative flex items-center px-4">
        <div className="absolute -left-3 w-6 h-6 rounded-full bg-[#F8FAFC] border border-amber-100" />
        <div className="flex-1 border-t-2 border-dashed border-amber-100 mx-3" />
        <div className="absolute -right-3 w-6 h-6 rounded-full bg-[#F8FAFC] border border-amber-100" />
      </div>

      {/* Bottom content */}
      <div className="px-5 py-4 space-y-4 bg-amber-50/30">
        {/* Coupon code */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {language === "en" ? "Coupon Code" : "رمز الكوبون"}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white border-2 border-dashed border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-center">
              <span className="font-mono text-xl font-black text-gray-900 tracking-widest">
                {coupon.code}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${
                copied
                  ? "bg-emerald-50 border-emerald-200 text-emerald-500"
                  : "bg-white border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-500"
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4">
          {coupon.expiryDate && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {language === "en" ? "Expires:" : "ينتهي:"} {formatDate(coupon.expiryDate)}
              </span>
            </div>
          )}
          {coupon.minOrderValue && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {language === "en" ? "Min:" : "الحد الأدنى:"} {coupon.minOrderValue}{" "}
                {language === "en" ? "SAR" : "ر.س"}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {(coupon.descriptionAr || coupon.descriptionEn) && (
          <p className="text-xs text-gray-400 leading-relaxed">
            {isRTL ? coupon.descriptionAr : coupon.descriptionEn}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 h-auto shadow-md shadow-amber-200/60 transition-all hover:-translate-y-0.5 gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {language === "en" ? "Creating..." : "جاري الإنشاء..."}
              </>
            ) : (
              <>
                <Ticket className="w-3.5 h-3.5" />
                {language === "en" ? "Create Coupon" : "إنشاء الكوبون"}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="text-sm rounded-xl px-4 py-2.5 h-auto border-amber-200 text-amber-600 hover:bg-amber-50 bg-white font-medium"
          >
            {language === "en" ? "Edit" : "تعديل"}
          </Button>
        </div>
      </div>
    </div>
  );
}
