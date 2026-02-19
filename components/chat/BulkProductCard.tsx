"use client";

import { useState } from "react";
import { Check, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAction, BulkProductItem } from "@/types";

interface BulkProductCardProps {
  action: AIAction;
  sessionId: string;
  language: "en" | "ar";
  onConfirm: (products: BulkProductItem[]) => void;
}

export function BulkProductCard({ action, sessionId, language, onConfirm }: BulkProductCardProps) {
  const isRTL = language === "ar";
  const initialProducts = (action.data?.products || []).map((p, i) => ({ ...p, _id: i, _selected: true, _done: false }));
  const [items, setItems] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [progress, setProgress] = useState(0);

  const selected = items.filter((i) => i._selected);
  const allDone = items.every((i) => i._done || !i._selected);

  const toggle = (id: number) => {
    setItems((prev) => prev.map((item) => (item._id === id ? { ...item, _selected: !item._selected } : item)));
  };

  const handleConfirm = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setProgress(0);

    try {
      // Push one by one so we can show per-row progress
      for (let i = 0; i < selected.length; i++) {
        const p = selected[i];
        try {
          await fetch("/api/store/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              product: {
                nameAr: p.nameAr,
                nameEn: p.nameEn,
                descriptionAr: p.descriptionAr,
                descriptionEn: p.descriptionEn,
                price: p.price,
                variants: [],
              },
              sessionId,
            }),
          });
        } catch {
          // continue even if one fails
        }
        setItems((prev) => prev.map((item) => (item._id === p._id ? { ...item, _done: true } : item)));
        setProgress(Math.round(((i + 1) / selected.length) * 100));
      }

      setConfirmed(true);
      onConfirm(selected.map(({ nameAr, nameEn, price, descriptionAr, descriptionEn }) => ({ nameAr, nameEn, price, descriptionAr, descriptionEn })));
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            {language === "en" ? "Products added!" : "تم إضافة المنتجات!"}
          </p>
          <p className="text-xs text-emerald-500 mt-0.5">
            {selected.length} {language === "en" ? "products created in your store" : "منتج أضيف إلى متجرك"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50/60 border border-violet-100 rounded-2xl p-4 space-y-3 shadow-sm" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
            <Package className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <span className="text-sm font-semibold text-violet-800">
            {language === "en" ? "Bulk Products Preview" : "معاينة المنتجات الجماعية"}
          </span>
        </div>
        <span className="text-xs font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full border border-violet-200">
          {selected.length} {language === "en" ? "selected" : "محدد"}
        </span>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="w-8 py-2 px-2" />
              <th className="py-2 px-2 text-left font-semibold text-gray-500">
                {language === "en" ? "Arabic" : "عربي"}
              </th>
              <th className="py-2 px-2 text-left font-semibold text-gray-500">
                {language === "en" ? "English" : "إنجليزي"}
              </th>
              <th className="py-2 px-2 text-right font-semibold text-gray-500">
                {language === "en" ? "Price" : "سعر"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => (
              <tr
                key={item._id}
                className={`transition-colors ${
                  item._done
                    ? "bg-emerald-50"
                    : item._selected
                    ? "bg-white"
                    : "bg-gray-50 opacity-50"
                }`}
              >
                <td className="py-2 px-2 text-center">
                  {item._done ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                  ) : (
                    <button
                      onClick={() => toggle(item._id)}
                      disabled={loading}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        item._selected ? "border-violet-500 bg-violet-500" : "border-gray-300 bg-white"
                      }`}
                    >
                      {item._selected && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                  )}
                </td>
                <td className="py-2 px-2 text-gray-700 font-medium max-w-[100px] truncate">{item.nameAr}</td>
                <td className="py-2 px-2 text-gray-600 max-w-[100px] truncate">{item.nameEn}</td>
                <td className="py-2 px-2 text-right text-gray-700 font-medium whitespace-nowrap">
                  {item.price} <span className="text-gray-400">SAR</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Progress bar */}
      {loading && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>{language === "en" ? "Adding products..." : "جاري إضافة المنتجات..."}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Confirm button */}
      <Button
        onClick={handleConfirm}
        disabled={loading || selected.length === 0}
        className="w-full bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white text-sm font-semibold rounded-xl px-5 py-2.5 h-auto shadow-md shadow-violet-200/60 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 gap-2"
      >
        {loading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {language === "en" ? "Adding..." : "جاري الإضافة..."}
          </>
        ) : (
          <>
            <Package className="w-3.5 h-3.5" />
            {language === "en"
              ? `Add ${selected.length} Products to Store`
              : `إضافة ${selected.length} منتج للمتجر`}
          </>
        )}
      </Button>
    </div>
  );
}
