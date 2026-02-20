"use client";

import { useState } from "react";
import { Trash2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAction } from "@/types";

interface DeleteConfirmCardProps {
  action: AIAction;
  sessionId: string;
  language: "en" | "ar";
  onConfirm: () => void;
}

export function DeleteConfirmCard({ action, language, onConfirm }: DeleteConfirmCardProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRTL = language === "ar";

  const isCategory = action.type === "delete_category";
  const id = isCategory ? action.data?.categoryId : action.data?.productId;
  const nameAr = action.data?.nameAr || "";
  const nameEn = action.data?.nameEn || "";
  const displayName = isRTL ? nameAr : nameEn;

  const handleDelete = async () => {
    if (!id) { setError("Missing ID"); return; }
    setLoading(true);
    setError(null);
    try {
      if (isCategory) {
        const res = await fetch("/api/store/categories/zid", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: id }),
        });
        const data = await res.json();
        if (data.success) {
          setDone(true);
          onConfirm();
        } else {
          setError(data.body || data.error || (language === "en" ? "Delete failed" : "فشل الحذف"));
        }
      } else {
        // Delete product via Zid API
        const res = await fetch(`/api/store/products/zid/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (data.success) {
          setDone(true);
          onConfirm();
        } else {
          setError(data.error || (language === "en" ? "Delete failed" : "فشل الحذف"));
        }
      }
    } catch (err) {
      setError(language === "en" ? "Network error" : "خطأ في الشبكة");
      console.error("[DeleteConfirmCard]", err);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm" dir={isRTL ? "rtl" : "ltr"}>
        <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            {language === "en" ? "Deleted successfully!" : "تم الحذف بنجاح!"}
          </p>
          <p className="text-xs text-emerald-500 mt-0.5">{displayName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3 shadow-sm" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
        <span className="text-sm font-semibold text-red-700">
          {isCategory
            ? (language === "en" ? "Delete Category" : "حذف الفئة")
            : (language === "en" ? "Delete Product" : "حذف المنتج")}
        </span>
      </div>

      {/* Item name */}
      <div className="px-3 py-2 bg-white rounded-xl border border-red-100">
        <p className="text-sm font-semibold text-gray-800" dir="rtl">{nameAr}</p>
        <p className="text-xs text-gray-400 mt-0.5">{nameEn}</p>
      </div>

      <p className="text-xs text-red-600">
        {language === "en"
          ? "This will permanently delete the item from your Zid store. This cannot be undone."
          : "سيؤدي هذا إلى حذف العنصر نهائيًا من متجر زد. لا يمكن التراجع عن هذا الإجراء."}
      </p>

      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleDelete}
          disabled={loading}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl h-auto py-2.5 gap-2 disabled:opacity-50 shadow-sm"
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          {language === "en" ? "Yes, Delete" : "نعم، احذف"}
        </Button>
      </div>
    </div>
  );
}
