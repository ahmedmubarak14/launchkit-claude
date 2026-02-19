"use client";

import { useState, useEffect } from "react";
import { Check, ShoppingBag, DollarSign, Pencil, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIAction } from "@/types";

interface ZidCat { id: string; nameAr: string; nameEn: string; }

interface ProductCardProps {
  action: AIAction;
  sessionId: string;
  language: "en" | "ar";
  onConfirm: (product: AIAction["data"]) => void;
}

export function ProductCard({ action, sessionId, language, onConfirm }: ProductCardProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [zidCategories, setZidCategories] = useState<ZidCat[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const data = action.data;
  const isRTL = language === "ar";

  const variants = data?.variants || [];

  // Fetch live Zid categories so user can assign product to one
  useEffect(() => {
    fetch("/api/store/categories/zid")
      .then((r) => r.json())
      .then((d) => {
        if (d.categories?.length > 0) {
          setZidCategories(d.categories);
          // Auto-select first category
          setSelectedCategoryId(d.categories[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const selectedCat = zidCategories.find((c) => c.id === selectedCategoryId);
  const selectedCatName = selectedCat
    ? (isRTL ? selectedCat.nameAr : selectedCat.nameEn)
    : (language === "en" ? "Uncategorized" : "بدون فئة");

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/store/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            ...data,
            categoryId: selectedCategoryId || null,
          },
          sessionId,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setConfirmed(true);
        onConfirm(result.product || data);
      }
    } finally {
      setLoading(false);
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
            {language === "en" ? "Product added to store!" : "تم إضافة المنتج للمتجر!"}
          </p>
          <p className="text-xs text-emerald-500 mt-0.5">
            {isRTL ? data?.nameAr : data?.nameEn}
            {selectedCat && (
              <span className="ml-1 opacity-70">· {isRTL ? selectedCat.nameAr : selectedCat.nameEn}</span>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-gray-100 rounded-2xl shadow-md overflow-hidden"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-emerald-50/50 border-b border-gray-100 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
          <ShoppingBag className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <span className="text-sm font-semibold text-gray-700">
          {language === "en" ? "Product Preview" : "معاينة المنتج"}
        </span>
        <div className="ml-auto">
          <Badge className="bg-violet-50 text-violet-500 border border-violet-100 text-[10px] font-medium">
            {language === "en" ? "Draft" : "مسودة"}
          </Badge>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* Image placeholder */}
          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-100 flex-shrink-0 flex flex-col items-center justify-center gap-1 shadow-inner">
            <ShoppingBag className="w-7 h-7 text-gray-300" />
            <span className="text-[9px] text-gray-300 font-medium">
              {language === "en" ? "Image" : "صورة"}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <h4 className="font-bold text-gray-900 text-sm leading-snug" dir="rtl">
              {data?.nameAr}
            </h4>
            <p className="text-gray-400 text-xs font-medium">{data?.nameEn}</p>

            {/* Category selector */}
            <div className="relative">
              {zidCategories.length > 0 ? (
                <div className="relative inline-flex items-center">
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="appearance-none text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-lg pl-2 pr-6 py-1 cursor-pointer hover:border-violet-300 transition-colors outline-none"
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    <option value="">
                      {language === "en" ? "— No category —" : "— بدون فئة —"}
                    </option>
                    {zidCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {isRTL ? cat.nameAr : cat.nameEn}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-violet-400 pointer-events-none" />
                </div>
              ) : (
                <Badge className="bg-violet-50 text-violet-600 border border-violet-100 text-[10px] px-2 py-0.5 font-medium">
                  {language === "en" ? "No categories yet" : "لا توجد فئات بعد"}
                </Badge>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center gap-1 pt-0.5">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-xl font-bold text-gray-900">{data?.price || 0}</span>
              <span className="text-sm text-gray-400 font-medium">{language === "en" ? "SAR" : "ر.س"}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {(data?.descriptionAr || data?.descriptionEn) && (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2" dir={isRTL ? "rtl" : "ltr"}>
              {isRTL ? data?.descriptionAr : data?.descriptionEn}
            </p>
          </div>
        )}

        {/* Variant chips */}
        {variants.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {language === "en" ? "Variants" : "المتغيرات"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {variants.map((variant, i) => {
                const v = variant as { name_en?: string; options?: string[] };
                const opts = v.options || [];
                return opts.map((opt, j) => (
                  <span
                    key={`${i}-${j}`}
                    className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600 transition-all cursor-pointer"
                  >
                    {opt}
                  </span>
                ));
              })}
            </div>
          </div>
        )}

        {/* Bilingual preview */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-violet-50/60 rounded-xl border border-violet-100 p-2.5">
            <div className="text-[9px] text-violet-400 mb-1 font-semibold uppercase tracking-wider">AR — العربية</div>
            <div className="text-xs font-semibold text-gray-700 truncate" dir="rtl">{data?.nameAr}</div>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-2.5">
            <div className="text-[9px] text-gray-400 mb-1 font-semibold uppercase tracking-wider">EN — English</div>
            <div className="text-xs font-semibold text-gray-700 truncate">{data?.nameEn}</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-semibold rounded-xl px-4 py-2.5 h-auto shadow-md shadow-emerald-200/60 transition-all hover:-translate-y-0.5 hover:shadow-lg gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {language === "en" ? "Adding..." : "جاري الإضافة..."}
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                {language === "en"
                  ? `Add to Store${selectedCat ? ` · ${isRTL ? selectedCat.nameAr : selectedCat.nameEn}` : ""}`
                  : `إضافة للمتجر${selectedCat ? ` · ${selectedCat.nameAr}` : ""}`}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="text-sm rounded-xl px-4 py-2.5 h-auto border-gray-200 text-gray-600 hover:border-violet-200 hover:text-violet-600 hover:bg-violet-50 gap-1.5 bg-white font-medium"
          >
            <Pencil className="w-3.5 h-3.5" />
            {language === "en" ? "Edit" : "تعديل"}
          </Button>
        </div>
      </div>
    </div>
  );
}
